type MetadataProvider = () => Promise<Record<string, any> | null>;
export declare class PluginCrashReporter {
    private static projectId;
    private static secret;
    private static baseUrl;
    private static metadataProvider;
    static configure(input: {
        projectId: string;
        secret?: string | null;
        baseUrl?: string;
        metadataProvider?: MetadataProvider;
    }): void;
    static report(input: {
        error: unknown;
        context?: string;
        isFatal?: boolean;
        crashType?: string;
    }): Promise<void>;
    private static telemetryUrl;
}
export {};
