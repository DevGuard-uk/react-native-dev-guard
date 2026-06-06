import { CrashLogModel } from 'react-native-vault-logger';
export declare class DevGuardLogger {
    static showConsoleLogs: boolean;
    private static initialized;
    private static infoLogs;
    static init(deviceId: string): Promise<void>;
    static enableConsoleLogs(): void;
    static info(message: string, data?: Record<string, any>): void;
    static warning(message: string, data?: Record<string, any>): void;
    static error(error: any, context?: string): void;
    static debug(message: string, data?: Record<string, any>): void;
    private static _log;
    static getErrorLogs(): CrashLogModel[];
    static getInfoLogs(): CrashLogModel[];
    static clearErrors(): Promise<void>;
    static clearInfo(): Promise<void>;
    static clearAll(): Promise<void>;
    static exportErrors(): Promise<string>;
    static getErrorCount(): number;
}
