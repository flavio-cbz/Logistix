// Disabled market analysis services
// import { MetadataService } from '@/lib/services/market-analysis/metadata-service';
// import { SyncService } from '@/lib/services/market-analysis/sync-service';
import { db, getCurrentTimestamp } from '@/lib/services/database/db';
import { SCHEDULE_CONFIG } from '@/lib/constants/config';

// Interface pour les tâches planifiées
interface ScheduledTask {
  userId: string;
  token: string;
  scheduledTime: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}

/**
 * Planificateur de synchronisation pour les métadonnées Vinted
 * Utilise Node.js setInterval pour une exécution régulière
 */
export class CronScheduler {
  // Disabled market analysis services
  // private metadataService: MetadataService;
  // private syncService: SyncService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    // Disabled market analysis services
    // this.metadataService = new MetadataService();
    // this.syncService = new SyncService();
  }

  /**
   * Démarre le scheduler (désactivé)
   */
  start(): void {
    console.log('⚠️ Scheduler désactivé - fonctionnalité d\'analyse de marché temporairement indisponible');
    return;
  }

  /**
   * Arrête le scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Scheduler arrêté');
    }
  }

  /**
   * Vérifie s'il est temps de synchroniser un utilisateur
   */
  private shouldSyncNow(
    lastSync: string | null,
    syncTime: string,
    frequency: 'daily' | 'weekly' | 'monthly'
  ): boolean {
    const now = new Date();
    const [hours, minutes] = syncTime.split(':').map(Number);
    
    // Vérifier l'heure de synchronisation
    if (now.getHours() !== hours || now.getMinutes() !== minutes) {
      return false;
    }

    if (!lastSync) {
      return true;
    }

    const lastSyncDate = new Date(lastSync);
    const timeDiff = now.getTime() - lastSyncDate.getTime();

    switch (frequency) {
      case 'daily':
        return timeDiff >= 24 * 60 * 60 * 1000;
      case 'weekly':
        return timeDiff >= 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return now.getTime() - lastSyncDate.getTime() >= 30 * 24 * 60 * 60 * 1000;
      default:
        return false;
    }
  }

  /**
   * Récupère les utilisateurs à synchroniser maintenant
   */
  private async getUsersToSync(): Promise<ScheduledTask[]> {
  const stmt = db.prepare(`
    SELECT
      u.id as userId,
      u.username,
      uss.frequency,
      uss.sync_time,
      uss.last_sync,
      uss.is_enabled
    FROM users u
    JOIN user_sync_settings uss ON u.id = uss.user_id
    WHERE uss.is_enabled = 1
    ORDER BY uss.last_sync ASC
    LIMIT ?
  `);

    interface UserSyncData {
  userId: string;
  username: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  sync_time: string;
  last_sync: string | null;
  is_enabled: 1 | 0;
}
    const users = stmt.all(SCHEDULE_CONFIG.MAX_CONCURRENT_USERS) as UserSyncData[];
    const tasks: ScheduledTask[] = [];

    for (const user of users) {
      if (this.shouldSyncNow(user.last_sync, user.sync_time, user.frequency)) {
        const token = await this.getUserToken(user.userId);
        if (token) {
          tasks.push({
            userId: user.userId,
            token,
            scheduledTime: user.sync_time,
            frequency: user.frequency,
          });
        }
      }
    }

    return tasks;
  }

  /**
   * Récupère le token Vinted d'un utilisateur
   */
  private async getUserToken(userId: string): Promise<string | null> {
    // Dans la version finale, cela viendra d'une table sécurisée
    // Pour l'instant, on retourne un mock
    return `mock_token_${userId}`;
  }

  /**
   * Exécute la synchronisation pour les utilisateurs éligibles
   */
  private async executeSync(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const tasks = await this.getUsersToSync();
      
      if (tasks.length === 0) {
        return;
      }

      console.log(`📊 ${tasks.length} utilisateur(s) à synchroniser`);

      // Exécuter en parallèle avec limite
      const promises = tasks.map(task => this.syncUser(task));
      await Promise.allSettled(promises);

    } catch (error) {
      console.error('❌ Erreur dans executeSync:', error);
    }
  }

  /**
   * Synchronise un utilisateur spécifique - DISABLED
   */
  private async syncUser(task: ScheduledTask): Promise<boolean> {
    console.log(`⚠️ Synchronisation désactivée pour ${task.userId}`);
    return false;
  }

  /**
   * Obtient l'état actuel du scheduler
   */
  getStatus(): { isRunning: boolean; nextExecution?: Date } {
    return {
      isRunning: this.isRunning,
      nextExecution: this.isRunning 
        ? new Date(Date.now() + SCHEDULE_CONFIG.CHECK_INTERVAL)
        : undefined
    };
  }
}

// Instance globale
export const cronScheduler = new CronScheduler();

// Démarrage automatique si le fichier est exécuté directement
if (require.main === module) {
  cronScheduler.start();
}