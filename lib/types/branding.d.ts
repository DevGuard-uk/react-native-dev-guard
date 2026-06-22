export interface LockScreenBranding {
    brandName?: string | null;
    logoUrl?: string | null;
    primaryColor?: string;
    accentColor?: string | null;
    websiteUrl?: string | null;
    hidePoweredBy?: boolean;
}
/** Default lock-screen palette when API sends no branding colors (Flutter PaymentWall parity). */
export declare const DEFAULT_LOCK_PRIMARY = "#d32f2f";
export declare const DEFAULT_LOCK_ACCENT = "#b71c1c";
export declare function parseHexColor(hex?: string | null, fallback?: string): string;
export declare function resolveBrandingFooter(branding?: LockScreenBranding | null): {
    hasCustom: boolean;
    label: string;
    brand: string;
    url: string;
    hidePoweredBy: boolean;
    primaryColor: string;
    accentColor: string;
};
