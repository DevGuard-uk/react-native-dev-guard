import React from 'react';
interface LockScreenProps {
    status: string;
    title?: string;
    message?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactWhatsapp?: string;
    allowUnlock?: boolean;
    onUnlock: (key: string) => Promise<boolean>;
}
export declare const LockScreen: React.FC<LockScreenProps>;
export {};
