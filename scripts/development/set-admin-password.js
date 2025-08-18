// scripts/development/set-admin-password.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

function getPasswordFromArgs() {
  const arg = process.argv[2];
  if (arg && arg.length > 0) return arg;
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return null;
}

try {
  const password = getPasswordFromArgs();
  if (!password) {
    console.error('Usage: node scripts/development/set-admin-password.js "NOUVEAU_MOT_DE_PASSE"');
    process.exit(2);
  }

  const dbPath = path.join(__dirname, '..', '..', 'data', 'logistix.db');
  if (!fs.existsSync(dbPath)) {
    console.error('Fichier de base de données introuvable:', dbPath);
    process.exit(2);
  }

  const db = new Database(dbPath);
  const user = db.prepare("SELECT id, username FROM users WHERE username = ?").get('admin');
  if (!user) {
    console.error('Utilisateur "admin" introuvable.');
    db.close();
    process.exit(3);
  }

  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const info = db.prepare("UPDATE users SET password_hash = ? WHERE username = ?").run(hash, 'admin');

  console.log(`Updated admin password. changes=${info.changes}`);
  db.close();
  process.exit(0);
} catch (err) {
  console.error('Erreur:', err.message || err);
  process.exit(1);
}