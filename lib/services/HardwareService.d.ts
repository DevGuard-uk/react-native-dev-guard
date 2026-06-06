export declare class HardwareService {
    private static instance;
    private deviceId;
    private constructor();
    static getInstance(): HardwareService;
    getDeviceId(): Promise<string>;
    setDeviceUser(username?: string, email?: string, phone?: string, customData?: Record<string, any>): Promise<void>;
    /**
     * Clears all stored device-user identity (username/email/phone/customData).
     * Used by the hardened remote wipe (parity with Flutter's
     * SecureStorageService.deleteAllDeviceUserKeys).
     */
    clearDeviceUser(): Promise<void>;
    getMetadata(betaFeatures?: any): Promise<any>;
    private getNetworkType;
    /**
     * Collects advanced hardware telemetry as FLAT string fields, matching the
     * Flutter plugin (battery/batteryCharging/batteryThermal/ram/storage) so the
     * admin panel renders Health (Beta) identically on both platforms.
     * Each metric is collected independently so one failure never blocks the rest.
     */
    private collectAdvancedTelemetry;
    /**
     * Collects GPS only if permission is already granted — never prompts during sync.
     *
     * Uses a cached position (low accuracy, high maximumAge) to avoid waking the GPS
     * radio. Denied or unavailable permission returns null silently — it must not
     * pollute the error vault.
     */
    private getLocationPassive;
    private isLocationPermissionGranted;
}
