#!/usr/bin/env node
/**
 * Migrate API_SECRET_KEY from environment to app_secrets (name='ai_api_key').
 *
 * Usage:
 *   node scripts/maintenance/migrate_api_secret_to_db.js
 *   OR
 *   API_SECRET_KEY=hexkey node scripts/maintenance/migrate_api_secret_to_db.js
 *
 * The script also accepts the key as first CLI argument:
 *   node scripts/maintenance/migrate_api_secret_to_db.js yourhexkey
 *
 * NOTE: The key must be in hex (same format expected by lib/utils/crypto.getKey).
 */

const path = require("path");
const fs = require("fs");
let Database;
try {
  Database = require("better-sqlite3");
} catch (e) {
  console.error("better-sqlite3 is required. Install with: npm install better-sqlite3");
  process.exit(2);
}

const argKey = process.argv[2];
const envKey = process.env.API_SECRET_KEY;
const key = argKey || envKey;

if (!key) {
  console.error("No API secret provided. Set API_SECRET_KEY env or pass it as first argument.");
  process.exit(1);
}

const dbPath = path.join(process.cwd(), "data", "logistix.db");
if (!fs.existsSync(dbPath)) {
  console.error("Database not found at:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

function now() {
  return new Date().toISOString();
}

try {
  // Ensure target table exists (best-effort)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS app_secrets (
      id TEXT PRIMARY KEY,
      name TEXT,
      value TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT,
      revoked_at TEXT
    )
  `).run();

  // Try to find existing row with name='ai_api_key'
  const existing = db.prepare("SELECT id FROM app_secrets WHERE name = ? LIMIT 1").get("ai_api_key");

  if (existing) {
    db.prepare("UPDATE app_secrets SET value = ?, is_active = 1, updated_at = ? WHERE id = ?")
      .run(key, now(), existing.id);
    console.log("Updated existing app_secrets row for 'ai_api_key' (id:", existing.id + ")");
  } else {
    // Insert new row
    const id = (function uid() {
      // simple nanoid-like fallback if nanoid not available
      try {
        return require("nanoid").nanoid();
      } catch (e) {
        return 'migr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
      }
    })();

    db.prepare("INSERT INTO app_secrets (id, name, value, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)")
      .run(id, "ai_api_key", key, now(), now());
    console.log("Inserted new app_secrets row for 'ai_api_key' (id:", id + ")");
  }

  // Also, if legacy table exists with column 'key', update it to keep backward compatibility
  try {
    const pragma = db.prepare("PRAGMA table_info(app_secrets)").all();
    const cols = pragma.map(c => String(c.name).toLowerCase());
    if (cols.includes("key")) {
      const existingLegacy = db.prepare("SELECT id FROM app_secrets LIMIT 1").get();
      if (existingLegacy) {
        db.prepare("UPDATE app_secrets SET key = ? WHERE id = ?").run(key, existingLegacy.id);
        console.log("Updated legacy 'key' column on app_secrets (id:", existingLegacy.id + ")");
      } else {
        const id2 = (function uid() {
          try { return require("nanoid").nanoid(); } catch (e) { return 'migr-' + Date.now().toString(36); }
        })();
        db.prepare("INSERT INTO app_secrets (id, key, is_active, created_at) VALUES (?, ?, 1, ?)")
          .run(id2, key, now());
        console.log("Inserted legacy row with 'key' column (id:", id2 + ")");
      }
    }
  } catch (e) {
    // ignore
  }

  console.log("Migration completed successfully.");
  process.exit(0);
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  try { db.close(); } catch (e) {}
}