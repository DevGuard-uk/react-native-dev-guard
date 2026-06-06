export declare class CacheService {
    private static readonly SERVICE_NAME;
    private static readonly WIPE_SERVICE;
    static saveResponse(projectId: string, response: any): Promise<void>;
    static getResponse(projectId: string): Promise<any | null>;
    static clear(): Promise<void>;
    /**
     * Returns the last remote-wipe nonce this client has executed, or null.
     * Stored separately from the response cache so it survives a cache wipe
     * (parity with Flutter's nonce persistence).
     */
    static getLastWipeNonce(projectId: string): Promise<number | null>;
    static setLastWipeNonce(projectId: string, nonce: number): Promise<void>;
}
