#!/usr/bin/env node
// scripts/admin/populate_missing_encryption_secrets.js
// Remplit automatiquement encryption_secret pour tous les utilisateurs qui n'en ont pas.

const { randomBytes } = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH || './data/database.sqlite';
const db = new sqlite3.Database(dbPath);

function generateSecret() {
  return randomBytes(32).toString('hex');
}

db.serialize(() => {
  db.all("SELECT id FROM users WHERE encryption_secret IS NULL OR encryption_secret = ''", [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des utilisateurs :', err);
      process.exit(1);
    }
    if (!rows.length) {
      console.log('Tous les utilisateurs ont déjà un encryption_secret.');
      process.exit(0);
    }
    let done = 0;
    rows.forEach((row) => {
      const secret = generateSecret();
      db.run("UPDATE users SET encryption_secret = ? WHERE id = ?", [secret, row.id], (err2) => {
        if (err2) {
          console.error(`Erreur lors de la mise à jour de l\'utilisateur ${row.id} :`, err2);
        } else {
          console.log(`Utilisateur ${row.id} mis à jour avec un nouveau encryption_secret.`);
        }
        done++;
        if (done === rows.length) {
          console.log('Population terminée.');
          db.close();
        }
      });
    });
  });
});