const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(process.cwd(), 'data', 'logistix.db');
const MIGRATIONS_PATH = path.join(process.cwd(), 'drizzle', 'migrations');

console.log('Applying migrations to', DB_PATH);
if (!fs.existsSync(MIGRATIONS_PATH)) {
  console.error('Migrations folder not found:', MIGRATIONS_PATH);
  process.exit(1);
}

// Backup existing DB
try {
  const backupPath = DB_PATH + '.backup-' + Date.now();
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, backupPath);
    console.log('Backup created at', backupPath);
  }
} catch (e) {
  console.warn('Failed to backup DB:', e.message);
}

const sqlite = new Database(DB_PATH);

const migrationFiles = fs.readdirSync(MIGRATIONS_PATH)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Found ${migrationFiles.length} migration files`);

for (const file of migrationFiles) {
  const filePath = path.join(MIGRATIONS_PATH, file);
  const content = fs.readFileSync(filePath, 'utf8');
  // Split using the custom marker if present, else split by ';' conservatively
  const parts = content.includes('--> statement-breakpoint')
    ? content.split('--> statement-breakpoint')
    : content.split(';');

  const statements = parts
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Applying ${file} (${statements.length} statements)`);
  for (const stmt of statements) {
    const statement = stmt.replace(/;?\s*$/,'');
    try {
      const lower = statement.trim().toLowerCase();
      // If index creation, do a safe check
      if (lower.startsWith('create index') || lower.startsWith('create unique index')) {
        const m = /on\s+([`"]?)([a-z0-9_]+)\1\s*\(([^)]+)\)/i.exec(statement);
        if (m) {
          const table = m[2];
          let cols = m[3].split(',').map(c => c.trim().replace(/[`"\s]+/g,'').toLowerCase());
          // get existing cols
          try {
            const rows = sqlite.prepare(`PRAGMA table_info('${table}')`).all();
            const existing = rows.map(r => r.name.toLowerCase());
            const missing = cols.filter(c => !existing.includes(c));
            if (missing.length > 0) {
              console.log(`  Skipping index on ${table} because columns missing: ${missing.join(', ')}`);
              continue;
            }
          } catch (e) {
            console.log(`  Table ${table} not present yet, skipping index`);
            continue;
          }
        }
      }

      sqlite.prepare(statement).run();
    } catch (e) {
      if (!String(e.message).includes('already exists')) {
        console.error('Error running statement from', file, e.message);
        // continue applying other statements
      }
    }
  }
}

sqlite.close();
console.log('Migrations applied (best-effort).');
