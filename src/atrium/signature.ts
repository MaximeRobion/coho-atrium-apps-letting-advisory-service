import crypto from 'node:crypto';

export const ATRIUM_SIGNATURE_HEADER = 'x-atrium-signature';
export const DEFAULT_TOLERANCE_SECONDS = 300;
export const MAX_FUTURE_SKEW_SECONDS = 30;

export interface SignatureRequest {
  method: string;
  pathAndQuery: string;
  connectionReference: string;
}

export function pathAndQueryForSignature(url: URL): string {
  const query = url.search.startsWith('?') ? url.search.slice(1) : '';
  const filtered = query
    .split('&')
    .filter(
      (part) =>
        part &&
        part !== 'atriumSignature' &&
        !part.toLowerCase().startsWith('atriumsignature='),
    );
  return filtered.length ? `${url.pathname}?${filtered.join('&')}` : url.pathname;
}

export function verifyAtriumSignature(
  rawBody: string,
  signatureHeader: string | string[] | undefined,
  signingSecret: string,
  request: SignatureRequest,
  now: Date = new Date(),
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): boolean {
  const header = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (typeof rawBody !== 'string' || !header || !signingSecret) return false;
  if (!request?.method || !request?.pathAndQuery || !request?.connectionReference) return false;

  let timestamp: number | null = null;
  let v1: string | null = null;
  for (const part of header.split(',')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (key === 't') {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) timestamp = parsed;
    } else if (key === 'v1') {
      v1 = value.trim().toLowerCase();
    }
  }

  if (timestamp == null || !v1) return false;

  const nowSeconds = now.getTime() / 1000;
  if (timestamp > nowSeconds + MAX_FUTURE_SKEW_SECONDS) return false;
  if (nowSeconds - timestamp > toleranceSeconds) return false;

  const method = String(request.method).trim().toUpperCase();
  const signedPayload = `${timestamp}.${method}.${request.pathAndQuery}.${request.connectionReference}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', signingSecret)
    .update(signedPayload, 'utf8')
    .digest('hex')
    .toLowerCase();

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(v1, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/** Build a signature header for tests / local tooling. */
export function createSignatureHeader(
  secret: string,
  method: string,
  pathAndQuery: string,
  connectionReference: string,
  rawBody: string,
  timestampSeconds?: number,
): string {
  const t = timestampSeconds ?? Math.floor(Date.now() / 1000);
  const payload = `${t}.${method.toUpperCase()}.${pathAndQuery}.${connectionReference}.${rawBody}`;
  const v1 = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  return `t=${t},v1=${v1}`;
}

/** Published vectors from docs/atrium-app-developer-spec.md §3.1.1 */
export const PUBLISHED_TEST_VECTORS = [
  {
    method: 'POST',
    pathAndQuery: '/webhooks/atrium/setup',
    rawBody: '{"type":"lifecycle.setup","data":{}}',
    expectedV1: 'dff6a1bb99bc74adf1c24bfbae39f9b511582c98e3eda0a520e23b37feca56df',
  },
  {
    method: 'GET',
    pathAndQuery: '/config?connectionReference=11111111-1111-1111-1111-111111111111',
    rawBody: '',
    expectedV1: '7dde59340b9b657a939e69760412d0ba615a0052d74674399ba7df87f7e4b906',
  },
  {
    method: 'POST',
    pathAndQuery: '/webhooks/atrium/triggers/event',
    rawBody: '{"type":"event.tenancy.started","data":{"name":"Zoe"}}',
    expectedV1: 'f62b7d1059edffe1c88013f0a20c9dc5a96036ed722dc71f0f9d5687bedaad90',
  },
] as const;

export const VECTOR_SECRET = 'atrium_test_secret';
export const VECTOR_TIMESTAMP = 1767225600;
export const VECTOR_CONNECTION = '11111111-1111-1111-1111-111111111111';
