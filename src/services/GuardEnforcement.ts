/**
 * Client-side policy enforcement applied to a server response before it is
 * shown to the user. Mirrors the Flutter plugin's `GuardEnforcement` so both
 * platforms behave identically.
 */
export class GuardEnforcement {
  /**
   * Applies enforcement rules to a fresh server response.
   *
   * - `blockEmulators`: if the project blocks emulators and the current device
   *   is not a physical device, the response is overridden to LOCKED.
   *
   * @param response The parsed server response (mutated copy returned).
   * @param metadata The device metadata collected for this sync.
   */
  static apply(response: any, metadata: { isPhysicalDevice?: boolean }): any {
    if (response?.blockEmulators === true && metadata?.isPhysicalDevice === false) {
      console.warn('DevGuard: Emulator blocked by project policy.');
      return {
        ...response,
        status: 'LOCKED',
        title: 'Emulator Detected',
        message:
          'This application cannot run on emulators or simulators for security reasons.',
      };
    }
    return response;
  }
}
