#!/usr/bin/env tsx

/**
 * Script de migration Drizzle - Applique les migrations en attente
 * Usage: npm run db:migrate
 */

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { databaseService } from "../../lib/database/database-service";
import { logger } from "../../lib/utils/logging/logger";

async function runMigrations() {
  try {
    logger.info("🚀 Début des migrations de base de données...");
    
    const startTime = performance.now();
    const db = await databaseService.getDb();
    
    // Exécuter les migrations
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    logger.info("✅ Migrations appliquées avec succès", { 
      duration,
      timestamp: new Date().toISOString()
    });
    
    process.exit(0);
  } catch (error) {
    logger.error("❌ Erreur lors des migrations", { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

export { runMigrations };