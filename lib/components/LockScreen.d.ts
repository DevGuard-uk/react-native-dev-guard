import React from 'react';
import { LockScreenBranding } from '../types/branding';
interface LockScreenProps {
    status: string;
    title?: string;
    message?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactWhatsapp?: string;
    allowUnlock?: boolean;
    branding?: LockScreenBranding | null;
    onUnlock: (key: string) => Promise<boolean>;
}
export declare const LockScreen: React.FC<LockScreenProps>;
export {};
