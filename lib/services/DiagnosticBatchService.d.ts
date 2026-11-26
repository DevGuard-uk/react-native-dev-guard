export type DeviceIdProvider = () => Promise<string | undefined>;
export interface DiagnosticBatchResult {
    success: boolean;
    batchId?: string;
    flushedCount: number;
    ackedCount: number;
    retryAfterSeconds?: number;
    error?: string;
}
export declare class DiagnosticBatchService {
    private static projectId?;
    private static secret?;
    private static baseUrl;
    private static deviceIdProvider?;
    private static rateLimitUntilMs;
    static configure(options: {
        projectId: string;
        secret?: string | null;
        baseUrl: string;
        deviceIdProvider?: DeviceIdProvider;
    }): void;
    static isRateLimited(): boolean;
    static getRateLimitRemainingSeconds(): number;
    static flush(options?: {
        maxRecords?: number;
        maxBytes?: number;
    }): Promise<DiagnosticBatchResult>;
    private static applyRateLimit;
    private static routeUrl;
    static resetRateLimitForTesting(): void;
}
