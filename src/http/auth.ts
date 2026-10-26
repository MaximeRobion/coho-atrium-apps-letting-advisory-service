import http from 'node:http';
import { URL } from 'node:url';
import { validateUsageToken } from '../api/usageAuth.js';
import {
  ATRIUM_SIGNATURE_HEADER,
  pathAndQueryForSignature,
  verifyAtriumSignature,
} from '../atrium/signature.js';
import * as repo from '../connections/repository.js';
import {
  isAtriumDevMode,
  LOCAL_DEV_ACTOR,
  localDevUsageToken,
} from '../dev/devMode.js';
import { header, sendJson } from './respond.js';

export function usageTokenFromReq(req: http.IncomingMessage): string {
  const auth = header(req, 'authorization');
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return '';
}

export function connectionFromReq(req: http.IncomingMessage, url: URL): string {
  return (
    header(req, 'x-atrium-connection-reference') ||
    url.searchParams.get('connectionReference') ||
    ''
  );
}

/**
 * Product /api auth: require a known connection + Bearer atriumUsageToken that
 * COHO accepts, bound to this connection. Actor is always the token's
 * personReference — never X-Atrium-Person-Reference (or body fields).
 */
export async function requireProductAuth(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<{ connectionReference: string; usageToken: string; actorReference: string } | null> {
  const connectionReference = connectionFromReq(req, url);
  if (!connectionReference) {
    sendJson(res, 400, { ok: false, message: 'connectionReference required' });
    return null;
  }
  const connection = repo.getConnection(connectionReference);
  if (!connection) {
    sendJson(res, 401, { ok: false, message: 'Unknown connection' });
    return null;
  }

  // Local UI only: skip COHO usage-token probe. Fail-closed outside NODE_ENV=development.
  if (isAtriumDevMode()) {
    const usageToken = usageTokenFromReq(req) || localDevUsageToken(connectionReference);
    return {
      connectionReference,
      usageToken,
      actorReference: LOCAL_DEV_ACTOR,
    };
  }

  const usageToken = usageTokenFromReq(req);
  if (!usageToken) {
    sendJson(res, 401, { ok: false, message: 'Bearer atriumUsageToken required' });
    return null;
  }

  const validated = await validateUsageToken(
    connection.apiBaseUrl,
    usageToken,
    connectionReference,
  );
  if (!validated) {
    sendJson(res, 401, { ok: false, message: 'Invalid or expired atriumUsageToken' });
    return null;
  }

  return {
    connectionReference,
    usageToken,
    actorReference: validated.personReference,
  };
}

export function verifyBrowserLaunch(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): string | null {
  const connectionReference = url.searchParams.get('connectionReference') || '';
  const connection = repo.getConnection(connectionReference);

  // Local UI only: skip atriumSignature. Still requires a known connection.
  if (isAtriumDevMode()) {
    if (!connection) {
      sendJson(res, 401, { ok: false, message: 'Unknown connection' });
      return null;
    }
    return connectionReference;
  }

  const secret = connection?.signingSecret;
  if (
    !secret ||
    !verifyAtriumSignature('', url.searchParams.get('atriumSignature') || '', secret, {
      method: req.method || 'GET',
      pathAndQuery: pathAndQueryForSignature(url),
      connectionReference,
    })
  ) {
    sendJson(res, 401, { ok: false, message: 'Invalid signature' });
    return null;
  }
  return connectionReference;
}

export function verifyConnectionSignature(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  connectionReference: string,
  rawBody: string,
  signatureHeaderOverride?: string,
): boolean {
  if (!connectionReference) {
    sendJson(res, 400, { ok: false, message: 'connectionReference required' });
    return false;
  }
  const connection = repo.getConnection(connectionReference);
  if (!connection?.signingSecret) {
    sendJson(res, 401, { ok: false, message: 'Unknown connection' });
    return false;
  }
  const sigHeader = signatureHeaderOverride || req.headers[ATRIUM_SIGNATURE_HEADER];
  if (
    !verifyAtriumSignature(rawBody, sigHeader, connection.signingSecret, {
      method: req.method || '',
      pathAndQuery: pathAndQueryForSignature(url),
      connectionReference,
    })
  ) {
    sendJson(res, 401, { ok: false, message: 'Invalid signature' });
    return false;
  }
  return true;
}
