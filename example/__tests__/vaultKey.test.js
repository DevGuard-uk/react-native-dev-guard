const CryptoJS = require('crypto-js');

function deriveVaultKeyMaterial(deviceId, salt) {
  const hex = CryptoJS.SHA256(`${deviceId}_${salt}`).toString(CryptoJS.enc.Hex);
  return CryptoJS.enc.Hex.parse(hex).toString(CryptoJS.enc.Latin1);
}

describe('DevGuard vault key derivation', () => {
  it('derives stable 32-byte keys per device', () => {
    const keyA = deriveVaultKeyMaterial('device-abc', 'dg_vault_key_v1');
    const keyB = deriveVaultKeyMaterial('device-abc', 'dg_vault_key_v1');
    const keyOther = deriveVaultKeyMaterial('device-xyz', 'dg_vault_key_v1');

    expect(keyA).toBe(keyB);
    expect(keyA).not.toBe(keyOther);
    expect(keyA.length).toBe(32);
  });

  it('derives distinct 16-byte IV material', () => {
    const iv = deriveVaultKeyMaterial('device-abc', 'dg_vault_iv_v1').substring(0, 16);
    const key = deriveVaultKeyMaterial('device-abc', 'dg_vault_key_v1');

    expect(iv.length).toBe(16);
    expect(iv).not.toBe(key.substring(0, 16));
  });

  it('does not embed a static published vault secret', () => {
    const key = deriveVaultKeyMaterial('simulator-test', 'dg_vault_key_v1');
    expect(key).not.toMatch(/DevGuard_Secure/);
    expect(key).not.toMatch(/Vault_Key_32/);
  });
});
