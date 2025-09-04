-- Migration: create vinted_sessions table (initial)
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS vinted_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_cookie TEXT,
  session_expires_at TEXT,
  status TEXT,
  last_validated_at TEXT,
  last_refreshed_at TEXT,
  refresh_error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  encryptedDek TEXT,
  encryptionMetadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_vinted_sessions_user_id ON vinted_sessions(user_id);

COMMIT;