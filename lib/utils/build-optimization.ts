import 'server-only';
import { getExecutionContext, ExecutionContext } from '@/lib/middlewares/database-initialization';

// Logger pour l'optimisation du build
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development' || process.env.DB_DEBUG === 'true') {
      console.log(`[Build-Optimization] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[Build-Optimization] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[Build-Optimization] ${message}`, data ? JSON.stringify(data) : '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.DB_DEBUG === 'true') {
      console.debug(`[Build-Optimization] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
};

/**
 * Configuration pour l'optimisation du build
 */
export interface BuildOptimizationConfig {
  enableDatabaseOptimization: boolean;
  skipNonEssentialRoutes: boolean;
  enableBuildTimeLogging: boolean;
  maxConcurrentConnections: number;
  buildTimeoutMs: number;
}

/**
 * Configuration par défaut pour l'optimisation du build
 */
const DEFAULT_BUILD_CONFIG: BuildOptimizationConfig = {
  enableDatabaseOptimization: true,
  skipNonEssentialRoutes: true,
  enableBuildTimeLogging: true,
  maxConcurrentConnections: 2,
  buildTimeoutMs: 30000
};

/**
 * Récupère la configuration d'optimisation du build
 */
export function getBuildOptimizationConfig(): BuildOptimizationConfig {
  const context = getExecutionContext();
  
  // Configuration spécifique au contexte de build
  if (context === ExecutionContext.BUILD_TIME) {
    return {
      ...DEFAULT_BUILD_CONFIG,
      enableDatabaseOptimization: process.env.BUILD_DB_OPTIMIZATION !== 'false',
      skipNonEssentialRoutes: process.env.BUILD_SKIP_NON_ESSENTIAL !== 'false',
      enableBuildTimeLogging: process.env.BUILD_LOGGING === 'true',
      maxConcurrentConnections: parseInt(process.env.BUILD_MAX_CONNECTIONS || '2'),
      buildTimeoutMs: parseInt(process.env.BUILD_TIMEOUT_MS || '30000')
    };
  }
  
  return DEFAULT_BUILD_CONFIG;
}

/**
 * Vérifie si une route doit être optimisée pendant le build
 */
export function shouldOptimizeRouteForBuild(pathname: string): boolean {
  const config = getBuildOptimizationConfig();
  const context = getExecutionContext();
  
  if (context !== ExecutionContext.BUILD_TIME) {
    return false;
  }
  
  if (!config.enableDatabaseOptimization) {
    return false;
  }
  
  // Routes essentielles qui doivent toujours être optimisées
  const essentialRoutes = [
    '/api/v1/health',
    '/api/v1/auth/session',
    '/api/v1/database/monitoring'
  ];
  
  // Routes non-essentielles qui peuvent être ignorées pendant le build
  const nonEssentialRoutes = [
    '/api/v1/market-analysis',
    '/api/v1/metadata/catalogs',
    '/api/v1/parse-query',
    '/api/v1/historical-prices',
    '/api/v1/validation'
  ];
  
  // Si on ignore les routes non-essentielles et que c'est une route non-essentielle
  if (config.skipNonEssentialRoutes && nonEssentialRoutes.some(route => pathname.startsWith(route))) {
    logger.debug('Skipping non-essential route during build', { pathname });
    return false;
  }
  
  // Optimiser les routes essentielles
  if (essentialRoutes.some(route => pathname.startsWith(route))) {
    logger.debug('Optimizing essential route for build', { pathname });
    return true;
  }
  
  // Par défaut, optimiser les autres routes API
  return pathname.startsWith('/api/v1/');
}

/**
 * Applique les optimisations spécifiques au build
 */
export function applyBuildOptimizations(): void {
  const context = getExecutionContext();
  const config = getBuildOptimizationConfig();
  
  if (context !== ExecutionContext.BUILD_TIME) {
    return;
  }
  
  logger.info('Applying build optimizations', {
    context,
    config
  });
  
  // Configurer les variables d'environnement pour l'optimisation
  if (config.enableDatabaseOptimization) {
    process.env.DB_POOL_SIZE = config.maxConcurrentConnections.toString();
    process.env.DB_CONNECTION_TIMEOUT = config.buildTimeoutMs.toString();
    process.env.DB_BUILD_MODE = 'true';
  }
  
  // Configurer le logging
  if (config.enableBuildTimeLogging) {
    process.env.DB_DEBUG = 'true';
  }
  
  logger.info('Build optimizations applied successfully');
}

/**
 * Nettoie les optimisations après le build
 */
export function cleanupBuildOptimizations(): void {
  const context = getExecutionContext();
  
  if (context !== ExecutionContext.BUILD_TIME) {
    return;
  }
  
  logger.info('Cleaning up build optimizations');
  
  // Nettoyer les variables d'environnement temporaires
  delete process.env.DB_BUILD_MODE;
  
  logger.info('Build optimizations cleanup completed');
}

/**
 * Wrapper pour les opérations de build qui nécessitent des optimisations
 */
export async function withBuildOptimizations<T>(
  operation: () => Promise<T>
): Promise<T> {
  const context = getExecutionContext();
  
  if (context !== ExecutionContext.BUILD_TIME) {
    return await operation();
  }
  
  try {
    applyBuildOptimizations();
    const result = await operation();
    return result;
  } finally {
    cleanupBuildOptimizations();
  }
}

/**
 * Vérifie si le build est en cours et retourne des informations de contexte
 */
export function getBuildContext(): {
  isBuildTime: boolean;
  context: ExecutionContext;
  config: BuildOptimizationConfig;
  optimizationsEnabled: boolean;
} {
  const context = getExecutionContext();
  const config = getBuildOptimizationConfig();
  const isBuildTime = context === ExecutionContext.BUILD_TIME;
  
  return {
    isBuildTime,
    context,
    config,
    optimizationsEnabled: isBuildTime && config.enableDatabaseOptimization
  };
}

/**
 * Middleware pour appliquer automatiquement les optimisations de build
 */
export function buildOptimizationMiddleware() {
  const buildContext = getBuildContext();
  
  if (buildContext.isBuildTime && buildContext.optimizationsEnabled) {
    logger.info('Build optimization middleware activated', {
      context: buildContext.context,
      config: buildContext.config
    });
    
    applyBuildOptimizations();
    
    // Nettoyer lors de l'arrêt du processus
    process.on('exit', cleanupBuildOptimizations);
    process.on('SIGINT', cleanupBuildOptimizations);
    process.on('SIGTERM', cleanupBuildOptimizations);
  }
}

// Appliquer automatiquement les optimisations si nous sommes en mode build
if (typeof window === 'undefined') {
  buildOptimizationMiddleware();
}