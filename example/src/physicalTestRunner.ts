import { useEffect, useRef, useState } from 'react';
import DeviceInfo from 'react-native-device-info';
import { useDevGuard } from 'react-native-dev-guard';
import {
  PHYSICAL_TEST_SYNC_URL,
  PHYSICAL_TEST_MESSAGE,
} from './physicalTest.local';

const SYNC_URL = PHYSICAL_TEST_SYNC_URL?.trim();
const EXPECTED_MESSAGE = PHYSICAL_TEST_MESSAGE || 'PHYSICAL_TEST_MESSAGE';

/** Canonical order — must match testing_suite/scripts/lib/mobileSdkScenarios.js */
const SCENARIO_ORDER = [
  'active',
  'warning',
  'locked_outbound',
  'locked_unlock',
  'emulator_block',
  'compromised_device',
  'end_user_identity',
  'integration_sync',
  'telemetry_diagnostics',
  'version_override',
  'white_label',
  'device_block',
  'webhook_locked',
] as const;

type ScenarioName = (typeof SCENARIO_ORDER)[number];

function scenarioSatisfied(
  name: ScenarioName,
  status: string,
  response: Record<string, any> | null,
  isLocked = false,
): boolean {
  if (!response) return false;
  const msg = String(response.message || '').trim();
  const st = String(response.status || status || '').toUpperCase();

  switch (name) {
    case 'active':
      return st === 'ACTIVE' && msg === EXPECTED_MESSAGE;
    case 'warning':
      return st === 'WARNING' && msg === EXPECTED_MESSAGE;
    case 'locked_outbound':
      return (
        (st === 'LOCKED' || isLocked === true) &&
        msg === EXPECTED_MESSAGE &&
        response.allowUnlock !== true
      );
    case 'locked_unlock':
      return (
        (st === 'LOCKED' || isLocked === true) &&
        msg === EXPECTED_MESSAGE &&
        response.allowUnlock === true
      );
    case 'emulator_block':
      return (
        (st === 'LOCKED' || isLocked === true) &&
        String(response.title || '').toLowerCase().includes('emulator')
      );
    case 'compromised_device':
      if (
        (st === 'LOCKED' || isLocked === true) &&
        String(response.title || '').toLowerCase().includes('security')
      ) {
        return true;
      }
      return st === 'ACTIVE' && msg === EXPECTED_MESSAGE;
    case 'integration_sync':
      return (
        st === 'ACTIVE' &&
        response.syncPolicy === 'daily' &&
        response.lifecycleSync != null &&
        response.pingInterval === 15
      );
    case 'telemetry_diagnostics':
      return (
        st === 'ACTIVE' &&
        response.betaFeatures?.showDiagnosticLogs === true &&
        !!response.diagnosticPasscodeHash
      );
    case 'end_user_identity':
      return st === 'ACTIVE' && response.extraData?.showBetaBadge === true;
    case 'version_override':
      return st === 'LOCKED' && response.title === 'Version Blocked';
    case 'white_label':
      return (
        st === 'LOCKED' &&
        response.title === 'Branded Lock' &&
        !!response.branding?.brandName
      );
    case 'device_block':
      return st === 'LOCKED' && response.title === 'Device Blocked';
    case 'webhook_locked':
      return st === 'LOCKED' && msg === EXPECTED_MESSAGE;
    default:
      return false;
  }
}

async function notifySync(completed: string, deviceId: string): Promise<string> {
  const uri = `${SYNC_URL}/ready?completed=${encodeURIComponent(completed)}&deviceId=${encodeURIComponent(deviceId)}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(uri);
      const body = (await response.text()).trim();
      if (!response.ok) {
        throw new Error(`Sync ${response.status}: ${body}`);
      }
      return body;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/**
 * Drives Firestore scenario patches via the host sync server (:9876).
 * Logs `PHYSICAL_TEST_PASS:<scenario>` for the Node harness.
 */
export function PhysicalTestRunner() {
  const { status, response, verify, setDeviceUser, isLocked } = useDevGuard();
  const [expectedScenario, setExpectedScenario] = useState<ScenarioName>('active');

  const expectedRef = useRef<ScenarioName>('active');
  const completedRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const identitySetRef = useRef(false);
  const deviceIdRef = useRef<string | null>(null);
  const lastVerifyAtRef = useRef(0);
  const verifyInFlightRef = useRef(false);

  const statusRef = useRef(status);
  const responseRef = useRef(response);
  const isLockedRef = useRef(isLocked);
  statusRef.current = status;
  responseRef.current = response;
  isLockedRef.current = isLocked;
  expectedRef.current = expectedScenario;

  const verifyRef = useRef(verify);
  const setDeviceUserRef = useRef(setDeviceUser);
  verifyRef.current = verify;
  setDeviceUserRef.current = setDeviceUser;

  useEffect(() => {
    if (!SYNC_URL) return undefined;
    DeviceInfo.getUniqueId().then((id) => {
      deviceIdRef.current = id;
    });
    return undefined;
  }, []);

  useEffect(() => {
    if (!SYNC_URL) return undefined;

    let cancelled = false;

    const runVerify = async () => {
      if (verifyInFlightRef.current) return;
      const since = Date.now() - lastVerifyAtRef.current;
      if (since < 2000) return;
      verifyInFlightRef.current = true;
      lastVerifyAtRef.current = Date.now();
      try {
        await verifyRef.current(true);
      } finally {
        verifyInFlightRef.current = false;
      }
    };

    const tick = async () => {
      if (cancelled || busyRef.current) return;

      const expected = expectedRef.current;
      const currentStatus = statusRef.current;
      const currentResponse = responseRef.current as Record<string, any> | null;
      const locked = isLockedRef.current;

      if (!currentResponse) return;
      if (completedRef.current.has(expected)) return;

      if (
        expected === 'active' &&
        currentStatus.toUpperCase() === 'ACTIVE' &&
        currentResponse.message !== EXPECTED_MESSAGE
      ) {
        await runVerify();
        return;
      }

      if (!scenarioSatisfied(expected, currentStatus, currentResponse, locked)) {
        if (expected === 'locked_outbound' || expected === 'locked_unlock') {
          console.log(
            `PHYSICAL_TEST_WAIT:${expected} status=${currentStatus} rs=${currentResponse.status} msg=${currentResponse.message} allowUnlock=${String(currentResponse.allowUnlock)} isLocked=${locked}`,
          );
          // Flutter integration test polls up to ~60s — bypass verify debounce for lock transitions.
          for (let attempt = 0; attempt < 30; attempt += 1) {
            lastVerifyAtRef.current = 0;
            verifyInFlightRef.current = false;
            await verifyRef.current(true);
            await new Promise((r) => setTimeout(r, 2000));
            const st = statusRef.current;
            const rs = responseRef.current as Record<string, any> | null;
            if (rs && scenarioSatisfied(expected, st, rs, isLockedRef.current)) {
              break;
            }
          }
        } else {
          await runVerify();
        }
        return;
      }

      // Guard before notifySync — two interval ticks can both satisfy the same
      // scenario and double-advance the host sync server (skipping warning patch).
      if (busyRef.current || completedRef.current.has(expected)) {
        return;
      }
      busyRef.current = true;

      if (expected === 'end_user_identity' && !identitySetRef.current) {
        identitySetRef.current = true;
        try {
          await setDeviceUserRef.current('example_user', 'rn@example.com', '+1987654321', {
            framework: 'react-native',
          });
          lastVerifyAtRef.current = 0;
          await verifyRef.current(true);
        } finally {
          busyRef.current = false;
        }
        return;
      }

      let next = '';
      try {
        const deviceId = deviceIdRef.current || (await DeviceInfo.getUniqueId());
        deviceIdRef.current = deviceId;
        const nextRaw = await notifySync(expected, deviceId);
        next = nextRaw.trim();
        completedRef.current.add(expected);
        console.log(`PHYSICAL_TEST_PASS:${expected}`);
        console.log(`PHYSICAL_TEST_NEXT:${next}`);
        console.log(
          `PHYSICAL_TEST_OUTCOME:${expected}:${JSON.stringify({
            result: 'pass',
            status: currentResponse.status || currentStatus,
            title: currentResponse.title,
            message: currentResponse.message,
            allowUnlock: currentResponse.allowUnlock,
            compromisedDetected:
              expected === 'compromised_device'
                ? String(currentResponse.title || '')
                    .toLowerCase()
                    .includes('security')
                : undefined,
          })}`,
        );

        if (next === 'done') {
          console.log('PHYSICAL_TEST_DONE');
          return;
        }

        if (SCENARIO_ORDER.includes(next as ScenarioName)) {
          expectedRef.current = next as ScenarioName;
          setExpectedScenario(next as ScenarioName);
        } else if (next && next !== 'done') {
          console.warn(`PHYSICAL_TEST_UNKNOWN_NEXT:${next}`);
        }
      } catch (e) {
        console.error('PHYSICAL_TEST_FAIL:', expected, e);
        return;
      } finally {
        busyRef.current = false;
      }

      // Settlement verify runs outside busyRef so the next scenario can tick while API catches up.
      lastVerifyAtRef.current = 0;
      await new Promise((r) => setTimeout(r, 800));
      await verifyRef.current(true);
      await new Promise((r) => setTimeout(r, 2500));
      await verifyRef.current(true);
    };

    const id = setInterval(() => {
      tick().catch(() => {});
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}

export function isPhysicalTestEnabled(): boolean {
  return !!SYNC_URL;
}

export { SCENARIO_ORDER };
