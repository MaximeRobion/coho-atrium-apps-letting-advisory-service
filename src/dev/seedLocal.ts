/**
 * Seed a local SQLite connection for UI work.
 *
 * Usage: npm run seed
 * Or imported from runLocal.ts on first boot.
 */
import { pathToFileURL } from 'node:url';
import { closeDatabase, openDatabase } from '../db/database.js';
import * as repo from '../connections/repository.js';
import {
  LOCAL_DEV_API_BASE_URL,
  LOCAL_DEV_CONNECTION,
  LOCAL_DEV_SIGNING_SECRET,
} from './devMode.js';

export interface SeedResult {
  connectionReference: string;
  created: boolean;
}

export function seedLocalDevData(options: { force?: boolean } = {}): SeedResult {
  const existing = repo.getConnection(LOCAL_DEV_CONNECTION);
  if (existing && !options.force) {
    return { connectionReference: LOCAL_DEV_CONNECTION, created: false };
  }

  if (existing && options.force) {
    repo.deleteConnectionData(LOCAL_DEV_CONNECTION);
  }

  repo.upsertConnection({
    connectionReference: LOCAL_DEV_CONNECTION,
    apiKey: 'local-dev-api-key',
    apiBaseUrl: LOCAL_DEV_API_BASE_URL,
    signingSecret: LOCAL_DEV_SIGNING_SECRET,
  });

  return { connectionReference: LOCAL_DEV_CONNECTION, created: true };
}

const invokedAsScript =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;
if (invokedAsScript) {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.ATRIUM_DATA_DIR = process.env.ATRIUM_DATA_DIR || './data';
  openDatabase(process.env.ATRIUM_DATA_DIR);
  const force = process.env.ATRIUM_DEV_RESEED === '1' || process.argv.includes('--force');
  const result = seedLocalDevData({ force });
  console.log('[atrium-lettings-advice] seed', result);
  closeDatabase();
}
