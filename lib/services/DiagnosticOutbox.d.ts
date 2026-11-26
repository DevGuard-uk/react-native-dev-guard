export interface DiagnosticRecord {
    clientRecordId: string;
    kind: string;
    payload: Record<string, any>;
    createdAt: string;
    ackedAt?: string | null;
    batchId?: string | null;
    schemaVersion: number;
}
export declare class DiagnosticOutbox {
    private static instance;
    private static readonly SERVICE_NAME;
    private static readonly KEY_NAME;
    static readonly MAX_CAPACITY = 500;
    private memoryRecords;
    private useMemoryFallback;
    private constructor();
    static getInstance(): DiagnosticOutbox;
    static generateRecordId(): string;
    enqueue(kind: string, payload: Record<string, any>, clientRecordId?: string): Promise<DiagnosticRecord>;
    getRecords(): Promise<DiagnosticRecord[]>;
    getUnackedRecords(kind?: string, limit?: number): Promise<DiagnosticRecord[]>;
    markAcked(clientRecordIds: string[], batchId?: string, ackedAt?: string): Promise<void>;
    purgeExpiredAcked(retentionHours?: number): Promise<number>;
    clearAckedOnly(): Promise<void>;
    clearAll(): Promise<void>;
    private enforceCap;
    private persist;
}
