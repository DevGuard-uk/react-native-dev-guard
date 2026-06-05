/**
 * Performs a hardened remote wipe of all local DevGuard security state.
 * Mirrors the Flutter plugin's `RemoteWipeService` so a wipe clears the same
 * surface on both platforms (not just the response cache).
 */
export declare class RemoteWipeService {
    /**
     * Clears local security state:
     * - cached server response,
     * - buffered usage logs,
     * - encrypted vault diagnostics (info + errors),
     * - stored device-user identity (username/email/phone/customData).
     *
     * @param projectId The project whose cache should be cleared.
     * @param options.revokeToken Also clear the device registration token.
     */
    static execute(projectId: string, options?: {
        revokeToken?: boolean;
    }): Promise<void>;
}
