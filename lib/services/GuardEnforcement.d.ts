/**
 * Client-side policy enforcement applied to a server response before it is
 * shown to the user. Mirrors Flutter `GuardEnforcement` + native `dg_e1`.
 *
 * Heartbeat `rootPolicy`: `warn` (default) → WARNING banner; `block` → LOCKED.
 */
export declare class GuardEnforcement {
    private static evaluatePolicy;
    static apply(response: any, metadata: {
        isPhysicalDevice?: boolean;
    }, isCompromised?: boolean): Promise<any>;
}
