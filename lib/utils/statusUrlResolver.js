"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStatusUrl = resolveStatusUrl;
const obf_1 = require("../internal/obf");
/** USB adb reverse / emulator alias — physical tests use release APKs with local API. */
function isLoopbackHttpStatusUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:')
            return false;
        const host = parsed.hostname.toLowerCase();
        return (host === '127.0.0.1' ||
            host === 'localhost' ||
            host === '10.0.2.2' ||
            host.startsWith('192.168.') ||
            host.startsWith('10.') ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(host));
    }
    catch {
        return false;
    }
}
function isAllowedStatusUrl(url) {
    if (isLoopbackHttpStatusUrl(url))
        return true;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:')
            return false;
        const host = parsed.hostname.toLowerCase();
        const suffix = obf_1.Obf.allowedApiHostSuffix;
        return host === suffix || host.endsWith(`.${suffix}`);
    }
    catch {
        return false;
    }
}
/** Resolves the DevGuard status API URL (HTTPS + devguard.uk, or loopback HTTP). */
function resolveStatusUrl(statusUrl) {
    const trimmed = statusUrl?.trim();
    const candidate = trimmed ? trimmed : obf_1.Obf.defaultApiUrl;
    if (!isAllowedStatusUrl(candidate)) {
        throw new Error(obf_1.Obf.invalidStatusUrlLog);
    }
    return candidate;
}
