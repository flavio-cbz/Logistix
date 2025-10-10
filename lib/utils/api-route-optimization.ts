import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  withDatabaseInitialization,
  getExecutionContext,
  requiresDatabaseInitialization,
  ExecutionContext,
  // type DatabaseInitializationOptions
} from "@/lib/middlewares/database-initialization";
import { databaseService } from "@/lib/services/database/db";

// Logger pour l'optimisation des routes API
import { getLogger } from "@/lib/utils/logging/simple-logger";

const logger = getLogger("APIOptimization");

/**
 * Configuration pour l'optimisation des routes API
 */
export interface ApiRouteConfig {
  requiresDatabase?: boolean;
  skipInitializationCheck?: boolean;
  enableHealthCheck?: boolean;
  logPerformance?: boolean;
  cacheHeaders?: boolean;
}

/**
 * Métriques de performance pour les routes API
 */
export interface ApiPerformanceMetrics {
  routePath: string;
  method: string;
  executionTime: number;
  databaseInitialized: boolean;
  context: ExecutionContext;
  timestamp: string;
}

/**
 * Cache des métriques de performance
 */
const performanceMetrics: ApiPerformanceMetrics[] = [];
const MAX_METRICS_CACHE = 100;

/**
 * Ajoute une métrique de performance au cache
 */
function addPerformanceMetric(metric: ApiPerformanceMetrics): void {
  performanceMetrics.push(metric);

  // Maintenir la taille du cache
  if (performanceMetrics.length > MAX_METRICS_CACHE) {
    performanceMetrics.shift();
  }
}

/**
 * Récupère les métriques de performance récentes
 */
export function getRecentPerformanceMetrics(
  limit: number = 50,
): ApiPerformanceMetrics[] {
  return performanceMetrics.slice(-limit);
}

/**
 * Wrapper optimisé pour les handlers d'API GET
 */
export function optimizedApiGet(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: ApiRouteConfig = {},
) {
  return async function optimizedGetHandler(
    request: NextRequest,
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const pathname = request.nextUrl.pathname;
    const context = getExecutionContext();

    const {
      requiresDatabase = requiresDatabaseInitialization(pathname),
      skipInitializationCheck = false,
      enableHealthCheck = true,
      logPerformance = true,
      cacheHeaders = false,
    } = config;

    try {
      // Vérification de santé de la base de données si nécessaire
      if (requiresDatabase && enableHealthCheck && !skipInitializationCheck) {
        const isHealthy = await databaseService.healthCheck();
        if (!isHealthy) {
          logger.warn("Database health check failed", { pathname });
          return NextResponse.json(
            { error: "Database temporarily unavailable" },
            { status: 503 },
          );
        }
      }

      // Exécuter le handler avec initialisation conditionnelle
      const response = await withDatabaseInitialization(() => handler(request));

      // Ajouter des headers de cache si configuré
      if (cacheHeaders && response.status === 200) {
        response.headers.set(
          "Cache-Control",
          "public, max-age=300, stale-while-revalidate=60",
        );
        response.headers.set("X-Database-Context", context);
      }

      // Log des métriques de performance
      if (logPerformance) {
        const executionTime = Date.now() - startTime;
        addPerformanceMetric({
          routePath: pathname,
          method: "GET",
          executionTime,
          databaseInitialized:
            databaseService.getInitializationState() === "completed",
          context,
          timestamp: new Date().toISOString(),
        });
      }

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error("GET request failed", {
        pathname,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: `${executionTime}ms`,
      });

      // Log de l'erreur dans les métriques
      if (logPerformance) {
        addPerformanceMetric({
          routePath: pathname,
          method: "GET",
          executionTime,
          databaseInitialized: false,
          context,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Wrapper optimisé pour les handlers d'API POST
 */
export function optimizedApiPost(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: ApiRouteConfig = {},
) {
  return async function optimizedPostHandler(
    request: NextRequest,
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const pathname = request.nextUrl.pathname;
    const context = getExecutionContext();

    const {
      requiresDatabase = requiresDatabaseInitialization(pathname),
      skipInitializationCheck = false,
      enableHealthCheck = true,
      logPerformance = true,
    } = config;

    try {
      // Vérification de santé de la base de données si nécessaire
      if (requiresDatabase && enableHealthCheck && !skipInitializationCheck) {
        const isHealthy = await databaseService.healthCheck();
        if (!isHealthy) {
          logger.warn("Database health check failed for POST", { pathname });
          return NextResponse.json(
            { error: "Database temporarily unavailable" },
            { status: 503 },
          );
        }
      }

      // Exécuter le handler avec initialisation conditionnelle
      const response = await withDatabaseInitialization(() => handler(request));

      // Log des métriques de performance
      if (logPerformance) {
        const executionTime = Date.now() - startTime;
        addPerformanceMetric({
          routePath: pathname,
          method: "POST",
          executionTime,
          databaseInitialized:
            databaseService.getInitializationState() === "completed",
          context,
          timestamp: new Date().toISOString(),
        });
      }

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error("POST request failed", {
        pathname,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: `${executionTime}ms`,
      });

      // Log de l'erreur dans les métriques
      if (logPerformance) {
        addPerformanceMetric({
          routePath: pathname,
          method: "POST",
          executionTime,
          databaseInitialized: false,
          context,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Wrapper générique pour tous les types de handlers d'API
 */
export function optimizedApiHandler(
  handlers: {
    GET?: (request: NextRequest) => Promise<NextResponse>;
    POST?: (request: NextRequest) => Promise<NextResponse>;
    PUT?: (request: NextRequest) => Promise<NextResponse>;
    DELETE?: (request: NextRequest) => Promise<NextResponse>;
  },
  config: ApiRouteConfig = {},
) {
  const optimizedHandlers: any = {};

  if (handlers.GET) {
    optimizedHandlers.GET = optimizedApiGet(handlers.GET, config);
  }

  if (handlers.POST) {
    optimizedHandlers.POST = optimizedApiPost(handlers.POST, config);
  }

  if (handlers.PUT) {
    optimizedHandlers.PUT = optimizedApiPost(handlers.PUT, config); // Réutiliser la logique POST
  }

  if (handlers.DELETE) {
    optimizedHandlers.DELETE = optimizedApiPost(handlers.DELETE, config); // Réutiliser la logique POST
  }

  return optimizedHandlers;
}

/**
 * Vérifie si une route API doit être optimisée pendant le build
 */
export function shouldOptimizeForBuild(pathname: string): boolean {
  const context = getExecutionContext();

  // Pendant le build, optimiser seulement les routes critiques
  if (context === ExecutionContext.BUILD_TIME) {
    const criticalRoutes = [
      "/api/v1/health",
      "/api/v1/auth/session",
      "/api/v1/metadata",
    ];

    return criticalRoutes.some((route) => pathname.startsWith(route));
  }

  return true;
}

/**
 * Crée un handler optimisé pour les routes qui n'ont pas besoin de base de données
 */
export function createNonDatabaseHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return optimizedApiGet(handler, {
    requiresDatabase: false,
    skipInitializationCheck: true,
    enableHealthCheck: false,
    cacheHeaders: true,
  });
}

/**
 * Crée un handler optimisé pour les routes critiques de base de données
 */
export function createCriticalDatabaseHandler(handlers: {
  GET?: (request: NextRequest) => Promise<NextResponse>;
  POST?: (request: NextRequest) => Promise<NextResponse>;
  PUT?: (request: NextRequest) => Promise<NextResponse>;
  DELETE?: (request: NextRequest) => Promise<NextResponse>;
}) {
  return optimizedApiHandler(handlers, {
    requiresDatabase: true,
    skipInitializationCheck: false,
    enableHealthCheck: true,
    logPerformance: true,
  });
}

/**
 * Récupère les statistiques d'optimisation des routes API
 */
export function getApiOptimizationStats(): {
  totalRequests: number;
  averageExecutionTime: number;
  databaseInitializationRate: number;
  contextDistribution: Record<ExecutionContext, number>;
  methodDistribution: Record<string, number>;
} {
  const totalRequests = performanceMetrics.length;

  if (totalRequests === 0) {
    return {
      totalRequests: 0,
      averageExecutionTime: 0,
      databaseInitializationRate: 0,
      contextDistribution: {} as Record<ExecutionContext, number>,
      methodDistribution: {},
    };
  }

  const totalExecutionTime = performanceMetrics.reduce(
    (sum, metric) => sum + metric.executionTime,
    0,
  );
  const averageExecutionTime = totalExecutionTime / totalRequests;

  const databaseInitializedCount = performanceMetrics.filter(
    (m) => m.databaseInitialized,
  ).length;
  const databaseInitializationRate =
    (databaseInitializedCount / totalRequests) * 100;

  const contextDistribution = performanceMetrics.reduce(
    (acc, metric) => {
      (acc as any)[metric.context] = (acc[metric.context]! || 0) + 1;
      return acc;
    },
    {} as Record<ExecutionContext, number>,
  );

  const methodDistribution = performanceMetrics.reduce(
    (acc, metric) => {
      (acc as any)[metric.method] = (acc[metric.method]! || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    totalRequests,
    averageExecutionTime: Math.round(averageExecutionTime * 100) / 100,
    databaseInitializationRate:
      Math.round(databaseInitializationRate * 100) / 100,
    contextDistribution,
    methodDistribution,
  };
}
