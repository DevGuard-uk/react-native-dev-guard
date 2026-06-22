"use strict";
/** Build contact deep-links for lock-screen support buttons (Flutter ContactButton parity). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWhatsAppUrl = buildWhatsAppUrl;
exports.buildMailtoUrl = buildMailtoUrl;
exports.buildTelUrl = buildTelUrl;
function buildWhatsAppUrl(raw) {
    const digits = raw.replace(/[^0-9]/g, '');
    return digits ? `https://wa.me/${digits}` : '';
}
function buildMailtoUrl(raw) {
    const email = raw.trim();
    return email ? `mailto:${email}` : '';
}
function buildTelUrl(raw) {
    const phone = raw.replace(/[^\d+]/g, '');
    return phone ? `tel:${phone}` : '';
}
