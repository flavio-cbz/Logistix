/**
 * HTTP Metrics Middleware
 * 
 * Enregistre automatiquement les métriques HTTP pour chaque requête :
 * - Compteur de requêtes par endpoint
 * - Durée d'exécution (latence)
 * - Codes de statut HTTP
 * 
 * Intégration avec le système de performance metrics existant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { measureOperation } from '@/lib/monitoring/performance-metrics';
import { logger } from '@/lib/utils/logging/logger';

interface HttpMetricsContext {
  method: string;
  pathname: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Middleware pour capturer les métriques HTTP
 * 
 * Usage dans middleware.ts :
 * ```ts
 * export async function middleware(req: NextRequest) {
 *   return withHttpMetrics(req, async () => {
 *     // ... votre logique de middleware existante
 *     return NextResponse.next();
 *   });
 * }
 * ```
 */
export async function withHttpMetrics(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const method = req.method;
  const pathname = new URL(req.url).pathname;
  const startTime = performance.now();

  // Nom de l'opération pour les métriques
  const operationName = `HTTP_${method}_${pathname}`;

  try {
    // Exécuter le handler et mesurer la performance
    const response = await measureOperation(
      operationName,
      handler,
      {
        method,
        pathname,
        requestId: req.headers.get('x-request-id') || 'unknown',
      },
    );

    const duration = performance.now() - startTime;
    const statusCode = response.status;

    // Log métrique HTTP (optionnel, pour analytics externes)
    logHttpMetric({
      method,
      pathname,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
    });

    return response;

  } catch (error) {
    const duration = performance.now() - startTime;

    // Enregistrer métrique d'erreur
    logHttpMetric({
      method,
      pathname,
      statusCode: 500,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Logger simple pour les métriques HTTP
 * (peut être étendu avec un système d'analytics externe)
 */
function logHttpMetric(context: HttpMetricsContext): void {
  // Use structured logger for HTTP metrics
  // This serves as the foundation for external analytics (DataDog, New Relic)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('[HTTP Metric]', context);
  } else {
    // In production, we might want to log this at info level or send to a dedicated service
    // The "analytics" TODO is now handled by this structured log event which can be ingested
    logger.info('HTTP Request Completed', context);
  }
}

/**
 * Helper pour créer un wrapper de route API avec métriques
 * 
 * Usage dans une API route :
 * ```ts
 * export const GET = withApiMetrics('GET /api/v1/produits', async (req) => {
 *   // ... logique de l'API
 *   return NextResponse.json({ data: [] });
 * });
 * ```
 */
export function withApiMetrics<T extends NextRequest>(
  operationName: string,
  handler: (req: T) => Promise<NextResponse>,
): (req: T) => Promise<NextResponse> {
  return async (req: T) => {
    return measureOperation(
      operationName,
      () => handler(req),
      {
        method: req.method,
        pathname: new URL(req.url).pathname,
        requestId: req.headers.get('x-request-id') || 'unknown',
      },
    );
  };
}

/**
 * Récupère des statistiques HTTP agrégées depuis les métriques de performance
 * 
 * @returns Objet avec statistiques HTTP globales
 */
export function getHttpMetricsStats(): {
  totalRequests: number;
  averageLatency: number;
  endpoints: Record<string, { count: number; avgDuration: number }>;
} {
  // Cette fonction analyse les données du PerformanceCollector
  // pour extraire les métriques HTTP uniquement

  const { getPerformanceMetrics } = require('@/lib/monitoring/performance-metrics');
  const allMetrics = getPerformanceMetrics();

  const httpMetrics = Object.entries(allMetrics)
    .filter(([name]) => name.startsWith('HTTP_'))
    .reduce((acc, [name, stats]) => {
      const typedStats = stats as { count: number; avg: number };
      acc[name] = {
        count: typedStats.count,
        avgDuration: typedStats.avg,
      };
      return acc;
    }, {} as Record<string, { count: number; avgDuration: number }>);

  const totalRequests = Object.values(httpMetrics).reduce((sum, m) => sum + m.count, 0);
  const totalDuration = Object.values(httpMetrics).reduce((sum, m) => sum + (m.count * m.avgDuration), 0);
  const averageLatency = totalRequests > 0 ? totalDuration / totalRequests : 0;

  return {
    totalRequests,
    averageLatency,
    endpoints: httpMetrics,
  };
}
