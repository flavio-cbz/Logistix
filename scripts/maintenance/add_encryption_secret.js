#!/usr/bin/env node
/**
 * scripts/maintenance/add_encryption_secret.js
 *
 * Adds the `encryption_secret` column to the users table (if missing)
 * and populates it with a cryptographically secure 32-byte hex secret for users
 * that don't have one.
 *
 * Uses better-sqlite3 for a simple, synchronous migration. If better-sqlite3
 * is not installed, the script will exit with an explanatory message.
 *
 * Usage:
 *   node scripts/maintenance/add_encryption_secret.js
 *
 * This script is idempotent and safe to re-run.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = path.resolve(__dirname, '../../data/logistix.db');

function exitWith(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

if (!fs.existsSync(DB_PATH)) {
  exitWith(`Database file not found at ${DB_PATH}`);
}

let BetterSqlite3;
try {
  BetterSqlite3 = require('better-sqlite3');
} catch (e) {
  exitWith(
    'Dependency "better-sqlite3" is required to run this script. Install it with:\n\n  npm install better-sqlite3\n\nThen re-run this script.'
  );
}

const db = new BetterSqlite3(DB_PATH);
try {
  // 1) Add column if it doesn't exist
  try {
    db.exec('ALTER TABLE users ADD COLUMN encryption_secret TEXT;');
    console.log('Added column encryption_secret to users');
  } catch (err) {
    const msg = String(err.message || err);
    if (msg.includes('duplicate column') || msg.includes('already exists') || msg.includes('column encryption_secret')) {
      console.log('Column encryption_secret already exists — skipping ALTER TABLE');
    } else {
      throw err;
    }
  }

  // 2) Populate missing secrets
  const selectStmt = db.prepare("SELECT id FROM users WHERE encryption_secret IS NULL OR encryption_secret = ''");
  const updateStmt = db.prepare('UPDATE users SET encryption_secret = ? WHERE id = ?');

  const rows = selectStmt.all();
  console.log(`Found ${rows.length} users without encryption_secret`);

  const updated = [];

  const tx = db.transaction((users) => {
    for (const u of users) {
      const secret = crypto.randomBytes(32).toString('hex');
      updateStmt.run(secret, u.id);
      updated.push(u.id);
    }
  });

  if (rows.length > 0) {
    tx(rows);
    console.log(`Populated encryption_secret for ${updated.length} users`);
  } else {
    console.log('No users needed encryption_secret population');
  }

  console.log('Migration completed successfully');
  process.exit(0);
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(2);
} finally {
  try { db.close(); } catch (_) {}
}