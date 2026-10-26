import http from 'node:http';
import { URL } from 'node:url';
import { handleProductApi } from './api/productRoutes.js';
import {
  handleConfigGet,
  handleConfigPut,
  handleConfigSchema,
} from './atrium/configRoutes.js';
import { handleDisconnect, handleSetup } from './atrium/lifecycle.js';
import {
  EMPTY_CONFIG_SCHEMA,
  MAX_BODY_BYTES,
  QUICK_VIEW_PATH,
  type ServerOptions,
} from './http/constants.js';
import { readRawBody, sendJson } from './http/respond.js';
import { parentOrigin, sanitizeFrameAncestors } from './ui/csp.js';
import { handleQuickView } from './ui/serveQuickView.js';

export {
  EMPTY_CONFIG_SCHEMA,
  MAX_BODY_BYTES,
  QUICK_VIEW_PATH,
  type ServerOptions,
};

export function createRequestListener(options: ServerOptions): http.RequestListener {
  const setupBootstrapSecret = options.setupBootstrapSecret;

  return async (req, res) => {
    try {
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url || '/', `http://${host}`);
      const method = (req.method || 'GET').toUpperCase();

      if (url.pathname === '/health' && method === 'GET') {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (url.pathname === '/webhooks/atrium/setup' && method === 'POST') {
        const rawBody = await readRawBody(req);
        await handleSetup(req, res, url, setupBootstrapSecret, rawBody);
        return;
      }

      if (url.pathname === '/webhooks/atrium/disconnect' && method === 'POST') {
        const rawBody = await readRawBody(req);
        await handleDisconnect(req, res, url, rawBody);
        return;
      }

      if (url.pathname === '/config/schema' && method === 'GET') {
        await handleConfigSchema(req, res, url);
        return;
      }

      if (url.pathname === '/config' && method === 'GET') {
        await handleConfigGet(req, res, url);
        return;
      }

      if (url.pathname === '/config' && method === 'PUT') {
        await handleConfigPut(req, res, url);
        return;
      }

      if (url.pathname === QUICK_VIEW_PATH && method === 'GET') {
        await handleQuickView(req, res, url);
        return;
      }

      if (await handleProductApi(req, res, url)) return;

      sendJson(res, 404, { ok: false, message: 'Not found' });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode || 500;
      if (status === 413) {
        sendJson(res, 413, { ok: false, message: 'Payload too large' });
        return;
      }
      console.error('[atrium-lettings-advice] request failed', err);
      sendJson(res, 500, { ok: false, message: 'Internal error' });
    }
  };
}

export function createServer(options: ServerOptions): http.Server {
  return http.createServer(createRequestListener(options));
}

export { parentOrigin, sanitizeFrameAncestors };
