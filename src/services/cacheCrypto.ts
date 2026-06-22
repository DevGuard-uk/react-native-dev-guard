import CryptoJS from 'crypto-js';

const CACHE_KEY_SALT = 'dg_cache_key_v1';
const CACHE_IV_SALT = 'dg_cache_iv_v1';
/** OpenSSL salted ciphertext prefix (legacy passphrase-based AES). */
const LEGACY_OPENSSL_PREFIX = 'U2FsdGVk';

function deriveCacheKeyIv(projectId: string): { key: CryptoJS.lib.WordArray; iv: CryptoJS.lib.WordArray } {
  const keyHex = CryptoJS.SHA256(`${projectId}_${CACHE_KEY_SALT}`).toString(CryptoJS.enc.Hex);
  const ivHex = CryptoJS.SHA256(`${projectId}_${CACHE_IV_SALT}`).toString(CryptoJS.enc.Hex);
  return {
    key: CryptoJS.enc.Hex.parse(keyHex),
    iv: CryptoJS.enc.Hex.parse(ivHex.substring(0, 32)),
  };
}

/**
 * AES-CBC with key/IV derived from projectId — no OpenSSL random salt (RN-safe).
 * Parity with DevGuardLogger vault key derivation; avoids Node crypto RNG on Android/Hermes.
 */
export function encryptCachePayload(projectId: string, plainText: string): string {
  const { key, iv } = deriveCacheKeyIv(projectId);
  return CryptoJS.AES.encrypt(plainText, key, { iv }).toString();
}

export function decryptCachePayload(projectId: string, cipherText: string): string | null {
  const { key, iv } = deriveCacheKeyIv(projectId);
  const decrypted = CryptoJS.AES.decrypt(cipherText, key, { iv }).toString(CryptoJS.enc.Utf8);
  if (decrypted) return decrypted;

  // Legacy entries used passphrase mode (random salt → needs native crypto RNG).
  if (cipherText.startsWith(LEGACY_OPENSSL_PREFIX)) {
    const legacy = CryptoJS.AES.decrypt(cipherText, projectId).toString(CryptoJS.enc.Utf8);
    return legacy || null;
  }

  return null;
}
