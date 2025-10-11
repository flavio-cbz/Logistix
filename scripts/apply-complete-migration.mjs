#!/usr/bin/env node

/**
 * Script pour appliquer la migration complète du schéma
 * Crée toutes les tables nécessaires avec les colonnes legacy
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/logistix.db');
const MIGRATION_FILE = join(__dirname, '../drizzle/migrations/0000_complete_schema.sql');

console.log('🚀 Application de la migration complète du schéma...\n');

try {
  // Connexion à la base de données
  const db = new Database(DB_PATH);
  console.log(`✅ Connexion à la base de données : ${DB_PATH}`);
  
  // Lecture du fichier de migration
  const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');
  console.log(`✅ Lecture du fichier de migration : ${MIGRATION_FILE}\n`);
  
  // Séparation des commandes SQL (ignorer les commentaires et lignes vides)
  const sqlStatements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => {
      // Ignorer les commentaires et les lignes vides
      return stmt.length > 0 && !stmt.startsWith('--');
    });
  
  console.log(`📋 ${sqlStatements.length} commandes SQL à exécuter\n`);
  
  // Exécution dans une transaction
  const transaction = db.transaction(() => {
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of sqlStatements) {
      try {
        db.exec(statement);
        successCount++;
        
        // Afficher des messages pour les CREATE TABLE
        if (statement.toLowerCase().includes('create table')) {
          const match = statement.match(/create table (?:if not exists )?(\w+)/i);
          if (match) {
            console.log(`  ✓ Table créée/vérifiée : ${match[1]}`);
          }
        }
      } catch (error) {
        // Ignorer les erreurs "table already exists" ou "duplicate column name"
        const errorMsg = error.message.toLowerCase();
        if (
          errorMsg.includes('already exists') || 
          errorMsg.includes('duplicate column')
        ) {
          skipCount++;
        } else {
          console.error(`\n❌ Erreur lors de l'exécution de la commande :`);
          console.error(`   ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
    
    return { successCount, skipCount };
  });
  
  const result = transaction();
  
  console.log(`\n✅ Migration complétée avec succès !`);
  console.log(`   - Commandes exécutées : ${result.successCount}`);
  console.log(`   - Commandes ignorées (déjà existantes) : ${result.skipCount}`);
  
  // Vérification des tables créées
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log(`\n📊 Tables présentes dans la base de données (${tables.length}) :`);
  tables.forEach(table => {
    console.log(`   - ${table.name}`);
  });
  
  // Fermeture de la connexion
  db.close();
  console.log(`\n✅ Connexion fermée. Migration terminée !`);
  
} catch (error) {
  console.error('\n❌ Erreur lors de la migration :', error.message);
  process.exit(1);
}
