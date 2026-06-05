import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { NativeModules, AppState, AppStateStatus, Vibration } from 'react-native';
import CryptoJS from 'crypto-js';
import pako from 'pako';
import { HardwareService } from './services/HardwareService';
import { LockScreen } from './components/LockScreen';
import { SecurityToast } from './components/SecurityToast';
import { UsageLogger } from './services/UsageLogger';
import { DeviceTokenService } from './services/DeviceTokenService';
// @ts-ignore
import Jailbreak from 'react-native-jailbreak';
import { CacheService } from './services/CacheService';
import { DiagnosticOverlay } from './components/DiagnosticOverlay';
import { DevGuardLogger } from './services/DevGuardLogger';
import { GuardEnforcement } from './services/GuardEnforcement';
import { RemoteWipeService } from './services/RemoteWipeService';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
const { DevGuard: DevGuardNative } = NativeModules;

const API_URL = 'https://api.devguard.uk/devguard';

export type GuardStatus = 'LOCKED' | 'ACTIVE' | 'PENDING' | 'ERROR' | 'EXPIRED' | 'WARNING';

interface GuardResponse {
  status: GuardStatus;
  message?: string;
  title?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  allowUnlock?: boolean;
  config?: any;
  lifecycleSync?: {
    onAppLaunch: boolean;
    onForeground: boolean;
    onBackground: boolean;
    fallbackIntervalHours: number;
    jitterMaxMinutes: number;
  };
  remoteCommand?: string;
  deviceToken?: string;
  betaFeatures?: any;
  deviceTracking?: boolean;
  diagnosticPasscodeHash?: string;
  /** Server-defined heartbeat interval (minutes) — legacy fallback when lifecycleSync is absent. */
  pingInterval?: number;
  /** Legacy heartbeat sync policy. */
  syncPolicy?: SyncPolicy;
  /** When true, the client locks on emulators/simulators (non-physical devices). */
  blockEmulators?: boolean;
}

interface DevGuardContextType {
  status: GuardStatus;
  verify: () => Promise<void>;
  unlock: (key: string) => Promise<boolean>;
  setDeviceUser: (username?: string, email?: string, phone?: string, customData?: Record<string, any>) => Promise<void>;
  isLocked: boolean;
  response: GuardResponse | null;
}

export type FailSafe = 'open' | 'closed';
export type SyncPolicy = 'immediate' | 'onDemand' | 'daily' | 'weekly';

const DevGuardContext = createContext<DevGuardContextType | undefined>(undefined);

export const DevGuardProvider: React.FC<{ 
  children: React.ReactNode; 
  projectId: string;
  /** Your account Master Secret (Settings → Master Secret). */
  secret?: string;
  /** @deprecated Use `secret` (Settings → Master Secret) instead. */
  apiKey?: string;
  autoProtect?: boolean;
  failSafe?: FailSafe;
}> = ({ 
  children, 
  projectId,
  secret,
  apiKey,
  autoProtect = true,
  failSafe = 'open'
}: { 
  children: React.ReactNode; 
  projectId: string;
  secret?: string;
  /** @deprecated Use `secret` (Settings → Master Secret) instead. */
  apiKey?: string;
  autoProtect?: boolean;
  failSafe?: FailSafe;
}) => {
  const authSecret = secret ?? apiKey;
  const [status, setStatus] = useState<GuardStatus>(failSafe === 'open' ? 'PENDING' : 'LOCKED');
  const [response, setResponse] = useState<GuardResponse | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const appState = useRef(AppState.currentState);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTime = useRef<number>(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const lastLifecycleSyncTime = useRef<number>(0);

  // Latest response for long-lived closures (AppState listener, heartbeat).
  const responseRef = useRef<GuardResponse | null>(null);
  useEffect(() => {
    responseRef.current = response;
  }, [response]);

  const shouldSync = (force: boolean = false, trigger?: 'foreground' | 'background' | 'appLaunch' | 'heartbeat'): boolean => {
    if (force) return true;

    const current = responseRef.current;

    if (trigger === 'foreground' || trigger === 'background' || trigger === 'appLaunch') {
      // Determine whether this lifecycle trigger is enabled BEFORE touching the
      // debounce timestamp. Otherwise a skipped trigger (e.g. background with
      // onBackground:false) would stamp the debounce window and suppress the
      // immediately-following foreground sync.
      let enabled: boolean;
      if (current?.lifecycleSync) {
        if (trigger === 'foreground') enabled = current.lifecycleSync.onForeground === true;
        else if (trigger === 'background') enabled = current.lifecycleSync.onBackground === true;
        else enabled = current.lifecycleSync.onAppLaunch === true;
      } else {
        // No server lifecycle policy: sync on foreground/appLaunch, not background.
        enabled = trigger !== 'background';
      }

      if (!enabled) return false;

      const now = Date.now();
      if (now - lastLifecycleSyncTime.current < 60000) {
        return false; // Debounce rapid switching (< 1 min)
      }
      lastLifecycleSyncTime.current = now;
      return true;
    }

    if (current?.lifecycleSync) {
      return true;
    }

    // Legacy sync policy fallback
    const effectivePolicy = current?.syncPolicy || 'immediate';
    if (effectivePolicy === 'immediate') return true;
    if (effectivePolicy === 'onDemand') return false;

    const now = Date.now();
    const diff = now - lastSyncTime.current;

    if (effectivePolicy === 'daily') return diff > 86400000;
    if (effectivePolicy === 'weekly') return diff > 604800000;

    return true;
  };

  const verify = async (force: boolean = false, trigger?: 'foreground' | 'background' | 'appLaunch' | 'heartbeat') => {
    if (!shouldSync(force, trigger)) {
      console.log('DevGuard: Sync skipped due to policy.');
      return;
    }

    try {
      const hardware = HardwareService.getInstance();
      const deviceId = await hardware.getDeviceId();
      // Use the ref (not the possibly-stale closed-over `response`) so advanced
      // telemetry consent is honored on heartbeat/lifecycle-triggered syncs.
      const metadata = await hardware.getMetadata(responseRef.current?.betaFeatures);

      const timestamp = Date.now().toString();
      
      // Align payload with Flutter: Metadata map is the core payload 'p'
      const payload = JSON.stringify({
        ...metadata,
        projectId,
        timestamp: parseInt(timestamp, 10)
      });

      // GZip + Base64 Tunneling (v1-gzip)
      const compressed = pako.gzip(payload);
      
      const uint8ToBase64 = (data: Uint8Array) => {
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
        } else if (i === l) {
          result += chars[data[i - 2] >> 2];
          result += chars[((data[i - 2] & 0x03) << 4) | (data[i - 1] >> 4)];
          result += chars[(data[i - 1] & 0x0f) << 2];
          result += '=';
        }
        return result;
      };

      const base64Payload = uint8ToBase64(compressed);

      const signature = await DevGuardNative.generateSignature(projectId, parseInt(timestamp, 10));

      const fetchUrl = API_URL;
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DevGuard-Signature': signature,
          'X-DevGuard-Timestamp': timestamp,
          'X-DevGuard-Tunnel': 'v1-gzip',
          ...(authSecret ? { 'X-DevGuard-API-Key': authSecret } : {})
        },
        body: JSON.stringify({ 
          projectId,
          deviceId: metadata.deviceId,
          deviceName: metadata.deviceName,
          model: metadata.model,
          os: metadata.os,
          version: metadata.version,
          isPhysicalDevice: metadata.isPhysicalDevice,
          username: metadata.username,
          email: metadata.email,
          phone: metadata.phone,
          customData: metadata.customData,
          fingerprint: metadata.fingerprint,
          deviceToken: metadata.deviceToken,
          location: metadata.location,
          p: base64Payload
        })
      };
      
      
      
      const fetchResponse = await fetch(fetchUrl, fetchOptions);

      if (!fetchResponse.ok) {
        throw new Error('API_UNREACHABLE');
      }

      const responseText = await fetchResponse.text();
      const result = JSON.parse(responseText);
      
      // Verify Response Signature
      const responseSig = fetchResponse.headers.get('X-DevGuard-Response-Signature');

      if (responseSig) {
        const isValid = await DevGuardNative.verifyResponse(responseText, responseSig);
        if (!isValid) {
          if (result.betaFeatures?.bypassSignature === true) {
            console.warn('DevGuard: Response signature mismatch, but bypassSignature is ACTIVE.');
          } else {
            console.error('DevGuard: Response signature mismatch! Possible tampering detected.');
            setStatus('LOCKED');
            return;
          }
        }
      } else {
        console.warn('DevGuard: Missing server response signature.');
      }

      // Client-side enforcement (e.g. blockEmulators).
      const enforced = GuardEnforcement.apply(result, metadata);

      const finalStatus = String(enforced.status || 'ERROR').toUpperCase() as GuardStatus;

      responseRef.current = enforced; // keep ref fresh for chained/triggered syncs
      setResponse(enforced);
      setStatus(finalStatus);
      setShowWarning(finalStatus === 'WARNING');
      lastSyncTime.current = Date.now();
      
      CacheService.saveResponse(projectId, enforced);

      // Handle beta features from server response
      if (finalStatus === 'WARNING' && result.betaFeatures?.vibrateOnWarning === true) {
        Vibration.vibrate();
      }

      const wipeNonce = result.betaFeatures?.wipeNonce;
      if (typeof wipeNonce === 'number' && wipeNonce > 0) {
        await executeRemoteWipe(wipeNonce);
      }

      // Heartbeat management
      startHeartbeat(result);

      // Persist server-issued device token
      if (result.deviceToken) {
        await DeviceTokenService.getInstance().saveToken(
          result.deviceToken,
          result.betaFeatures?.secureEnclave === true
        );
      }

      // Handle remote commands from server
      if (result.remoteCommand && result.remoteCommand !== 'none') {
        await handleRemoteCommand(result.remoteCommand);
      }

      // Clear logs after successful sync
      if (metadata.usageLogs && metadata.usageLogs.length > 0) {
        await UsageLogger.getInstance().clearLogs();
      }

    } catch (e) {
      console.error('DevGuard Verification Failed:', e);
      if (failSafe === 'open' && status === 'PENDING') {
        setStatus('ACTIVE');
      } else if (failSafe === 'closed') {
        setStatus('LOCKED');
      }
    }
  };

  const startHeartbeat = (res: GuardResponse) => {
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    
    let fallbackMinutes = 24 * 60;
    let jitterMinutes = 15;
    
    if (res.lifecycleSync) {
       fallbackMinutes = (res.lifecycleSync.fallbackIntervalHours || 24) * 60;
       jitterMinutes = res.lifecycleSync.jitterMaxMinutes || 15;
    } else {
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

  const handleRemoteCommand = async (command: string) => {
    console.log(`DevGuard: Executing remote command: ${command}`);
    if (command === 'wipeCache') {
      await CacheService.clear();
    } else if (command === 'syncLogs') {
      await verify(true);
    } else if (command === 'clearLogs') {
      await UsageLogger.getInstance().clearLogs();
    } else if (command === 'revokeToken') {
      await DeviceTokenService.getInstance().clearToken();
    }
  };

  /** Nonce-based remote wipe — runs once per server command. */
  const executeRemoteWipe = async (nonce: number) => {
    const lastHandled = await CacheService.getLastWipeNonce(projectId);
    if (lastHandled !== null && nonce <= lastHandled) return;

    await RemoteWipeService.execute(projectId);
    await CacheService.setLastWipeNonce(projectId, nonce);
    console.warn(`DevGuard: Hardened Remote Wipe triggered (Nonce: ${nonce}).`);
  };

  const unlock = async (key: string): Promise<boolean> => {
    try {
      // LicenseKeyService logic: SHA256 the key
      const hashedKey = CryptoJS.SHA256(key).toString();
      
      const timestamp = Date.now().toString();
      const signature = await DevGuardNative.generateSignature(projectId, parseInt(timestamp, 10));

      const payload = JSON.stringify({ projectId, providedKey: hashedKey });

      const fetchResponse = await fetch(`${API_URL}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DevGuard-Signature': signature,
          'X-DevGuard-Timestamp': timestamp,
          ...(authSecret ? { 'X-DevGuard-API-Key': authSecret } : {})
        },
        body: payload
      });

      if (fetchResponse.ok) {
        const text = await fetchResponse.text();
        if (text === 'Unlocked') {
          await verify();
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('DevGuard Unlock Failed:', e);
      return false;
    }
  };

  const setDeviceUser = async (username?: string, email?: string, phone?: string, customData?: Record<string, any>): Promise<void> => {
    await HardwareService.getInstance().setDeviceUser(username, email, phone, customData);
    if (!username && !email && !phone && !customData) return;
    await verify(true);
  };

  useEffect(() => {
    // Initial fallback if failSafe is closed
    if (failSafe === 'closed') {
      setResponse({
        status: 'LOCKED',
        message: 'Connecting to security server...',
      } as GuardResponse);
    }

    // Run heavy operations safely in the background JS event loop
    setTimeout(async () => {
      try {
        await DevGuardLogger.init();
        
        const isJailbroken = await Jailbreak.check();
        if (isJailbroken) {
          console.warn('DevGuard Security Alert: Compromised device detected.');
          setResponse({
            status: 'LOCKED',
            title: 'Security Alert',
            message: 'This application cannot run on jailbroken or rooted devices for security reasons.',
          } as GuardResponse);
          setStatus('LOCKED');
          return;
        }

        const cached = await CacheService.getResponse(projectId);
        if (cached) {
          responseRef.current = cached; // ensure the immediate appLaunch sync honors cached consent
          setResponse(cached);
          setStatus(cached.status || 'ACTIVE');
          setShowWarning(cached.status === 'WARNING');
        } else {
          // Fallback if no cache
          setResponse({
            status: failSafe === 'open' ? 'ACTIVE' : 'LOCKED',
            message: failSafe === 'open' ? '' : 'Connecting to security server...',
          } as GuardResponse);
          setStatus(failSafe === 'open' ? 'PENDING' : 'LOCKED');
        }

        UsageLogger.getInstance().logEvent('app_open');
        verify(false, 'appLaunch'); // Respects portal rules
      } catch (e) {
        console.error('DevGuard Initialization failed', e);
        if (failSafe === 'closed') {
          setStatus('LOCKED');
        }
      }
    }, 500); // 500ms delay to ensure UI renders smoothly without JS thread blocking

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        verify(false, 'foreground'); // Re-verify on foreground
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        verify(false, 'background'); // Re-verify on background
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, []);

  const isLocked = status === 'LOCKED' || status === 'EXPIRED';

  const showBugIcon = response?.betaFeatures?.showDiagnosticLogs === true;

  return (
    <DevGuardContext.Provider value={{ status, verify, unlock, setDeviceUser, isLocked, response }}>
      {showWarning && status === 'WARNING' && (
        <SecurityToast 
          title={response?.title || 'Security Warning'}
          message={response?.message}
        />
      )}
      {autoProtect && isLocked ? (
        <LockScreen 
          status={status}
          title={response?.title}
          message={response?.message}
          contactEmail={response?.contactEmail}
          contactPhone={response?.contactPhone}
          contactWhatsapp={response?.contactWhatsapp}
          allowUnlock={response?.allowUnlock}
          onUnlock={unlock}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {children}
          {showBugIcon && (
            <SafeAreaInsetsContext.Consumer>
              {(insets) => {
                const safeInsets = insets || { top: 0, bottom: 0, right: 0, left: 0 };
                return (
                  <TouchableOpacity 
                    style={[
                      styles.bugIcon, 
                      { bottom: safeInsets.bottom > 0 ? safeInsets.bottom + 16 : 32 }
                    ]} 
                    onPress={() => setShowDiagnostics(true)}
                  >
                    <Text style={{ fontSize: 24 }}>🐛</Text>
                  </TouchableOpacity>
                );
              }}
            </SafeAreaInsetsContext.Consumer>
          )}
          <DiagnosticOverlay 
            visible={showDiagnostics}
            onClose={() => setShowDiagnostics(false)}
            response={response}
            projectId={projectId}
          />
        </View>
      )}
    </DevGuardContext.Provider>
  );
};

const styles = StyleSheet.create({
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

export const useDevGuard = () => {
  const context = useContext(DevGuardContext);
  if (!context) throw new Error('useDevGuard must be used within a DevGuardProvider');
  return context;
};
