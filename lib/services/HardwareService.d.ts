export declare class HardwareService {
    private static instance;
    private deviceId;
    private constructor();
    static getInstance(): HardwareService;
    getDeviceId(): Promise<string>;
    setDeviceUser(username?: string, email?: string, phone?: string, customData?: Record<string, any>): Promise<void>;
    /** Clears stored device-user identity (username, email, phone, customData). */
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
}
