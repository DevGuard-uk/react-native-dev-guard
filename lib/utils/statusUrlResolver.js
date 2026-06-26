"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStatusUrl = resolveStatusUrl;
const obf_1 = require("../internal/obf");
function isAllowedStatusUrl(url) {
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
/** Resolves the DevGuard status API URL (HTTPS + devguard.uk domain only). */
function resolveStatusUrl(statusUrl) {
    const trimmed = statusUrl?.trim();
    const candidate = trimmed ? trimmed : obf_1.Obf.defaultApiUrl;
    if (!isAllowedStatusUrl(candidate)) {
        throw new Error(obf_1.Obf.invalidStatusUrlLog);
    }
    return candidate;
}
