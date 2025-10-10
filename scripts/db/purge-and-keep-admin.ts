#!/usr/bin/env node

/**
 * Script pour purger la base de données tout en conservant l'utilisateur administrateur
 * Ce script supprime toutes les données de la base de données sauf l'utilisateur admin
 */

import Database from 'better-sqlite3';
import path from 'path';

// Chemin vers la base de données SQLite
const dbPath = path.join(process.cwd(), 'logistix.db');
const db = new Database(dbPath);

console.log('Démarrage du script de purge de la base de données...');

async function purgeDatabase() {
  try {
    // Désactiver les contraintes de clé étrangère
    db.exec('PRAGMA foreign_keys = OFF');
    
    // Obtenir la liste de toutes les tables utilisateur
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_drizzle_%'`
    ).all() as Array<{name: string}>;
    
    console.log(`Tables trouvées: ${tables.map(t => t.name).join(', ')}`);
    
    // Supprimer toutes les données de chaque table
    for (const table of tables) {
      if (table.name === 'users') {
        // Pour la table des utilisateurs, supprimer tous les utilisateurs sauf admin
        db.prepare(`DELETE FROM users WHERE username != 'admin'`).run();
        console.log('Tous les utilisateurs sauf admin ont été supprimés');
      } else {
        // Pour les autres tables, supprimer toutes les données
        db.prepare(`DELETE FROM ${table.name}`).run();
        console.log(`Données supprimées de la table: ${table.name}`);
      }
    }
    
    // Réactiver les contraintes de clé étrangère
    db.exec('PRAGMA foreign_keys = ON');
    
    console.log('Script de purge terminé avec succès !');
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script de purge:', error);
    // Réactiver les contraintes de clé étrangère en cas d'erreur
    try {
      db.exec('PRAGMA foreign_keys = ON');
    } catch (fkError) {
      console.error('Erreur lors de la réactivation des contraintes de clé étrangère:', fkError);
    }
    process.exit(1);
  } finally {
    db.close();
  }
}

// Exécuter la fonction
purgeDatabase();