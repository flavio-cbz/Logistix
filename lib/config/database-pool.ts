import type { PoolConfig } from '@/lib/types/database-pool';

/**
 * Configuration du pool de connexions basée sur l'environnement
 */
export function getDatabasePoolConfig(): PoolConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
  
  // Configuration optimisée pour le build
  if (isBuild) {
    return {
      maxConnections: parseInt(process.env.DB_POOL_MAX_CONNECTIONS_BUILD || '2'),
      connectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_BUILD || '10000'), // 10s pour le build
      idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_BUILD || '60000'), // 1min pour le build
      retryAttempts: parseInt(process.env.DB_POOL_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.DB_POOL_RETRY_DELAY || '1000'), // 1s pour le build
    };
  }
  
  // Configuration pour la production
  if (isProduction) {
    return {
      maxConnections: parseInt(process.env.DB_POOL_MAX_CONNECTIONS || '8'),
      connectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '30000'),
      idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '300000'), // 5min
      retryAttempts: parseInt(process.env.DB_POOL_RETRY_ATTEMPTS || '5'),
      retryDelay: parseInt(process.env.DB_POOL_RETRY_DELAY || '500'),
    };
  }
  
  // Configuration pour le développement
  return {
    maxConnections: parseInt(process.env.DB_POOL_MAX_CONNECTIONS || '3'),
    connectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '15000'),
    idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '180000'), // 3min
    retryAttempts: parseInt(process.env.DB_POOL_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.DB_POOL_RETRY_DELAY || '500'),
  };
}

/**
 * Variables d'environnement pour la configuration du pool
 */
export const DATABASE_POOL_ENV_VARS = {
  // Configuration générale
  DB_POOL_MAX_CONNECTIONS: 'Nombre maximum de connexions dans le pool',
  DB_POOL_CONNECTION_TIMEOUT: 'Timeout pour obtenir une connexion (ms)',
  DB_POOL_IDLE_TIMEOUT: 'Timeout avant fermeture des connexions inactives (ms)',
  DB_POOL_RETRY_ATTEMPTS: 'Nombre de tentatives en cas d\'erreur',
  DB_POOL_RETRY_DELAY: 'Délai entre les tentatives (ms)',
  
  // Configuration spécifique au build
  DB_POOL_MAX_CONNECTIONS_BUILD: 'Nombre maximum de connexions pendant le build',
  DB_POOL_CONNECTION_TIMEOUT_BUILD: 'Timeout de connexion pendant le build (ms)',
  DB_POOL_IDLE_TIMEOUT_BUILD: 'Timeout d\'inactivité pendant le build (ms)',
  
  // Debug et monitoring
  DB_DEBUG: 'Active les logs de debug du pool (true/false)',
  DB_POOL_METRICS: 'Active la collecte de métriques (true/false)',
} as const;

/**
 * Valide la configuration du pool
 */
export function validatePoolConfig(config: PoolConfig): string[] {
  const errors: string[] = [];
  
  if (config.maxConnections <= 0) {
    errors.push('maxConnections doit être supérieur à 0');
  }
  
  if (config.maxConnections > 20) {
    errors.push('maxConnections ne devrait pas dépasser 20 pour SQLite');
  }
  
  if (config.connectionTimeout <= 0) {
    errors.push('connectionTimeout doit être supérieur à 0');
  }
  
  if (config.idleTimeout <= 0) {
    errors.push('idleTimeout doit être supérieur à 0');
  }
  
  if (config.retryAttempts < 0) {
    errors.push('retryAttempts doit être supérieur ou égal à 0');
  }
  
  if (config.retryDelay <= 0) {
    errors.push('retryDelay doit être supérieur à 0');
  }
  
  if (config.connectionTimeout < config.retryDelay * config.retryAttempts) {
    errors.push('connectionTimeout devrait être supérieur au temps total des tentatives');
  }
  
  return errors;
}

/**
 * Affiche la configuration actuelle du pool
 */
export function logPoolConfig(config: PoolConfig): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
  
  if (!isProduction || process.env.DB_DEBUG === 'true') {
  }
}