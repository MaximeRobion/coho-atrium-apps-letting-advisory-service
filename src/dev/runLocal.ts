/**
 * Cross-platform local UI entrypoint.
 * Sets fail-closed dev flags, opens SQLite, seeds connection, starts the server.
 *
 * Usage: npm run dev   |   npm run dev:watch
 *
 * Loads `.env` then `.env.example` (existing keys win). Put TAWK_* there — nothing
 * is baked into application code.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.ATRIUM_DEV_MODE = process.env.ATRIUM_DEV_MODE || '1';
process.env.ATRIUM_DATA_DIR = process.env.ATRIUM_DATA_DIR || './data';
process.env.PORT = process.env.PORT || '8080';

import { existsSync } from 'node:fs';
import { openDatabase } from '../db/database.js';
import { createServer } from '../server.js';
import { readTawkConfig } from '../tawk/config.js';
import { isAtriumDevMode, LOCAL_DEV_CONNECTION, localDevUsageToken } from './devMode.js';
import { seedLocalDevData } from './seedLocal.js';

function loadLocalEnvFiles(): void {
  // Node: later files do not override keys already set.
  for (const file of ['.env', '.env.example'] as const) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
    } catch (err) {
      console.warn(
        `[atrium-lettings-advice] could not load ${file}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

loadLocalEnvFiles();

const port = Number(process.env.PORT || 8080);
const dataDir = process.env.ATRIUM_DATA_DIR || './data';
const setupSecret = process.env.ATRIUM_SETUP_SECRET || 'dev-setup-secret';

if (!isAtriumDevMode()) {
  console.error(
    '[atrium-lettings-advice] runLocal requires NODE_ENV=development and ATRIUM_DEV_MODE=1 (fail-closed)',
  );
  process.exit(1);
}

const tawk = readTawkConfig();
if (!tawk.embedUrl) {
  console.error(
    '[atrium-lettings-advice] TAWK_PROPERTY_ID and TAWK_WIDGET_ID are required. Copy .env.example to .env or set them in the environment.',
  );
  process.exit(1);
}

openDatabase(dataDir);
const force = process.env.ATRIUM_DEV_RESEED === '1';
const seed = seedLocalDevData({ force });

const server = createServer({ setupBootstrapSecret: setupSecret });
server.listen(port, '127.0.0.1', () => {
  const uiUrl =
    `http://127.0.0.1:${port}/ui?connectionReference=${encodeURIComponent(LOCAL_DEV_CONNECTION)}` +
    `&atriumUsageToken=${encodeURIComponent(localDevUsageToken())}`;
  console.log(`[atrium-lettings-advice] local UI listening on http://127.0.0.1:${port}`);
  console.log(`[atrium-lettings-advice] dataDir=${dataDir} seed=${JSON.stringify(seed)}`);
  console.log(`[atrium-lettings-advice] open: ${uiUrl}`);
  console.log(
    `[atrium-lettings-advice] Tawk embed from env: ${tawk.embedUrl} (FORCE_CHAT_OPEN on unless ATRIUM_DEV_FORCE_CHAT_OPEN=0).`,
  );
});
