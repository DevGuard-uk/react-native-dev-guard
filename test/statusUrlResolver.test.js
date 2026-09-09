const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { resolveStatusUrl } = require('../lib/utils/statusUrlResolver');
const { Obf } = require('../lib/internal/obf');

describe('resolveStatusUrl', () => {
  it('defaults to the obfuscated production API URL', () => {
    assert.equal(resolveStatusUrl(), Obf.defaultApiUrl);
    assert.equal(resolveStatusUrl(null), Obf.defaultApiUrl);
    assert.equal(resolveStatusUrl(''), Obf.defaultApiUrl);
  });

  it('accepts HTTPS endpoints on devguard.uk subdomains', () => {
    assert.equal(
      resolveStatusUrl('https://api.devguard.uk/devguard'),
      'https://api.devguard.uk/devguard',
    );
  });

  it('accepts loopback HTTP for USB adb reverse / emulator local API', () => {
    assert.equal(
      resolveStatusUrl('http://127.0.0.1:3000/devguard'),
      'http://127.0.0.1:3000/devguard',
    );
    assert.equal(
      resolveStatusUrl('http://localhost:3000/devguard'),
      'http://localhost:3000/devguard',
    );
    assert.equal(
      resolveStatusUrl('http://10.0.2.2:3000/devguard'),
      'http://10.0.2.2:3000/devguard',
    );
  });

  it('rejects non-HTTPS and off-domain endpoints', () => {
    assert.throws(() => resolveStatusUrl('http://api.devguard.uk/devguard'));
    assert.throws(() => resolveStatusUrl('https://evil.example.com/devguard'));
    assert.throws(() => resolveStatusUrl('http://127.0.0.1.evil.example/devguard'));
  });
});
