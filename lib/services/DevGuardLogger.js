"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevGuardLogger = void 0;
const react_native_vault_logger_1 = require("react-native-vault-logger");
class DevGuardLogger {
    static showConsoleLogs = false;
    static initialized = false;
    static infoLogs = [];
    static async init() {
        if (this.initialized)
            return;
        try {
            await react_native_vault_logger_1.CrashLogService.init({
                encryptionKey: 'REDACTED_LEGACY_VAULT_KEY',
                encryptionIV: 'REDACTED_LEGACY_VAULT_IV',
                maxLogCount: 1000,
            });
            this.initialized = true;
        }
        catch (e) {
            console.warn('DevGuardLogger: Initialization failed', e);
        }
    }
    static enableConsoleLogs() {
        this.showConsoleLogs = true;
        console.log('[DevGuard] [DEBUG] Console logs enabled via Diagnostic Authorization.');
    }
    static info(message, data) {
        this._log(message, 'INFO', data);
    }
    static warning(message, data) {
        this._log(message, 'WARNING', data);
        react_native_vault_logger_1.CrashLogService.logError(new Error(message), { context: 'WARNING' });
    }
    static error(error, context) {
        const message = error?.message || String(error);
        this._log(message, 'ERROR', { context });
        react_native_vault_logger_1.CrashLogService.logError(error, { context: context || 'ERROR' });
    }
    static debug(message, data) {
        this._log(message, 'DEBUG', data);
    }
    static _log(message, level, data) {
        const formatted = `[DevGuard] [${level}] ${message} ${data ? JSON.stringify(data) : ''}`;
        if (this.showConsoleLogs) {
            console.log(formatted);
        }
        if (!this.initialized)
            return;
        if (level === 'INFO' || level === 'DEBUG') {
            const log = {
                timestamp: new Date().toISOString(),
                error: message,
                stackTrace: 'N/A',
                context: level,
                deviceInfo: '',
                appVersion: '',
            };
            this.infoLogs.unshift(log); // newest first
            if (this.infoLogs.length > 1000) {
                this.infoLogs.pop();
            }
        }
    }
    static getErrorLogs() {
        return react_native_vault_logger_1.CrashLogService.getLogs();
    }
    static getInfoLogs() {
        return [...this.infoLogs];
    }
    static async clearErrors() {
        await react_native_vault_logger_1.CrashLogService.clearLogs();
    }
    static async clearInfo() {
        this.infoLogs = [];
    }
    static async clearAll() {
        await this.clearErrors();
        await this.clearInfo();
    }
    static async exportErrors() {
        return await react_native_vault_logger_1.CrashLogService.exportEncryptedLogs();
    }
    static getErrorCount() {
        return react_native_vault_logger_1.CrashLogService.getLogs().length;
    }
}
exports.DevGuardLogger = DevGuardLogger;
