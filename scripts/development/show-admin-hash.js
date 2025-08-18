// scripts/development/show-admin-hash.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

try {
  const dbPath = path.join(__dirname, '..', '..', 'data', 'logistix.db');
  if (!fs.existsSync(dbPath)) {
    console.error('Fichier de base de données introuvable:', dbPath);
    process.exit(2);
  }

  const db = new Database(dbPath, { readonly: true });
  const stmt = db.prepare("SELECT id, username, password_hash, email FROM users WHERE username = ?");
  const row = stmt.get('admin');

  if (!row) {
    console.log('Utilisateur "admin" introuvable.');
  } else {
    console.log('Résultat for admin:');
    console.log(JSON.stringify(row, null, 2));
  }

  db.close();
} catch (err) {
  console.error('Erreur:', err.message || err);
  process.exit(1);
}