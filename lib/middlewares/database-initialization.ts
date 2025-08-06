import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { DatabaseInitializationManagerImpl } from '@/lib/services/database/initialization-manager';
import { databaseLogger } from '@/lib/services/database/database-logger';

// Logger pour le middleware
const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development' || process.env.DB_DEBUG === 'true') {
      console.log(`[DB-Middleware] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[DB-Middleware] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[DB-Middleware] ${message}`, data ? JSON.stringify(data) : '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.DB_DEBUG === 'true') {
      console.debug(`[DB-Middleware] ${message}`, data ? JSON.stringify(data) : '');
    }
  },
};

/**
 * Contexte d'exécution pour déterminer si l'initialisation de la base de données est nécessaire
 */
export enum ExecutionContext {
  BUILD_TIME = 'build_time',
  RUNTIME = 'runtime',
  DEVELOPMENT = 'development',
  TEST = 'test'
}

/**
 * Détermine le contexte d'exécution actuel
 */
export function getExecutionContext(): ExecutionContext {
  // Vérifier si nous sommes en mode build Next.js
  if (process.env.NEXT_PHASE === 'phase-production-build' || 
      process.env.NODE_ENV === 'production' && process.env.BUILDING === 'true') {
    return ExecutionContext.BUILD_TIME;
  }
  
  // Vérifier si nous sommes en mode test
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return ExecutionContext.TEST;
  }
  
  // Vérifier si nous sommes en développement
  if (process.env.NODE_ENV === 'development') {
    return ExecutionContext.DEVELOPMENT;
  }
  
  return ExecutionContext.RUNTIME;
}

/**
 * Vérifie si une route nécessite l'initialisation de la base de données
 */
export function requiresDatabaseInitialization(pathname: string): boolean {
  // Routes qui n'ont pas besoin de la base de données
  const nonDatabaseRoutes = [
    '/api/v1/health',
    '/api/v1/debug/cookies',
    '/api/v1/debug/session',
    '/api/v1/debug/set-cookie',
    '/api/v1/debug/set-session',
    '/api/v1/cache',
  ];
  
  // Vérifier si la route est dans la liste des routes sans base de données
  if (nonDatabaseRoutes.some(route => pathname.startsWith(route))) {
    return false;
  }
  
  // Routes qui nécessitent explicitement la base de données
  const databaseRoutes = [
    '/api/v1/auth',
    '/api/v1/parcelles',
    '/api/v1/produits',
    '/api/v1/statistiques',
    '/api/v1/market-analysis',
    '/api/v1/metadata',
    '/api/v1/profile',
    '/api/v1/data',
    '/api/v1/database',
  ];
  
  return databaseRoutes.some(route => pathname.startsWith(route));
}

/**
 * Options pour le middleware d'initialisation de la base de données
 */
export interface DatabaseInitializationOptions {
  skipInitialization?: boolean;
  forceInitialization?: boolean;
  context?: ExecutionContext;
  logInitialization?: boolean;
}

/**
 * Middleware pour gérer l'initialisation conditionnelle de la base de données
 */
export async function withDatabaseInitialization<T>(
  handler: () => Promise<T>,
  options: DatabaseInitializationOptions = {}
): Promise<T> {
  const {
    skipInitialization = false,
    forceInitialization = false,
    context = getExecutionContext(),
    logInitialization = true
  } = options;

  const initManager = DatabaseInitializationManagerImpl.getInstance();
  const startTime = Date.now();

  try {
    // Si l'initialisation est explicitement ignorée
    if (skipInitialization && !forceInitialization) {
      logger.debug('Database initialization skipped by configuration');
      return await handler();
    }

    // Vérifier si l'initialisation est déjà terminée
    if (initManager.isInitialized() && !forceInitialization) {
      logger.debug('Database already initialized, proceeding with handler');
      return await handler();
    }

    // Log du contexte d'exécution
    if (logInitialization) {
      logger.info('Database initialization check', {
        context,
        isInitialized: initManager.isInitialized(),
        forceInitialization
      });
    }

    // Initialiser la base de données si nécessaire
    if (!initManager.isInitialized() || forceInitialization) {
      logger.info('Starting database initialization', { context });
      
      await initManager.initialize();
      
      const initTime = Date.now() - startTime;
      logger.info('Database initialization completed', {
        context,
        initializationTime: `${initTime}ms`
      });

      // Log des métriques d'initialisation
      if (logInitialization) {
        databaseLogger.logConnectionEvent(
          'initialization',
          'initialization_completed',
          String(context),
          initTime,
          { timestamp: new Date().toISOString() }
        );
      }
    }

    // Exécuter le handler
    return await handler();

  } catch (error) {
    const errorTime = Date.now() - startTime;
    logger.error('Database initialization or handler execution failed', {
      context,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: `${errorTime}ms`
    });

    // Log de l'erreur
    if (logInitialization) {
      databaseLogger.logDatabaseError(
        'initialization',
        String(context),
        'initialization_failed',
        error as Error,
        0,
        errorTime
      );
    }

    throw error;
  }
}

/**
 * Middleware Next.js pour l'initialisation conditionnelle de la base de données
 */
export function createDatabaseInitializationMiddleware(
  options: DatabaseInitializationOptions = {}
) {
  return async function databaseInitializationMiddleware(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const pathname = request.nextUrl.pathname;
    const context = getExecutionContext();

    // Vérifier si cette route nécessite l'initialisation de la base de données
    if (!requiresDatabaseInitialization(pathname) && !options.forceInitialization) {
      logger.debug('Route does not require database initialization', { pathname });
      return await handler();
    }

    // Appliquer le middleware d'initialisation
    return await withDatabaseInitialization(
      handler,
      {
        ...options,
        context,
        logInitialization: true
      }
    );
  };
}

/**
 * Wrapper pour les handlers d'API qui nécessitent la base de données
 */
export function withDatabase<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: DatabaseInitializationOptions = {}
) {
  return async (...args: T): Promise<R> => {
    return await withDatabaseInitialization(
      () => handler(...args),
      options
    );
  };
}

/**
 * Vérifie l'état de la base de données sans forcer l'initialisation
 */
export async function checkDatabaseStatus(): Promise<{
  isInitialized: boolean;
  context: ExecutionContext;
  initializationState: string;
}> {
  const initManager = DatabaseInitializationManagerImpl.getInstance();
  const context = getExecutionContext();

  return {
    isInitialized: initManager.isInitialized(),
    context,
    initializationState: initManager.getInitializationState()
  };
}

/**
 * Force l'initialisation de la base de données (à utiliser avec précaution)
 */
export async function forceDatabaseInitialization(): Promise<void> {
  const initManager = DatabaseInitializationManagerImpl.getInstance();
  logger.info('Forcing database initialization');
  
  await initManager.initialize();
  
  logger.info('Forced database initialization completed');
}