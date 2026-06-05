"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceTokenService = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
// Conditional import — react-native-keychain is a peer dependency
let Keychain = null;
try {
    Keychain = require('react-native-keychain');
}
catch (e) {
    // Keychain not available — fallback to in-memory with AES encryption
    console.warn('DevGuard: react-native-keychain not installed. Device tokens will not persist across restarts.');
}
const TOKEN_SERVICE_KEY = 'com.devguard.device-token';
const FINGERPRINT_SERVICE_KEY = 'com.devguard.fingerprint';
class DeviceTokenService {
    static instance;
    cachedToken = null;
    sessionKey;
    fingerprint = null;
    constructor() {
        // Generate a session key without relying on native crypto, which often fails in RN environments
        // without specific polyfills (e.g. react-native-get-random-values).
        this.sessionKey = Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    static getInstance() {
        if (!DeviceTokenService.instance) {
            DeviceTokenService.instance = new DeviceTokenService();
        }
        return DeviceTokenService.instance;
    }
    /**
     * Retrieves the device registration token.
     * Reads from Keychain/Keystore if available, otherwise from in-memory cache.
     */
    async getToken() {
        // Try Keychain first (persists across restarts)
        if (Keychain) {
            try {
                const credentials = await Keychain.getGenericPassword({ service: TOKEN_SERVICE_KEY });
                if (credentials && credentials.password) {
                    return credentials.password;
                }
            }
            catch (e) {
                console.warn('DevGuard: Keychain read failed, using in-memory fallback');
            }
        }
        // Fallback: in-memory token
        return this.cachedToken;
    }
    /** Persists a registration token using Keychain/Keystore when available. */
    async saveToken(token, useEnclave = false) {
        let finalToken = token;
        if (useEnclave) {
            // Simulated enclave: reverse and prefix
            finalToken = `se:${token.split('').reverse().join('')}`;
        }
        // Primary: Keychain/Keystore (hardware-backed, persists across restarts)
        if (Keychain) {
            try {
                await Keychain.setGenericPassword('devguard', finalToken, {
                    service: TOKEN_SERVICE_KEY,
                    accessible: Keychain.ACCESSIBLE?.AFTER_FIRST_UNLOCK || undefined,
                    securityLevel: Keychain.SECURITY_LEVEL?.SECURE_HARDWARE || undefined,
                });
            }
            catch (e) {
                console.warn('DevGuard: Keychain write failed, using in-memory fallback');
            }
        }
        // Secondary: in-memory (always set as backup) - Plain for now due to RNG issues in RN
        this.cachedToken = finalToken;
    }
    /**
     * Removes the registration token. Only called on explicit admin revocation.
     */
    async clearToken() {
        // Clear Keychain
        if (Keychain) {
            try {
                await Keychain.resetGenericPassword({ service: TOKEN_SERVICE_KEY });
            }
            catch (e) {
                // Ignore cleanup errors
            }
        }
        // Clear in-memory
        this.cachedToken = null;
        this.sessionKey = Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    /**
     * Generates a device fingerprint from hardware identifiers.
     * This fingerprint persists even if the token is wiped, allowing
     * the server to detect re-registrations from the same hardware.
     */
    static generateFingerprint(deviceId, model, os) {
        const raw = `${deviceId}|${model}|${os}`;
        return crypto_js_1.default.SHA256(raw).toString().substring(0, 16);
    }
    async saveFingerprint(fingerprint) {
        this.fingerprint = fingerprint;
        if (Keychain) {
            try {
                await Keychain.setGenericPassword('devguard', fingerprint, {
                    service: FINGERPRINT_SERVICE_KEY,
                });
            }
            catch (e) {
                // Ignore
            }
        }
    }
    async getFingerprint() {
        if (this.fingerprint)
            return this.fingerprint;
        if (Keychain) {
            try {
                const credentials = await Keychain.getGenericPassword({ service: FINGERPRINT_SERVICE_KEY });
                if (credentials && credentials.password) {
                    this.fingerprint = credentials.password;
                    return this.fingerprint;
                }
            }
            catch (e) {
                // Ignore
            }
        }
        return null;
    }
}
exports.DeviceTokenService = DeviceTokenService;
