#!/usr/bin/env node

/**
 * Script CRON pour synchroniser les métadonnées Vinted
 * Usage: node scripts/cron/sync-metadata.js [user_id]
 */

const path = require('path');
const { db } = require('../../lib/services/db'); // Utiliser l'instance de DB centralisée

// Configuration
const SYNC_BATCH_SIZE = 50; // Nombre d'utilisateurs à traiter par exécution
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 secondes

/**
 * Classe de synchronisation
 */
class CronSyncService {
  constructor() {
    this.db = db; // Utiliser l'instance de DB centralisée
  }

  /**
   * Récupère les utilisateurs qui doivent être synchronisés
   */
  getUsersToSync() {
    const stmt = this.db.prepare(`
      SELECT 
        u.id as user_id,
        u.username,
        uss.frequency,
        uss.sync_time,
        uss.last_sync,
        uss.is_enabled
      FROM users u
      JOIN user_sync_settings uss ON u.id = uss.user_id
      WHERE uss.is_enabled = 1
        AND (
          uss.last_sync IS NULL 
          OR (
            CASE uss.frequency
              WHEN 'daily' THEN datetime(uss.last_sync, '+1 day') <= datetime('now')
              WHEN 'weekly' THEN datetime(uss.last_sync, '+7 days') <= datetime('now')
              WHEN 'monthly' THEN datetime(uss.last_sync, '+30 days') <= datetime('now')
            END
          )
        )
      ORDER BY uss.last_sync ASC
      LIMIT ?
    `);
    
    return stmt.all(SYNC_BATCH_SIZE);
  }

  /**
   * Récupère le token Vinted d'un utilisateur
   */
  getUserToken(userId) {
    // Pour l'instant, on utilise une table de tokens
    // Dans la version finale, cela pourrait venir d'une table sécurisée
    const stmt = this.db.prepare(`
      SELECT vinted_token 
      FROM user_tokens 
      WHERE user_id = ? AND is_valid = 1
      ORDER BY created_at DESC LIMIT 1
    `);
    
    const result = stmt.get(userId);
    return result?.vinted_token || null;
  }

  /**
   * Enregistre le début d'une synchronisation
   */
  startSyncLog(userId, syncType) {
    const id = Math.random().toString(36).substring(2, 15);
    const stmt = this.db.prepare(`
      INSERT INTO sync_logs (id, user_id, sync_type, started_at, status, items_processed)
      VALUES (?, ?, ?, datetime('now'), 'running', 0)
    `);
    
    stmt.run(id, userId, syncType);
    return id;
  }

  /**
   * Met à jour le log de synchronisation
   */
  updateSyncLog(logId, status, itemsProcessed = 0, errorDetails = null) {
    const stmt = this.db.prepare(`
      UPDATE sync_logs 
      SET ended_at = datetime('now'),
          status = ?,
          items_processed = ?,
          error_details = ?
      WHERE id = ?
    `);
    
    stmt.run(status, itemsProcessed, errorDetails, logId);
  }

  /**
   * Met à jour la date de dernière synchronisation
   */
  updateLastSync(userId) {
    const stmt = this.db.prepare(`
      UPDATE user_sync_settings 
      SET last_sync = datetime('now'), updated_at = datetime('now')
      WHERE user_id = ?
    `);
    
    stmt.run(userId);
  }

  /**
   * Effectue la synchronisation pour un utilisateur
   */
  async syncUser(user) {
    console.log(`🔄 Synchronisation pour ${user.username} (${user.user_id})`);
    
    const token = this.getUserToken(user.user_id);
    if (!token) {
      console.log(`⚠️  Pas de token Vinted pour ${user.username}`);
      return false;
    }

    const logId = this.startSyncLog(user.user_id, 'full');
    
    try {
      // Note: Pour l'instant, on simule la synchronisation
      // Dans la version finale, on intégrera avec le SyncService TypeScript
      
      // Simulation de la synchronisation
      const mockResults = {
        catalogs: 150,
        brands: 2000,
        colors: 50,
        materials: 30,
        statuses: 5,
        sizes: 500
      };
      
      const total = Object.values(mockResults).reduce((a, b) => a + b, 0);
      
      // Attendre un peu pour simuler le temps de traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.updateSyncLog(logId, 'success', total);
      this.updateLastSync(user.user_id);
      
      console.log(`✅ Synchronisation terminée pour ${user.username}: ${total} éléments`);
      return true;
      
    } catch (error) {
      console.error(`❌ Erreur pour ${user.username}:`, error.message);
      this.updateSyncLog(logId, 'failed', 0, error.message);
      return false;
    }
  }

  /**
   * Exécute la synchronisation pour tous les utilisateurs
   */
  async run() {
    console.log('🚀 Démarrage de la synchronisation des métadonnées Vinted');
    console.log(`📅 ${new Date().toISOString()}`);
    
    const users = this.getUsersToSync();
    
    if (users.length === 0) {
      console.log('ℹ️  Aucun utilisateur à synchroniser');
      return;
    }

    console.log(`👥 ${users.length} utilisateur(s) à synchroniser`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const result = await this.syncUser(user);
        if (result) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Petite pause entre les utilisateurs
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`💥 Erreur critique pour ${user.username}:`, error);
        errorCount++;
      }
    }

    console.log(`📊 Résultat: ${successCount} succès, ${errorCount} erreurs`);
    console.log('🏁 Synchronisation terminée');
  }
}

/**
 * Fonction principale
 */
async function main() {
  const syncService = new CronSyncService();
  
  // Vérifier les arguments
  const userId = process.argv[2];
  
  if (userId) {
    // Synchronisation d'un utilisateur spécifique
    console.log(`🎯 Synchronisation spécifique pour l'utilisateur ${userId}`);
    
    const user = syncService.db.prepare(`
      SELECT u.id as user_id, u.username, uss.frequency, uss.sync_time, uss.last_sync, uss.is_enabled
      FROM users u
      JOIN user_sync_settings uss ON u.id = uss.user_id
      WHERE u.id = ?
    `).get(userId);
    
    if (user && user.is_enabled) {
      await syncService.syncUser(user);
    } else {
      console.log('❌ Utilisateur non trouvé ou synchronisation désactivée');
    }
  } else {
    // Synchronisation batch
    await syncService.run();
  }
}

// Exécution
if (require.main === module) {
  main()
    .then(() => {
      db.close();
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { CronSyncService };