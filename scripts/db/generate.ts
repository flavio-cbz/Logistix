#!/usr/bin/env tsx

/**
 * Script de génération de migration Drizzle
 * Usage: npm run db:generate
 */

import { execSync } from "child_process";
import { logger } from "../../lib/utils/logging/logger";

async function generateMigration() {
  try {
    logger.info("🏗️ Génération d'une nouvelle migration...");
    
    // Générer la migration avec drizzle-kit
    const output = execSync("npx drizzle-kit generate", { 
      cwd: process.cwd(),
      encoding: "utf-8"
    });
    
    logger.info("✅ Migration générée avec succès", { 
      output: output.trim(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error("❌ Erreur lors de la génération de migration", { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    process.exit(1);
  }
}

if (require.main === module) {
  generateMigration();
}