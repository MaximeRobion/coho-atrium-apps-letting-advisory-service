import { getDatabase } from '../db/database.js';
import type { ConnectionRow } from './types.js';

type SqlRow = Record<string, unknown>;

function mapConnection(row: SqlRow): ConnectionRow {
  return {
    connectionReference: String(row.connection_reference),
    apiKey: String(row.api_key),
    apiBaseUrl: String(row.api_base_url),
    signingSecret: String(row.signing_secret),
    createdAt: Number(row.created_at),
  };
}

export function upsertConnection(input: {
  connectionReference: string;
  apiKey: string;
  apiBaseUrl: string;
  signingSecret: string;
  createdAt?: number;
}): ConnectionRow {
  const db = getDatabase();
  const createdAt = input.createdAt ?? Date.now();
  db.prepare(
    `INSERT INTO connections (connection_reference, api_key, api_base_url, signing_secret, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(connection_reference) DO UPDATE SET
       api_key = excluded.api_key,
       api_base_url = excluded.api_base_url,
       signing_secret = excluded.signing_secret`,
  ).run(input.connectionReference, input.apiKey, input.apiBaseUrl, input.signingSecret, createdAt);
  return getConnection(input.connectionReference)!;
}

export function getConnection(connectionReference: string): ConnectionRow | null {
  const row = getDatabase()
    .prepare(`SELECT * FROM connections WHERE connection_reference = ?`)
    .get(connectionReference) as SqlRow | undefined;
  return row ? mapConnection(row) : null;
}

export function deleteConnectionData(connectionReference: string): void {
  const db = getDatabase();
  db.prepare(`DELETE FROM connections WHERE connection_reference = ?`).run(connectionReference);
  try {
    db.exec('VACUUM');
  } catch {
    /* ignore — some volumes disallow VACUUM */
  }
}
