const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { resolveStatusUrl } = require('../lib/utils/statusUrlResolver');
const { buildDevGuardAuthHeaders } = require('../lib/utils/secureDevGuardRequest');
const { Obf } = require('../lib/internal/obf');

describe('secureDevGuardRequest', () => {
  it('includes secret only for allowed devguard.uk URLs', () => {
    const url = resolveStatusUrl(Obf.defaultApiUrl);
    const headers = buildDevGuardAuthHeaders({
      url,
      secret: 'super-secret',
      signature: 'abc',
      timestamp: 1,
      includeTunnel: true,
    });
    assert.equal(headers[Obf.hdrApiKey], 'super-secret');
    assert.equal(headers[Obf.hdrSig], 'abc');
    assert.equal(headers[Obf.hdrTunnel], Obf.tunnelV1);
  });

  it('throws before attaching secret to off-domain URLs', () => {
    assert.throws(() =>
      buildDevGuardAuthHeaders({
        url: 'https://evil.example.com/devguard',
        secret: 'super-secret',
        signature: 'abc',
        timestamp: 1,
      }),
    );
  });
});
