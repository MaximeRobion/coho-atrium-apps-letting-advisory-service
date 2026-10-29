import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, test } from 'node:test';
import {
  clearUsageAuthCache,
  resetUsageAuthFetch,
  setUsageAuthFetch,
} from '../src/api/usageAuth.js';
import { resetDeliveryDedupe } from '../src/atrium/deliveryDedupe.js';
import { createSignatureHeader } from '../src/atrium/signature.js';
import * as repo from '../src/connections/repository.js';
import { closeDatabase, openMemoryDatabase } from '../src/db/database.js';
import { createRequestListener, EMPTY_CONFIG_SCHEMA, QUICK_VIEW_PATH } from '../src/server.js';

const SETUP_SECRET = 'bootstrap-setup-secret';
const CONNECTION = '11111111-1111-1111-1111-111111111111';
const PERSON_REF = 'PER-test';

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
  delete process.env.ATRIUM_FRAME_ANCESTORS;
  delete process.env.TAWK_PROPERTY_ID;
  delete process.env.TAWK_WIDGET_ID;
  delete process.env.TAWK_API_KEY;
  delete process.env.TAWK_KNOWLEDGE_BASE_URL;
  delete process.env.ATRIUM_DEV_MODE;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  closeDatabase();
  resetDeliveryDedupe();
  resetUsageAuthFetch();
  clearUsageAuthCache();
  delete process.env.TAWK_PROPERTY_ID;
  delete process.env.TAWK_WIDGET_ID;
  delete process.env.TAWK_API_KEY;
  delete process.env.TAWK_KNOWLEDGE_BASE_URL;
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

test('tawk config returns embed + knowledge base; never exposes api key', async () => {
  process.env.TAWK_API_KEY = 'unit-test-api-key-must-not-leak';

  await withServer(async (port) => {
    repo.upsertConnection({
      connectionReference: CONNECTION,
      apiKey: 'k',
      apiBaseUrl: 'https://api.example.com',
      signingSecret: 'connection-signing-secret',
    });

    const res = await fetch(`http://127.0.0.1:${port}/api/tawk/config`, {
      headers: {
        Authorization: `Bearer ${usageTokenFor()}`,
        'X-Atrium-Connection-Reference': CONNECTION,
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.ok, true);
    assert.equal(
      body.embedUrl,
      'https://embed.tawk.to/687cb5a73606072bf84a6030/1j0jib5sb',
    );
    assert.equal(body.knowledgeBaseUrl, 'https://lettingadviceservice.tawk.help');
    assert.equal(body.configured, true);
    assert.equal(body.apiKey, undefined);
    assert.equal(body.secureModeEnabled, undefined);
    const raw = JSON.stringify(body);
    assert.doesNotMatch(raw, /unit-test-api-key/);
  });
});

test('visitor Secure Mode route is removed', async () => {
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
    assert.equal(res.status, 404);
  });
});

test('signed /ui returns HTML with documents + chat and Tawk-friendly CSP', async () => {
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
    assert.doesNotMatch(csp, /tawk\.help/);
    const html = await res.text();
    assert.match(html, /Lettings Advice Service/);
    assert.match(html, /nav-documents/);
    assert.match(html, /nav-chat/);
    assert.match(html, />Documents</);
    assert.match(html, />Chat</);
    assert.match(html, /panel-documents/);
    assert.match(html, /panel-chat/);
    assert.match(html, /documents-root/);
    assert.match(html, /DOCUMENT_CATALOGUE/);
    assert.match(html, /LasDocuments/);
    assert.doesNotMatch(html, /Guides, free templates, and videos from Lettings Advice Service/);
    assert.doesNotMatch(html, /library-frame/);
    assert.doesNotMatch(html, /lettingadviceservice\.tawk\.help/);
    assert.match(html, /Tawk_API\.embedded/);
    assert.match(html, /Tawk_API\.autoStart\s*=\s*false/);
    assert.match(html, /getChatHoursStatus/);
    assert.match(html, /onStatusChange/);
    assert.match(html, /chat-out-of-hours/);
    assert.doesNotMatch(html, /Chat is out of hours/);
    assert.match(html, /We're currently offline/);
    assert.match(html, /Europe\/London/);
    assert.doesNotMatch(html, /Expert property guides and resources/);
    assert.doesNotMatch(html, /Free templates and letters/);
    assert.doesNotMatch(html, /Video tutorials from Lettings Advice Service/);
    assert.doesNotMatch(html, /<h2 class="heading--2">Documents<\/h2>/);
    assert.doesNotMatch(html, /id="documents-breadcrumb"/);
    assert.doesNotMatch(html, /id="documents-back"/);
    assert.doesNotMatch(html, />Filter</);
    assert.match(html, /grid-span-sm-4/);
    assert.match(html, /aria-current="true"/);
    assert.match(html, /documents-row-title/);
    assert.match(html, /'Watch<\/button>'/);
    assert.doesNotMatch(html, /Watch now/);
    assert.doesNotMatch(html, /Watch on YouTube/);
    assert.doesNotMatch(html, /data-action="download"/);
    assert.match(html, /youtube-nocookie\.com\/embed\//);
    assert.match(html, /icon-cross/);
    assert.match(html, /documents-row-player/);
    assert.doesNotMatch(html, /documents-video-host/);
    assert.doesNotMatch(html, /<thead>/);
    // Markup must not use coloured filter variants (class names still appear in inlined coho.css).
    assert.doesNotMatch(
      html,
      /class="[^"]*card__filters--(?:action|progress|active)[^"]*"/,
    );
    assert.match(html, /\[id\^=['"]tawk_/);
    assert.doesNotMatch(html, /Open in new tab/);
    assert.doesNotMatch(html, /Showing the Tawk Knowledge Base/);
    assert.doesNotMatch(html, /Chat ready/);
    assert.doesNotMatch(html, /id="back-home/);
    assert.doesNotMatch(html, /id="close-(home|chat|library)"/);
    assert.doesNotMatch(html, /Tawk_API\.login/);
    assert.doesNotMatch(html, /Secure Mode/);

    const scriptBlocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map(
      (match) => match[1] || '',
    );
    const bootstrapScript =
      scriptBlocks.find((block) => block.includes('DOCUMENT_CATALOGUE')) || '';
    assert.ok(bootstrapScript, 'expected DOCUMENT_CATALOGUE bootstrap script');
    const guides = (bootstrapScript.match(/"category":"guides"/g) || []).length;
    const templates = (bootstrapScript.match(/"category":"templates"/g) || []).length;
    const videos = (bootstrapScript.match(/"category":"videos"/g) || []).length;
    assert.equal(guides, 67);
    assert.equal(templates, 48);
    assert.equal(videos, 22);
    const catalogueAssign = bootstrapScript.indexOf('const DOCUMENT_CATALOGUE =');
    const documentsModule = bootstrapScript.indexOf('Documents tab:');
    assert.ok(catalogueAssign >= 0, 'expected DOCUMENT_CATALOGUE assign');
    assert.ok(documentsModule >= 0, 'expected las-documents module');
    assert.ok(
      catalogueAssign < documentsModule,
      'DOCUMENT_CATALOGUE must be injected before las-documents.js runs (otherwise Documents stays empty)',
    );
    assert.doesNotThrow(() => new Function(bootstrapScript));
  });
});

