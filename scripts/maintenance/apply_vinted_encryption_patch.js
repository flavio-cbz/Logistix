const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve(__dirname, '../../data/logistix.db');
const sqlPath = path.resolve(__dirname, '../../drizzle/migrations/20250819_add_encrypted_dek_metadata.sql');

const db = new Database(dbPath);
const sql = fs.readFileSync(sqlPath, 'utf8');

try {
  db.exec(sql);
  console.log('Patch SQL appliqué avec succès.');
} catch (err) {
  console.error('Erreur lors de l\'application du patch SQL:', err.message);
  process.exit(1);
}
db.close();