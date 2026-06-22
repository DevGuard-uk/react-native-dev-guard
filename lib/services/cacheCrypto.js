"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptCachePayload = encryptCachePayload;
exports.decryptCachePayload = decryptCachePayload;
const crypto_js_1 = __importDefault(require("crypto-js"));
const CACHE_KEY_SALT = 'dg_cache_key_v1';
const CACHE_IV_SALT = 'dg_cache_iv_v1';
/** OpenSSL salted ciphertext prefix (legacy passphrase-based AES). */
const LEGACY_OPENSSL_PREFIX = 'U2FsdGVk';
function deriveCacheKeyIv(projectId) {
    const keyHex = crypto_js_1.default.SHA256(`${projectId}_${CACHE_KEY_SALT}`).toString(crypto_js_1.default.enc.Hex);
    const ivHex = crypto_js_1.default.SHA256(`${projectId}_${CACHE_IV_SALT}`).toString(crypto_js_1.default.enc.Hex);
    return {
        key: crypto_js_1.default.enc.Hex.parse(keyHex),
        iv: crypto_js_1.default.enc.Hex.parse(ivHex.substring(0, 32)),
    };
}
/**
 * AES-CBC with key/IV derived from projectId — no OpenSSL random salt (RN-safe).
 * Parity with DevGuardLogger vault key derivation; avoids Node crypto RNG on Android/Hermes.
 */
function encryptCachePayload(projectId, plainText) {
    const { key, iv } = deriveCacheKeyIv(projectId);
    return crypto_js_1.default.AES.encrypt(plainText, key, { iv }).toString();
}
function decryptCachePayload(projectId, cipherText) {
    const { key, iv } = deriveCacheKeyIv(projectId);
    const decrypted = crypto_js_1.default.AES.decrypt(cipherText, key, { iv }).toString(crypto_js_1.default.enc.Utf8);
    if (decrypted)
        return decrypted;
    // Legacy entries used passphrase mode (random salt → needs native crypto RNG).
    if (cipherText.startsWith(LEGACY_OPENSSL_PREFIX)) {
        const legacy = crypto_js_1.default.AES.decrypt(cipherText, projectId).toString(crypto_js_1.default.enc.Utf8);
        return legacy || null;
    }
    return null;
}
