"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticOutbox = void 0;
const Keychain = __importStar(require("react-native-keychain"));
class DiagnosticOutbox {
    static instance;
    static SERVICE_NAME = 'devguard.diagnostic.outbox';
    static KEY_NAME = 'devguard_diag_records';
    static MAX_CAPACITY = 500;
    memoryRecords = [];
    useMemoryFallback = false;
    constructor() { }
    static getInstance() {
        if (!DiagnosticOutbox.instance) {
            DiagnosticOutbox.instance = new DiagnosticOutbox();
        }
        return DiagnosticOutbox.instance;
    }
    static generateRecordId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    async enqueue(kind, payload, clientRecordId) {
        const record = {
            clientRecordId: clientRecordId || DiagnosticOutbox.generateRecordId(),
            kind,
            payload,
            createdAt: new Date().toISOString(),
            ackedAt: null,
            batchId: null,
            schemaVersion: 1,
        };
        const records = await this.getRecords();
        records.push(record);
        this.enforceCap(records);
        await this.persist(records);
        return record;
    }
    async getRecords() {
        if (this.useMemoryFallback) {
            return [...this.memoryRecords];
        }
        try {
            const creds = await Keychain.getGenericPassword({
                service: DiagnosticOutbox.SERVICE_NAME,
            });
            if (creds && creds.password) {
                const parsed = JSON.parse(creds.password);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
            return [];
        }
        catch (_) {
            this.useMemoryFallback = true;
            return [...this.memoryRecords];
        }
    }
    async getUnackedRecords(kind, limit) {
        const records = await this.getRecords();
        let unacked = records.filter((r) => !r.ackedAt);
        if (kind) {
            unacked = unacked.filter((r) => r.kind === kind);
        }
        if (limit && limit > 0) {
            return unacked.slice(0, limit);
        }
        return unacked;
    }
    async markAcked(clientRecordIds, batchId, ackedAt) {
        if (!clientRecordIds || clientRecordIds.length === 0)
            return;
        const idSet = new Set(clientRecordIds);
        const ackIso = ackedAt || new Date().toISOString();
        const records = await this.getRecords();
        let changed = false;
        for (const r of records) {
            if (idSet.has(r.clientRecordId)) {
                r.ackedAt = ackIso;
                if (batchId)
                    r.batchId = batchId;
                changed = true;
            }
        }
        if (changed) {
            await this.persist(records);
        }
    }
    async purgeExpiredAcked(retentionHours = 48) {
        const records = await this.getRecords();
        const cutoff = new Date(Date.now() - retentionHours * 3600 * 1000);
        const initialCount = records.length;
        const remaining = records.filter((r) => {
            if (!r.ackedAt)
                return true; // unacked NEVER pruned by retention!
            const ackDate = new Date(r.ackedAt);
            return ackDate >= cutoff;
        });
        const purgedCount = initialCount - remaining.length;
        if (purgedCount > 0) {
            await this.persist(remaining);
        }
        return purgedCount;
    }
    async clearAckedOnly() {
        const records = await this.getRecords();
        const remaining = records.filter((r) => !r.ackedAt);
        if (remaining.length !== records.length) {
            await this.persist(remaining);
        }
    }
    async clearAll() {
        this.memoryRecords = [];
        try {
            await Keychain.resetGenericPassword({
                service: DiagnosticOutbox.SERVICE_NAME,
            });
        }
        catch (_) { }
    }
    enforceCap(records) {
        if (records.length <= DiagnosticOutbox.MAX_CAPACITY)
            return;
        // 1. Remove expired acked (>48h)
        const cutoff = new Date(Date.now() - 48 * 3600 * 1000);
        for (let i = records.length - 1; i >= 0; i--) {
            if (records[i].ackedAt && new Date(records[i].ackedAt) < cutoff) {
                records.splice(i, 1);
            }
        }
        // 2. Remove oldest acked
        if (records.length > DiagnosticOutbox.MAX_CAPACITY) {
            for (let i = 0; i < records.length && records.length > DiagnosticOutbox.MAX_CAPACITY; i++) {
                if (records[i].ackedAt) {
                    records.splice(i, 1);
                    i--;
                }
            }
        }
        // 3. If STILL over cap, drop oldest non-fatal unacked
        if (records.length > DiagnosticOutbox.MAX_CAPACITY) {
            for (let i = 0; i < records.length && records.length > DiagnosticOutbox.MAX_CAPACITY; i++) {
                const isFatal = records[i].kind === 'crash' && records[i].payload?.isFatal === true;
                if (!isFatal) {
                    records.splice(i, 1);
                    i--;
                }
            }
        }
    }
    async persist(records) {
        this.memoryRecords = records;
        if (this.useMemoryFallback)
            return;
        try {
            await Keychain.setGenericPassword(DiagnosticOutbox.KEY_NAME, JSON.stringify(records), { service: DiagnosticOutbox.SERVICE_NAME });
        }
        catch (_) {
            this.useMemoryFallback = true;
        }
    }
}
exports.DiagnosticOutbox = DiagnosticOutbox;
