import { tokenRefreshScheduler } from './token-refresh-scheduler';
import { logger } from '@/lib/utils/logging/logger';

/**
 * Initialise tous les schedulers de l'application
 */
export function initializeSchedulers() {
  try {
    // Démarre le scheduler de rafraîchissement des tokens
    // Rafraîchissement toutes les 30 minutes
    tokenRefreshScheduler.start(30);
    
    logger.info('[Schedulers] Tous les schedulers ont été initialisés');
  } catch (error) {
    logger.error('[Schedulers] Erreur lors de l\'initialisation des schedulers:', error);
  }
}

/**
 * Arrête tous les schedulers
 */
export function stopSchedulers() {
  try {
    tokenRefreshScheduler.stop();
    logger.info('[Schedulers] Tous les schedulers ont été arrêtés');
  } catch (error) {
    logger.error('[Schedulers] Erreur lors de l\'arrêt des schedulers:', error);
  }
}

export { tokenRefreshScheduler };