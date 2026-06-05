import { CacheService } from './CacheService';
import { UsageLogger } from './UsageLogger';
import { DevGuardLogger } from './DevGuardLogger';
import { DeviceTokenService } from './DeviceTokenService';
import { HardwareService } from './HardwareService';

/**
 * Performs a hardened remote wipe of all local DevGuard security state.
 * Mirrors the Flutter plugin's `RemoteWipeService` so a wipe clears the same
 * surface on both platforms (not just the response cache).
 */
export class RemoteWipeService {
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
  static async execute(
    projectId: string,
    options: { revokeToken?: boolean } = {}
  ): Promise<void> {
    await CacheService.clear();
    await UsageLogger.getInstance().clearLogs();

    try {
      await DevGuardLogger.clearAll();
    } catch (e) {
      // Vault logger may not be initialized — ignore.
    }

    try {
      await HardwareService.getInstance().clearDeviceUser();
    } catch (e) {
      // Ignore cleanup errors.
    }

    if (options.revokeToken) {
      await DeviceTokenService.getInstance().clearToken();
    }
  }
}
