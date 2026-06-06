"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardwareService = void 0;
const react_native_device_info_1 = __importDefault(require("react-native-device-info"));
const react_native_1 = require("react-native");
const Keychain = __importStar(require("react-native-keychain"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const UsageLogger_1 = require("./UsageLogger");
const DeviceTokenService_1 = require("./DeviceTokenService");
class HardwareService {
    static instance;
    deviceId = null;
    constructor() { }
    static getInstance() {
        if (!HardwareService.instance) {
            HardwareService.instance = new HardwareService();
        }
        return HardwareService.instance;
    }
    async getDeviceId() {
        if (this.deviceId)
            return this.deviceId;
        try {
            const id = await react_native_device_info_1.default.getUniqueId();
            if (id && id !== 'unknown') {
                this.deviceId = id;
                return id;
            }
        }
        catch (e) {
            console.warn('DevGuard: Native DeviceInfo failed, falling back to fingerprint');
        }
        const fingerprint = [
            react_native_1.Platform.OS,
            react_native_1.Platform.Version,
            react_native_device_info_1.default.getBrand(),
            react_native_device_info_1.default.getModel(),
            react_native_device_info_1.default.getSystemName(),
            react_native_device_info_1.default.getBundleId(),
        ].join('|');
        this.deviceId = crypto_js_1.default.SHA256(fingerprint).toString().substring(0, 16);
        return this.deviceId;
    }
    async setDeviceUser(username, email, phone, customData) {
        try {
            const userData = JSON.stringify({ username, email, phone, customData });
            await Keychain.setGenericPassword('devguard_user_info', userData, { service: 'devguard.user.service' });
        }
        catch (e) {
            console.warn('DevGuard: Failed to save user info', e);
        }
    }
    /**
     * Clears all stored device-user identity (username/email/phone/customData).
     * Used by the hardened remote wipe (parity with Flutter's
     * SecureStorageService.deleteAllDeviceUserKeys).
     */
    async clearDeviceUser() {
        try {
            await Keychain.resetGenericPassword({ service: 'devguard.user.service' });
        }
        catch (e) {
            // Ignore cleanup errors
        }
        try {
            await Keychain.resetGenericPassword({ service: 'devguard.username.service' });
        }
        catch (e) {
            // Ignore cleanup errors
        }
    }
    async getMetadata(betaFeatures = {}) {
        console.log('DevGuard: Collecting Hardware Metadata...');
        const isEmulator = await react_native_device_info_1.default.isEmulator();
        const deviceId = await this.getDeviceId();
        const model = react_native_device_info_1.default.getModel();
        const os = `${react_native_1.Platform.OS} ${react_native_1.Platform.Version}`;
        const usageLogger = UsageLogger_1.UsageLogger.getInstance();
        const tokenService = DeviceTokenService_1.DeviceTokenService.getInstance();
        let username, email, phone, customData;
        try {
            const credentials = await Keychain.getGenericPassword({ service: 'devguard.user.service' });
            if (credentials) {
                const parsed = JSON.parse(credentials.password);
                username = parsed.username;
                email = parsed.email;
                phone = parsed.phone;
                customData = parsed.customData;
            }
            else {
                // Fallback to older generic password entry
                const oldCreds = await Keychain.getGenericPassword({ service: 'devguard.username.service' });
                if (oldCreds)
                    username = oldCreds.password;
            }
        }
        catch (e) {
            // Ignore
        }
        const isAdvanced = betaFeatures?.advancedTelemetry === true;
        const metadata = {
            deviceId,
            deviceName: await react_native_device_info_1.default.getDeviceName(),
            model: model,
            brand: react_native_device_info_1.default.getBrand(),
            os: os,
            osVersion: react_native_1.Platform.Version,
            version: react_native_device_info_1.default.getVersion(),
            bundleId: react_native_device_info_1.default.getBundleId(),
            isTablet: react_native_device_info_1.default.isTablet(),
            isEmulator: isEmulator,
            isPhysicalDevice: !isEmulator,
            username: username,
            email: email,
            phone: phone,
            customData: customData,
            networkType: isAdvanced ? await this.getNetworkType() : 'REDACTED',
            fingerprint: DeviceTokenService_1.DeviceTokenService.generateFingerprint(deviceId, model, os),
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
    async getNetworkType() {
        try {
            const carrier = await react_native_device_info_1.default.getCarrier();
            if (carrier && carrier.trim() && carrier.toLowerCase() !== 'unknown') {
                return carrier;
            }
        }
        catch (e) {
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
    async collectAdvancedTelemetry() {
        const out = { batteryThermal: 'NORMAL' };
        try {
            const mem = await react_native_device_info_1.default.getTotalMemory();
            if (typeof mem === 'number' && mem > 0) {
                out.ram = `${(mem / (1024 * 1024 * 1024)).toFixed(1)} GB`;
            }
        }
        catch (e) {
            // Ignore individual metric failure.
        }
        try {
            const total = await react_native_device_info_1.default.getTotalDiskCapacity();
            if (typeof total === 'number' && total > 0) {
                out.storage = `${(total / (1024 * 1024 * 1024)).toFixed(1)} GB`;
            }
        }
        catch (e) {
            // Ignore individual metric failure.
        }
        try {
            // getBatteryLevel returns 0..1, or -1 when unavailable (e.g. simulator).
            const level = await react_native_device_info_1.default.getBatteryLevel();
            if (typeof level === 'number' && level >= 0) {
                out.battery = `${Math.round(level * 100)}%`;
            }
        }
        catch (e) {
            // Ignore individual metric failure.
        }
        try {
            const charging = await react_native_device_info_1.default.isBatteryCharging();
            out.batteryCharging = charging ? 'charging' : 'discharging';
        }
        catch (e) {
            // Ignore individual metric failure.
        }
        const location = await this.getLocationPassive();
        if (location) {
            out.location = location;
        }
        return out;
    }
    /**
     * Collects GPS only if permission is already granted — never prompts during sync.
     *
     * Uses a cached position (low accuracy, high maximumAge) to avoid waking the GPS
     * radio. Denied or unavailable permission returns null silently — it must not
     * pollute the error vault.
     */
    async getLocationPassive() {
        if (react_native_1.Platform.OS !== 'android' && react_native_1.Platform.OS !== 'ios')
            return null;
        if (!(await this.isLocationPermissionGranted()))
            return null;
        try {
            // Optional peer: host app installs react-native-geolocation-service for GPS telemetry.
            const Geolocation = require('react-native-geolocation-service').default;
            return await new Promise((resolve) => {
                Geolocation.getCurrentPosition((position) => {
                    const { latitude, longitude } = position.coords;
                    resolve(`${latitude.toFixed(4)},${longitude.toFixed(4)}`);
                }, () => resolve(null), {
                    enableHighAccuracy: false,
                    maximumAge: 86_400_000,
                    timeout: 5_000,
                });
            });
        }
        catch {
            return null;
        }
    }
    async isLocationPermissionGranted() {
        if (react_native_1.Platform.OS === 'android') {
            try {
                const fine = await react_native_1.PermissionsAndroid.check(react_native_1.PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                const coarse = await react_native_1.PermissionsAndroid.check(react_native_1.PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
                return fine || coarse;
            }
            catch {
                return false;
            }
        }
        if (react_native_1.Platform.OS === 'ios') {
            try {
                // Optional peer: react-native-permissions (check only — never request).
                const { check, PERMISSIONS, RESULTS } = require('react-native-permissions');
                const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
                return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
            }
            catch {
                return false;
            }
        }
        return false;
    }
}
exports.HardwareService = HardwareService;
