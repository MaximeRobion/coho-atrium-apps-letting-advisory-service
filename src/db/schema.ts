/** SQLite DDL — connection secrets only (no product domain tables in P0). */

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connections (
  connection_reference TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  signing_secret TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;
