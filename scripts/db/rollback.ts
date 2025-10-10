#!/usr/bin/env tsx

/**
 * Script de rollback de migration
 * Usage: npm run db:rollback [steps]
 */

import { execSync } from "child_process";
import { logger } from "../../lib/utils/logging/logger";

async function rollbackMigration(steps: number = 1) {
  try {
    logger.info(`⏪ Rollback de ${steps} migration(s)...`);
    
    // Utiliser drizzle-kit drop pour annuler les migrations
    const output = execSync(`npx drizzle-kit drop --out ./drizzle/migrations`, { 
      cwd: process.cwd(),
      encoding: "utf-8"
    });
    
    logger.info("✅ Rollback effectué avec succès", { 
      output: output.trim(),
      steps,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error("❌ Erreur lors du rollback", { 
      error: error instanceof Error ? error.message : String(error),
      steps
    });
    
    process.exit(1);
  }
}

async function main() {
  const steps = process.argv[2] ? parseInt(process.argv[2]) : 1;
  
  if (isNaN(steps) || steps < 1) {
    logger.error("❌ Nombre d'étapes invalide. Usage: npm run db:rollback [steps]");
    process.exit(1);
  }
  
  await rollbackMigration(steps);
}

if (require.main === module) {
  main();
}