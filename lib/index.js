"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDevGuard = exports.DevGuardProvider = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const crypto_js_1 = __importDefault(require("crypto-js"));
const pako_1 = __importDefault(require("pako"));
const HardwareService_1 = require("./services/HardwareService");
const LockScreen_1 = require("./components/LockScreen");
const SecurityToast_1 = require("./components/SecurityToast");
const UsageLogger_1 = require("./services/UsageLogger");
const DeviceTokenService_1 = require("./services/DeviceTokenService");
// @ts-ignore
const react_native_jailbreak_1 = __importDefault(require("react-native-jailbreak"));
const CacheService_1 = require("./services/CacheService");
const DiagnosticOverlay_1 = require("./components/DiagnosticOverlay");
const DevGuardLogger_1 = require("./services/DevGuardLogger");
const GuardEnforcement_1 = require("./services/GuardEnforcement");
const RemoteWipeService_1 = require("./services/RemoteWipeService");
const react_native_2 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const { DevGuard: DevGuardNative } = react_native_1.NativeModules;
const API_URL = 'https://api.devguard.uk/devguard';
const DevGuardContext = (0, react_1.createContext)(undefined);
const DevGuardProvider = ({ children, projectId, secret, apiKey, autoProtect = true, failSafe = 'open' }) => {
    const authSecret = secret ?? apiKey;
    const [status, setStatus] = (0, react_1.useState)(failSafe === 'open' ? 'PENDING' : 'LOCKED');
    const [response, setResponse] = (0, react_1.useState)(null);
    const [showWarning, setShowWarning] = (0, react_1.useState)(false);
    const appState = (0, react_1.useRef)(react_native_1.AppState.currentState);
    const heartbeatTimer = (0, react_1.useRef)(null);
    const lastSyncTime = (0, react_1.useRef)(0);
    const [showDiagnostics, setShowDiagnostics] = (0, react_1.useState)(false);
    const lastLifecycleSyncTime = (0, react_1.useRef)(0);
    // Mirror of `response` for use inside long-lived closures (AppState listener,
    // heartbeat). Those callbacks are registered once, so reading the `response`
    // state directly would capture a stale (initial null) value — breaking
    // telemetry consent and lifecycle gating. The ref always holds the latest.
    // (Parity with Flutter, where these reads hit the `_cachedResponse` field.)
    const responseRef = (0, react_1.useRef)(null);
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
    const verify = async (force = false, trigger) => {
        if (!shouldSync(force, trigger)) {
            console.log('DevGuard: Sync skipped due to policy.');
            return;
        }
        try {
            const hardware = HardwareService_1.HardwareService.getInstance();
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
                    }
                    else {
                        console.error('DevGuard: Response signature mismatch! Possible tampering detected.');
                        setStatus('LOCKED');
                        return;
                    }
                }
            }
            else {
                console.warn('DevGuard: Missing server response signature.');
            }
            // Client-side enforcement (e.g. blockEmulators) — parity with Flutter.
            const enforced = GuardEnforcement_1.GuardEnforcement.apply(result, metadata);
            const finalStatus = String(enforced.status || 'ERROR').toUpperCase();
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
            // Clear logs after successful sync
            if (metadata.usageLogs && metadata.usageLogs.length > 0) {
                await UsageLogger_1.UsageLogger.getInstance().clearLogs();
            }
        }
        catch (e) {
            console.error('DevGuard Verification Failed:', e);
            if (failSafe === 'open' && status === 'PENDING') {
                setStatus('ACTIVE');
            }
            else if (failSafe === 'closed') {
                setStatus('LOCKED');
            }
        }
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
    const handleRemoteCommand = async (command) => {
        console.log(`DevGuard: Executing remote command: ${command}`);
        if (command === 'wipeCache') {
            await CacheService_1.CacheService.clear();
        }
        else if (command === 'syncLogs') {
            await verify(true);
        }
        else if (command === 'clearLogs') {
            await UsageLogger_1.UsageLogger.getInstance().clearLogs();
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
                const deviceId = await HardwareService_1.HardwareService.getInstance().getDeviceId();
                await DevGuardLogger_1.DevGuardLogger.init(deviceId);
                const isJailbroken = await react_native_jailbreak_1.default.check();
                if (isJailbroken) {
                    console.warn('DevGuard Security Alert: Compromised device detected.');
                    setResponse({
                        status: 'LOCKED',
                        title: 'Security Alert',
                        message: 'This application cannot run on jailbroken or rooted devices for security reasons.',
                    });
                    setStatus('LOCKED');
                    return;
                }
                const cached = await CacheService_1.CacheService.getResponse(projectId);
                if (cached) {
                    responseRef.current = cached; // ensure the immediate appLaunch sync honors cached consent
                    setResponse(cached);
                    setStatus(cached.status || 'ACTIVE');
                    setShowWarning(cached.status === 'WARNING');
                }
                else {
                    // Fallback if no cache
                    setResponse({
                        status: failSafe === 'open' ? 'ACTIVE' : 'LOCKED',
                        message: failSafe === 'open' ? '' : 'Connecting to security server...',
                    });
                    setStatus(failSafe === 'open' ? 'PENDING' : 'LOCKED');
                }
                UsageLogger_1.UsageLogger.getInstance().logEvent('app_open');
                verify(false, 'appLaunch'); // Respects portal rules
            }
            catch (e) {
                console.error('DevGuard Initialization failed', e);
                if (failSafe === 'closed') {
                    setStatus('LOCKED');
                }
            }
        }, 500); // 500ms delay to ensure UI renders smoothly without JS thread blocking
        const subscription = react_native_1.AppState.addEventListener('change', (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
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
    return ((0, jsx_runtime_1.jsxs)(DevGuardContext.Provider, { value: { status, verify, unlock, setDeviceUser, isLocked, response }, children: [showWarning && status === 'WARNING' && ((0, jsx_runtime_1.jsx)(SecurityToast_1.SecurityToast, { title: response?.title || 'Security Warning', message: response?.message })), autoProtect && isLocked ? ((0, jsx_runtime_1.jsx)(LockScreen_1.LockScreen, { status: status, title: response?.title, message: response?.message, contactEmail: response?.contactEmail, contactPhone: response?.contactPhone, contactWhatsapp: response?.contactWhatsapp, allowUnlock: response?.allowUnlock, onUnlock: unlock })) : ((0, jsx_runtime_1.jsxs)(react_native_2.View, { style: { flex: 1 }, children: [children, showBugIcon && ((0, jsx_runtime_1.jsx)(react_native_safe_area_context_1.SafeAreaInsetsContext.Consumer, { children: (insets) => {
                            const safeInsets = insets || { top: 0, bottom: 0, right: 0, left: 0 };
                            return ((0, jsx_runtime_1.jsx)(react_native_2.TouchableOpacity, { style: [
                                    styles.bugIcon,
                                    { bottom: safeInsets.bottom > 0 ? safeInsets.bottom + 16 : 32 }
                                ], onPress: () => setShowDiagnostics(true), children: (0, jsx_runtime_1.jsx)(react_native_2.Text, { style: { fontSize: 24 }, children: "\uD83D\uDC1B" }) }));
                        } })), (0, jsx_runtime_1.jsx)(DiagnosticOverlay_1.DiagnosticOverlay, { visible: showDiagnostics, onClose: () => setShowDiagnostics(false), response: response, projectId: projectId })] }))] }));
};
exports.DevGuardProvider = DevGuardProvider;
const styles = react_native_2.StyleSheet.create({
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
