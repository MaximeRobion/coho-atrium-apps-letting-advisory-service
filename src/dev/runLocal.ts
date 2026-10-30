/**
 * Cross-platform local UI entrypoint.
 * Sets fail-closed dev flags, opens SQLite, seeds connection, starts the server.
 *
 * Usage: npm run dev   |   npm run dev:watch
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.ATRIUM_DEV_MODE = process.env.ATRIUM_DEV_MODE || '1';
process.env.ATRIUM_DATA_DIR = process.env.ATRIUM_DATA_DIR || './data';
process.env.PORT = process.env.PORT || '8080';

import { openDatabase } from '../db/database.js';
import { createServer } from '../server.js';
import { isAtriumDevMode, LOCAL_DEV_CONNECTION, localDevUsageToken } from './devMode.js';
import { seedLocalDevData } from './seedLocal.js';

const port = Number(process.env.PORT || 8080);
const dataDir = process.env.ATRIUM_DATA_DIR || './data';
const setupSecret = process.env.ATRIUM_SETUP_SECRET || 'dev-setup-secret';

if (!isAtriumDevMode()) {
  console.error(
    '[atrium-lettings-advice] runLocal requires NODE_ENV=development and ATRIUM_DEV_MODE=1 (fail-closed)',
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
    '[atrium-lettings-advice] Local/dev chat uses the COHO test Tawk Inline widget (FORCE_CHAT_OPEN on). Hosting still uses Julie LAS defaults.',
  );
});
