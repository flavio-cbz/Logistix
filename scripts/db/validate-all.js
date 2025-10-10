#!/usr/bin/env node

/**
 * Workflow de validation complète - End-to-End Database Migration
 * Usage: npm run db:validate-all
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class MigrationValidator {
  constructor() {
    this.steps = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(message, type = 'info') {
    const prefix = {
      'success': '✅',
      'error': '❌', 
      'info': 'ℹ️',
      'warning': '⚠️',
      'step': '🔸'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} ${message}`);
  }

  async runStep(name, command, expectSuccess = true) {
    this.log(`${name}`, 'step');
    
    try {
      const output = execSync(command, { 
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      if (expectSuccess) {
        this.passed++;
        this.steps.push({ name, status: 'PASSED', output: output.trim() });
        this.log(`PASSED: ${name}`, 'success');
      }
      
      return { success: true, output };
      
    } catch (error) {
      this.failed++;
      this.steps.push({ 
        name, 
        status: 'FAILED', 
        error: error.message,
        output: error.stdout ? error.stdout.toString() : ''
      });
      this.log(`FAILED: ${name} - ${error.message}`, 'error');
      return { success: false, error };
    }
  }

  checkPrerequisites() {
    this.log("\n🔍 Vérification des prérequis...");
    
    // Vérifier Node.js
    const nodeVersion = process.version;
    if (!nodeVersion.startsWith('v18') && !nodeVersion.startsWith('v20')) {
      this.log(`Node.js version non optimale: ${nodeVersion} (recommandé: v18 ou v20)`, 'warning');
    } else {
      this.log(`Node.js version OK: ${nodeVersion}`, 'success');
    }
    
    // Vérifier package.json
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      throw new Error("package.json introuvable");
    }
    
    // Vérifier better-sqlite3
    try {
      require('better-sqlite3');
      this.log("better-sqlite3 disponible", 'success');
    } catch (error) {
      throw new Error("better-sqlite3 non installé. Exécutez: npm install");
    }
    
    // Vérifier drizzle-kit
    try {
      execSync('npx drizzle-kit --version', { stdio: 'pipe' });
      this.log("drizzle-kit disponible", 'success');
    } catch (error) {
      throw new Error("drizzle-kit non disponible");
    }
  }

  generateReport() {
    const total = this.passed + this.failed;
    const successRate = total > 0 ? (this.passed / total) * 100 : 0;
    
    console.log("\n" + "=".repeat(70));
    console.log("📊 RAPPORT DE VALIDATION MIGRATION COMPLÈTE");
    console.log("=".repeat(70));
    console.log(`⏱️  Durée totale: ${Date.now() - this.startTime}ms`);
    console.log(`✅ Étapes réussies: ${this.passed}`);
    console.log(`❌ Étapes échouées: ${this.failed}`);
    console.log(`📈 Taux de succès: ${successRate.toFixed(1)}%`);
    
    if (this.failed > 0) {
      console.log("\n❌ Étapes échouées:");
      for (const step of this.steps) {
        if (step.status === 'FAILED') {
          console.log(`  - ${step.name}: ${step.error}`);
        }
      }
    } else {
      console.log("\n🎉 MIGRATION VALIDÉE AVEC SUCCÈS!");
      console.log("   • Base de données opérationnelle");
      console.log("   • Données importées et validées");  
      console.log("   • Tests d'intégrité passés");
      console.log("   • Prêt pour la production");
    }
    
    // Informations utiles
    console.log("\n📋 Prochaines étapes recommandées:");
    console.log("   1. Remplacer les services mockés dans le code");
    console.log("   2. Configurer les backups automatiques");
    console.log("   3. Ajouter monitoring des performances");
    
    return successRate === 100;
  }

  async run() {
    this.startTime = Date.now();
    
    console.log("🚀 VALIDATION COMPLÈTE - Migration Base de Données LogistiX");
    console.log("=" .repeat(70));
    
    try {
      // Étape 0: Prérequis
      this.checkPrerequisites();
      
      // Étape 1: Clean slate - Reset complet
      this.log("\n🧹 Phase 1: Préparation environnement");
      await this.runStep(
        "Reset base de données",
        "npm run db:reset"
      );
      
      // Étape 2: Test génération migration (structure)
      this.log("\n🏗️ Phase 2: Validation du schéma");
      await this.runStep(
        "Génération migration Drizzle",
        "npm run db:generate"
      );
      
      // Étape 3: Application migrations
      await this.runStep(
        "Application des migrations", 
        "npm run db:migrate"
      );
      
      // Étape 4: Import données (dry-run d'abord)
      this.log("\n📊 Phase 3: Import et validation des données");
      await this.runStep(
        "Simulation import données",
        "npm run db:seed:dry"
      );
      
      // Étape 5: Import réel
      await this.runStep(
        "Import réel des données",
        "npm run db:seed"
      );
      
      // Étape 6: Tests d'intégrité complets
      this.log("\n🔍 Phase 4: Tests d'intégrité");
      await this.runStep(
        "Tests d'intégrité base de données",
        "npm run db:test"
      );
      
      // Étape 7: Validation idempotence (re-seed)
      this.log("\n♻️ Phase 5: Validation idempotence");
      await this.runStep(
        "Re-import (test idempotence)",
        "npm run db:seed"
      );
      
      // Étape 8: Tests finaux post-idempotence
      await this.runStep(
        "Tests finaux post-idempotence",
        "npm run db:test"
      );
      
      // Étape 9: Vérification structure fichiers
      this.log("\n📁 Phase 6: Validation structure");
      this.validateFileStructure();
      
      // Rapport final
      return this.generateReport();
      
    } catch (error) {
      this.log(`ERREUR FATALE: ${error.message}`, 'error');
      console.log("\n💡 Suggestions de dépannage:");
      console.log("   • Vérifiez que Node.js >= 18 est installé");
      console.log("   • Exécutez: npm install");
      console.log("   • Vérifiez les permissions de fichier");
      return false;
    }
  }

  validateFileStructure() {
    const requiredFiles = [
      'lib/database/schema.ts',
      'drizzle.config.json', 
      'data/logistix.db',
      'scripts/db/migrate-simple.js',
      'scripts/db/seed-sql.js',
      'scripts/db/test.js',
      'README_MIGRATION.md'
    ];
    
    let missingFiles = 0;
    
    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.log(`Fichier présent: ${file}`, 'success');
      } else {
        this.log(`Fichier manquant: ${file}`, 'error');
        missingFiles++;
      }
    }
    
    if (missingFiles === 0) {
      this.passed++;
      this.steps.push({ name: "Validation structure fichiers", status: 'PASSED' });
    } else {
      this.failed++;
      this.steps.push({ 
        name: "Validation structure fichiers", 
        status: 'FAILED',
        error: `${missingFiles} fichiers manquants`
      });
    }
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const validator = new MigrationValidator();
  
  try {
    const success = await validator.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("\n❌ VALIDATION ÉCHOUÉE:", error.message);
    process.exit(1);
  }
}

main();