import { Obf } from '../internal/obf';

function isAllowedStatusUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    const suffix = Obf.allowedApiHostSuffix;
    return host === suffix || host.endsWith(`.${suffix}`);
  } catch {
    return false;
  }
}

/** Resolves the DevGuard status API URL (HTTPS + devguard.uk domain only). */
export function resolveStatusUrl(statusUrl?: string | null): string {
  const trimmed = statusUrl?.trim();
  const candidate = trimmed ? trimmed : Obf.defaultApiUrl;

  if (!isAllowedStatusUrl(candidate)) {
    throw new Error(Obf.invalidStatusUrlLog);
  }

  return candidate;
}
