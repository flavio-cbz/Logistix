/**
 * Exemple d'utilisation du DatabaseInitializationManager avec le pool de connexions
 * 
 * Ce fichier montre comment les routes API peuvent utiliser le nouveau système
 * pour éviter les problèmes de verrous de base de données pendant le build.
 */

import { enhancedDb } from './enhanced-database-service';
import { initializationManager } from './initialization-manager';

// Exemple 1: Route API qui vérifie l'initialisation avant d'accéder aux données
export async function exampleApiRoute() {
  try {
    // Le service s'assure automatiquement que la base est initialisée
    const users = await enhancedDb.query<{ id: string; username: string }>(
      'SELECT id, username FROM users LIMIT 10',
      undefined,
      'api-users-list'
    );
    
    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: 'Database error' };
  }
}

// Exemple 2: Route API qui attend l'initialisation si elle est en cours
export async function exampleWaitForInit() {
  try {
    // Attendre explicitement l'initialisation si nécessaire
    await initializationManager.waitForInitialization();
    
    const result = await enhancedDb.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM produits WHERE vendu = 1',
      undefined,
      'api-sold-products-count'
    );
    
    return { success: true, soldCount: result?.count || 0 };
  } catch (error) {
    return { success: false, error: 'Initialization failed' };
  }
}

// Exemple 3: Route API qui vérifie l'état d'initialisation
export async function exampleInitStatus() {
  const state = initializationManager.getInitializationState();
  const isInitialized = initializationManager.isInitialized();
  const stats = enhancedDb.getStats();
  
  return {
    initialization: {
      state,
      isInitialized
    },
    database: stats
  };
}

// Exemple 4: Route API avec transaction
export async function exampleTransaction() {
  try {
    const result = await enhancedDb.transaction((db) => {
      // Créer une nouvelle parcelle
      const parcelleStmt = db.prepare(`
        INSERT INTO parcelles (id, user_id, numero, transporteur, prixAchat, poids, prixTotal, prixParGramme)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const parcelleResult = parcelleStmt.run(
        'parcelle-123',
        'user-456',
        'P001',
        'DHL',
        100.0,
        50.0,
        120.0,
        2.4
      );
      
      // Créer un produit associé
      const produitStmt = db.prepare(`
        INSERT INTO produits (id, user_id, parcelleId, commandeId, nom, prixArticle, poids, prixLivraison)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const produitResult = produitStmt.run(
        'produit-789',
        'user-456',
        'parcelle-123',
        'CMD001',
        'Produit Test',
        25.0,
        10.0,
        5.0
      );
      
      return {
        parcelleId: parcelleResult.lastInsertRowid,
        produitId: produitResult.lastInsertRowid
      };
    }, 'api-create-parcelle-with-product');
    
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: 'Transaction failed' };
  }
}

// Exemple 5: Route API avec batch operations
export async function exampleBatchOperations() {
  try {
    const queries = [
      {
        sql: 'UPDATE produits SET vendu = 1, dateVente = ? WHERE id = ?',
        params: [new Date().toISOString(), 'produit-1']
      },
      {
        sql: 'UPDATE produits SET vendu = 1, dateVente = ? WHERE id = ?',
        params: [new Date().toISOString(), 'produit-2']
      },
      {
        sql: 'UPDATE produits SET vendu = 1, dateVente = ? WHERE id = ?',
        params: [new Date().toISOString(), 'produit-3']
      }
    ];
    
    const results = await enhancedDb.batchExecute(queries, 'api-mark-products-sold');
    
    const totalChanges = results.reduce((sum, r) => sum + r.changes, 0);
    
    return { 
      success: true, 
      updatedProducts: totalChanges,
      details: results 
    };
  } catch (error) {
    return { success: false, error: 'Batch operation failed' };
  }
}

// Exemple 6: Health check endpoint
export async function exampleHealthCheck() {
  try {
    const isHealthy = await enhancedDb.healthCheck();
    const stats = enhancedDb.getStats();
    
    return {
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
      stats
    };
  } catch (error) {
    return {
      healthy: false,
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    };
  }
}

// Exemple 7: Utilisation dans un contexte de build Next.js
export async function exampleBuildTimeUsage() {
  try {
    // Pendant le build, vérifier si l'initialisation est nécessaire
    if (!initializationManager.isInitialized()) {
      // Database not initialized during build, initializing...
      await initializationManager.initialize();
    }
    
    // Récupérer des données pour la génération statique
    const data = await enhancedDb.query<{ id: string; nom: string }>(
      'SELECT id, nom FROM produits WHERE vendu = 0 LIMIT 100',
      undefined,
      'build-time-products'
    );
    
    return data;
  } catch (error) {
    // En cas d'erreur pendant le build, retourner des données par défaut
    return [];
  }
}

// Exemple 8: Nettoyage pour les tests
export async function exampleTestCleanup() {
  try {
    // Réinitialiser l'état d'initialisation
    initializationManager.reset();
    
    // Fermer toutes les connexions
    await enhancedDb.shutdown();
    
    // Test cleanup completed
  } catch (error) {
    // Test cleanup error - continuing
  }
}