"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageLogger = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
class UsageLogger {
    static instance;
    logs = [];
    sessionPasscode = null;
    constructor() { }
    static getInstance() {
        if (!UsageLogger.instance) {
            UsageLogger.instance = new UsageLogger();
        }
        return UsageLogger.instance;
    }
    setSessionPasscode(passcode) {
        this.sessionPasscode = passcode;
    }
    async logEvent(eventType, data) {
        const newEvent = {
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
    async getLogs() {
        return [...this.logs];
    }
    async clearLogs() {
        this.logs = [];
    }
    // XOR Crypt logic from Flutter version (Simulated for parity)
    crypt(text, passcode) {
        const effectivePasscode = passcode || this.sessionPasscode || "secure_default";
        const key = crypto_js_1.default.SHA256(effectivePasscode).toString();
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    }
}
exports.UsageLogger = UsageLogger;
