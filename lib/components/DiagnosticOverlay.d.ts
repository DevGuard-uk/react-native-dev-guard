import React from 'react';
interface DiagnosticOverlayProps {
    visible: boolean;
    onClose: () => void;
    response: any;
    projectId: string;
}
export declare const DiagnosticOverlay: React.FC<DiagnosticOverlayProps>;
export {};
