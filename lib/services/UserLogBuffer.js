"use strict";
/**
 * Local ring buffer for integrator setUserLog steps (User Journey).
 * Mirrors UsageLogger: in-memory, never throws to the host app.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserLogBuffer = void 0;
const MAX_EVENTS = 200;
const STRING_MAX = 80;
const EXTRAS_JSON_MAX = 400;
const DEDUP_MS = 800;
const SECRET_KEY_RE = /pass|token|secret|auth|cookie/i;
const ACTIONS = new Set([
    'view',
    'tap',
    'submit',
    'appear',
    'disappear',
    'error',
    'custom',
]);
class UserLogBuffer {
    static instance;
    logs = [];
    constructor() { }
    static getInstance() {
        if (!UserLogBuffer.instance) {
            UserLogBuffer.instance = new UserLogBuffer();
        }
        return UserLogBuffer.instance;
    }
    /** Never throws. Empty screen is ignored. */
    async log(input) {
        try {
            const sanitized = this.sanitize(input);
            if (!sanitized)
                return;
            const dedupKey = this.dedupKey(sanitized);
            const nowMs = Date.parse(sanitized.timestamp);
            if (this.logs.length > 0) {
                const last = this.logs[this.logs.length - 1];
                if (this.dedupKey(last) === dedupKey) {
                    const lastMs = Date.parse(last.timestamp);
                    if (!Number.isNaN(nowMs) && !Number.isNaN(lastMs) && nowMs - lastMs <= DEDUP_MS) {
                        this.logs[this.logs.length - 1] = sanitized;
                        return;
                    }
                }
            }
            this.logs.push(sanitized);
            if (this.logs.length > MAX_EVENTS) {
                this.logs = this.logs.slice(-MAX_EVENTS);
            }
        }
        catch {
            // Never throw to host app
        }
    }
    async getLogs() {
        return [...this.logs];
    }
    async clearLogs() {
        this.logs = [];
    }
    sanitize(input) {
        const screen = this.truncate(input?.screen, STRING_MAX);
        if (!screen)
            return null;
        const widget = this.truncate(input.widget, STRING_MAX) || undefined;
        const className = this.truncate(input.className, STRING_MAX) || undefined;
        const action = this.normalizeAction(input.action);
        const extras = this.sanitizeExtras(input.extras);
        const event = {
            screen,
            action,
            timestamp: new Date().toISOString(),
        };
        if (widget)
            event.widget = widget;
        if (className)
            event.className = className;
        if (extras)
            event.extras = extras;
        return event;
    }
    normalizeAction(raw) {
        const a = String(raw || 'view').toLowerCase().trim();
        if (ACTIONS.has(a))
            return a;
        return 'custom';
    }
    truncate(value, max) {
        const s = String(value ?? '').trim();
        if (!s)
            return '';
        return s.length > max ? s.slice(0, max) : s;
    }
    sanitizeExtras(extras) {
        if (!extras || typeof extras !== 'object' || Array.isArray(extras))
            return undefined;
        const out = {};
        const keys = Object.keys(extras).sort();
        for (const key of keys) {
            if (!key || SECRET_KEY_RE.test(key))
                continue;
            const value = extras[key];
            if (typeof value === 'string') {
                out[key] = this.truncate(value, STRING_MAX);
            }
            else if (typeof value === 'number' || typeof value === 'boolean') {
                out[key] = value;
            }
        }
        if (Object.keys(out).length === 0)
            return undefined;
        if (JSON.stringify(out).length <= EXTRAS_JSON_MAX)
            return out;
        const trimmed = {};
        for (const key of Object.keys(out)) {
            trimmed[key] = out[key];
            if (JSON.stringify(trimmed).length > EXTRAS_JSON_MAX) {
                delete trimmed[key];
                break;
            }
        }
        return Object.keys(trimmed).length ? trimmed : undefined;
    }
    dedupKey(log) {
        return `${log.screen}|${log.widget || ''}|${log.className || ''}|${log.action}`;
    }
}
exports.UserLogBuffer = UserLogBuffer;
