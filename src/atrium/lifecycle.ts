import http from 'node:http';
import { URL } from 'node:url';
import { ApiBaseUrlError, normaliseApiBaseUrl } from '../api/apiBaseUrl.js';
import * as repo from '../connections/repository.js';
import { verifyConnectionSignature } from '../http/auth.js';
import { header, sendJson } from '../http/respond.js';
import { markDeliverySeen, wasDeliverySeen } from './deliveryDedupe.js';
import { postAtriumLog } from './logs.js';
import {
  ATRIUM_SIGNATURE_HEADER,
  pathAndQueryForSignature,
  verifyAtriumSignature,
} from './signature.js';

export async function handleSetup(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  setupBootstrapSecret: string,
  rawBody: string,
): Promise<void> {
  let envelope: Record<string, unknown>;
  try {
    envelope = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    sendJson(res, 400, { ok: false, message: 'Invalid JSON' });
    return;
  }

  const data =
    envelope?.data && typeof envelope.data === 'object'
      ? (envelope.data as Record<string, unknown>)
      : {};
  const setupSecret = typeof data.signingSecret === 'string' ? data.signingSecret : '';
  if (!setupSecret) {
    sendJson(res, 401, { ok: false, message: 'Missing signing secret in setup' });
    return;
  }

  const connectionReference = String(envelope.connectionReference || '');
  if (!connectionReference) {
    sendJson(res, 400, { ok: false, message: 'Missing connectionReference' });
    return;
  }

  if (
    !verifyAtriumSignature(rawBody, req.headers[ATRIUM_SIGNATURE_HEADER], setupBootstrapSecret, {
      method: req.method || 'POST',
      pathAndQuery: pathAndQueryForSignature(url),
      connectionReference,
    })
  ) {
    sendJson(res, 401, { ok: false, message: 'Invalid signature' });
    return;
  }

  const deliveryId = header(req, 'x-atrium-delivery-id') || String(envelope.deliveryId || '');
  if (wasDeliverySeen(deliveryId)) {
    sendJson(res, 200, { ok: true, deduped: true });
    return;
  }

  const apiKey = typeof data.apiKey === 'string' ? data.apiKey : '';
  let apiBaseUrl: string;
  try {
    apiBaseUrl = normaliseApiBaseUrl(
      typeof data.apiBaseUrl === 'string' ? data.apiBaseUrl : '',
    );
  } catch (err) {
    const message = err instanceof ApiBaseUrlError ? err.message : 'Invalid apiBaseUrl';
    sendJson(res, 400, { ok: false, message });
    return;
  }

  repo.upsertConnection({
    connectionReference,
    apiKey,
    apiBaseUrl,
    signingSecret: setupSecret,
  });
  markDeliverySeen(deliveryId);

  console.log('[atrium-lettings-advice] setup', {
    connectionReference,
    organisationReference: envelope.organisationReference,
    apiBaseUrl,
  });

  void postAtriumLog(apiBaseUrl, apiKey, {
    level: 'info',
    message: 'Lettings Advice Service connected',
    deliveryId: deliveryId || undefined,
  });

  sendJson(res, 200, { ok: true });
}

export async function handleDisconnect(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  rawBody: string,
): Promise<void> {
  let envelope: Record<string, unknown>;
  try {
    envelope = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    sendJson(res, 400, { ok: false, message: 'Invalid JSON' });
    return;
  }

  const connectionReference = String(envelope.connectionReference || '');
  if (!verifyConnectionSignature(req, res, url, connectionReference, rawBody)) return;

  const deliveryId = header(req, 'x-atrium-delivery-id') || String(envelope.deliveryId || '');
  if (wasDeliverySeen(deliveryId)) {
    sendJson(res, 200, { ok: true, deduped: true });
    return;
  }

  const prior = repo.getConnection(connectionReference);
  repo.deleteConnectionData(connectionReference);
  markDeliverySeen(deliveryId);

  if (prior) {
    void postAtriumLog(prior.apiBaseUrl, prior.apiKey, {
      level: 'info',
      message: 'Lettings Advice Service disconnected; connection secrets wiped',
      deliveryId: deliveryId || undefined,
    });
  }

  sendJson(res, 200, { ok: true });
}
