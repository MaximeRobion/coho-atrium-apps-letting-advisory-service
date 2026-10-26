import { openDatabase } from './db/database.js';
import { createServer } from './server.js';

const port = Number(process.env.PORT || 8080);
const dataDir = process.env.ATRIUM_DATA_DIR || './data';
const setupSecret = process.env.ATRIUM_SETUP_SECRET || '';

if (!setupSecret) {
  const allowEmpty =
    process.env.ATRIUM_ALLOW_EMPTY_SETUP_SECRET === '1' ||
    process.env.NODE_ENV === 'development';
  if (!allowEmpty) {
    console.error(
      '[atrium-lettings-advice] ATRIUM_SETUP_SECRET is required — refusing to start with an empty setup secret',
    );
    process.exit(1);
  }
  console.warn(
    '[atrium-lettings-advice] ATRIUM_SETUP_SECRET is empty — setup webhooks will fail until it is set',
  );
}

openDatabase(dataDir);
const server = createServer({ setupBootstrapSecret: setupSecret });

server.listen(port, '0.0.0.0', () => {
  console.log(
    `[atrium-lettings-advice] listening on 0.0.0.0:${port} dataDir=${dataDir}`,
  );
});
