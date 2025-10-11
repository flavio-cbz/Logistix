const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'logistix.db');
console.log('Inspecting DB:', dbPath);
try {
  const db = new Database(dbPath, { readonly: true });
  const tables = db.prepare("SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','index') ORDER BY type, name;").all();
  console.log('Tables & Indexes:');
  tables.forEach(t => console.log('-', t.name, t.type ? t.type : '', (t.sql || '').slice(0,120).replace(/\n/g,' ')));

  const check = (tbl) => {
    try {
      const cols = db.prepare(`PRAGMA table_info('${tbl}')`).all();
      console.log('---', tbl, 'columns ---');
      cols.forEach(c => console.log(c.cid, c.name, c.type, c.notnull, c.dflt_value));
    } catch (e) {
      console.log('Table', tbl, 'does not exist or cannot be read:', e.message);
    }
  };

  ['parcelles','produits','products','users'].forEach(check);
  db.close();
} catch (e) {
  console.error('Error opening DB:', e.message);
  process.exit(1);
}
