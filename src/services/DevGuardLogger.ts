import CryptoJS from 'crypto-js';
import { CrashLogService, CrashLogModel } from 'react-native-vault-logger';

function deriveVaultKeyMaterial(deviceId: string, salt: string): string {
  const hex = CryptoJS.SHA256(`${deviceId}_${salt}`).toString(CryptoJS.enc.Hex);
  return CryptoJS.enc.Hex.parse(hex).toString(CryptoJS.enc.Latin1);
}

export class DevGuardLogger {
  static showConsoleLogs = false;
  private static initialized = false;
  private static infoLogs: CrashLogModel[] = [];

  static async init(deviceId: string) {
    if (this.initialized) return;
    try {
      const encryptionKey = deriveVaultKeyMaterial(deviceId, 'dg_vault_key_v1');
      const encryptionIV = deriveVaultKeyMaterial(deviceId, 'dg_vault_iv_v1').substring(0, 16);
      await CrashLogService.init({
        encryptionKey,
        encryptionIV,
        maxLogCount: 1000,
      });
      this.initialized = true;
    } catch (e) {
      console.warn('DevGuardLogger: Initialization failed', e);
    }
  }

  static enableConsoleLogs() {
    this.showConsoleLogs = true;
    console.log('[DevGuard] [DEBUG] Console logs enabled via Diagnostic Authorization.');
  }

  static info(message: string, data?: Record<string, any>) {
    this._log(message, 'INFO', data);
  }

  static warning(message: string, data?: Record<string, any>) {
    this._log(message, 'WARNING', data);
    CrashLogService.logError(new Error(message), { context: 'WARNING' });
  }

  static error(error: any, context?: string) {
    const message = error?.message || String(error);
    this._log(message, 'ERROR', { context });
    CrashLogService.logError(error, { context: context || 'ERROR' });
  }

  static debug(message: string, data?: Record<string, any>) {
    this._log(message, 'DEBUG', data);
  }

  private static _log(message: string, level: string, data?: Record<string, any>) {
    const formatted = `[DevGuard] [${level}] ${message} ${data ? JSON.stringify(data) : ''}`;
    
    if (this.showConsoleLogs) {
      console.log(formatted);
    }

    if (!this.initialized) return;

    if (level === 'INFO' || level === 'DEBUG') {
      const log: CrashLogModel = {
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

  static getErrorLogs(): CrashLogModel[] {
    return CrashLogService.getLogs();
  }

  static getInfoLogs(): CrashLogModel[] {
    return [...this.infoLogs];
  }

  static async clearErrors() {
    await CrashLogService.clearLogs();
  }

  static async clearInfo() {
    this.infoLogs = [];
  }

  static async clearAll() {
    await this.clearErrors();
    await this.clearInfo();
  }

  static async exportErrors(): Promise<string> {
    return await CrashLogService.exportEncryptedLogs();
  }

  static getErrorCount(): number {
    return CrashLogService.getLogs().length;
  }
}
