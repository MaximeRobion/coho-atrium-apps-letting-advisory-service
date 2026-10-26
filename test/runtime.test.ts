import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, test } from 'node:test';
import {
  clearUsageAuthCache,
  resetUsageAuthFetch,
  setUsageAuthFetch,
} from '../src/api/usageAuth.js';
import { resetDirectoryFetch, setDirectoryFetch } from '../src/api/cohoDirectory.js';
import { resetDeliveryDedupe } from '../src/atrium/deliveryDedupe.js';
import { createSignatureHeader } from '../src/atrium/signature.js';
import * as repo from '../src/connections/repository.js';
import { closeDatabase, openMemoryDatabase } from '../src/db/database.js';
import { createRequestListener, EMPTY_CONFIG_SCHEMA, QUICK_VIEW_PATH } from '../src/server.js';

const SETUP_SECRET = 'bootstrap-setup-secret';
const CONNECTION = '11111111-1111-1111-1111-111111111111';
const PERSON_REF = 'PER-test';
const PERSON_GUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function fakeUsageJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.sig`;
}

function usageTokenFor(connectionReference = CONNECTION, personReference = PERSON_REF): string {
  return fakeUsageJwt({
    token_use: 'atrium_usage',
    personReference,
    connectionReference,
    organisationReference: 'org-1',
  });
}

beforeEach(() => {
  openMemoryDatabase();
  resetDeliveryDedupe();
  clearUsageAuthCache();
  setUsageAuthFetch(async () => new Response(null, { status: 200 }));
  setDirectoryFetch(async (input) => {
    const url = String(input);
    if (url.includes('/organisation/users')) {
      return new Response(
        JSON.stringify({
          items: [
            {
              guid: PERSON_GUID,
              personReference: PERSON_REF,
              forename: 'Alex',
              surname: 'Manager',
              email: 'Alex@Example.COM',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (url.endsWith('/organisation')) {
      return new Response(JSON.stringify({ accountName: 'Dahlia Properties' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(null, { status: 404 });
  });
  delete process.env.ATRIUM_FRAME_ANCESTORS;
  delete process.env.TAWK_PROPERTY_ID;
  delete process.env.TAWK_WIDGET_ID;
  delete process.env.TAWK_API_KEY;
  delete process.env.ATRIUM_DEV_MODE;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  closeDatabase();
  resetDeliveryDedupe();
  resetUsageAuthFetch();
  resetDirectoryFetch();
  clearUsageAuthCache();
  delete process.env.TAWK_PROPERTY_ID;
  delete process.env.TAWK_WIDGET_ID;
  delete process.env.TAWK_API_KEY;
});

async function withServer(
  fn: (port: number) => Promise<void>,
): Promise<void> {
  const listener = createRequestListener({ setupBootstrapSecret: SETUP_SECRET });
  const server = http.createServer(listener);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(port);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

test('GET /health returns ok', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test('setup stores connection; disconnect wipes secrets', async () => {
  await withServer(async (port) => {
    const setupBody = JSON.stringify({
      type: 'lifecycle.setup',
      connectionReference: CONNECTION,
      organisationReference: 'org-1',
      data: {
        apiKey: 'api-key-guid',
        apiBaseUrl: 'https://api.example.com/',
        signingSecret: 'connection-signing-secret',
      },
    });
    const setupPath = '/webhooks/atrium/setup';
    const setupSig = createSignatureHeader(
      SETUP_SECRET,
      'POST',
      setupPath,
      CONNECTION,
      setupBody,
    );
    const setupRes = await fetch(`http://127.0.0.1:${port}${setupPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Atrium-Signature': setupSig,
        'X-Atrium-Delivery-Id': 'delivery-setup-1',
      },
      body: setupBody,
    });
    assert.equal(setupRes.status, 200);

    const connection = repo.getConnection(CONNECTION);
    assert.ok(connection);
    assert.equal(connection.apiKey, 'api-key-guid');
    assert.equal(connection.apiBaseUrl, 'https://api.example.com');

    const disconnectBody = JSON.stringify({
      type: 'lifecycle.disconnect',
      connectionReference: CONNECTION,
    });
    const disconnectPath = '/webhooks/atrium/disconnect';
    const disconnectSig = createSignatureHeader(
      'connection-signing-secret',
      'POST',
      disconnectPath,
      CONNECTION,
      disconnectBody,
    );
    const disconnectRes = await fetch(`http://127.0.0.1:${port}${disconnectPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Atrium-Signature': disconnectSig,
        'X-Atrium-Delivery-Id': 'delivery-disconnect-1',
      },
      body: disconnectBody,
    });
    assert.equal(disconnectRes.status, 200);
    assert.equal(repo.getConnection(CONNECTION), null);
  });
});

test('signed empty config schema/get/put', async () => {
  await withServer(async (port) => {
    repo.upsertConnection({
      connectionReference: CONNECTION,
      apiKey: 'k',
      apiBaseUrl: 'https://api.example.com',
      signingSecret: 'connection-signing-secret',
    });

    const schemaPath = `/config/schema?connectionReference=${CONNECTION}`;
    const schemaSig = createSignatureHeader(
      'connection-signing-secret',
      'GET',
      schemaPath,
      CONNECTION,
      '',
    );
    const schemaRes = await fetch(`http://127.0.0.1:${port}${schemaPath}`, {
      headers: { 'X-Atrium-Signature': schemaSig },
    });
    assert.equal(schemaRes.status, 200);
    assert.deepEqual(await schemaRes.json(), EMPTY_CONFIG_SCHEMA);

    const getPath = `/config?connectionReference=${CONNECTION}`;
    const getSig = createSignatureHeader(
      'connection-signing-secret',
      'GET',
      getPath,
      CONNECTION,
      '',
    );
    const getRes = await fetch(`http://127.0.0.1:${port}${getPath}`, {
      headers: { 'X-Atrium-Signature': getSig },
    });
    assert.equal(getRes.status, 200);
    assert.deepEqual(await getRes.json(), {});

    const putBody = '{}';
    const putPath = `/config?connectionReference=${CONNECTION}`;
    const putSig = createSignatureHeader(
      'connection-signing-secret',
      'PUT',
      putPath,
      CONNECTION,
      putBody,
    );
    const putRes = await fetch(`http://127.0.0.1:${port}${putPath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Atrium-Signature': putSig,
      },
      body: putBody,
    });
    assert.equal(putRes.status, 200);
  });
});

test('visitor hash endpoint returns Secure Mode login when key set', async () => {
  process.env.TAWK_PROPERTY_ID = 'tawk-property-test';
  process.env.TAWK_WIDGET_ID = 'tawk-widget-test';
  process.env.TAWK_API_KEY = 'unit-test-api-key';

  await withServer(async (port) => {
    repo.upsertConnection({
      connectionReference: CONNECTION,
      apiKey: 'k',
      apiBaseUrl: 'https://api.example.com',
      signingSecret: 'connection-signing-secret',
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/tawk/visitor`, {
      headers: {
        Authorization: `Bearer ${usageTokenFor()}`,
        'X-Atrium-Connection-Reference': CONNECTION,
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      ok: boolean;
      secureModeEnabled: boolean;
      login: { userId: string; hash: string; name: string; email: string };
    };
    assert.equal(body.ok, true);
    assert.equal(body.secureModeEnabled, true);
    assert.equal(body.login.userId, PERSON_GUID);
    assert.equal(body.login.email, 'alex@example.com');
    assert.equal(body.login.name, 'Dahlia Properties - Alex Manager');
    assert.match(body.login.hash, /^[a-f0-9]{64}$/);
  });
});

test('visitor endpoint degrades without TAWK_API_KEY', async () => {
  process.env.TAWK_PROPERTY_ID = 'tawk-property-test';
  process.env.TAWK_WIDGET_ID = 'tawk-widget-test';
  delete process.env.TAWK_API_KEY;

  await withServer(async (port) => {
    repo.upsertConnection({
      connectionReference: CONNECTION,
      apiKey: 'k',
      apiBaseUrl: 'https://api.example.com',
      signingSecret: 'connection-signing-secret',
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/tawk/visitor`, {
      headers: {
        Authorization: `Bearer ${usageTokenFor()}`,
        'X-Atrium-Connection-Reference': CONNECTION,
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      ok: boolean;
      secureModeEnabled: boolean;
      login: null;
      embedUrl: string;
    };
    assert.equal(body.ok, true);
    assert.equal(body.secureModeEnabled, false);
    assert.equal(body.login, null);
    assert.match(body.embedUrl, /embed\.tawk\.to/);
  });
});

test('signed /ui returns HTML with Tawk-friendly CSP', async () => {
  process.env.TAWK_PROPERTY_ID = 'prop';
  process.env.TAWK_WIDGET_ID = 'widget';

  await withServer(async (port) => {
    repo.upsertConnection({
      connectionReference: CONNECTION,
      apiKey: 'k',
      apiBaseUrl: 'https://api.example.com',
      signingSecret: 'connection-signing-secret',
    });

    const path =
      `${QUICK_VIEW_PATH}?connectionReference=${CONNECTION}` +
      `&atriumUsageToken=${encodeURIComponent(usageTokenFor())}`;
    const sig = createSignatureHeader(
      'connection-signing-secret',
      'GET',
      path,
      CONNECTION,
      '',
    );
    const res = await fetch(`http://127.0.0.1:${port}${path}&atriumSignature=${encodeURIComponent(sig)}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const csp = res.headers.get('content-security-policy') || '';
    assert.match(csp, /embed\.tawk\.to/);
    const html = await res.text();
    assert.match(html, /Lettings Advice Service/);
    assert.match(html, /Open chat/);
  });
});
