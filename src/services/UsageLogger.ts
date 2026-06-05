import CryptoJS from 'crypto-js';

export interface UsageEvent {
  type: string;
  timestamp: string;
  data?: any;
}

export class UsageLogger {
  private static instance: UsageLogger;
  private logs: UsageEvent[] = [];
  private sessionPasscode: string | null = null;

  private constructor() {}

  public static getInstance(): UsageLogger {
    if (!UsageLogger.instance) {
      UsageLogger.instance = new UsageLogger();
    }
    return UsageLogger.instance;
  }

  public setSessionPasscode(passcode: string) {
    this.sessionPasscode = passcode;
  }

  public async logEvent(eventType: string, data?: any) {
    const newEvent: UsageEvent = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    this.logs.push(newEvent);

    // Keep only the last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    console.log(`DevGuard: Logged event: ${eventType}`);
  }

  public async getLogs(): Promise<UsageEvent[]> {
    return [...this.logs];
  }

  public async clearLogs() {
    this.logs = [];
  }

  // XOR Crypt logic from Flutter version (Simulated for parity)
  private crypt(text: string, passcode?: string): string {
    const effectivePasscode = passcode || this.sessionPasscode || "secure_default";
    const key = CryptoJS.SHA256(effectivePasscode).toString();
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }
}
