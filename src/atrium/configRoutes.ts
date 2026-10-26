import http from 'node:http';
import { URL } from 'node:url';
import { EMPTY_CONFIG_SCHEMA } from '../http/constants.js';
import { verifyConnectionSignature } from '../http/auth.js';
import { readRawBody, sendJson } from '../http/respond.js';

export async function handleConfigSchema(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<void> {
  const connectionReference = url.searchParams.get('connectionReference') || '';
  if (!verifyConnectionSignature(req, res, url, connectionReference, '')) return;
  sendJson(res, 200, EMPTY_CONFIG_SCHEMA);
}

export async function handleConfigGet(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<void> {
  const connectionReference = url.searchParams.get('connectionReference') || '';
  if (!verifyConnectionSignature(req, res, url, connectionReference, '')) return;
  sendJson(res, 200, {});
}

export async function handleConfigPut(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<void> {
  const connectionReference = url.searchParams.get('connectionReference') || '';
  const rawBody = await readRawBody(req);
  if (!verifyConnectionSignature(req, res, url, connectionReference, rawBody)) return;
  let body: unknown = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    sendJson(res, 400, { ok: false, message: 'Invalid JSON' });
    return;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body as object).length) {
    sendJson(res, 400, { ok: false, message: 'Config must be an empty object in v1' });
    return;
  }
  sendJson(res, 200, {});
}
