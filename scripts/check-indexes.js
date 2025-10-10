#!/usr/bin/env node

/**
 * Script de vérification des indexes critiques
 * 
 * Vérifie que tous les indexes essentiels pour les performances sont présents dans la base.
 * Utilisé en CI pour s'assurer que les migrations sont appliquées correctement.
 * 
 * Exit codes:
 * - 0: Tous les indexes sont présents
 * - 1: Un ou plusieurs indexes manquent
 */

const Database = require('better-sqlite3');
const path = require('path');
const chalk = require('chalk');

// Indexes critiques par table
const REQUIRED_INDEXES = {
  produits: [
    'idx_produits_user_id',
    'idx_produits_parcelle_id',
    'idx_produits_user_parcelle',
    'idx_produits_created_at',
    'idx_produits_user_created',
  ],
  parcelles: [
    'idx_parcelles_user_id',
    'idx_parcelles_numero',
    'idx_parcelles_transporteur',
    'idx_parcelles_created_at',
    'idx_parcelles_user_created',
    'idx_parcelles_user_numero',
  ],
  products: [
    'product_user_idx',
    'product_status_idx',
    'product_parcelle_idx',
    'product_created_at_idx',
  ],
};

function checkIndexes() {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/logistix.db');
  
  console.log(chalk.blue('🔍 Vérification des indexes de performance...\n'));
  console.log(chalk.gray(`Database: ${dbPath}\n`));

  let db;
  try {
    db = new Database(dbPath, { readonly: true });
  } catch (error) {
    console.error(chalk.red('❌ Impossible d\'ouvrir la base de données:'), error.message);
    process.exit(1);
  }

  let allIndexesPresent = true;
  const missingIndexes = [];

  // Vérifier chaque table
  for (const [tableName, requiredIndexes] of Object.entries(REQUIRED_INDEXES)) {
    console.log(chalk.yellow(`📋 Table: ${tableName}`));

    // Récupérer les indexes existants
    const existingIndexes = db
      .prepare(
        `SELECT name FROM sqlite_master 
         WHERE type='index' AND tbl_name=? 
         ORDER BY name`
      )
      .all(tableName)
      .map(row => row.name);

    // Vérifier chaque index requis
    for (const indexName of requiredIndexes) {
      if (existingIndexes.includes(indexName)) {
        console.log(chalk.green(`  ✓ ${indexName}`));
      } else {
        console.log(chalk.red(`  ✗ ${indexName} (MANQUANT)`));
        allIndexesPresent = false;
        missingIndexes.push({ table: tableName, index: indexName });
      }
    }

    console.log('');
  }

  db.close();

  // Résumé
  console.log(chalk.blue('─'.repeat(60)));
  if (allIndexesPresent) {
    console.log(chalk.green.bold('✅ Tous les indexes critiques sont présents !'));
    process.exit(0);
  } else {
    console.log(chalk.red.bold(`❌ ${missingIndexes.length} index(es) manquant(s) :\n`));
    
    for (const { table, index } of missingIndexes) {
      console.log(chalk.red(`  • ${table}.${index}`));
    }

    console.log(chalk.yellow('\n💡 Conseil: Exécutez les migrations manquantes avec:'));
    console.log(chalk.cyan('   npm run db:migrate\n'));

    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ Erreur inattendue:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Promesse rejetée:'), error.message);
  process.exit(1);
});

// Exécution
checkIndexes();
