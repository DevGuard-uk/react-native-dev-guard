"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteWipeService = void 0;
const CacheService_1 = require("./CacheService");
const UsageLogger_1 = require("./UsageLogger");
const DevGuardLogger_1 = require("./DevGuardLogger");
const DeviceTokenService_1 = require("./DeviceTokenService");
const HardwareService_1 = require("./HardwareService");
/**
 * Performs a hardened remote wipe of all local DevGuard security state.
 * Mirrors the Flutter plugin's `RemoteWipeService` so a wipe clears the same
 * surface on both platforms (not just the response cache).
 */
class RemoteWipeService {
    /**
     * Clears local security state:
     * - cached server response,
     * - buffered usage logs,
     * - encrypted vault diagnostics (info + errors),
     * - stored device-user identity (username/email/phone/customData).
     *
     * @param projectId The project whose cache should be cleared.
     * @param options.revokeToken Also clear the device registration token.
     */
    static async execute(projectId, options = {}) {
        await CacheService_1.CacheService.clear();
        await UsageLogger_1.UsageLogger.getInstance().clearLogs();
        try {
            await DevGuardLogger_1.DevGuardLogger.clearAll();
        }
        catch (e) {
            // Vault logger may not be initialized — ignore.
        }
        try {
            await HardwareService_1.HardwareService.getInstance().clearDeviceUser();
        }
        catch (e) {
            // Ignore cleanup errors.
        }
        if (options.revokeToken) {
            await DeviceTokenService_1.DeviceTokenService.getInstance().clearToken();
        }
    }
}
exports.RemoteWipeService = RemoteWipeService;
