#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Usage:
//   node scripts/maintenance/apply_vinted_migration.js [path/to/db.sqlite]
// Falls back to process.env.DATABASE_PATH or ./data/database.sqlite

const argPath = process.argv[2];
const envPath = process.env.DATABASE_PATH;
const defaultPath = path.join(process.cwd(), 'data', 'database.sqlite');
const dbPath = argPath || envPath || defaultPath;
const backupPath = dbPath + '.bak.' + Date.now();

console.log('DB path:', dbPath);
if (!fs.existsSync(dbPath)) {
  console.error('Database file not found:', dbPath);
  console.error('Tried argPath:', argPath);
  console.error('Tried env DATABASE_PATH:', envPath);
  process.exit(1);
}

console.log('Creating backup at', backupPath);
fs.copyFileSync(dbPath, backupPath);

const db = new Database(dbPath);

function columnExists(table, column) {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  const rows = stmt.all();
  return rows.some(r => r.name === column);
}

const table = 'vinted_sessions';
const toAdd = [];

if (!columnExists(table, 'encryptedDek')) {
  toAdd.push(`ALTER TABLE ${table} ADD COLUMN encryptedDek TEXT;`);
}
if (!columnExists(table, 'encryptionMetadata')) {
  toAdd.push(`ALTER TABLE ${table} ADD COLUMN encryptionMetadata TEXT;`);
}

if (toAdd.length === 0) {
  console.log('No migration necessary — columns already exist.');
  process.exit(0);
}

try {
  db.exec('BEGIN TRANSACTION;');
  for (const sql of toAdd) {
    console.log('Applying:', sql);
    db.exec(sql);
  }
  db.exec('COMMIT;');
  console.log('Migration applied successfully.');
} catch (err) {
  try { db.exec('ROLLBACK;'); } catch (e) {}
  console.error('Migration failed:', err);
  process.exit(1);
}