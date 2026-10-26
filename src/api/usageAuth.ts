import { createHash } from 'node:crypto';
/**
 * Validate Atrium interactive usage JWTs against COHO Public API and read
 * person/connection claims from the token payload.
 *
 * Crypto verification is COHO's job:
 *   GET {apiBaseUrl}/v1.1/public/test-auth
 *   Authorization: Bearer <atriumUsageToken>
 * (PublicApiAuthenticationV11Controller — not …/authentication/test-auth.)
 *
 * After a successful check we trust the JWT payload fields that COHO minted
 * (personReference, connectionReference). Local claim decode is not a signature check.
 */

/** Probe path relative to apiBaseUrl (no trailing slash on base). */
export const USAGE_TOKEN_PROBE_PATH = '/v1.1/public/test-auth';

export interface UsageAuthClaims {
  personReference: string;
  connectionReference: string;
  organisationReference: string | null;
  tokenUse: string | null;
}

export interface UsageAuthResult {
  personReference: string;
  connectionReference: string;
  organisationReference: string | null;
}

const USAGE_AUTH_CACHE_TTL_MS = 60_000;
const USAGE_AUTH_CACHE_MAX = 500;
const TOKEN_USE_ATRIUM_USAGE = 'atrium_usage';

type CacheEntry = { expiresAt: number; result: UsageAuthResult };
const usageAuthCache = new Map<string, CacheEntry>();

function pruneUsageAuthCache(now = Date.now()): void {
  for (const [key, entry] of usageAuthCache) {
    if (entry.expiresAt <= now) usageAuthCache.delete(key);
  }
  while (usageAuthCache.size >= USAGE_AUTH_CACHE_MAX) {
    const oldest = usageAuthCache.keys().next().value;
    if (oldest === undefined) break;
    usageAuthCache.delete(oldest);
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

let outboundFetch: typeof fetch = globalThis.fetch.bind(globalThis);

export function setUsageAuthFetch(impl: typeof fetch): void {
  outboundFetch = impl;
  usageAuthCache.clear();
}

export function resetUsageAuthFetch(): void {
  outboundFetch = globalThis.fetch.bind(globalThis);
  usageAuthCache.clear();
}

export function clearUsageAuthCache(): void {
  usageAuthCache.clear();
}

function base64UrlToUtf8(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64').toString('utf8');
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Decode JWT payload claims without verifying the signature. */
export function decodeUsageTokenClaims(token: string): UsageAuthClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const payload = JSON.parse(base64UrlToUtf8(parts[1]!)) as Record<string, unknown>;
    const personReference = asNonEmptyString(payload.personReference);
    const connectionReference = asNonEmptyString(payload.connectionReference);
    if (!personReference || !connectionReference) return null;
    return {
      personReference,
      connectionReference,
      organisationReference: asNonEmptyString(payload.organisationReference),
      tokenUse: asNonEmptyString(payload.token_use) ?? asNonEmptyString(payload.tokenUse),
    };
  } catch {
    return null;
  }
}

function sameReference(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Fail-closed validation of atriumUsageToken for a product /api request.
 * Returns null when the token is missing claims, bound to another connection,
 * rejected by COHO, or the outbound check fails.
 */
export async function validateUsageToken(
  apiBaseUrl: string,
  usageToken: string,
  expectedConnectionReference: string,
): Promise<UsageAuthResult | null> {
  if (!usageToken || !apiBaseUrl || !expectedConnectionReference) return null;

  const cacheKey = `${expectedConnectionReference}|${hashToken(usageToken)}`;
  const hit = usageAuthCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  const claims = decodeUsageTokenClaims(usageToken);
  if (!claims) return null;
  if (claims.tokenUse !== TOKEN_USE_ATRIUM_USAGE) return null;
  if (!sameReference(claims.connectionReference, expectedConnectionReference)) return null;

  const base = apiBaseUrl.replace(/\/+$/, '');
  const probeUrl = `${base}${USAGE_TOKEN_PROBE_PATH}`;
  let status = 0;
  try {
    const response = await outboundFetch(probeUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${usageToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(12_000),
    });
    status = response.status;
  } catch (err) {
    console.warn('[atrium-lettings-advice] usage-token probe failed', {
      probeUrl,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  if (status < 200 || status >= 300) {
    console.warn('[atrium-lettings-advice] usage-token probe rejected', { probeUrl, status });
    return null;
  }

  const result: UsageAuthResult = {
    personReference: claims.personReference,
    connectionReference: claims.connectionReference,
    organisationReference: claims.organisationReference,
  };
  pruneUsageAuthCache();
  usageAuthCache.set(cacheKey, {
    expiresAt: Date.now() + USAGE_AUTH_CACHE_TTL_MS,
    result,
  });
  return result;
}
