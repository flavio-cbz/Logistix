#!/usr/bin/env tsx

/**
 * Script d'initialisation de la base de données LogistiX
 *
 * Ce script vérifie si la base de données existe déjà, et si ce n'est pas le cas,
 * il exécute les migrations via Drizzle et crée un utilisateur admin.
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
import * as schema from '../../lib/database/schema';
import { logger } from '../../lib/utils/logging/logger';

// Configuration
const DB_PATH = resolve(process.cwd(), 'data', 'logistix.db');
const MIGRATIONS_PATH = resolve(process.cwd(), 'drizzle', 'migrations');
const ADMIN_DEFAULT_PASSWORD = process.env['ADMIN_DEFAULT_PASSWORD'] || 'admin123';
const BCRYPT_ROUNDS = parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10);

/**
 * Vérifie si le fichier de base de données existe
 */
function checkDatabaseExists(): boolean {
  return existsSync(DB_PATH);
}

/**
 * Exécute les migrations de la base de données via Drizzle
 */
async function runMigrations(): Promise<void> {
  logger.info("🚀 Début des migrations de base de données...");
  const start = performance.now();

  try {
    const sqlite = new Database(DB_PATH);
    const db = drizzle(sqlite, { schema });

    // Utilisation du migrator officiel de Drizzle
    await migrate(db, { migrationsFolder: MIGRATIONS_PATH });

    const end = performance.now();
    logger.info("✅ Migrations appliquées avec succès", { duration: Math.round(end - start) });
    sqlite.close();
  } catch (error) {
    logger.error("❌ Erreur lors des migrations", error);
    throw error;
  }
}

/**
 * Crée l'utilisateur admin par défaut
 */
async function createAdminUser(): Promise<void> {
  const sqlite = new Database(DB_PATH);
  const db = drizzle(sqlite, { schema });

  try {
    // Vérifier si des utilisateurs existent déjà
    const userCount = await db.query.users.findFirst();

    if (!userCount) {
      logger.info('Aucun utilisateur trouvé, création de l\'administrateur par défaut...');

      const adminPassword = ADMIN_DEFAULT_PASSWORD;
      if (!adminPassword) {
        throw new Error('La variable d\'environnement ADMIN_DEFAULT_PASSWORD n\'est pas définie');
      }

      const passwordHash = await bcryptHashPassword(adminPassword, BCRYPT_ROUNDS);
      const userId = randomUUID();
      const timestamp = new Date().toISOString();

      // Utilisation du schéma Drizzle pour l'insertion
      await db.insert(schema.users).values({
        id: userId,
        username: 'admin',
        passwordHash: passwordHash,
        email: 'admin@logistix.app', // Ajout d'un email par défaut pour cohérence
        role: 'admin',
        createdAt: timestamp,
        updatedAt: timestamp
      });

      logger.info('✅ Utilisateur administrateur créé avec succès', { userId, username: 'admin' });
    } else {
      logger.info('⚠️ Un ou plusieurs utilisateurs existent déjà, création de l\'administrateur ignorée');
    }
  } catch (error) {
    logger.error("❌ Erreur lors de la création de l'admin", error);
    throw error;
  } finally {
    sqlite.close();
  }
}

/**
 * Fonction principale
 */
async function main(): Promise<void> {
  logger.info("🔍 Vérification de l'état de la base de données...");

  if (checkDatabaseExists()) {
    logger.info("✅ La base de données existe déjà. Aucune action requise.");
    process.exit(0);
  }

  logger.info("📦 Base de données introuvable, initialisation en cours...");

  try {
    await runMigrations();
    await createAdminUser();

    logger.info("🎉 Base de données initialisée avec succès.");
    process.exit(0);
  } catch (error) {
    logger.error("💥 Echec de l'initialisation", error);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main as initializeDatabase };
