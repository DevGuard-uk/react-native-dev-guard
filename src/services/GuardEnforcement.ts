import { NativeModules } from 'react-native';
import { Obf, PolicyLock } from '../internal/obf';

const { DevGuard: DevGuardNative } = NativeModules;

/**
 * Client-side policy enforcement applied to a server response before it is
 * shown to the user. Mirrors Flutter `GuardEnforcement` + native `dg_e1`.
 */
export class GuardEnforcement {
  private static async evaluatePolicy(
    blockEmulators: boolean,
    isPhysicalDevice: boolean,
    isCompromised: boolean,
  ): Promise<number> {
    if (typeof DevGuardNative?.evaluatePolicy === 'function') {
      try {
        return await DevGuardNative.evaluatePolicy(
          blockEmulators,
          isPhysicalDevice,
          isCompromised,
        );
      } catch {
        // Fall through to JS fallback when native bridge unavailable (e.g. tests).
      }
    }
    if (isCompromised) return PolicyLock.compromised;
    if (blockEmulators && !isPhysicalDevice) return PolicyLock.emulator;
    return PolicyLock.allow;
  }

  static async apply(
    response: any,
    metadata: { isPhysicalDevice?: boolean },
    isCompromised = false,
  ): Promise<any> {
    const isPhysical = metadata?.isPhysicalDevice !== false;
    const code = await this.evaluatePolicy(
      response?.blockEmulators === true,
      isPhysical,
      isCompromised,
    );

    if (code === PolicyLock.compromised) {
      console.warn(Obf.compromisedLog);
      return {
        ...response,
        status: 'LOCKED',
        title: Obf.securityTitle,
        message: Obf.compromisedMessage,
      };
    }

    if (code === PolicyLock.emulator) {
      console.warn('DevGuard: Emulator blocked by project policy.');
      return {
        ...response,
        status: 'LOCKED',
        title: Obf.emulatorTitle,
        message: Obf.emulatorMessage,
      };
    }

    return response;
  }
}
