"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardEnforcement = void 0;
const react_native_1 = require("react-native");
const obf_1 = require("../internal/obf");
const { DevGuard: DevGuardNative } = react_native_1.NativeModules;
function normalizeRootPolicy(value) {
    return value === 'block' ? 'block' : 'warn';
}
/**
 * Client-side policy enforcement applied to a server response before it is
 * shown to the user. Mirrors Flutter `GuardEnforcement` + native `dg_e1`.
 *
 * Heartbeat `rootPolicy`: `warn` (default) → WARNING banner; `block` → LOCKED.
 */
class GuardEnforcement {
    static async evaluatePolicy(blockEmulators, isPhysicalDevice, isCompromised) {
        if (typeof DevGuardNative?.evaluatePolicy === 'function') {
            try {
                return await DevGuardNative.evaluatePolicy(blockEmulators, isPhysicalDevice, isCompromised);
            }
            catch {
                // Fall through to JS fallback when native bridge unavailable (e.g. tests).
            }
        }
        if (isCompromised)
            return obf_1.PolicyLock.compromised;
        if (blockEmulators && !isPhysicalDevice)
            return obf_1.PolicyLock.emulator;
        return obf_1.PolicyLock.allow;
    }
    static async apply(response, metadata, isCompromised = false) {
        const isPhysical = metadata?.isPhysicalDevice !== false;
        const rootPolicy = normalizeRootPolicy(response?.rootPolicy);
        if (isCompromised) {
            if (rootPolicy === 'block') {
                const code = await this.evaluatePolicy(false, isPhysical, true);
                if (code === obf_1.PolicyLock.compromised) {
                    console.warn(obf_1.Obf.compromisedLog);
                    return {
                        ...response,
                        status: 'LOCKED',
                        title: obf_1.Obf.securityTitle,
                        message: obf_1.Obf.compromisedMessage,
                    };
                }
            }
            else {
                const status = String(response?.status || '').toUpperCase();
                if (status !== 'LOCKED') {
                    console.warn(obf_1.Obf.compromisedLog);
                    return {
                        ...response,
                        status: 'WARNING',
                        title: obf_1.Obf.securityTitle,
                        message: obf_1.Obf.compromisedMessage,
                    };
                }
            }
        }
        const code = await this.evaluatePolicy(response?.blockEmulators === true, isPhysical, false);
        if (code === obf_1.PolicyLock.emulator) {
            console.warn('DevGuard: Emulator blocked by project policy.');
            return {
                ...response,
                status: 'LOCKED',
                title: obf_1.Obf.emulatorTitle,
                message: obf_1.Obf.emulatorMessage,
            };
        }
        return response;
    }
}
exports.GuardEnforcement = GuardEnforcement;
