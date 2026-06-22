"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOCK_ACCENT = exports.DEFAULT_LOCK_PRIMARY = void 0;
exports.parseHexColor = parseHexColor;
exports.resolveBrandingFooter = resolveBrandingFooter;
/** Default lock-screen palette when API sends no branding colors (Flutter PaymentWall parity). */
exports.DEFAULT_LOCK_PRIMARY = '#d32f2f';
exports.DEFAULT_LOCK_ACCENT = '#b71c1c';
function parseHexColor(hex, fallback = exports.DEFAULT_LOCK_PRIMARY) {
    if (!hex)
        return fallback;
    const normalized = hex.startsWith('#') ? hex : `#${hex}`;
    return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : fallback;
}
function resolveBrandingFooter(branding) {
    const hasCustom = !!branding && (!!branding.brandName?.trim() || !!branding.logoUrl?.trim());
    return {
        hasCustom,
        label: hasCustom ? 'Powered by' : 'Secured by',
        brand: hasCustom
            ? branding?.brandName?.trim() || 'DevGuard'
            : 'DevGuard',
        url: hasCustom && branding?.websiteUrl?.trim()
            ? branding.websiteUrl.trim()
            : 'https://devguard.uk',
        hidePoweredBy: branding?.hidePoweredBy === true,
        primaryColor: parseHexColor(branding?.primaryColor, exports.DEFAULT_LOCK_PRIMARY),
        accentColor: parseHexColor(branding?.accentColor || branding?.primaryColor, exports.DEFAULT_LOCK_ACCENT),
    };
}
