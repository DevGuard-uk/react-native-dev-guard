const CryptoJS = require('crypto-js');

const CACHE_KEY_SALT = 'dg_cache_key_v1';
const CACHE_IV_SALT = 'dg_cache_iv_v1';

function deriveCacheKeyIv(projectId) {
  const keyHex = CryptoJS.SHA256(`${projectId}_${CACHE_KEY_SALT}`).toString(CryptoJS.enc.Hex);
  const ivHex = CryptoJS.SHA256(`${projectId}_${CACHE_IV_SALT}`).toString(CryptoJS.enc.Hex);
  return {
    key: CryptoJS.enc.Hex.parse(keyHex),
    iv: CryptoJS.enc.Hex.parse(ivHex.substring(0, 32)),
  };
}

function encryptCachePayload(projectId, plainText) {
  const { key, iv } = deriveCacheKeyIv(projectId);
  return CryptoJS.AES.encrypt(plainText, key, { iv }).toString();
}

function decryptCachePayload(projectId, cipherText) {
  const { key, iv } = deriveCacheKeyIv(projectId);
  return CryptoJS.AES.decrypt(cipherText, key, { iv }).toString(CryptoJS.enc.Utf8);
}

describe('DevGuard cache crypto (RN-safe)', () => {
  it('round-trips guard response without native crypto RNG', () => {
    const projectId = 'your_project_id';
    const payload = JSON.stringify({ status: 'ACTIVE', pingInterval: 5 });

    expect(() => encryptCachePayload(projectId, payload)).not.toThrow();
    const encrypted = encryptCachePayload(projectId, payload);
    expect(encrypted).toBeTruthy();
    expect(encrypted.startsWith('U2FsdGVk')).toBe(false);

    const decrypted = decryptCachePayload(projectId, encrypted);
    expect(decrypted).toBe(payload);
  });

  it('uses deterministic AES (not OpenSSL salted passphrase mode)', () => {
    const encrypted = encryptCachePayload('test_project', '{"status":"ACTIVE"}');
    expect(encrypted.startsWith('U2FsdGVk')).toBe(false);
  });
});
