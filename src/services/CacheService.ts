import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

export class CacheService {
  private static readonly SERVICE_NAME = 'devguard.cache.service';
  private static readonly WIPE_SERVICE = 'devguard.wipe.service';
  
  static async saveResponse(projectId: string, response: any): Promise<void> {
    try {
      const dataString = JSON.stringify(response);
      
      // Use projectId as the encryption key for the payload
      const encrypted = CryptoJS.AES.encrypt(dataString, projectId).toString();
      
      // Store in secure keychain
      await Keychain.setGenericPassword(
        `devguard_${projectId}`, 
        encrypted, 
        { service: this.SERVICE_NAME }
      );
    } catch (e) {
      console.warn('DevGuard Cache: Failed to save response securely', e);
    }
  }

  static async getResponse(projectId: string): Promise<any | null> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: this.SERVICE_NAME });
      
      if (credentials && credentials.username === `devguard_${projectId}`) {
        const encrypted = credentials.password;
        
        // Decrypt using projectId
        const bytes = CryptoJS.AES.decrypt(encrypted, projectId);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        
        if (decrypted) {
          return JSON.parse(decrypted);
        }
      }
      return null;
    } catch (e) {
      console.warn('DevGuard Cache: Failed to retrieve secure response', e);
      return null;
    }
  }

  static async clear(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: this.SERVICE_NAME });
    } catch (e) {
      console.warn('DevGuard Cache: Failed to clear cache', e);
    }
  }

  /**
   * Returns the last remote-wipe nonce this client has executed, or null.
   * Stored separately from the response cache so it survives a cache wipe
   * (parity with Flutter's nonce persistence).
   */
  static async getLastWipeNonce(projectId: string): Promise<number | null> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: this.WIPE_SERVICE });
      if (credentials && credentials.username === `wipe_${projectId}`) {
        const parsed = parseInt(credentials.password, 10);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static async setLastWipeNonce(projectId: string, nonce: number): Promise<void> {
    try {
      await Keychain.setGenericPassword(`wipe_${projectId}`, String(nonce), {
        service: this.WIPE_SERVICE,
      });
    } catch (e) {
      console.warn('DevGuard Cache: Failed to persist wipe nonce', e);
    }
  }
}
