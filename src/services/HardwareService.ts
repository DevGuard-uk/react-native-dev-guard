import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

import { UsageLogger } from './UsageLogger';
import { DeviceTokenService } from './DeviceTokenService';

export class HardwareService {
  private static instance: HardwareService;
  private deviceId: string | null = null;

  private constructor() {}

  public static getInstance(): HardwareService {
    if (!HardwareService.instance) {
      HardwareService.instance = new HardwareService();
    }
    return HardwareService.instance;
  }

  public async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;

    try {
      const id = await DeviceInfo.getUniqueId();
      if (id && id !== 'unknown') {
        this.deviceId = id;
        return id;
      }
    } catch (e) {
      console.warn('DevGuard: Native DeviceInfo failed, falling back to fingerprint');
    }

    const fingerprint = [
      Platform.OS,
      Platform.Version,
      DeviceInfo.getBrand(),
      DeviceInfo.getModel(),
      DeviceInfo.getSystemName(),
      DeviceInfo.getBundleId(),
    ].join('|');

    this.deviceId = CryptoJS.SHA256(fingerprint).toString().substring(0, 16);
    return this.deviceId;
  }

  public async setDeviceUser(username?: string, email?: string, phone?: string, customData?: Record<string, any>): Promise<void> {
    try {
      const userData = JSON.stringify({ username, email, phone, customData });
      await Keychain.setGenericPassword(
        'devguard_user_info',
        userData,
        { service: 'devguard.user.service' }
      );
    } catch (e) {
      console.warn('DevGuard: Failed to save user info', e);
    }
  }

  /** Clears stored device-user identity (username, email, phone, customData). */
  public async clearDeviceUser(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: 'devguard.user.service' });
    } catch (e) {
      // Ignore cleanup errors
    }
    try {
      await Keychain.resetGenericPassword({ service: 'devguard.username.service' });
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  public async getMetadata(betaFeatures: any = {}): Promise<any> {
    console.log('DevGuard: Collecting Hardware Metadata...');
    
    const isEmulator = await DeviceInfo.isEmulator();
    const deviceId = await this.getDeviceId();
    const model = DeviceInfo.getModel();
    const os = `${Platform.OS} ${Platform.Version}`;

    const usageLogger = UsageLogger.getInstance();
    const tokenService = DeviceTokenService.getInstance();

    let username, email, phone, customData;
    try {
      const credentials = await Keychain.getGenericPassword({ service: 'devguard.user.service' });
      if (credentials) {
        const parsed = JSON.parse(credentials.password);
        username = parsed.username;
        email = parsed.email;
        phone = parsed.phone;
        customData = parsed.customData;
      } else {
        // Fallback to older generic password entry
        const oldCreds = await Keychain.getGenericPassword({ service: 'devguard.username.service' });
        if (oldCreds) username = oldCreds.password;
      }
    } catch (e) {
      // Ignore
    }

    const isAdvanced = betaFeatures?.advancedTelemetry === true;

    const metadata: Record<string, any> = {
      deviceId,
      deviceName: await DeviceInfo.getDeviceName(),
      model: model,
      brand: DeviceInfo.getBrand(),
      os: os,
      osVersion: Platform.Version,
      version: DeviceInfo.getVersion(),
      bundleId: DeviceInfo.getBundleId(),
      isTablet: DeviceInfo.isTablet(),
      isEmulator: isEmulator,
      isPhysicalDevice: !isEmulator,
      username: username,
      email: email,
      phone: phone,
      customData: customData,
      networkType: isAdvanced ? await this.getNetworkType() : 'REDACTED',
      fingerprint: DeviceTokenService.generateFingerprint(deviceId, model, os),
      deviceToken: await tokenService.getToken(),
      usageLogs: await usageLogger.getLogs(),
    };

    // Advanced telemetry MUST be emitted as FLAT string fields (battery / ram /
    // storage / batteryCharging / batteryThermal) to match the Flutter plugin's
    // DeviceMetadata shape. The admin "Health (Beta)" view reads these flat keys
    // (displayData.battery / .ram / .storage); the old nested objects
    // (ram.total, health.batteryLevel) were unreadable and rendered "No telemetry".
    if (isAdvanced) {
      Object.assign(metadata, await this.collectAdvancedTelemetry());
    }

    return metadata;
  }

  private async getNetworkType(): Promise<string> {
    try {
      const carrier = await DeviceInfo.getCarrier();
      if (carrier && carrier.trim() && carrier.toLowerCase() !== 'unknown') {
        return carrier;
      }
    } catch (e) {
      // Ignore — fall through to default.
    }
    return 'WiFi';
  }

  /**
   * Collects advanced hardware telemetry as FLAT string fields, matching the
   * Flutter plugin (battery/batteryCharging/batteryThermal/ram/storage) so the
   * admin panel renders Health (Beta) identically on both platforms.
   * Each metric is collected independently so one failure never blocks the rest.
   */
  private async collectAdvancedTelemetry(): Promise<Record<string, any>> {
    const out: Record<string, any> = { batteryThermal: 'NORMAL' };

    try {
      const mem = await DeviceInfo.getTotalMemory();
      if (typeof mem === 'number' && mem > 0) {
        out.ram = `${(mem / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      }
    } catch (e) {
      // Ignore individual metric failure.
    }

    try {
      const total = await DeviceInfo.getTotalDiskCapacity();
      if (typeof total === 'number' && total > 0) {
        out.storage = `${(total / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      }
    } catch (e) {
      // Ignore individual metric failure.
    }

    try {
      // getBatteryLevel returns 0..1, or -1 when unavailable (e.g. simulator).
      const level = await DeviceInfo.getBatteryLevel();
      if (typeof level === 'number' && level >= 0) {
        out.battery = `${Math.round(level * 100)}%`;
      }
    } catch (e) {
      // Ignore individual metric failure.
    }

    try {
      const charging = await DeviceInfo.isBatteryCharging();
      out.batteryCharging = charging ? 'charging' : 'discharging';
    } catch (e) {
      // Ignore individual metric failure.
    }

    return out;
  }
}
