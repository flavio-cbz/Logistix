/**
 * Helper Database Connection pour Tests et Application
 * 
 * Fournit un accès simple aux repositories via la Database Factory
 * Gère l'initialisation automatique et le cache des instances
 */

import { DatabaseFactory, DatabaseType, RepositoryContainer } from '@/lib/config/database-factory';
import { logger } from '@/lib/utils/logging/logger';

let cachedRepositories: RepositoryContainer | null = null;
let currentDatabaseType: DatabaseType | null = null;

/**
 * Obtient les repositories selon la configuration environnement
 */
export async function getDatabaseConnection(): Promise<RepositoryContainer> {
  const configuredType = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase() as DatabaseType;
  
  // Si le type a changé ou si pas de cache, reinitialiser
  if (!cachedRepositories || currentDatabaseType !== configuredType) {
    logger.info('Initializing database connection', { type: configuredType });
    
    const factory = DatabaseFactory.getInstance(
      DatabaseFactory.createConfigFromEnv()
    );
    
    cachedRepositories = await factory.getRepositories();
    currentDatabaseType = configuredType;
    
    logger.info('Database connection established', { 
      type: configuredType,
      repositories: Object.keys(cachedRepositories)
    });
  }
  
  return cachedRepositories;
}

/**
 * Force une reconnexion (utile pour les tests)
 */
export function resetDatabaseConnection(): void {
  cachedRepositories = null;
  currentDatabaseType = null;
  logger.debug('Database connection cache reset');
}

/**
 * Obtient seulement le repository des parcelles
 */
export async function getParcelleRepository() {
  const { parcelleRepository } = await getDatabaseConnection();
  return parcelleRepository;
}

/**
 * Check de santé de la connexion DB
 */
export async function checkDatabaseHealth(): Promise<{
  type: DatabaseType;
  status: 'healthy' | 'error';
  message?: string;
}> {
  try {
    const repositories = await getDatabaseConnection();
    
    // Test simple : compter les éléments (ne devrait pas échouer)
    const testUserId = 'health-check-test';
    if ((repositories as any).parcelleRepository) {
      await (repositories as any).parcelleRepository.countByUserId(testUserId);
    }
    
    return {
      type: currentDatabaseType!,
      status: 'healthy',
    };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      type: currentDatabaseType || DatabaseType.SQLITE,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}