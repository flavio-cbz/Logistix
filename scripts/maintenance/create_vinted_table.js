#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Usage: node scripts/maintenance/create_vinted_table.js [path/to/db.sqlite]
// Falls back to process.env.DATABASE_PATH or ./data/db.sqlite
const argPath = process.argv[2];
const dbPath = argPath || process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');
const sqlFile = path.join(process.cwd(), 'drizzle', 'migrations', '0000_create_vinted_sessions.sql');

console.log('DB path:', dbPath);
console.log('SQL file:', sqlFile);

if (!fs.existsSync(sqlFile)) {
  console.error('SQL migration file not found:', sqlFile);
  process.exit(1);
}

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

if (!fs.existsSync(dbPath)) {
  // create empty sqlite file
  fs.closeSync(fs.openSync(dbPath, 'w'));
  console.log('Created empty database file:', dbPath);
}

// backup
const backupPath = dbPath + '.bak.' + Date.now();
console.log('Creating backup at', backupPath);
fs.copyFileSync(dbPath, backupPath);

const sql = fs.readFileSync(sqlFile, 'utf8');
const db = new Database(dbPath);

try {
  db.exec(sql);
  console.log('Migration SQL executed successfully.');
} catch (err) {
  console.error('Execution failed:', err);
  process.exit(1);
}