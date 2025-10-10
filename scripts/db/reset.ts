#!/usr/bin/env tsx

/**
 * Script de reset complet de la base de données
 * Usage: npm run db:reset
 */

import { existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { logger } from "../../lib/utils/logging/logger";
import path from "path";

async function resetDatabase() {
  try {
    logger.info("🗑️ Reset complet de la base de données...");
    
    const dbPath = path.join(process.cwd(), "data", "logistix.db");
    const dbShmPath = `${dbPath}-shm`;
    const dbWalPath = `${dbPath}-wal`;
    
    // Supprimer les fichiers de base de données s'ils existent
    [dbPath, dbShmPath, dbWalPath].forEach(filePath => {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        logger.info(`Supprimé: ${path.basename(filePath)}`);
      }
    });
    
    // Recréer la base avec les migrations
    logger.info("🏗️ Recréation de la base de données...");
    execSync("npm run db:migrate", { 
      cwd: process.cwd(),
      stdio: "inherit"
    });
    
    logger.info("✅ Base de données réinitialisée avec succès");
    
  } catch (error) {
    logger.error("❌ Erreur lors du reset", { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    process.exit(1);
  }
}

if (require.main === module) {
  resetDatabase();
}