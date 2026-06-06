export declare class DeviceTokenService {
    private static instance;
    private cachedToken;
    private sessionKey;
    private fingerprint;
    private constructor();
    static getInstance(): DeviceTokenService;
    /**
     * Retrieves the device registration token.
     * Reads from Keychain/Keystore if available, otherwise from in-memory cache.
     */
    getToken(): Promise<string | null>;
    /**
     * Persists a registration token received from the server.
     * Uses hardware-backed Keychain/Keystore when available (parity with Flutter's flutter_secure_storage).
     */
    saveToken(token: string, useEnclave?: boolean): Promise<void>;
    /**
     * Removes the registration token. Only called on explicit admin revocation.
     */
    clearToken(): Promise<void>;
    /**
     * Generates a device fingerprint from hardware identifiers.
     * This fingerprint persists even if the token is wiped, allowing
     * the server to detect re-registrations from the same hardware.
     */
    static generateFingerprint(deviceId: string, model: string, os: string): string;
    saveFingerprint(fingerprint: string): Promise<void>;
    getFingerprint(): Promise<string | null>;
}
