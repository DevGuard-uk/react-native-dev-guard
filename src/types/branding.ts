export interface LockScreenBranding {
  brandName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string | null;
  websiteUrl?: string | null;
  hidePoweredBy?: boolean;
}

/** Default lock-screen palette when API sends no branding colors (Flutter PaymentWall parity). */
export const DEFAULT_LOCK_PRIMARY = '#d32f2f';
export const DEFAULT_LOCK_ACCENT = '#b71c1c';

export function parseHexColor(hex?: string | null, fallback = DEFAULT_LOCK_PRIMARY): string {
  if (!hex) return fallback;
  const normalized = hex.startsWith('#') ? hex : `#${hex}`;
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : fallback;
}

export function resolveBrandingFooter(branding?: LockScreenBranding | null) {
  const hasCustom =
    !!branding && (!!branding.brandName?.trim() || !!branding.logoUrl?.trim());
  return {
    hasCustom,
    label: hasCustom ? 'Powered by' : 'Secured by',
    brand: hasCustom
      ? branding?.brandName?.trim() || 'DevGuard'
      : 'DevGuard',
    url:
      hasCustom && branding?.websiteUrl?.trim()
        ? branding.websiteUrl.trim()
        : 'https://devguard.uk',
    hidePoweredBy: branding?.hidePoweredBy === true,
    primaryColor: parseHexColor(branding?.primaryColor, DEFAULT_LOCK_PRIMARY),
    accentColor: parseHexColor(
      branding?.accentColor || branding?.primaryColor,
      DEFAULT_LOCK_ACCENT,
    ),
  };
}
