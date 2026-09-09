/**
 * Local ring buffer for integrator setUserLog steps (User Journey).
 * Mirrors UsageLogger: in-memory, never throws to the host app.
 */
export type UserLogAction = 'view' | 'tap' | 'submit' | 'appear' | 'disappear' | 'error' | 'custom';
export interface UserLogEvent {
    screen: string;
    widget?: string;
    className?: string;
    action: UserLogAction;
    extras?: Record<string, string | number | boolean>;
    timestamp: string;
}
export interface UserLogInput {
    screen: string;
    widget?: string;
    className?: string;
    action?: string;
    extras?: Record<string, string | number | boolean>;
}
export declare class UserLogBuffer {
    private static instance;
    private logs;
    private constructor();
    static getInstance(): UserLogBuffer;
    /** Never throws. Empty screen is ignored. */
    log(input: UserLogInput): Promise<void>;
    getLogs(): Promise<UserLogEvent[]>;
    clearLogs(): Promise<void>;
    private sanitize;
    private normalizeAction;
    private truncate;
    private sanitizeExtras;
    private dedupKey;
}
