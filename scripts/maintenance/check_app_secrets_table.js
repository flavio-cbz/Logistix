#!/usr/bin/env node
/**
 * Vérifie la présence et la structure de la table app_secrets dans la base SQLite.
 * Affiche la structure si la table existe, sinon un message d'alerte.
 */

const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../data/logistix.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Base de données non trouvée :', DB_PATH);
  process.exit(1);
}

let BetterSqlite3;
try {
  BetterSqlite3 = require('better-sqlite3');
} catch (e) {
  console.error('❌ Installez better-sqlite3 : npm install better-sqlite3');
  process.exit(1);
}

const db = new BetterSqlite3(DB_PATH);

try {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_secrets'").all();
  if (rows.length === 0) {
    console.log('❌ Table app_secrets ABSENTE dans la base.');
    process.exit(2);
  }
  const pragma = db.prepare("PRAGMA table_info(app_secrets)").all();
  console.log('✅ Table app_secrets trouvée. Structure :');
  for (const col of pragma) {
    console.log(`- ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  }
  process.exit(0);
} catch (err) {
  console.error('Erreur lors de la vérification :', err);
  process.exit(3);
} finally {
  try { db.close(); } catch (_) {}
}