"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticOutbox = exports.DiagnosticBatchService = exports.PluginCrashReporter = exports.resolveBrandingFooter = exports.useDevGuard = exports.DevGuardProvider = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const crypto_js_1 = __importDefault(require("crypto-js"));
const pako_1 = __importDefault(require("pako"));
const HardwareService_1 = require("./services/HardwareService");
const LockScreen_1 = require("./components/LockScreen");
const SecurityToast_1 = require("./components/SecurityToast");
const UsageLogger_1 = require("./services/UsageLogger");
const UserLogBuffer_1 = require("./services/UserLogBuffer");
const DeviceTokenService_1 = require("./services/DeviceTokenService");
// @ts-ignore
const react_native_jailbreak_1 = __importDefault(require("react-native-jailbreak"));
const CacheService_1 = require("./services/CacheService");
const DiagnosticOverlay_1 = require("./components/DiagnosticOverlay");
const DevGuardLogger_1 = require("./services/DevGuardLogger");
const PluginCrashReporter_1 = require("./services/PluginCrashReporter");
const DiagnosticOutbox_1 = require("./services/DiagnosticOutbox");
const DiagnosticBatchService_1 = require("./services/DiagnosticBatchService");
const GuardEnforcement_1 = require("./services/GuardEnforcement");
const RemoteWipeService_1 = require("./services/RemoteWipeService");
const obf_1 = require("./internal/obf");
const statusUrlResolver_1 = require("./utils/statusUrlResolver");
const fetchFailurePolicy_1 = require("./utils/fetchFailurePolicy");
const secureDevGuardRequest_1 = require("./utils/secureDevGuardRequest");
const react_native_2 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const { DevGuard: DevGuardNative } = react_native_1.NativeModules;
/**
 * OS power-saver / low-battery signal for lifecycle debounce backoff.
 * Prefer DeviceInfo.getPowerStateSync (lowPowerMode + batteryLevel); allow
 * host override via global `__DEVGUARD_LOW_POWER__` for tests / OEM hooks.
 */
function resolveLowPowerMode() {
    const forced = global?.__DEVGUARD_LOW_POWER__;
    if (typeof forced === 'boolean')
        return forced;
    try {
        // Optional peer — same package HardwareService already uses.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const DeviceInfo = require('react-native-device-info');
        const power = typeof DeviceInfo.getPowerStateSync === 'function'
            ? DeviceInfo.getPowerStateSync()
            : null;
        if (power?.lowPowerMode === true)
            return true;
        const level = typeof power?.batteryLevel === 'number'
            ? power.batteryLevel
            : (typeof DeviceInfo.getBatteryLevelSync === 'function' ? DeviceInfo.getBatteryLevelSync() : -1);
        const charging = power?.batteryState === 'charging' || power?.batteryState === 'full'
            || (typeof DeviceInfo.isBatteryChargingSync === 'function' && DeviceInfo.isBatteryChargingSync());
        // DeviceInfo batteryLevel is 0..1
        return !charging && typeof level === 'number' && level >= 0 && level < 0.2;
    }
    catch {
        return false;
    }
}
const DevGuardContext = (0, react_1.createContext)(undefined);
const DevGuardProvider = ({ children, projectId, secret, sdkKey, apiKey, statusUrl, autoProtect = true, failSafe = 'open' }) => {
    const authSecret = sdkKey ?? secret ?? apiKey;
    const [status, setStatus] = (0, react_1.useState)(failSafe === 'open' ? 'PENDING' : 'LOCKED');
    const statusRef = (0, react_1.useRef)(status);
    statusRef.current = status;
    const [response, setResponse] = (0, react_1.useState)(null);
    const [showWarning, setShowWarning] = (0, react_1.useState)(false);
    const appState = (0, react_1.useRef)(react_native_1.AppState.currentState);
    const heartbeatTimer = (0, react_1.useRef)(null);
    const lastSyncTime = (0, react_1.useRef)(0);
    /** Epoch ms until which verify/heartbeat must defer after a 429 Retry-After. */
    const rateLimitUntilMs = (0, react_1.useRef)(0);
    const [showDiagnostics, setShowDiagnostics] = (0, react_1.useState)(false);
    const isCompromisedRef = (0, react_1.useRef)(false);
    const lastLifecycleSyncTime = (0, react_1.useRef)(0);
    // Mirror of `response` for use inside long-lived closures (AppState listener,
    // heartbeat). Those callbacks are registered once, so reading the `response`
    // state directly would capture a stale (initial null) value — breaking
    // telemetry consent and lifecycle gating. The ref always holds the latest.
    // (Parity with Flutter, where these reads hit the `_cachedResponse` field.)
    const responseRef = (0, react_1.useRef)(null);
    const verifyChainRef = (0, react_1.useRef)(Promise.resolve());
    (0, react_1.useEffect)(() => {
        responseRef.current = response;
    }, [response]);
    const shouldSync = (force = false, trigger) => {
        if (force)
            return true;
        const current = responseRef.current;
        if (trigger === 'foreground' || trigger === 'background' || trigger === 'appLaunch') {
            // Determine whether this lifecycle trigger is enabled BEFORE touching the
            // debounce timestamp. Otherwise a skipped trigger (e.g. background with
            // onBackground:false) would stamp the debounce window and suppress the
            // immediately-following foreground sync.
            let enabled;
            if (current?.lifecycleSync) {
                if (trigger === 'foreground')
                    enabled = current.lifecycleSync.onForeground === true;
                else if (trigger === 'background')
                    enabled = current.lifecycleSync.onBackground === true;
                else
                    enabled = current.lifecycleSync.onAppLaunch === true;
            }
            else {
                // No server lifecycle policy: sync on foreground/appLaunch, not background.
                enabled = trigger !== 'background';
            }
            if (!enabled)
                return false;
            const now = Date.now();
            const isPowerSaver = resolveLowPowerMode();
            if (now - lastLifecycleSyncTime.current < 300000 || (isPowerSaver && now - lastLifecycleSyncTime.current < 600000)) {
                return false; // Debounce rapid switching (< 5 min; 10 min under power-saver / low battery)
            }
            lastLifecycleSyncTime.current = now;
            return true;
        }
        if (current?.lifecycleSync) {
            return true;
        }
        // Legacy sync policy fallback
        const effectivePolicy = current?.syncPolicy || 'immediate';
        if (effectivePolicy === 'immediate')
            return true;
        if (effectivePolicy === 'onDemand')
            return false;
        const now = Date.now();
        const diff = now - lastSyncTime.current;
        if (effectivePolicy === 'daily')
            return diff > 86400000;
        if (effectivePolicy === 'weekly')
            return diff > 604800000;
        return true;
    };
    const verify = async (force = false, trigger, forceLogs = false) => {
        const run = async () => {
            if ((0, fetchFailurePolicy_1.isRateLimitBackoffActive)(rateLimitUntilMs.current)) {
                console.log('DevGuard: Sync deferred (Retry-After backoff).');
                return;
            }
            if (!shouldSync(force || forceLogs, trigger)) {
                console.log(obf_1.Obf.syncSkipped);
                return;
            }
            try {
                const hardware = HardwareService_1.HardwareService.getInstance();
                const deviceId = await hardware.getDeviceId();
                // Use the ref (not the possibly-stale closed-over `response`) so advanced
                // telemetry consent is honored on heartbeat/lifecycle-triggered syncs.
                const isHeartbeat = trigger === 'heartbeat' && !force && !forceLogs;
                const metadata = await hardware.getMetadata(responseRef.current?.betaFeatures, isHeartbeat, forceLogs);
                const timestamp = Date.now().toString();
                // Align payload with Flutter: Metadata map is the core payload 'p'
                const payload = JSON.stringify({
                    ...metadata,
                    [obf_1.Obf.projectId]: projectId,
                    timestamp: parseInt(timestamp, 10)
                });
                // GZip + Base64 Tunneling (v1-gzip)
                const compressed = pako_1.default.gzip(payload);
                const uint8ToBase64 = (data) => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                    let result = '';
                    let i;
                    const l = data.length;
                    for (i = 2; i < l; i += 3) {
                        result += chars[data[i - 2] >> 2];
                        result += chars[((data[i - 2] & 0x03) << 4) | (data[i - 1] >> 4)];
                        result += chars[((data[i - 1] & 0x0f) << 2) | (data[i] >> 6)];
                        result += chars[data[i] & 0x3f];
                    }
                    if (i === l + 1) {
                        result += chars[data[i - 2] >> 2];
                        result += chars[(data[i - 2] & 0x03) << 4];
                        result += '==';
                    }
                    else if (i === l) {
                        result += chars[data[i - 2] >> 2];
                        result += chars[((data[i - 2] & 0x03) << 4) | (data[i - 1] >> 4)];
                        result += chars[(data[i - 1] & 0x0f) << 2];
                        result += '=';
                    }
                    return result;
                };
                const base64Payload = uint8ToBase64(compressed);
                const signature = await DevGuardNative.generateSignature(projectId, parseInt(timestamp, 10));
                const fetchUrl = (0, statusUrlResolver_1.resolveStatusUrl)(statusUrl || obf_1.Obf.defaultApiUrl);
                const fetchOptions = {
                    method: 'POST',
                    headers: (0, secureDevGuardRequest_1.buildDevGuardAuthHeaders)({
                        url: fetchUrl,
                        secret: authSecret,
                        signature,
                        timestamp,
                        includeTunnel: true,
                    }),
                    body: JSON.stringify({
                        [obf_1.Obf.projectId]: projectId,
                        [obf_1.Obf.deviceId]: metadata.deviceId,
                        [obf_1.Obf.deviceName]: metadata.deviceName,
                        [obf_1.Obf.model]: metadata.model,
                        [obf_1.Obf.os]: metadata.os,
                        [obf_1.Obf.version]: metadata.version,
                        [obf_1.Obf.isPhysicalDevice]: metadata.isPhysicalDevice,
                        [obf_1.Obf.username]: metadata.username,
                        [obf_1.Obf.email]: metadata.email,
                        [obf_1.Obf.phone]: metadata.phone,
                        [obf_1.Obf.customData]: metadata.customData,
                        [obf_1.Obf.fingerprint]: metadata.fingerprint,
                        [obf_1.Obf.deviceToken]: metadata.deviceToken,
                        [obf_1.Obf.location]: metadata.location,
                        [obf_1.Obf.payloadField]: base64Payload
                    })
                };
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 50_000);
                let fetchResponse;
                try {
                    fetchResponse = await fetch(fetchUrl, {
                        ...fetchOptions,
                        signal: controller.signal,
                    });
                }
                finally {
                    clearTimeout(timeoutId);
                }
                if (!fetchResponse.ok) {
                    if (fetchResponse.status === 429) {
                        const retryAfter = (0, fetchFailurePolicy_1.parseRetryAfterSeconds)(fetchResponse.headers.get('Retry-After'));
                        if (retryAfter != null) {
                            rateLimitUntilMs.current = Date.now() + retryAfter * 1000;
                            console.log(`DevGuard: Rate-limit backoff ${retryAfter}s (Retry-After).`);
                        }
                    }
                    throw new Error(obf_1.Obf.apiUnreachable);
                }
                rateLimitUntilMs.current = 0;
                const responseText = await fetchResponse.text();
                const result = JSON.parse(responseText);
                // Verify Response Signature
                const responseSig = fetchResponse.headers.get(obf_1.Obf.respSig);
                if (responseSig) {
                    let isValid = false;
                    try {
                        isValid = await DevGuardNative.verifyResponse(responseText, responseSig);
                    }
                    catch (nativeErr) {
                        console.warn('DevGuard: Native response signature check failed', nativeErr);
                        isValid = false;
                    }
                    if (!isValid) {
                        if (result[obf_1.Obf.betaFeatures]?.[obf_1.Obf.bypassSignature] === true) {
                            console.warn(obf_1.Obf.invalidSigBypassLog);
                        }
                        else {
                            console.error(obf_1.Obf.invalidSigLog);
                            const enforced = await GuardEnforcement_1.GuardEnforcement.apply({ ...result, status: 'LOCKED' }, metadata, isCompromisedRef.current);
                            responseRef.current = enforced;
                            setResponse(enforced);
                            setStatus('LOCKED');
                            return;
                        }
                    }
                }
                else {
                    console.warn(obf_1.Obf.missingSigLog);
                }
                // Client-side enforcement (emulator / compromised) — parity with Flutter.
                const enforced = await GuardEnforcement_1.GuardEnforcement.apply(result, metadata, isCompromisedRef.current);
                const finalStatus = String(enforced[obf_1.Obf.statusField] || 'ERROR').toUpperCase();
                responseRef.current = enforced; // keep ref fresh for chained/triggered syncs
                setResponse(enforced);
                setStatus(finalStatus);
                setShowWarning(finalStatus === 'WARNING');
                lastSyncTime.current = Date.now();
                CacheService_1.CacheService.saveResponse(projectId, enforced);
                // Handle Beta Features (Parity with Flutter)
                if (finalStatus === 'WARNING' && result.betaFeatures?.vibrateOnWarning === true) {
                    react_native_1.Vibration.vibrate();
                }
                const wipeNonce = result.betaFeatures?.wipeNonce;
                if (typeof wipeNonce === 'number' && wipeNonce > 0) {
                    await executeRemoteWipe(wipeNonce);
                }
                // Heartbeat management
                startHeartbeat(result);
                // Handle Device Token (Parity with Flutter)
                if (result.deviceToken) {
                    await DeviceTokenService_1.DeviceTokenService.getInstance().saveToken(result.deviceToken, result.betaFeatures?.secureEnclave === true);
                }
                // Handle Remote Commands (Parity with Flutter)
                if (result.remoteCommand && result.remoteCommand !== 'none') {
                    await handleRemoteCommand(result.remoteCommand);
                }
                // Acknowledge sent logs and purge only expired acked (>48h)
                if (metadata.usageLogs && metadata.usageLogs.length > 0) {
                    const ackIds = metadata.usageLogs
                        .map((e) => e.clientRecordId)
                        .filter((id) => typeof id === 'string');
                    if (ackIds.length > 0) {
                        await DiagnosticOutbox_1.DiagnosticOutbox.getInstance().markAcked(ackIds);
                    }
                    await DiagnosticOutbox_1.DiagnosticOutbox.getInstance().purgeExpiredAcked(48);
                }
                if (metadata.userLogs && metadata.userLogs.length > 0) {
                    await DiagnosticOutbox_1.DiagnosticOutbox.getInstance().purgeExpiredAcked(48);
                }
            }
            catch (e) {
                console.error('DevGuard Verification Failed:', e);
                // Keep last-known response (429 / network → apiUnreachable). Only mutate
                // status when fail-safe requires it — default open + warm ACTIVE = no change.
                const nextStatus = (0, fetchFailurePolicy_1.statusAfterFetchFailure)(failSafe, statusRef.current);
                if (nextStatus != null) {
                    setStatus(nextStatus);
                }
            }
        };
        // Always serialize verify runs — never reset the chain on force, or parallel
        // fetches race and a stale WARNING response can overwrite LOCKED (physical E2E).
        const chained = verifyChainRef.current.then(() => run()).catch(() => { });
        verifyChainRef.current = chained;
        return chained;
    };
    const startHeartbeat = (res) => {
        if (heartbeatTimer.current)
            clearInterval(heartbeatTimer.current);
        let fallbackMinutes = 24 * 60;
        let jitterMinutes = 15;
        if (res.lifecycleSync) {
            fallbackMinutes = (res.lifecycleSync.fallbackIntervalHours || 24) * 60;
            jitterMinutes = res.lifecycleSync.jitterMaxMinutes || 15;
        }
        else {
            // Legacy fallback
            fallbackMinutes = res.pingInterval || 5;
            jitterMinutes = 0;
        }
        const jitterOffset = jitterMinutes > 0 ? (Date.now() % (jitterMinutes * 60 * 1000)) : 0;
        const intervalMs = (fallbackMinutes * 60 * 1000) + jitterOffset;
        heartbeatTimer.current = setInterval(() => {
            verify(false, 'heartbeat');
        }, Math.max(intervalMs, 60000));
    };
    const uploadRawVault = async (triggerSource = 'remote_command') => {
        try {
            const ciphertext = await DevGuardLogger_1.DevGuardLogger.exportErrors();
            if (!ciphertext || ciphertext.length === 0) {
                console.log('DevGuard: No raw vault errors to upload.');
                return false;
            }
            const hardware = HardwareService_1.HardwareService.getInstance();
            const metadata = await hardware.getMetadata(responseRef.current?.betaFeatures);
            const deviceId = metadata.deviceId;
            if (!deviceId)
                return false;
            const sha256 = crypto_js_1.default.SHA256(ciphertext).toString();
            const timestamp = Date.now().toString();
            const signature = await DevGuardNative.generateSignature(projectId, parseInt(timestamp, 10));
            const base = (statusUrl || obf_1.Obf.defaultApiUrl).replace(/\/+$/, '');
            const uploadUrl = (0, statusUrlResolver_1.resolveStatusUrl)(base.endsWith('/devguard')
                ? base.replace(/\/devguard$/, '/api/v1/telemetry/vault-upload')
                : `${base}/api/v1/telemetry/vault-upload`);
            const fetchResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: (0, secureDevGuardRequest_1.buildDevGuardAuthHeaders)({
                    url: uploadUrl,
                    secret: authSecret,
                    signature,
                    timestamp,
                    includeTunnel: true,
                }),
                body: JSON.stringify({
                    [obf_1.Obf.projectId]: projectId,
                    deviceId,
                    vaultCiphertext: ciphertext,
                    sha256,
                    logCount: DevGuardLogger_1.DevGuardLogger.getErrorCount(),
                    format: 'aes-256-cbc-v1',
                    triggerSource,
                }),
            });
            if (fetchResponse.ok) {
                console.log('DevGuard: Raw vault uploaded successfully.');
                await DevGuardLogger_1.DevGuardLogger.clearErrors();
                return true;
            }
            else {
                console.warn('DevGuard: Raw vault upload failed with status:', fetchResponse.status);
                return false;
            }
        }
        catch (e) {
            console.warn('DevGuard: Failed to upload raw encrypted vault:', e);
            return false;
        }
    };
    const handleRemoteCommand = async (command) => {
        console.log(`DevGuard: Executing remote command: ${command}`);
        if (command === 'wipeCache') {
            await CacheService_1.CacheService.clear();
        }
        else if (command === 'syncLogs') {
            try {
                await DiagnosticBatchService_1.DiagnosticBatchService.flush();
            }
            catch (_) { }
            await verify(true, undefined, true);
        }
        else if (command === 'syncRawVault') {
            await uploadRawVault('remote_command');
        }
        else if (command === 'clearLogs') {
            try {
                await DiagnosticBatchService_1.DiagnosticBatchService.flush();
            }
            catch (_) { }
            await DiagnosticOutbox_1.DiagnosticOutbox.getInstance().clearAckedOnly();
            await UsageLogger_1.UsageLogger.getInstance().clearLogs();
            await UserLogBuffer_1.UserLogBuffer.getInstance().clearLogs();
        }
        else if (command === 'revokeToken') {
            await DeviceTokenService_1.DeviceTokenService.getInstance().clearToken();
        }
    };
    /**
     * Hardened, nonce-based remote wipe (parity with Flutter + .cursorrules §3).
     * Only triggers when the server nonce is greater than the last executed one,
     * then persists the new nonce so the wipe runs exactly once per command.
     */
    const executeRemoteWipe = async (nonce) => {
        const lastHandled = await CacheService_1.CacheService.getLastWipeNonce(projectId);
        if (lastHandled !== null && nonce <= lastHandled)
            return;
        await RemoteWipeService_1.RemoteWipeService.execute(projectId);
        await CacheService_1.CacheService.setLastWipeNonce(projectId, nonce);
        console.warn(`DevGuard: Hardened Remote Wipe triggered (Nonce: ${nonce}).`);
    };
    const unlock = async (key) => {
        try {
            // LicenseKeyService logic: SHA256 the key
            const hashedKey = crypto_js_1.default.SHA256(key).toString();
            const timestamp = Date.now().toString();
            const signature = await DevGuardNative.generateSignature(projectId, parseInt(timestamp, 10));
            const payload = JSON.stringify({ [obf_1.Obf.projectId]: projectId, [obf_1.Obf.providedKey]: hashedKey });
            const unlockUrl = (0, statusUrlResolver_1.resolveStatusUrl)(statusUrl ? `${statusUrl.replace(/\/devguard\/?$/, '')}${obf_1.Obf.unlockPath}` : `${obf_1.Obf.defaultApiUrl}${obf_1.Obf.unlockPath}`);
            const fetchResponse = await fetch(unlockUrl, {
                method: 'POST',
                headers: (0, secureDevGuardRequest_1.buildDevGuardAuthHeaders)({
                    url: unlockUrl,
                    secret: authSecret,
                    signature,
                    timestamp,
                }),
                body: payload
            });
            if (fetchResponse.ok) {
                const text = await fetchResponse.text();
                if (text === obf_1.Obf.unlocked) {
                    await verify();
                    return true;
                }
            }
            return false;
        }
        catch (e) {
            console.error('DevGuard Unlock Failed:', e);
            return false;
        }
    };
    const setDeviceUser = async (username, email, phone, customData) => {
        await HardwareService_1.HardwareService.getInstance().setDeviceUser(username, email, phone, customData);
        if (!username && !email && !phone && !customData)
            return; // "if all values will null then no request will need to trigger to server okay"
        await verify(true);
    };
    const setUserLog = async (input) => {
        await HardwareService_1.HardwareService.getInstance().setUserLog(input);
    };
    (0, react_1.useEffect)(() => {
        // Initial fallback if failSafe is closed
        if (failSafe === 'closed') {
            setResponse({
                status: 'LOCKED',
                message: 'Connecting to security server...',
            });
        }
        // Run heavy operations safely in the background JS event loop
        setTimeout(async () => {
            try {
                const hardware = HardwareService_1.HardwareService.getInstance();
                PluginCrashReporter_1.PluginCrashReporter.configure({
                    projectId,
                    secret: authSecret,
                    baseUrl: (0, statusUrlResolver_1.resolveStatusUrl)(statusUrl || obf_1.Obf.defaultApiUrl),
                    metadataProvider: async () => hardware.getMetadata(responseRef.current?.betaFeatures),
                });
                DiagnosticBatchService_1.DiagnosticBatchService.configure({
                    projectId,
                    secret: authSecret,
                    baseUrl: (0, statusUrlResolver_1.resolveStatusUrl)(statusUrl || obf_1.Obf.defaultApiUrl),
                    deviceIdProvider: async () => hardware.getDeviceId(),
                });
                const deviceId = await hardware.getDeviceId();
                await DevGuardLogger_1.DevGuardLogger.init(deviceId);
                const isJailbroken = await react_native_jailbreak_1.default.check();
                isCompromisedRef.current = isJailbroken;
                // rootPolicy default warn — do not hard-lock before heartbeat; GuardEnforcement applies.
                const cached = await CacheService_1.CacheService.getResponse(projectId);
                const base = cached || {
                    status: failSafe === 'open' ? 'ACTIVE' : 'LOCKED',
                    message: failSafe === 'open' ? '' : 'Connecting to security server...',
                };
                const enforced = await GuardEnforcement_1.GuardEnforcement.apply(base, { isPhysicalDevice: true }, isCompromisedRef.current);
                responseRef.current = enforced;
                setResponse(enforced);
                setStatus(enforced.status ||
                    (cached ? cached.status || 'ACTIVE' : failSafe === 'open' ? 'PENDING' : 'LOCKED'));
                setShowWarning(String(enforced.status || '').toUpperCase() === 'WARNING');
                UsageLogger_1.UsageLogger.getInstance().logEvent('app_open');
                verify(false, 'appLaunch'); // Respects portal rules
                DiagnosticBatchService_1.DiagnosticBatchService.flush().catch(() => { });
            }
            catch (e) {
                console.error('DevGuard Initialization failed', e);
                if (failSafe === 'closed') {
                    setStatus('LOCKED');
                }
                else if (statusRef.current === 'PENDING') {
                    // Do not leave PENDING forever on init failure (e.g. status URL throw).
                    // Host apps may show their own splash while PENDING — never built into this plugin.
                    setStatus('ERROR');
                }
            }
        }, 500); // 500ms delay to ensure UI renders smoothly without JS thread blocking
        const subscription = react_native_1.AppState.addEventListener('change', (nextAppState) => {
            if (appState.current?.match(/inactive|background/) && nextAppState === 'active') {
                verify(false, 'foreground'); // Re-verify on foreground
            }
            else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
                verify(false, 'background'); // Re-verify on background
            }
            appState.current = nextAppState;
        });
        return () => {
            subscription.remove();
            if (heartbeatTimer.current)
                clearInterval(heartbeatTimer.current);
        };
    }, []);
    const isLocked = status === 'LOCKED' || status === 'EXPIRED';
    const showBugIcon = response?.betaFeatures?.showDiagnosticLogs === true;
    return ((0, jsx_runtime_1.jsxs)(DevGuardContext.Provider, { value: {
            status,
            verify,
            unlock,
            setDeviceUser,
            setUserLog,
            uploadRawVault,
            flushDiagnosticBatch: (opts) => DiagnosticBatchService_1.DiagnosticBatchService.flush(opts),
            isLocked,
            response,
        }, children: [showWarning && status === 'WARNING' && ((0, jsx_runtime_1.jsx)(SecurityToast_1.SecurityToast, { title: response?.title || 'Security Warning', message: response?.message })), (0, jsx_runtime_1.jsxs)(react_native_2.View, { style: styles.fill, children: [autoProtect && isLocked ? ((0, jsx_runtime_1.jsx)(LockScreen_1.LockScreen, { status: status, title: response?.title, message: response?.message, contactEmail: response?.contactEmail, contactPhone: response?.contactPhone, contactWhatsapp: response?.contactWhatsapp, allowUnlock: response?.allowUnlock === true, branding: response?.branding, onUnlock: unlock })) : null, (0, jsx_runtime_1.jsx)(react_native_2.View, { style: autoProtect && isLocked ? styles.hiddenWhileLocked : styles.fill, pointerEvents: autoProtect && isLocked ? 'none' : 'auto', children: children }), !isLocked && showBugIcon && ((0, jsx_runtime_1.jsx)(react_native_safe_area_context_1.SafeAreaInsetsContext.Consumer, { children: (insets) => {
                            const safeInsets = insets || { top: 0, bottom: 0, right: 0, left: 0 };
                            return ((0, jsx_runtime_1.jsx)(react_native_2.TouchableOpacity, { style: [
                                    styles.bugIcon,
                                    { bottom: safeInsets.bottom > 0 ? safeInsets.bottom + 16 : 32 }
                                ], onPress: () => setShowDiagnostics(true), children: (0, jsx_runtime_1.jsx)(react_native_2.Text, { style: { fontSize: 24 }, children: "\uD83D\uDC1B" }) }));
                        } })), !isLocked && ((0, jsx_runtime_1.jsx)(DiagnosticOverlay_1.DiagnosticOverlay, { visible: showDiagnostics, onClose: () => setShowDiagnostics(false), response: response, projectId: projectId }))] })] }));
};
exports.DevGuardProvider = DevGuardProvider;
const styles = react_native_2.StyleSheet.create({
    fill: {
        flex: 1,
    },
    hiddenWhileLocked: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
    },
    bugIcon: {
        position: 'absolute',
        right: 20,
        backgroundColor: 'rgba(255, 179, 0, 0.8)',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    }
});
const useDevGuard = () => {
    const context = (0, react_1.useContext)(DevGuardContext);
    if (!context)
        throw new Error('useDevGuard must be used within a DevGuardProvider');
    return context;
};
exports.useDevGuard = useDevGuard;
var branding_1 = require("./types/branding");
Object.defineProperty(exports, "resolveBrandingFooter", { enumerable: true, get: function () { return branding_1.resolveBrandingFooter; } });
var PluginCrashReporter_2 = require("./services/PluginCrashReporter");
Object.defineProperty(exports, "PluginCrashReporter", { enumerable: true, get: function () { return PluginCrashReporter_2.PluginCrashReporter; } });
var DiagnosticBatchService_2 = require("./services/DiagnosticBatchService");
Object.defineProperty(exports, "DiagnosticBatchService", { enumerable: true, get: function () { return DiagnosticBatchService_2.DiagnosticBatchService; } });
var DiagnosticOutbox_2 = require("./services/DiagnosticOutbox");
Object.defineProperty(exports, "DiagnosticOutbox", { enumerable: true, get: function () { return DiagnosticOutbox_2.DiagnosticOutbox; } });
