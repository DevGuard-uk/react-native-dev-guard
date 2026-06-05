import React from 'react';
export type GuardStatus = 'LOCKED' | 'ACTIVE' | 'PENDING' | 'ERROR' | 'EXPIRED' | 'WARNING';
interface GuardResponse {
    status: GuardStatus;
    message?: string;
    title?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactWhatsapp?: string;
    allowUnlock?: boolean;
    config?: any;
    lifecycleSync?: {
        onAppLaunch: boolean;
        onForeground: boolean;
        onBackground: boolean;
        fallbackIntervalHours: number;
        jitterMaxMinutes: number;
    };
    remoteCommand?: string;
    deviceToken?: string;
    betaFeatures?: any;
    deviceTracking?: boolean;
    diagnosticPasscodeHash?: string;
    /** Server-defined heartbeat interval (minutes) — legacy fallback when lifecycleSync is absent. */
    pingInterval?: number;
    /** Legacy heartbeat sync policy. */
    syncPolicy?: SyncPolicy;
    /** When true, the client locks on emulators/simulators (non-physical devices). */
    blockEmulators?: boolean;
}
interface DevGuardContextType {
    status: GuardStatus;
    verify: () => Promise<void>;
    unlock: (key: string) => Promise<boolean>;
    setDeviceUser: (username?: string, email?: string, phone?: string, customData?: Record<string, any>) => Promise<void>;
    isLocked: boolean;
    response: GuardResponse | null;
}
export type FailSafe = 'open' | 'closed';
export type SyncPolicy = 'immediate' | 'onDemand' | 'daily' | 'weekly';
export declare const DevGuardProvider: React.FC<{
    children: React.ReactNode;
    projectId: string;
    /** Your account Master Secret (Settings → Master Secret). */
    secret?: string;
    /** @deprecated Use `secret` (Settings → Master Secret) instead. */
    apiKey?: string;
    autoProtect?: boolean;
    failSafe?: FailSafe;
}>;
export declare const useDevGuard: () => DevGuardContextType;
export {};
