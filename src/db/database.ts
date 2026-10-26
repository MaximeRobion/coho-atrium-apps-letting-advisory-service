import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from './schema.js';

let db: DatabaseSync | null = null;
let dbPath = '';

export type AppDatabase = DatabaseSync;

export function getDbPath(): string {
  return dbPath;
}

/** Secrets live in the DB — keep the file (and WAL companions) owner-read/write only. */
function lockDownDbFiles(filePath: string): void {
  if (!filePath || filePath === ':memory:') return;
  for (const candidate of [filePath, `${filePath}-wal`, `${filePath}-shm`]) {
    try {
      if (fs.existsSync(candidate)) fs.chmodSync(candidate, 0o600);
    } catch {
      /* volume may disallow chmod; best-effort */
    }
  }
}

export function openDatabase(
  dataDir: string,
  fileName = 'atrium-lettings-advice.sqlite',
): DatabaseSync {
  fs.mkdirSync(dataDir, { mode: 0o750, recursive: true });
  dbPath = path.join(dataDir, fileName);
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  lockDownDbFiles(dbPath);
  return db;
}

export function getDatabase(): DatabaseSync {
  if (!db) {
    throw new Error('Database not opened. Call openDatabase first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    dbPath = '';
  }
}

/** Open an isolated in-memory DB for tests. */
export function openMemoryDatabase(): DatabaseSync {
  closeDatabase();
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  dbPath = ':memory:';
  return db;
}
