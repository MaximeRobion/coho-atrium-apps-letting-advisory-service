import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PUBLISHED_TEST_VECTORS,
  VECTOR_CONNECTION,
  VECTOR_SECRET,
  VECTOR_TIMESTAMP,
  createSignatureHeader,
  verifyAtriumSignature,
} from '../src/atrium/signature.js';

test('published signature test vectors verify', () => {
  const now = new Date(VECTOR_TIMESTAMP * 1000);
  for (const vector of PUBLISHED_TEST_VECTORS) {
    const header = `t=${VECTOR_TIMESTAMP},v1=${vector.expectedV1}`;
    const ok = verifyAtriumSignature(vector.rawBody, header, VECTOR_SECRET, {
      method: vector.method,
      pathAndQuery: vector.pathAndQuery,
      connectionReference: VECTOR_CONNECTION,
    }, now);
    assert.equal(ok, true, `vector ${vector.method} ${vector.pathAndQuery}`);
  }
});

test('rejects tampered body, wrong path, wrong v1, stale and future timestamps', () => {
  const vector = PUBLISHED_TEST_VECTORS[0]!;
  const now = new Date(VECTOR_TIMESTAMP * 1000);
  const goodHeader = `t=${VECTOR_TIMESTAMP},v1=${vector.expectedV1}`;

  assert.equal(
    verifyAtriumSignature('{"type":"lifecycle.setup","data":{"x":1}}', goodHeader, VECTOR_SECRET, {
      method: vector.method,
      pathAndQuery: vector.pathAndQuery,
      connectionReference: VECTOR_CONNECTION,
    }, now),
    false,
  );

  assert.equal(
    verifyAtriumSignature(vector.rawBody, goodHeader, VECTOR_SECRET, {
      method: 'GET',
      pathAndQuery: vector.pathAndQuery,
      connectionReference: VECTOR_CONNECTION,
    }, now),
    false,
  );

  assert.equal(
    verifyAtriumSignature(vector.rawBody, `t=${VECTOR_TIMESTAMP},v1=${'0'.repeat(64)}`, VECTOR_SECRET, {
      method: vector.method,
      pathAndQuery: vector.pathAndQuery,
      connectionReference: VECTOR_CONNECTION,
    }, now),
    false,
  );

  assert.equal(
    verifyAtriumSignature(vector.rawBody, goodHeader, VECTOR_SECRET, {
      method: vector.method,
      pathAndQuery: vector.pathAndQuery,
      connectionReference: VECTOR_CONNECTION,
    }, new Date((VECTOR_TIMESTAMP + 400) * 1000)),
    false,
  );

  assert.equal(
    verifyAtriumSignature(vector.rawBody, goodHeader, VECTOR_SECRET, {
      method: vector.method,
      pathAndQuery: vector.pathAndQuery,
      connectionReference: VECTOR_CONNECTION,
    }, new Date((VECTOR_TIMESTAMP - 60) * 1000)),
    false,
  );
});

test('createSignatureHeader round-trips with verifier', () => {
  const now = Math.floor(Date.now() / 1000);
  const header = createSignatureHeader(
    'local-secret',
    'POST',
    '/webhooks/atrium/setup',
    VECTOR_CONNECTION,
    '{}',
    now,
  );
  assert.equal(
    verifyAtriumSignature('{}', header, 'local-secret', {
      method: 'POST',
      pathAndQuery: '/webhooks/atrium/setup',
      connectionReference: VECTOR_CONNECTION,
    }),
    true,
  );
});
