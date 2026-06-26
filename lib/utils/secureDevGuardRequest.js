"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDevGuardAuthHeaders = buildDevGuardAuthHeaders;
exports.devGuardFetch = devGuardFetch;
const obf_1 = require("../internal/obf");
const statusUrlResolver_1 = require("./statusUrlResolver");
/** Auth headers are only attached when [url] is an allowed DevGuard HTTPS endpoint. */
function buildDevGuardAuthHeaders(input) {
    const allowedUrl = (0, statusUrlResolver_1.resolveStatusUrl)(input.url);
    if (allowedUrl !== input.url.trim()) {
        throw new Error(obf_1.Obf.invalidStatusUrlLog);
    }
    const headers = {
        [obf_1.Obf.contentType]: obf_1.Obf.appJson,
        [obf_1.Obf.hdrSig]: input.signature,
        [obf_1.Obf.hdrTs]: String(input.timestamp),
    };
    if (input.includeTunnel) {
        headers[obf_1.Obf.hdrTunnel] = obf_1.Obf.tunnelV1;
    }
    if (input.secret) {
        headers[obf_1.Obf.hdrApiKey] = input.secret;
    }
    return headers;
}
async function devGuardFetch(url, init) {
    const allowedUrl = (0, statusUrlResolver_1.resolveStatusUrl)(url);
    const headers = buildDevGuardAuthHeaders({
        url: allowedUrl,
        secret: init.secret,
        signature: init.signature,
        timestamp: init.timestamp,
        includeTunnel: init.includeTunnel,
    });
    const { secret: _secret, signature: _signature, timestamp: _timestamp, includeTunnel: _tunnel, ...rest } = init;
    return fetch(allowedUrl, {
        ...rest,
        headers: {
            ...headers,
            ...rest.headers,
        },
    });
}
