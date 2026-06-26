export type DevGuardAuthHeaderInput = {
    url: string;
    secret?: string | null;
    signature: string;
    timestamp: string | number;
    includeTunnel?: boolean;
};
/** Auth headers are only attached when [url] is an allowed DevGuard HTTPS endpoint. */
export declare function buildDevGuardAuthHeaders(input: DevGuardAuthHeaderInput): Record<string, string>;
export declare function devGuardFetch(url: string, init: RequestInit & {
    secret?: string | null;
    signature: string;
    timestamp: string | number;
    includeTunnel?: boolean;
}): Promise<Response>;
