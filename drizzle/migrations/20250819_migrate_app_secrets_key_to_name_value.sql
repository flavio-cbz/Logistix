-- Migration: migrate legacy app_secrets.key -> app_secrets.name/value schema
BEGIN TRANSACTION;

-- Create new temporary table with the desired schema if not exists
CREATE TABLE IF NOT EXISTS app_secrets_new (
  id TEXT PRIMARY KEY,
  name TEXT,
  value TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT,
  revoked_at TEXT
);

-- If legacy table exists with 'key' column, migrate its data
-- Copy existing rows into new table, mapping 'key' => value and using a default name 'ai_api_key' if no name present.
INSERT INTO app_secrets_new (id, name, value, is_active, created_at, updated_at)
SELECT
  id,
  'ai_api_key' AS name,
  key AS value,
  COALESCE(is_active, 1) AS is_active,
  COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at,
  COALESCE(updated_at, CURRENT_TIMESTAMP) AS updated_at
FROM app_secrets
WHERE EXISTS (SELECT 1 FROM pragma_table_info('app_secrets') WHERE name = 'key');

-- For tables that already follow new schema, copy them as-is (avoid duplicating)
INSERT OR IGNORE INTO app_secrets_new (id, name, value, is_active, created_at, updated_at)
SELECT id, name, value, COALESCE(is_active,1), COALESCE(created_at, CURRENT_TIMESTAMP), COALESCE(updated_at, CURRENT_TIMESTAMP)
FROM app_secrets
WHERE EXISTS (SELECT 1 FROM pragma_table_info('app_secrets') WHERE name = 'name' AND name = 'value');

-- Drop old table and rename new
DROP TABLE IF EXISTS app_secrets;
ALTER TABLE app_secrets_new RENAME TO app_secrets;

COMMIT;