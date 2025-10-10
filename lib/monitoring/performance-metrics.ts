/**
 * Performance Metrics & Instrumentation
 * 
 * Système de mesure des performances des use-cases et opérations critiques.
 * Collecte des métriques de latence (p50, p95, p99) et compteurs.
 */

import { logger } from '@/lib/utils/logging/logger';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
}

class PerformanceCollector {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly maxMetricsPerOperation = 1000; // Limite pour éviter la fuite mémoire

  /**
   * Enregistre une métrique de performance
   */
  record(metric: PerformanceMetric): void {
    const { operation } = metric;
    
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(metric);

    // Limiter le nombre de métriques stockées (FIFO)
    if (operationMetrics.length > this.maxMetricsPerOperation) {
      operationMetrics.shift();
    }

    // Log si l'opération est lente (> 1s)
    if (metric.duration > 1000) {
      logger.warn(`Slow operation detected: ${operation}`, {
        duration: metric.duration,
        ...metric.metadata,
      });
    }
  }

  /**
   * Calcule les statistiques pour une opération
   */
  getStats(operation: string): PerformanceStats | null {
    const operationMetrics = this.metrics.get(operation);
    
    if (!operationMetrics || operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = operationMetrics.filter(m => m.success).length;

    return {
      count: operationMetrics.length,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      successRate: (successCount / operationMetrics.length) * 100,
    };
  }

  /**
   * Récupère toutes les statistiques
   */
  getAllStats(): Record<string, PerformanceStats> {
    const stats: Record<string, PerformanceStats> = {};
    
    for (const operation of this.metrics.keys()) {
      const operationStats = this.getStats(operation);
      if (operationStats) {
        stats[operation] = operationStats;
      }
    }

    return stats;
  }

  /**
   * Réinitialise les métriques
   */
  reset(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Calcule un percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
}

// Instance singleton
export const performanceCollector = new PerformanceCollector();

/**
 * Décorateur pour instrumenter automatiquement un use-case
 * 
 * Usage:
 * ```typescript
 * @measurePerformance('CreateProduitUseCase')
 * async execute(input: CreateProduitInput) {
 *   // ...
 * }
 * ```
 */
export function measurePerformance(operationName: string) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      let success = true;
      let error: Error | undefined;

      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err as Error;
        throw err;
      } finally {
        const duration = performance.now() - startTime;
        
        performanceCollector.record({
          operation: operationName,
          duration,
          timestamp: new Date().toISOString(),
          success,
          metadata: {
            method: propertyKey,
            error: error?.message,
          },
        });

        // Log la métrique
        logger.info(`[PERF] ${operationName}.${propertyKey}`, {
          duration: Math.round(duration),
          success,
          error: error?.message,
        });
      }
    };

    return descriptor;
  };
}

/**
 * Helper function pour mesurer manuellement une opération
 * 
 * Usage:
 * ```typescript
 * const result = await measureOperation('my-operation', async () => {
 *   // code à mesurer
 *   return something;
 * });
 * ```
 */
export async function measureOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();
  let success = true;
  let error: Error | undefined;

  try {
    const result = await operation();
    return result;
  } catch (err) {
    success = false;
    error = err as Error;
    throw err;
  } finally {
    const duration = performance.now() - startTime;
    
    performanceCollector.record({
      operation: operationName,
      duration,
      timestamp: new Date().toISOString(),
      success,
      metadata: {
        ...metadata,
        error: error?.message,
      },
    });

    logger.info(`[PERF] ${operationName}`, {
      duration: Math.round(duration),
      success,
      ...metadata,
    });
  }
}

/**
 * Middleware pour exposer les métriques via API
 */
export function getPerformanceMetrics(): Record<string, PerformanceStats> {
  return performanceCollector.getAllStats();
}

/**
 * Reset des métriques (utile pour les tests)
 */
export function resetPerformanceMetrics(operation?: string): void {
  performanceCollector.reset(operation);
}
