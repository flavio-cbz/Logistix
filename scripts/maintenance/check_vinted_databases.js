#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  console.error('Data directory not found:', dataDir);
  process.exit(1);
}

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.sqlite') || f.endsWith('.db') || f.endsWith('.sqlite3'));
if (files.length === 0) {
  console.log('No sqlite files found in', dataDir);
  process.exit(0);
}

for (const f of files) {
  const full = path.join(dataDir, f);
  try {
    const db = new Database(full, { readonly: true });
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vinted_sessions'").get();
    if (row && row.name === 'vinted_sessions') {
      const countRow = db.prepare('SELECT COUNT(*) as c FROM vinted_sessions').get();
      console.log(`FOUND: ${full} -> vinted_sessions (rows=${countRow.c})`);
    } else {
      console.log(`NO: ${full} -> no vinted_sessions table`);
    }
    db.close();
  } catch (err) {
    console.error(`ERROR opening ${full}:`, err.message);
  }
}