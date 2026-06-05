export declare class CacheService {
    private static readonly SERVICE_NAME;
    private static readonly WIPE_SERVICE;
    static saveResponse(projectId: string, response: any): Promise<void>;
    static getResponse(projectId: string): Promise<any | null>;
    static clear(): Promise<void>;
    /** Last remote-wipe nonce executed on this device, or null. */
    static getLastWipeNonce(projectId: string): Promise<number | null>;
    static setLastWipeNonce(projectId: string, nonce: number): Promise<void>;
}
