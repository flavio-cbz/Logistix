import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { logger } from '@/lib/utils/logging/logger';
import { getVintedConfig } from '@/lib/config/vinted-config';

class TokenRefreshScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Démarre le scheduler pour rafraîchir automatiquement les tokens
   * @param intervalMinutes Intervalle en minutes (utilise la configuration interne par défaut)
   */
  start(intervalMinutes?: number) {
    if (this.isRunning) {
      logger.warn('[TokenRefreshScheduler] Le scheduler est déjà en cours d\'exécution');
      return;
    }

    const config = getVintedConfig();
    
    // Vérifier si l'auto-refresh est activé
    if (!config.autoRefreshEnabled) {
      logger.info('[TokenRefreshScheduler] Auto-refresh désactivé via configuration');
      return;
    }

    const interval = intervalMinutes || config.refreshIntervalMinutes;
    const intervalMs = interval * 60 * 1000;
    
    this.intervalId = setInterval(async () => {
      await this.refreshAllTokens();
    }, intervalMs);

    this.isRunning = true;
    logger.info(`[TokenRefreshScheduler] Scheduler démarré - rafraîchissement toutes les ${interval} minutes`);
  }

  /**
   * Arrête le scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('[TokenRefreshScheduler] Scheduler arrêté');
  }

  /**
   * Rafraîchit tous les tokens des utilisateurs
   */
  private async refreshAllTokens() {
    try {
      logger.info('[TokenRefreshScheduler] Début du rafraîchissement automatique des tokens');
      
      const config = getVintedConfig();
      // Utilise l'utilisateur par défaut de la configuration
      await vintedSessionManager.refreshSession(config.defaultUserId);
      
      logger.info('[TokenRefreshScheduler] Rafraîchissement automatique terminé');
    } catch (error) {
      logger.error('[TokenRefreshScheduler] Erreur lors du rafraîchissement automatique:', error);
    }
  }

  /**
   * Vérifie si le scheduler est en cours d'exécution
   */
  get isActive(): boolean {
    return this.isRunning;
  }
}

export const tokenRefreshScheduler = new TokenRefreshScheduler();