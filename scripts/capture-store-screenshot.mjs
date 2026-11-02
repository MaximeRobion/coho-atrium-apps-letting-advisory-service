/**
 * Serve a signed /ui and capture store/screenshot.png (1440x900 @2x).
 *
 * Usage:
 *   node --import tsx scripts/capture-store-screenshot.mjs
 *
 * Needs playwright + Chromium (`npm i` then `npx playwright install chromium`).
 * Hides #chat-error so a local usage-token probe failure does not spoil the Store card.
 */
import http from 'node:http';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { openDatabase } from '../src/db/database.js';
import * as repo from '../src/connections/repository.js';
import { createRequestListener } from '../src/server.js';
import { createSignatureHeader } from '../src/atrium/signature.js';

for (const file of ['.env', '.env.example']) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* ignore */
    }
  }
}

if (!process.env.TAWK_PROPERTY_ID || !process.env.TAWK_WIDGET_ID) {
  console.error('TAWK_PROPERTY_ID and TAWK_WIDGET_ID required (see .env.example)');
  process.exit(1);
}

delete process.env.ATRIUM_DEV_MODE;
process.env.NODE_ENV = 'production';
process.env.ATRIUM_DEV_FORCE_CHAT_OPEN = '0';

const CONNECTION = '11111111-1111-1111-1111-111111111111';
const SECRET = 'connection-signing-secret';
const PORT = Number(process.env.CAPTURE_PORT || 18081);
const OUT = process.env.CAPTURE_OUT || 'store/screenshot.png';

openDatabase(process.env.ATRIUM_DATA_DIR || './data');
repo.upsertConnection({
  connectionReference: CONNECTION,
  apiKey: 'k',
  apiBaseUrl: 'https://api.example.com',
  signingSecret: SECRET,
});

const tokenHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
const tokenPayload = Buffer.from(
  JSON.stringify({
    token_use: 'atrium_usage',
    personReference: 'PER-shot',
    connectionReference: CONNECTION,
    organisationReference: 'org-1',
  }),
).toString('base64url');
const usageToken = `${tokenHeader}.${tokenPayload}.sig`;

const path =
  `/ui?connectionReference=${CONNECTION}` +
  `&atriumUsageToken=${encodeURIComponent(usageToken)}` +
  `&theme=light`;
const sig = createSignatureHeader(SECRET, 'GET', path, CONNECTION, '');
const url = `http://127.0.0.1:${PORT}${path}&atriumSignature=${encodeURIComponent(sig)}`;

const server = http.createServer(createRequestListener({ setupBootstrapSecret: 'bootstrap' }));
await new Promise((resolve, reject) => {
  server.listen(PORT, '127.0.0.1', resolve);
  server.on('error', reject);
});

try {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#documents-root');
    await page.evaluate(() => {
      const err = document.getElementById('chat-error');
      if (err) {
        err.hidden = true;
        err.textContent = '';
      }
      document.getElementById('las-debug-strip')?.remove();
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: OUT });
    console.log(`Saved ${OUT} from ${url.split('&atriumSignature=')[0]}…`);
  } finally {
    await browser.close();
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
