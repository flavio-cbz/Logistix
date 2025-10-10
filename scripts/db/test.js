#!/usr/bin/env node

/**
 * Tests d'intégration pour la base de données - Validation complète
 * Usage: npm run db:test
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// =============================================================================
// TESTS DE CONNEXION ET STRUCTURE
// =============================================================================

class DatabaseValidator {
  constructor() {
    this.db = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const prefix = {
      'success': '✅',
      'error': '❌',
      'info': 'ℹ️',
      'warning': '⚠️'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} ${message}`);
  }

  async runTest(testName, testFn) {
    try {
      this.log(`Test: ${testName}`, 'info');
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED' });
      this.log(`PASSED: ${testName}`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
      this.log(`FAILED: ${testName} - ${error.message}`, 'error');
    }
  }

  // Test 1: Connexion à la base de données
  async testDatabaseConnection() {
    const dbPath = path.join(process.cwd(), "data", "logistix.db");
    
    if (!fs.existsSync(dbPath)) {
      throw new Error("Fichier de base de données introuvable");
    }

    this.db = new Database(dbPath, { readonly: true });
    
    // Test basique de connexion
    const result = this.db.prepare("SELECT sqlite_version() as version").get();
    
    if (!result || !result.version) {
      throw new Error("Impossible de récupérer la version SQLite");
    }
    
    this.log(`SQLite version: ${result.version}`);
  }

  // Test 2: Vérification des tables requises
  async testRequiredTables() {
    const requiredTables = [
      'users', 'parcelles', 'products', 'user_preferences', 
      'market_analyses', 'user_actions', 'vinted_sessions',
      'tracked_products', 'market_trends', 'historical_prices',
      'similar_sales', 'app_secrets', 'user_query_history'
    ];

    const existingTables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map(row => row.name);

    for (const table of requiredTables) {
      if (!existingTables.includes(table)) {
        throw new Error(`Table manquante: ${table}`);
      }
    }

    this.log(`${existingTables.length} tables trouvées`);
  }

  // Test 3: Vérification des contraintes de clés étrangères
  async testForeignKeyConstraints() {
    // Activer la vérification des FK
    this.db.prepare("PRAGMA foreign_keys = ON").run();
    
    const fkCheck = this.db.prepare("PRAGMA foreign_key_check").all();
    
    if (fkCheck.length > 0) {
      throw new Error(`${fkCheck.length} violations de contraintes FK détectées`);
    }
    
    this.log("Contraintes FK validées");
  }

  // Test 4: Vérification des index de performance
  async testPerformanceIndexes() {
    const criticalIndexes = [
      'user_username_idx',
      'product_user_idx', 
      'product_status_idx',
      'parcelle_user_idx',
      'idx_market_analyses_user_created',
      'product_brand_idx',
      'product_category_idx'
    ];

    const existingIndexes = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map(row => row.name);

    for (const index of criticalIndexes) {
      if (!existingIndexes.includes(index)) {
        throw new Error(`Index de performance manquant: ${index}`);
      }
    }

    this.log(`${existingIndexes.length} index trouvés`);
  }

  // Test 5: Intégrité des données seedées
  async testDataIntegrity() {
    // Vérifier que les données de base existent
    const userCount = this.db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const parcelleCount = this.db.prepare("SELECT COUNT(*) as count FROM parcelles").get().count;
    const productCount = this.db.prepare("SELECT COUNT(*) as count FROM products").get().count;

    if (userCount === 0) {
      throw new Error("Aucun utilisateur trouvé - Le seeding n'a peut-être pas été exécuté");
    }

    if (parcelleCount === 0) {
      throw new Error("Aucune parcelle trouvée");
    }

    if (productCount === 0) {
      throw new Error("Aucun produit trouvé");
    }

    this.log(`Données: ${userCount} users, ${parcelleCount} parcelles, ${productCount} produits`);
  }

  // Test 6: Cardinalités et relations
  async testRelationships() {
    // Test relation users -> parcelles
    const orphanParcelles = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM parcelles p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE u.id IS NULL
    `).get().count;

    if (orphanParcelles > 0) {
      throw new Error(`${orphanParcelles} parcelles orphelines détectées`);
    }

    // Test relation products -> users
    const orphanProducts = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM products p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE u.id IS NULL
    `).get().count;

    if (orphanProducts > 0) {
      throw new Error(`${orphanProducts} produits orphelins détectés`);
    }

    // Test relation products -> parcelles (optionnelle)
    const invalidProductParcelles = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM products p 
      LEFT JOIN parcelles par ON p.parcelle_id = par.id 
      WHERE p.parcelle_id IS NOT NULL AND par.id IS NULL
    `).get().count;

    if (invalidProductParcelles > 0) {
      throw new Error(`${invalidProductParcelles} produits avec parcelle_id invalide`);
    }

    this.log("Relations inter-tables validées");
  }

  // Test 7: Contraintes NOT NULL
  async testNotNullConstraints() {
    const tables = ['users', 'parcelles', 'products'];
    
    for (const table of tables) {
      const columns = this.db.prepare(`PRAGMA table_info(${table})`).all();
      const notNullColumns = columns.filter(col => col.notnull === 1);
      
      for (const col of notNullColumns) {
        const nullCount = this.db
          .prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${col.name} IS NULL`)
          .get().count;
          
        if (nullCount > 0) {
          throw new Error(`${nullCount} valeurs NULL trouvées dans ${table}.${col.name}`);
        }
      }
    }
    
    this.log("Contraintes NOT NULL validées");
  }

  // Test 8: Performance des requêtes critiques
  async testQueryPerformance() {
    const criticalQueries = [
      {
        name: "Recherche produits par utilisateur",
        query: "SELECT * FROM products WHERE user_id = ? LIMIT 10",
        params: ["user-demo-001"]
      },
      {
        name: "Statistiques par marque",
        query: "SELECT brand, COUNT(*) as count, AVG(price) as avg_price FROM products WHERE brand IS NOT NULL GROUP BY brand",
        params: []
      },
      {
        name: "Parcelles avec produits", 
        query: `SELECT p.numero, COUNT(pr.id) as product_count 
                FROM parcelles p 
                LEFT JOIN products pr ON p.id = pr.parcelle_id 
                GROUP BY p.id`,
        params: []
      }
    ];

    for (const query of criticalQueries) {
      const startTime = performance.now();
      
      const stmt = this.db.prepare(query.query);
      const results = stmt.all(query.params);
      
      const duration = performance.now() - startTime;
      
      if (duration > 100) { // Plus de 100ms considéré comme lent
        throw new Error(`Requête lente (${duration.toFixed(2)}ms): ${query.name}`);
      }
      
      this.log(`${query.name}: ${results.length} résultats en ${duration.toFixed(2)}ms`);
    }
  }

  // Test 9: Taille et optimisation de la base
  async testDatabaseOptimization() {
    const dbPath = path.join(process.cwd(), "data", "logistix.db");
    const stats = fs.statSync(dbPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    if (stats.size > 100 * 1024 * 1024) { // Plus de 100MB
      throw new Error(`Base de données trop volumineuse: ${sizeInMB}MB`);
    }

    // Vérifier la fragmentation
    const pragma = this.db.prepare("PRAGMA page_count").get();
    const unusedPages = this.db.prepare("PRAGMA freelist_count").get();
    const fragmentation = (unusedPages.freelist_count / pragma.page_count) * 100;

    if (fragmentation > 20) {
      this.log(`Fragmentation élevée: ${fragmentation.toFixed(1)}%`, 'warning');
    }

    this.log(`Taille DB: ${sizeInMB}MB, Fragmentation: ${fragmentation.toFixed(1)}%`);
  }

  // Test 10: Sécurité de base
  async testBasicSecurity() {
    // Vérifier qu'il n'y a pas de mots de passe en clair
    const clearPasswords = this.db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE password_hash NOT LIKE '$2a$%' AND password_hash NOT LIKE '$2b$%'
    `).get().count;

    if (clearPasswords > 0) {
      throw new Error(`${clearPasswords} mots de passe potentiellement non hachés détectés`);
    }

    // Vérifier les permissions de fichier
    const dbPath = path.join(process.cwd(), "data", "logistix.db");
    const stats = fs.statSync(dbPath);
    const permissions = (stats.mode & parseInt('777', 8)).toString(8);

    if (permissions === '666' || permissions === '777') {
      this.log(`Permissions DB trop permissives: ${permissions}`, 'warning');
    }

    this.log("Vérifications de sécurité basiques passées");
  }

  // Génération du rapport final
  generateReport() {
    const total = this.results.passed + this.results.failed;
    const successRate = total > 0 ? (this.results.passed / total) * 100 : 0;
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 RAPPORT DE VALIDATION DE BASE DE DONNÉES");
    console.log("=".repeat(60));
    console.log(`✅ Tests réussis: ${this.results.passed}`);
    console.log(`❌ Tests échoués: ${this.results.failed}`);
    console.log(`📈 Taux de succès: ${successRate.toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log("\n❌ Tests échoués:");
      for (const test of this.results.tests) {
        if (test.status === 'FAILED') {
          console.log(`  - ${test.name}: ${test.error}`);
        }
      }
    }
    
    console.log("\n" + (successRate === 100 ? "✅ VALIDATION RÉUSSIE" : "❌ VALIDATION ÉCHOUÉE"));
    
    return successRate === 100;
  }

  async runAllTests() {
    console.log("🔍 Démarrage des tests d'intégration de base de données...\n");

    await this.runTest("Connexion à la base de données", () => this.testDatabaseConnection());
    await this.runTest("Tables requises", () => this.testRequiredTables());
    await this.runTest("Contraintes de clés étrangères", () => this.testForeignKeyConstraints());
    await this.runTest("Index de performance", () => this.testPerformanceIndexes());
    await this.runTest("Intégrité des données", () => this.testDataIntegrity());
    await this.runTest("Relations entre tables", () => this.testRelationships());
    await this.runTest("Contraintes NOT NULL", () => this.testNotNullConstraints());
    await this.runTest("Performance des requêtes", () => this.testQueryPerformance());
    await this.runTest("Optimisation de la base", () => this.testDatabaseOptimization());
    await this.runTest("Sécurité de base", () => this.testBasicSecurity());

    if (this.db) {
      this.db.close();
    }

    return this.generateReport();
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const validator = new DatabaseValidator();
  
  try {
    const success = await validator.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("\n❌ ERREUR FATALE:", error.message);
    process.exit(1);
  }
}

main();