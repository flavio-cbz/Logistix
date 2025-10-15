#!/usr/bin/env tsx

/**
 * Pipeline d'ingestion des données mockées vers la base de données
 * Transforme toutes les données in-memory en enregistrements persistants
 * 
 * Usage: npm run db:seed [--force] [--report=csv|json]
 */

import { writeFileSync } from "fs";
import { databaseService } from "../../lib/database/database-service";
import { 
  users, parcelles, products, userPreferences, 
} from "../../lib/database/schema";
import { logger } from "../../lib/utils/logging/logger";
import { eq, count } from "drizzle-orm";
import path from "path";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface SeedReport {
  timestamp: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    entity: string;
    operation: string;
    error: string;
    data?: any;
  }>;
  summary: {
    users: { created: number; updated: number; errors: number };
    parcelles: { created: number; updated: number; errors: number };
    products: { created: number; updated: number; errors: number };
    preferences: { created: number; updated: number; errors: number };
    analyses: { created: number; updated: number; errors: number };
  };
}

interface SeedOptions {
  force: boolean;
  reportFormat: 'csv' | 'json';
  dryRun: boolean;
}

// =============================================================================
// DONNÉES MOCKÉES EXTRAITES DES SERVICES
// =============================================================================

const mockUsers = [
  {
    id: "user-demo-001",
    username: "demo_user",
    email: "demo@logistix.fr", 
    passwordHash: "$2a$10$mockHashForDemo", // Hash bcrypt mocké
    bio: "Utilisateur de démonstration LogistiX",
    theme: "light",
    language: "fr"
  },
  {
    id: "user-test-002", 
    username: "test_seller",
    email: "seller@test.com",
    passwordHash: "$2a$10$mockHashForTest",
    bio: "Vendeur test pour les données de démonstration",
    theme: "dark",
    language: "fr"
  }
];

const mockParcelles = [
  {
    id: "p1",
    userId: "user-demo-001",
    numero: "A123", 
    transporteur: "DHL",
    poids: 1500,
    prixAchat: 150,
    prixTotal: 127.5,
    prixParGramme: 0.085
  },
  {
    id: "p2",
    userId: "user-demo-001", 
    numero: "B456",
    transporteur: "FedEx",
    poids: 800,
    prixAchat: 95,
    prixTotal: 80.75,
    prixParGramme: 0.101
  },
  {
    id: "p3",
    userId: "user-test-002",
    numero: "C789", 
    transporteur: "Colissimo",
    poids: 1200,
    prixAchat: 120,
    prixTotal: 102.0,
    prixParGramme: 0.085
  }
];

const mockProducts = [
  {
    id: "prod1",
    userId: "user-demo-001",
    parcelleId: "p1",
    name: "T-shirt Nike vintage",
    description: "T-shirt Nike vintage en excellent état, porté quelques fois seulement.",
    brand: "Nike", 
    category: "T-shirts",
    size: "M",
    color: "Noir", 
    condition: "bon",
    price: 15.0,
    sellingPrice: 25.0,
    poids: 150,
    status: "available",
    plateforme: "Vinted",
    vintedItemId: "vinted-001"
  },
  {
    id: "prod2", 
    userId: "user-demo-001",
    parcelleId: "p1",
    name: "Jeans Levi's 501",
    description: "Jeans Levi's 501 classique, taille parfaite, très peu porté.",
    brand: "Levi's",
    category: "Jeans", 
    size: "32/34",
    color: "Bleu",
    condition: "excellent",
    price: 35.0,
    sellingPrice: 55.0,
    poids: 400,
    status: "sold",
    plateforme: "Vinted",
    vintedItemId: "vinted-002",
    dateVente: new Date('2024-01-15').toISOString()
  },
  {
    id: "prod3",
    userId: "user-test-002", 
    parcelleId: "p3",
    name: "Sneakers Adidas",
    description: "Baskets Adidas en très bon état, pointure 42.",
    brand: "Adidas",
    category: "Chaussures",
    size: "42", 
    color: "Blanc",
    condition: "bon",
    price: 45.0,
    sellingPrice: 75.0,
    poids: 600,
    status: "available",
    plateforme: "leboncoin"
  }
];

const mockUserPreferences = [
  {
    id: "pref-001",
    userId: "user-demo-001",
    objectives: ["profit", "volume"],
    riskTolerance: "moderate" as const,
    preferredInsightTypes: ["trends", "opportunities"],
    customFilters: {}
  },
  {
    id: "pref-002", 
    userId: "user-test-002",
    objectives: ["profit"],
    riskTolerance: "aggressive" as const,
    preferredInsightTypes: ["trends", "predictions"],
    customFilters: {
      minPrice: 20,
      brands: ["Nike", "Adidas"]
    }
  }
];

const mockMarketAnalyses = [
  {
    id: "analysis-001",
    userId: "user-demo-001", 
    productName: "T-shirt Nike vintage",
    status: "completed" as const,
    result: {
      avgPrice: 22.5,
      minPrice: 15.0,
      maxPrice: 35.0, 
      salesVolume: 150,
      recommendation: "Prix compétitif, bon potentiel de vente"
    },
    categoryName: "T-shirts",
    brandId: 1
  }
];

// =============================================================================
// FONCTIONS D'UPSERT (IDEMPOTENCE)
// =============================================================================

class SeedService {
  private report: SeedReport;
  private options: SeedOptions;
  
  constructor(options: SeedOptions) {
    this.options = options;
    this.report = {
      timestamp: new Date().toISOString(),
      totalRecords: 0,
      successCount: 0, 
      errorCount: 0,
      errors: [],
      summary: {
        users: { created: 0, updated: 0, errors: 0 },
        parcelles: { created: 0, updated: 0, errors: 0 },
        products: { created: 0, updated: 0, errors: 0 },
        preferences: { created: 0, updated: 0, errors: 0 },
        analyses: { created: 0, updated: 0, errors: 0 }
      }
    };
  }

  private logError(entity: string, operation: string, error: Error, data?: any) {
    this.report.errors.push({
      entity,
      operation, 
      error: error.message,
      data
    });
    this.report.errorCount++;
    logger.error(`Erreur ${operation} ${entity}`, { error: error.message, data });
  }

  private logSuccess(entity: keyof SeedReport['summary'], operation: 'created' | 'updated') {
    this.report.summary[entity][operation]++;
    this.report.successCount++;
  }

  async upsertUsers() {
    logger.info("👥 Import des utilisateurs...");
    const db = await databaseService.getDb();
    
    for (const userData of mockUsers) {
      try {
        if (this.options.dryRun) {
          logger.info(`[DRY RUN] Création utilisateur: ${userData.username}`);
          this.logSuccess('users', 'created');
          continue;
        }
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.id, userData.id));
          
        if (existingUser[0]?.count > 0) {
          if (!this.options.force) {
            logger.info(`Utilisateur ${userData.username} existe déjà, ignoré`);
            continue;
          }
          
          // Mise à jour
          await db
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date().toISOString()
            })
            .where(eq(users.id, userData.id));
            
          this.logSuccess('users', 'updated');
          logger.info(`✅ Utilisateur ${userData.username} mis à jour`);
        } else {
          // Création
          await db.insert(users).values(userData);
          this.logSuccess('users', 'created');
          logger.info(`✅ Utilisateur ${userData.username} créé`);
        }
        
      } catch (error) {
        this.logError('users', 'upsert', error as Error, userData);
      }
    }
  }

  async upsertParcelles() {
    logger.info("📦 Import des parcelles...");
    const db = await databaseService.getDb();
    
    for (const parcelleData of mockParcelles) {
      try {
        
        if (this.options.dryRun) {
          logger.info(`[DRY RUN] Création parcelle: ${parcelleData.numero}`);
          this.logSuccess('parcelles', 'created');
          continue;
        }

        const existingParcelle = await db
          .select({ count: count() })
          .from(parcelles)
          .where(eq(parcelles.id, parcelleData.id));
          
        if (existingParcelle[0]?.count > 0) {
          if (!this.options.force) {
            logger.info(`Parcelle ${parcelleData.numero} existe déjà, ignorée`);
            continue;
          }
          
          await db
            .update(parcelles) 
            .set({
              ...parcelleData,
              updatedAt: new Date().toISOString()
            })
            .where(eq(parcelles.id, parcelleData.id));
            
          this.logSuccess('parcelles', 'updated');
          logger.info(`✅ Parcelle ${parcelleData.numero} mise à jour`);
        } else {
          await db.insert(parcelles).values(parcelleData);
          this.logSuccess('parcelles', 'created');
          logger.info(`✅ Parcelle ${parcelleData.numero} créée`);
        }
        
      } catch (error) {
        this.logError('parcelles', 'upsert', error as Error, parcelleData);
      }
    }
  }

  async upsertProducts() {
    logger.info("🛍️ Import des produits...");
    const db = await databaseService.getDb();
    
    for (const productData of mockProducts) {
      try {
        
        if (this.options.dryRun) {
          logger.info(`[DRY RUN] Création produit: ${productData.name}`);
          this.logSuccess('products', 'created'); 
          continue;
        }

        const existingProduct = await db
          .select({ count: count() })
          .from(products)
          .where(eq(products.id, productData.id));
          
        if (existingProduct[0]?.count > 0) {
          if (!this.options.force) {
            logger.info(`Produit ${productData.name} existe déjà, ignoré`);
            continue;
          }
          
          await db
            .update(products)
            .set({
              ...productData,
              updatedAt: new Date().toISOString()
            })
            .where(eq(products.id, productData.id));
            
          this.logSuccess('products', 'updated');
          logger.info(`✅ Produit ${productData.name} mis à jour`);
        } else {
          await db.insert(products).values(productData);
          this.logSuccess('products', 'created');
          logger.info(`✅ Produit ${productData.name} créé`);
        }
        
      } catch (error) {
        this.logError('products', 'upsert', error as Error, productData);
      }
    }
  }

  async upsertPreferences() {
    logger.info("⚙️ Import des préférences utilisateur...");
    const db = await databaseService.getDb();
    
    for (const prefData of mockUserPreferences) {
      try {
        
        if (this.options.dryRun) {
          logger.info(`[DRY RUN] Création préférences pour: ${prefData.userId}`);
          this.logSuccess('preferences', 'created');
          continue;
        }

        const existingPref = await db
          .select({ count: count() })
          .from(userPreferences) 
          .where(eq(userPreferences.userId, prefData.userId));
          
        if (existingPref[0]?.count > 0) {
          if (!this.options.force) {
            logger.info(`Préférences pour ${prefData.userId} existent déjà, ignorées`);
            continue;
          }
          
          await db
            .update(userPreferences)
            .set({
              ...prefData,
              updatedAt: new Date().toISOString()
            })
            .where(eq(userPreferences.userId, prefData.userId));
            
          this.logSuccess('preferences', 'updated');
          logger.info(`✅ Préférences ${prefData.userId} mises à jour`);
        } else {
          await db.insert(userPreferences).values(prefData);
          this.logSuccess('preferences', 'created');
          logger.info(`✅ Préférences ${prefData.userId} créées`);
        }
        
      } catch (error) {
        this.logError('preferences', 'upsert', error as Error, prefData);
      }
    }
  }

  calculateErrorRate(): number {
    const total = this.report.successCount + this.report.errorCount;
    return total > 0 ? (this.report.errorCount / total) * 100 : 0;
  }

  async generateReport() {
    const errorRate = this.calculateErrorRate();
    
    logger.info("📋 Rapport d'ingestion", {
      successCount: this.report.successCount,
      errorCount: this.report.errorCount,
      errorRate: `${errorRate.toFixed(2)}%`,
      timestamp: this.report.timestamp
    });

    // Générer le fichier de rapport
    const reportDir = path.join(process.cwd(), "reports", "seed");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    
    if (this.options.reportFormat === 'json') {
      const reportPath = path.join(reportDir, `seed-report-${timestamp}.json`);
      writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
      logger.info(`📄 Rapport JSON sauvegardé: ${reportPath}`);
    } else {
      const csvData = this.generateCSVReport();
      const reportPath = path.join(reportDir, `seed-report-${timestamp}.csv`);
      writeFileSync(reportPath, csvData);
      logger.info(`📄 Rapport CSV sauvegardé: ${reportPath}`);
    }
    
    // Validation du taux d'erreur
    if (errorRate > 0.1) {
      logger.error(`❌ Taux d'erreur trop élevé: ${errorRate.toFixed(2)}% > 0.1%`);
      process.exit(1);
    }
    
    logger.info(`✅ Ingestion réussie - Taux d'erreur: ${errorRate.toFixed(2)}%`);
  }

  private generateCSVReport(): string {
    const headers = ["Entity", "Operation", "Count", "Errors"];
    const rows = [
      ["Users", "Created", this.report.summary.users.created.toString(), this.report.summary.users.errors.toString()],
      ["Users", "Updated", this.report.summary.users.updated.toString(), ""],
      ["Parcelles", "Created", this.report.summary.parcelles.created.toString(), this.report.summary.parcelles.errors.toString()],
      ["Parcelles", "Updated", this.report.summary.parcelles.updated.toString(), ""],
      ["Products", "Created", this.report.summary.products.created.toString(), this.report.summary.products.errors.toString()],
      ["Products", "Updated", this.report.summary.products.updated.toString(), ""],
      ["Preferences", "Created", this.report.summary.preferences.created.toString(), this.report.summary.preferences.errors.toString()],
      ["Preferences", "Updated", this.report.summary.preferences.updated.toString(), ""],
      ["Analyses", "Created", this.report.summary.analyses.created.toString(), this.report.summary.analyses.errors.toString()],
      ["Analyses", "Updated", this.report.summary.analyses.updated.toString(), ""]
    ];
    
    return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
  }

  async run() {
    const startTime = performance.now();
    logger.info("🚀 Début de l'ingestion des données mockées...");
    
    if (this.options.dryRun) {
      logger.info("🧪 Mode DRY RUN activé - Aucune donnée ne sera modifiée");
    }
    
    // Ordre respectant les contraintes FK
    await this.upsertUsers();
    await this.upsertParcelles(); 
    await this.upsertProducts();
    await this.upsertPreferences();
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    this.report.totalRecords = this.report.successCount + this.report.errorCount;
    
    logger.info(`⏱️ Ingestion terminée en ${duration}ms`);
    await this.generateReport();
  }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  const options: SeedOptions = {
    force: args.includes('--force'),
    reportFormat: args.includes('--report=json') ? 'json' : 'csv', 
    dryRun: args.includes('--dry-run')
  };
  
  logger.info("🌱 Pipeline d'ingestion des données mockées", { options });
  
  const seedService = new SeedService(options);
  await seedService.run();
}

if (require.main === module) {
  main().catch((error) => {
    logger.error("❌ Erreur fatale lors de l'ingestion", { error: error.message });
    process.exit(1);
  });
}

export { SeedService, mockUsers, mockParcelles, mockProducts };