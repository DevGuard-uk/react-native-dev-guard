/**
 * AES-CBC with key/IV derived from projectId — no OpenSSL random salt (RN-safe).
 * Parity with DevGuardLogger vault key derivation; avoids Node crypto RNG on Android/Hermes.
 */
export declare function encryptCachePayload(projectId: string, plainText: string): string;
export declare function decryptCachePayload(projectId: string, cipherText: string): string | null;
