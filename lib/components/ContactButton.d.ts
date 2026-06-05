import React from 'react';
interface ContactButtonProps {
    label: string;
    onPress: () => void;
    color: string;
    icon?: string;
}
export declare const ContactButton: React.FC<ContactButtonProps>;
export {};
