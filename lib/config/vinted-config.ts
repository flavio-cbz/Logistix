/**
 * Configuration interne pour le système Vinted
 * Ne dépend plus du fichier .env
 */

export interface VintedConfig {
  autoRefreshEnabled: boolean;
  refreshIntervalMinutes: number;
  defaultUserId: string;
  apiEndpoints: {
    userCurrent: string;
    sessionRefresh: string;
    suggestions: string;
  };
  headers: {
    userAgent: string;
    accept: string;
    xRequestedWith: string;
  };
}

/**
 * Configuration par défaut du système Vinted
 */
export const VINTED_CONFIG: VintedConfig = {
  // Auto-refresh toujours activé
  autoRefreshEnabled: true,
  
  // Intervalle de rafraîchissement par défaut (30 minutes)
  refreshIntervalMinutes: 30,
  
  // Utilisateur par défaut (sera résolu dynamiquement)
  defaultUserId: 'admin',
  
  // Endpoints API Vinted
  apiEndpoints: {
    userCurrent: 'https://www.vinted.fr/api/v2/users/current',
    sessionRefresh: 'https://www.vinted.fr/session-refresh',
    suggestions: 'https://www.vinted.fr/api/v2/items/suggestions'
  },
  
  // Headers par défaut pour les requêtes
  headers: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    accept: 'application/json',
    xRequestedWith: 'XMLHttpRequest'
  }
};

/**
 * Récupère la configuration avec possibilité de surcharge via variables d'environnement
 */
export function getVintedConfig(): VintedConfig {
  return {
    ...VINTED_CONFIG,
    // Permettre la surcharge via .env si disponible (optionnel)
    autoRefreshEnabled: process.env.VINTED_AUTO_REFRESH_ENABLED === 'false' ? false : VINTED_CONFIG.autoRefreshEnabled,
    refreshIntervalMinutes: process.env.VINTED_TOKEN_REFRESH_INTERVAL_MINUTES 
      ? parseInt(process.env.VINTED_TOKEN_REFRESH_INTERVAL_MINUTES) 
      : VINTED_CONFIG.refreshIntervalMinutes
  };
}

/**
 * Session par défaut pour les tests (peut être remplacée)
 */
export const DEFAULT_TEST_SESSION = 'session_par_defaut_pour_tests';

/**
 * Récupère la session Vinted (depuis .env si disponible, sinon session par défaut)
 */
export function getVintedSession(): string {
  return process.env.VINTED_SESSION || DEFAULT_TEST_SESSION;
}