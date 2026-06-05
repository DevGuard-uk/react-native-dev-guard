export interface UsageEvent {
    type: string;
    timestamp: string;
    data?: any;
}
export declare class UsageLogger {
    private static instance;
    private logs;
    private sessionPasscode;
    private constructor();
    static getInstance(): UsageLogger;
    setSessionPasscode(passcode: string): void;
    logEvent(eventType: string, data?: any): Promise<void>;
    getLogs(): Promise<UsageEvent[]>;
    clearLogs(): Promise<void>;
    private crypt;
}
