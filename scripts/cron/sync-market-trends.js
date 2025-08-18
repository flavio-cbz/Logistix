#!/usr/bin/env node

/**
 * Script CRON pour synchroniser les tendances de marché des produits suivis.
 * Usage: node scripts/cron/sync-market-trends.js
 */

const { db } = require('../../lib/services/database/drizzle-client');
const { vintedMarketAnalysisService } = require('../../lib/services/vinted-market-analysis');
const { vintedSessionManager } = require('../../lib/services/auth/vinted-session-manager');
const { logger } = require('../../lib/utils/logging/logger');

const BATCH_SIZE = 10; // Nombre de produits à traiter par exécution

class CronMarketTrendsService {
  constructor() {
    this.db = db;
  }

  /**
   * Récupère les produits suivis qui nécessitent une mise à jour.
   */
  getProductsToUpdate() {
    // Sélectionne les produits actifs qui n'ont pas été vérifiés depuis plus de 24 heures
    const stmt = this.db.prepare(`
      SELECT id, user_id, product_name, catalog_id, brand_id
      FROM tracked_products
      WHERE is_active = 1 AND (
        last_checked_at IS NULL OR
        datetime(last_checked_at, '+1 day') <= datetime('now')
      )
      ORDER BY last_checked_at ASC
      LIMIT ?
    `);
    return stmt.all(BATCH_SIZE);
  }

  /**
   * Exécute la synchronisation pour un produit suivi.
   */
  async syncProduct(product) {
    logger.info(`[CronTrends] Début de la synchronisation pour le produit: "${product.product_name}" (ID: ${product.id})`);

    const userCookie = await vintedSessionManager.getSessionCookie(product.user_id);
    if (!userCookie) {
      logger.warn(`[CronTrends] Pas de cookie Vinted pour l'utilisateur ${product.user_id}, impossible de synchroniser le produit ${product.id}`);
      return;
    }

    try {
      const analysisResult = await vintedMarketAnalysisService.analyzeProduct({
        productName: product.product_name,
        catalogId: product.catalog_id,
        brandId: product.brand_id,
        token: userCookie,
      });

      // Insérer le nouveau snapshot de tendance
      const trendId = `trend_${new Date().getTime()}`;
      const snapshotDate = new Date().toISOString();
      
      const insertStmt = this.db.prepare(`
        INSERT INTO market_trends (id, tracked_product_id, snapshot_date, avg_price, sales_volume)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertStmt.run(trendId, product.id, snapshotDate, analysisResult.avgPrice, analysisResult.salesVolume);

      // Mettre à jour la date de dernière vérification
      const updateStmt = this.db.prepare(`
        UPDATE tracked_products
        SET last_checked_at = ?
        WHERE id = ?
      `);
      updateStmt.run(snapshotDate, product.id);

      logger.info(`[CronTrends] Succès: Produit ${product.id} mis à jour. Prix moyen: ${analysisResult.avgPrice}, Volume: ${analysisResult.salesVolume}`);

    } catch (error) {
      logger.error(`[CronTrends] Erreur lors de la synchronisation du produit ${product.id}:`, error);
      // Optionnel: marquer le produit comme ayant une erreur pour ne pas le réessayer immédiatement.
    }
  }

  /**
   * Exécute le processus de synchronisation complet.
   */
  async run() {
    logger.info('[CronTrends] Démarrage du script de synchronisation des tendances de marché.');
    const productsToUpdate = this.getProductsToUpdate();

    if (productsToUpdate.length === 0) {
      logger.info('[CronTrends] Aucun produit à mettre à jour.');
      return;
    }

    logger.info(`[CronTrends] ${productsToUpdate.length} produit(s) à synchroniser.`);

    for (const product of productsToUpdate) {
      await this.syncProduct(product);
      // Petite pause pour ne pas surcharger l'API Vinted
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    logger.info('[CronTrends] Script de synchronisation terminé.');
  }
}

async function main() {
  const trendService = new CronMarketTrendsService();
  await trendService.run();
}

if (require.main === module) {
  main()
    .then(() => {
      logger.info('[CronTrends] Exécution terminée, fermeture de la connexion DB.');
      // La connexion DB est gérée globalement, pas besoin de la fermer ici.
      process.exit(0);
    })
    .catch(error => {
      logger.error('[CronTrends] Erreur fatale dans le script:', error);
      process.exit(1);
    });
}