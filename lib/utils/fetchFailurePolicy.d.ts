/**
 * Heartbeat / verify fetch-failure policy (HTTP non-ok incl. 429 → apiUnreachable).
 *
 * Product contract (rate_limited / offline): do **not** clear last-known GuardResponse;
 * only mutate GuardStatus when fail-safe requires it. Default failSafe `'open'` with a
 * warm ACTIVE cache returns `null` (keep last-known — no false lock).
 *
 * Callers must not overwrite `response` / `responseRef` on the failure path.
 */
export type FetchFailSafe = 'open' | 'closed';
/**
 * @returns next status to apply, or `null` to keep last-known (no mutation).
 */
export declare function statusAfterFetchFailure(failSafe: FetchFailSafe, currentStatus: string): string | null;
/** HTTP non-2xx (incl. 429 Too Many Requests) is a fetch failure — same as offline. */
export declare function isHttpFetchFailure(httpOk: boolean): boolean;
/**
 * Parse HTTP `Retry-After` (delta-seconds) and clamp to the SDK honor window (1–60).
 * Invalid / empty / HTTP-date → null (no multi-minute sleep on bad headers).
 */
export declare function parseRetryAfterSeconds(raw: string | null | undefined): number | null;
/** True when epoch-ms backoff deadline is still in the future. */
export declare function isRateLimitBackoffActive(untilMs: number, nowMs?: number): boolean;
