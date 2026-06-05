"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardEnforcement = void 0;
/**
 * Client-side policy enforcement applied to a server response before it is
 * shown to the user. Mirrors the Flutter plugin's `GuardEnforcement` so both
 * platforms behave identically.
 */
class GuardEnforcement {
    /**
     * Applies enforcement rules to a fresh server response.
     *
     * - `blockEmulators`: if the project blocks emulators and the current device
     *   is not a physical device, the response is overridden to LOCKED.
     *
     * @param response The parsed server response (mutated copy returned).
     * @param metadata The device metadata collected for this sync.
     */
    static apply(response, metadata) {
        if (response?.blockEmulators === true && metadata?.isPhysicalDevice === false) {
            console.warn('DevGuard: Emulator blocked by project policy.');
            return {
                ...response,
                status: 'LOCKED',
                title: 'Emulator Detected',
                message: 'This application cannot run on emulators or simulators for security reasons.',
            };
        }
        return response;
    }
}
exports.GuardEnforcement = GuardEnforcement;
