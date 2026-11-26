"use strict";
/**
 * Heartbeat / verify fetch-failure policy (HTTP non-ok incl. 429 → apiUnreachable).
 *
 * Product contract (rate_limited / offline): do **not** clear last-known GuardResponse;
 * only mutate GuardStatus when fail-safe requires it. Default failSafe `'open'` with a
 * warm ACTIVE cache returns `null` (keep last-known — no false lock).
 *
 * Callers must not overwrite `response` / `responseRef` on the failure path.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusAfterFetchFailure = statusAfterFetchFailure;
exports.isHttpFetchFailure = isHttpFetchFailure;
exports.parseRetryAfterSeconds = parseRetryAfterSeconds;
exports.isRateLimitBackoffActive = isRateLimitBackoffActive;
/**
 * @returns next status to apply, or `null` to keep last-known (no mutation).
 */
function statusAfterFetchFailure(failSafe, currentStatus) {
    if (failSafe === 'open' && currentStatus === 'PENDING') {
        return 'ACTIVE';
    }
    if (failSafe === 'closed') {
        return 'LOCKED';
    }
    return null;
}
/** HTTP non-2xx (incl. 429 Too Many Requests) is a fetch failure — same as offline. */
function isHttpFetchFailure(httpOk) {
    return !httpOk;
}
/**
 * Parse HTTP `Retry-After` (delta-seconds) and clamp to the SDK honor window (1–60).
 * Invalid / empty / HTTP-date → null (no multi-minute sleep on bad headers).
 */
function parseRetryAfterSeconds(raw) {
    if (raw == null)
        return null;
    const trimmed = String(raw).trim();
    if (!trimmed)
        return null;
    const secs = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(secs) || secs < 1)
        return null;
    return secs > 60 ? 60 : secs;
}
/** True when epoch-ms backoff deadline is still in the future. */
function isRateLimitBackoffActive(untilMs, nowMs = Date.now()) {
    return untilMs > 0 && nowMs < untilMs;
}
