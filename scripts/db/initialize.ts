#!/usr/bin/env tsx

/**
 * Script d'initialisation de la base de données LogistiX
 * 
 * Ce script vérifie si la base de données existe déjà, et si ce n'est pas le cas,
 * il exécute les migrations et crée un utilisateur admin avec le mot de passe
 * défini dans la variable d'environnement ADMIN_DEFAULT_PASSWORD.
 * 
 * Usage: npm run db:initialize
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { hash as bcryptHashPassword } from 'bcrypt';
import { randomUUID } from 'crypto';

// Configuration simplifiée pour le script
const DB_PATH = resolve(process.cwd(), 'logistix.db');
const MIGRATIONS_PATH = resolve(process.cwd(), 'drizzle', 'migrations');
const ADMIN_DEFAULT_PASSWORD = process.env['ADMIN_DEFAULT_PASSWORD'] || 'admin123'; // Valeur par défaut pour le script
const BCRYPT_ROUNDS = parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10);

/**
 * Vérifie si le fichier de base de données existe
 */
function checkDatabaseExists(): boolean {
  return existsSync(DB_PATH);
}

/**
 * Exécute les migrations de la base de données
 */
async function runMigrations(): Promise<void> {
  console.log("🚀 Début des migrations de base de données...");
  const start = performance.now();

  // Initialiser better-sqlite3 directement (pas besoin de Drizzle pour les migrations)
  const sqlite = new Database(DB_PATH);
  
  // Lire tous les fichiers de migration manuellement
  const fs = require('fs');
  const path = require('path');
  
  const migrationFiles = fs.readdirSync(MIGRATIONS_PATH)
    .filter((file: string) => file.endsWith('.sql'))
    .sort(); // Trier pour appliquer dans l'ordre
  
  console.log(`📝 ${migrationFiles.length} fichiers de migration trouvés`);

  for (const file of migrationFiles) {
    const filePath = path.join(MIGRATIONS_PATH, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    
    // Splitter les statements SQL (séparés par ';' et saut de ligne)
    const statements = sqlContent
      .split(';')
      .map((stmt: string) => stmt.trim())
      .filter((stmt: string) => stmt.length > 0);
    
    console.log(`  ⚙️  Exécution de ${file} (${statements.length} statement${statements.length > 1 ? 's' : ''})`);
    
    for (const statement of statements) {
      try {
        // Guard: if this is an index referencing a column that may not exist yet,
        // check the table columns first (avoid "no such column" errors on CREATE INDEX)
        const lower = statement.trim().toLowerCase();
        if (lower.startsWith('create index') || lower.startsWith('create unique index')) {
          // simple regex to extract table name and column list: ON <table>(...)
          const m = /on\s+([`"]?)([a-z0-9_]+)\1\s*\(([^)]+)\)/i.exec(statement);
          if (m) {
            const table = m[2];
            const cols = m[3]
              .split(',')
              .map(s => s.trim())
              .map(s => s.replace(/[`"\s]+/g, ' '))
              .map(s => s.replace(/\s+(desc|asc)\s*$/i, '')) // remove ORDER direction
              .map(s => s.replace(/[`"\s]/g, '').trim().toLowerCase());

            // query pragma to get existing columns for the table
            let tableColumns: string[] = [];
            try {
              const rows = sqlite.prepare(`PRAGMA table_info('${table}')`).all();
              tableColumns = rows.map((r: any) => String(r.name).toLowerCase());
            } catch (e) {
              // if table doesn't exist yet, skip index creation
              console.warn(`⚠️ Table '${table}' does not exist yet. Skipping index statement until later: ${file}`);
              continue;
            }

            const missing = cols.filter(c => !tableColumns.includes(c));
            if (missing.length > 0) {
              console.log(`⚠️ Skipping index on table '${table}' because columns missing: ${missing.join(', ')} (file: ${file})`);
              continue; // skip executing this index statement
            }
          }
        }

        sqlite.prepare(statement).run();
      } catch (error: any) {
        // Ignorer les erreurs "already exists" car on utilise IF NOT EXISTS
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  const end = performance.now();
  console.log("✅ Migrations appliquées avec succès", { duration: Math.round(end - start) });
  sqlite.close();
}

/**
 * Crée l'utilisateur admin
 */
async function createAdminUser(): Promise<void> {
  // Initialiser Drizzle avec better-sqlite3 directement
  const sqlite = new Database(DB_PATH);
  const db = drizzle(sqlite);

  // Vérifier si des utilisateurs existent déjà
  const userCountResult = db.$client.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const userCount = userCountResult.count || 0;

  if (userCount === 0) {
    console.log('Aucun utilisateur trouvé, création de l\'administrateur par défaut...');
    
    // Récupérer le mot de passe admin depuis les variables d'environnement
    const adminPassword = ADMIN_DEFAULT_PASSWORD;
    if (!adminPassword) {
      throw new Error('La variable d\'environnement ADMIN_DEFAULT_PASSWORD n\'est pas définie');
    }

    // Hasher le mot de passe
    const passwordHash = await bcryptHashPassword(adminPassword, BCRYPT_ROUNDS);

    // Créer l'utilisateur admin
    const userId = randomUUID();
    const timestamp = new Date().toISOString();

    db.$client.prepare(
      `INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).run(userId, 'admin', passwordHash, timestamp, timestamp);

    console.log('✅ Utilisateur administrateur créé avec succès', { userId, username: 'admin' });
  } else {
    console.log('⚠️ Un ou plusieurs utilisateurs existent déjà, création de l\'administrateur ignorée');
  }

 sqlite.close();
}

/**
 * Post-migration fixes for known schema gaps (idempotent)
 */
async function postMigrationFixes(): Promise<void> {
  const sqlite = new Database(DB_PATH);
  try {
    // Ensure 'status' column exists on parcelles (some migrations omitted it)
    const cols = sqlite.prepare("PRAGMA table_info('parcelles')").all().map((r: any) => r.name);
    if (!cols.includes('status')) {
      console.log("🔧 Ajout de la colonne 'status' à la table 'parcelles' (valeur par défaut 'active')");
      sqlite.prepare("ALTER TABLE parcelles ADD COLUMN status TEXT DEFAULT 'active' NOT NULL").run();
    }

    // Ensure index exists
    try {
      sqlite.prepare("CREATE INDEX IF NOT EXISTS idx_parcelles_user_status ON parcelles(user_id, status)").run();
    } catch (e: unknown) {
      const err: any = e;
      console.warn('⚠️ Impossible de créer idx_parcelles_user_status:', err?.message ?? err);
    }
  } finally {
    sqlite.close();
  }
}

/**
 * Fonction principale
 */
async function main(): Promise<void> {
 console.log("🔍 Vérification de l'état de la base de données...");

  if (checkDatabaseExists()) {
    console.log("✅ La base de données existe déjà. Aucune action requise.");
    process.exit(0);
  }

  console.log("📦 Base de données introuvable, initialisation en cours...");

  // Exécuter les migrations
  await runMigrations();

  // Appliquer les correctifs post-migration (colonnes manquantes, index manquants)
  await postMigrationFixes();

  // Créer l'utilisateur admin
  await createAdminUser();

  console.log("🎉 Base de données initialisée avec succès avec l'utilisateur admin.");
  process.exit(0);
}

// Exécuter le script si ce fichier est le point d'entrée principal
if (require.main === module) {
  main().catch(error => {
    console.error("💥 Erreur lors de l'initialisation de la base de données", error);
    process.exit(1);
  });
}

export { main as initializeDatabase };