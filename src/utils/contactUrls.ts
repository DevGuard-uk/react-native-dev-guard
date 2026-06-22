/** Build contact deep-links for lock-screen support buttons (Flutter ContactButton parity). */

export function buildWhatsAppUrl(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

export function buildMailtoUrl(raw: string): string {
  const email = raw.trim();
  return email ? `mailto:${email}` : '';
}

export function buildTelUrl(raw: string): string {
  const phone = raw.replace(/[^\d+]/g, '');
  return phone ? `tel:${phone}` : '';
}
