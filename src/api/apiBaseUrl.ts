/**
 * Validate setup `apiBaseUrl` before storing / using it for outbound fetch.
 * Blocks non-https (except explicit local allow), userinfo, and private/link-local hosts.
 */

export class ApiBaseUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiBaseUrlError';
  }
}

function isIpv4(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function ipv4ToInt(host: string): number | null {
  const parts = host.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.localhost')) return true;
  if (host === '::1' || host === '::' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) {
    return true;
  }
  if (isIpv4(host)) {
    const n = ipv4ToInt(host);
    if (n == null) return true;
    // JS bitwise ops are signed int32 — normalise with >>> 0 before comparing.
    // 10/8, 127/8, 169.254/16, 172.16/12, 192.168/16
    if (((n & 0xff000000) >>> 0) === 0x0a000000) return true;
    if (((n & 0xff000000) >>> 0) === 0x7f000000) return true;
    if (((n & 0xffff0000) >>> 0) === 0xa9fe0000) return true;
    if (((n & 0xfff00000) >>> 0) === 0xac100000) return true;
    if (((n & 0xffff0000) >>> 0) === 0xc0a80000) return true;
  }
  return false;
}

function allowInsecureLocal(): boolean {
  return (
    process.env.ATRIUM_ALLOW_INSECURE_API_BASE === '1' ||
    process.env.NODE_ENV === 'development'
  );
}

/**
 * Normalise and validate an apiBaseUrl from setup. Returns trimmed URL without trailing slash.
 */
export function normaliseApiBaseUrl(raw: string): string {
  const trimmed = String(raw || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new ApiBaseUrlError('apiBaseUrl is required');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new ApiBaseUrlError('apiBaseUrl is not a valid URL');
  }

  if (url.username || url.password) {
    throw new ApiBaseUrlError('apiBaseUrl must not include credentials');
  }

  const insecureLocal =
    allowInsecureLocal() &&
    url.protocol === 'http:' &&
    (url.hostname === '127.0.0.1' || url.hostname === 'localhost');

  if (url.protocol !== 'https:' && !insecureLocal) {
    throw new ApiBaseUrlError('apiBaseUrl must use https');
  }

  if (isPrivateOrLocalHostname(url.hostname) && !insecureLocal) {
    throw new ApiBaseUrlError('apiBaseUrl must not target a private or link-local host');
  }

  const allowlist = (process.env.ATRIUM_API_HOST_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(url.hostname.toLowerCase())) {
    throw new ApiBaseUrlError('apiBaseUrl host is not allowlisted');
  }

  return trimmed;
}
