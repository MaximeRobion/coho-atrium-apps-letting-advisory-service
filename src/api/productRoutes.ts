import http from 'node:http';
import { URL } from 'node:url';
import { requireProductAuth } from '../http/auth.js';
import { sendJson } from '../http/respond.js';
import { readTawkConfig } from '../tawk/config.js';

/**
 * Product API (usage-token gated).
 * GET /api/tawk/config — embed IDs + knowledge base URL (never the API key)
 *
 * Secure Mode visitor login (`/api/tawk/visitor`, Tawk_API.login) is intentionally
 * omitted — another team shares the Tawk property.
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
      knowledgeBaseUrl: tawk.knowledgeBaseUrl || null,
      configured: Boolean(tawk.embedUrl),
    });
    return true;
  }

  sendJson(res, 404, { ok: false, message: 'Not found' });
  return true;
}
