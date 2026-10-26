import http from 'node:http';
import { URL } from 'node:url';
import * as repo from '../connections/repository.js';
import { requireProductAuth } from '../http/auth.js';
import { sendJson } from '../http/respond.js';
import { readTawkConfig } from '../tawk/config.js';
import { mintTawkVisitorHash } from '../tawk/hash.js';
import { resolveVisitorIdentity } from './cohoDirectory.js';
import { decodeUsageTokenClaims } from './usageAuth.js';

/**
 * Product API (usage-token gated).
 * GET /api/tawk/config — embed IDs (never the API key)
 * GET /api/tawk/visitor — Secure Mode login payload (hash when key present)
 */
export async function handleProductApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<boolean> {
  const method = (req.method || 'GET').toUpperCase();
  if (!url.pathname.startsWith('/api/')) return false;

  if (url.pathname === '/api/tawk/config' && method === 'GET') {
    const auth = await requireProductAuth(req, res, url);
    if (!auth) return true;
    const tawk = readTawkConfig();
    sendJson(res, 200, {
      ok: true,
      propertyId: tawk.propertyId || null,
      widgetId: tawk.widgetId || null,
      embedUrl: tawk.embedUrl,
      secureModeEnabled: tawk.secureModeEnabled,
      configured: Boolean(tawk.embedUrl),
    });
    return true;
  }

  if (url.pathname === '/api/tawk/visitor' && method === 'GET') {
    const auth = await requireProductAuth(req, res, url);
    if (!auth) return true;

    const connection = repo.getConnection(auth.connectionReference);
    if (!connection) {
      sendJson(res, 401, { ok: false, message: 'Unknown connection' });
      return true;
    }

    const tawk = readTawkConfig();
    if (!tawk.embedUrl) {
      sendJson(res, 503, {
        ok: false,
        message: 'Tawk widget is not configured (TAWK_PROPERTY_ID / TAWK_WIDGET_ID)',
        secureModeEnabled: false,
      });
      return true;
    }

    const claims = decodeUsageTokenClaims(auth.usageToken);
    const personReference = claims?.personReference || auth.actorReference;

    const identity = await resolveVisitorIdentity(
      connection.apiBaseUrl,
      auth.usageToken,
      personReference,
    );
    if (!identity) {
      sendJson(res, 502, {
        ok: false,
        message: 'Could not resolve manager identity from Public API',
        secureModeEnabled: tawk.secureModeEnabled,
      });
      return true;
    }

    if (!tawk.apiKey) {
      // Graceful degrade: widget still loads; client skips Tawk_API.login.
      sendJson(res, 200, {
        ok: true,
        secureModeEnabled: false,
        login: null,
        reason: 'TAWK_API_KEY missing or Secure Mode off — widget will load without visitor login',
        embedUrl: tawk.embedUrl,
      });
      return true;
    }

    let hash: string;
    try {
      hash = mintTawkVisitorHash(identity.userId, tawk.apiKey);
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        message: err instanceof Error ? err.message : 'Failed to mint visitor hash',
      });
      return true;
    }

    sendJson(res, 200, {
      ok: true,
      secureModeEnabled: true,
      embedUrl: tawk.embedUrl,
      login: {
        userId: identity.userId.toLowerCase(),
        hash,
        name: identity.name,
        email: identity.email,
      },
    });
    return true;
  }

  sendJson(res, 404, { ok: false, message: 'Not found' });
  return true;
}
