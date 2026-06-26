import { Obf } from '../internal/obf';
import { resolveStatusUrl } from './statusUrlResolver';

export type DevGuardAuthHeaderInput = {
  url: string;
  secret?: string | null;
  signature: string;
  timestamp: string | number;
  includeTunnel?: boolean;
};

/** Auth headers are only attached when [url] is an allowed DevGuard HTTPS endpoint. */
export function buildDevGuardAuthHeaders(input: DevGuardAuthHeaderInput): Record<string, string> {
  const allowedUrl = resolveStatusUrl(input.url);
  if (allowedUrl !== input.url.trim()) {
    throw new Error(Obf.invalidStatusUrlLog);
  }

  const headers: Record<string, string> = {
    [Obf.contentType]: Obf.appJson,
    [Obf.hdrSig]: input.signature,
    [Obf.hdrTs]: String(input.timestamp),
  };

  if (input.includeTunnel) {
    headers[Obf.hdrTunnel] = Obf.tunnelV1;
  }

  if (input.secret) {
    headers[Obf.hdrApiKey] = input.secret;
  }

  return headers;
}

export async function devGuardFetch(
  url: string,
  init: RequestInit & { secret?: string | null; signature: string; timestamp: string | number; includeTunnel?: boolean },
): Promise<Response> {
  const allowedUrl = resolveStatusUrl(url);
  const headers = buildDevGuardAuthHeaders({
    url: allowedUrl,
    secret: init.secret,
    signature: init.signature,
    timestamp: init.timestamp,
    includeTunnel: init.includeTunnel,
  });

  const { secret: _secret, signature: _signature, timestamp: _timestamp, includeTunnel: _tunnel, ...rest } = init;

  return fetch(allowedUrl, {
    ...rest,
    headers: {
      ...headers,
      ...(rest.headers as Record<string, string> | undefined),
    },
  });
}
