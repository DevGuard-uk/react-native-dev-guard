import React from 'react';
import { UserLogInput } from './services/UserLogBuffer';
import { LockScreenBranding } from './types/branding';
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
    branding?: LockScreenBranding | null;
}
interface DevGuardContextType {
    status: GuardStatus;
    verify: () => Promise<void>;
    unlock: (key: string) => Promise<boolean>;
    setDeviceUser: (username?: string, email?: string, phone?: string, customData?: Record<string, any>) => Promise<void>;
    setUserLog: (input: UserLogInput) => Promise<void>;
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
    statusUrl?: string;
    autoProtect?: boolean;
    failSafe?: FailSafe;
}>;
export declare const useDevGuard: () => DevGuardContextType;
export type { LockScreenBranding } from './types/branding';
export { resolveBrandingFooter } from './types/branding';
export { PluginCrashReporter } from './services/PluginCrashReporter';
export type { UserLogInput, UserLogAction, UserLogEvent } from './services/UserLogBuffer';
