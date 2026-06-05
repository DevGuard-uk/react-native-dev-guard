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
exports.CacheService = void 0;
const Keychain = __importStar(require("react-native-keychain"));
const crypto_js_1 = __importDefault(require("crypto-js"));
class CacheService {
    static SERVICE_NAME = 'devguard.cache.service';
    static WIPE_SERVICE = 'devguard.wipe.service';
    static async saveResponse(projectId, response) {
        try {
            const dataString = JSON.stringify(response);
            // Use projectId as the encryption key for the payload
            const encrypted = crypto_js_1.default.AES.encrypt(dataString, projectId).toString();
            // Store in secure keychain
            await Keychain.setGenericPassword(`devguard_${projectId}`, encrypted, { service: this.SERVICE_NAME });
        }
        catch (e) {
            console.warn('DevGuard Cache: Failed to save response securely', e);
        }
    }
    static async getResponse(projectId) {
        try {
            const credentials = await Keychain.getGenericPassword({ service: this.SERVICE_NAME });
            if (credentials && credentials.username === `devguard_${projectId}`) {
                const encrypted = credentials.password;
                // Decrypt using projectId
                const bytes = crypto_js_1.default.AES.decrypt(encrypted, projectId);
                const decrypted = bytes.toString(crypto_js_1.default.enc.Utf8);
                if (decrypted) {
                    return JSON.parse(decrypted);
                }
            }
            return null;
        }
        catch (e) {
            console.warn('DevGuard Cache: Failed to retrieve secure response', e);
            return null;
        }
    }
    static async clear() {
        try {
            await Keychain.resetGenericPassword({ service: this.SERVICE_NAME });
        }
        catch (e) {
            console.warn('DevGuard Cache: Failed to clear cache', e);
        }
    }
    /** Last remote-wipe nonce executed on this device, or null. */
    static async getLastWipeNonce(projectId) {
        try {
            const credentials = await Keychain.getGenericPassword({ service: this.WIPE_SERVICE });
            if (credentials && credentials.username === `wipe_${projectId}`) {
                const parsed = parseInt(credentials.password, 10);
                return isNaN(parsed) ? null : parsed;
            }
            return null;
        }
        catch (e) {
            return null;
        }
    }
    static async setLastWipeNonce(projectId, nonce) {
        try {
            await Keychain.setGenericPassword(`wipe_${projectId}`, String(nonce), {
                service: this.WIPE_SERVICE,
            });
        }
        catch (e) {
            console.warn('DevGuard Cache: Failed to persist wipe nonce', e);
        }
    }
}
exports.CacheService = CacheService;
