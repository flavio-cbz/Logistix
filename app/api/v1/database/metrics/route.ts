import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { databaseService } from "@/lib/services/database/db";
import { createNonDatabaseHandler } from "@/lib/utils/api-route-optimization";

interface TimeSeriesMetric {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

interface MetricsReport {
  connectionPool: {
    utilization: TimeSeriesMetric[];
    activeConnections: TimeSeriesMetric[];
    queueLength: TimeSeriesMetric[];
    waitTime: TimeSeriesMetric[];
  };
  database: {
    queryTime: TimeSeriesMetric[];
    errorRate: TimeSeriesMetric[];
    lockEvents: TimeSeriesMetric[];
    throughput: TimeSeriesMetric[];
  };
  system: {
    memoryUsage: TimeSeriesMetric[];
    uptime: number;
    processId: number;
  };
  summary: {
    period: string;
    totalOperations: number;
    averageResponseTime: number;
    errorCount: number;
    peakUtilization: number;
  };
}

function analyzeLogData(logs: any[], type: 'connections' | 'errors' | 'locks' | 'monitoring'): TimeSeriesMetric[] {
  const metrics: TimeSeriesMetric[] = [];
  
  logs.forEach(log => {
    let value = 0;
    let metadata: Record<string, any> = {};

    switch (type) {
      case 'connections':
        value = log.duration || 0;
        metadata = {
          event: log.event,
          connectionId: log.connectionId?.substring(0, 8),
          context: log.context
        };
        break;
      case 'errors':
        value = 1; // Count of errors
        metadata = {
          error: log.error,
          context: log.context,
          attempts: log.attempts
        };
        break;
      case 'locks':
        value = log.duration || 0;
        metadata = {
          lockType: log.lockType,
          context: log.context,
          resolved: log.resolved
        };
        break;
      case 'monitoring':
        value = log.activeConnections || 0;
        metadata = {
          totalConnections: log.totalConnections,
          waitingRequests: log.waitingRequests
        };
        break;
    }

    metrics.push({
      timestamp: log.timestamp,
      value,
      metadata
    });
  });

  return metrics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function calculateSummaryMetrics(
  connectionLogs: any[], 
  errorLogs: any[], 
  monitoringLogs: any[]
): MetricsReport['summary'] {
  const now = Date.now();
  const oneHourAgo = now - 3600000; // 1 hour ago
  
  // Filtrer les logs de la dernière heure
  const recentConnections = connectionLogs.filter(log => 
    new Date(log.timestamp).getTime() > oneHourAgo
  );
  const recentErrors = errorLogs.filter(log => 
    new Date(log.timestamp).getTime() > oneHourAgo
  );
  const recentMonitoring = monitoringLogs.filter(log => 
    new Date(log.timestamp).getTime() > oneHourAgo
  );

  // Calculer les métriques
  const totalOperations = recentConnections.length;
  
  const responseTimes = recentConnections
    .filter(log => log.duration && log.duration > 0)
    .map(log => log.duration);
  const averageResponseTime = responseTimes.length > 0 ? 
    responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

  const errorCount = recentErrors.length;

  // Calculer l'utilisation maximale
  let peakUtilization = 0;
  recentMonitoring.forEach(log => {
    if (log.totalConnections && log.activeConnections) {
      const utilization = (log.activeConnections / log.totalConnections) * 100;
      peakUtilization = Math.max(peakUtilization, utilization);
    }
  });

  return {
    period: "last_hour",
    totalOperations,
    averageResponseTime: Math.round(averageResponseTime),
    errorCount,
    peakUtilization: Math.round(peakUtilization * 100) / 100
  };
}

async function metricsHandler(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Vérifier l'authentification
    const user = await getSessionUser();
    const isAuthenticated = !!user;

    if (!isAuthenticated) {
      return NextResponse.json({
        error: "Authentication required",
        message: "Performance metrics require authentication",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Obtenir les paramètres de requête
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
    const timeRange = url.searchParams.get('range') || '1h'; // 1h, 6h, 24h

    // Obtenir les logs par catégorie
    const connectionLogs = databaseService.getRecentLogs('connections', limit);
    const errorLogs = databaseService.getRecentLogs('errors', Math.floor(limit / 2));
    const lockLogs = databaseService.getRecentLogs('locks', Math.floor(limit / 2));
    const monitoringLogs = databaseService.getRecentLogs('monitoring', Math.floor(limit / 4));

    // Analyser les données pour créer des métriques de série temporelle
    const connectionMetrics = analyzeLogData(connectionLogs, 'connections');
    const errorMetrics = analyzeLogData(errorLogs, 'errors');
    const lockMetrics = analyzeLogData(lockLogs, 'locks');
    const monitoringMetrics = analyzeLogData(monitoringLogs, 'monitoring');

    // Obtenir les statistiques actuelles
    const poolStatus = databaseService.getPoolStatus();
    const memoryUsage = process.memoryUsage();

    // Créer les métriques de pool de connexions
    const poolMetrics = {
      utilization: monitoringMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.metadata?.totalConnections ? 
          (m.value / m.metadata.totalConnections) * 100 : 0,
        metadata: { totalConnections: m.metadata?.totalConnections }
      })),
      activeConnections: monitoringMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.value,
        metadata: m.metadata
      })),
      queueLength: monitoringMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.metadata?.waitingRequests || 0,
        metadata: { waitingRequests: m.metadata?.waitingRequests }
      })),
      waitTime: connectionMetrics
        .filter(m => m.metadata?.event === 'acquired' && m.metadata?.fromQueue)
        .map(m => ({
          timestamp: m.timestamp,
          value: m.value,
          metadata: { fromQueue: true, context: m.metadata?.context }
        }))
    };

    // Créer les métriques de base de données
    const databaseMetrics = {
      queryTime: connectionMetrics
        .filter(m => m.value > 0)
        .map(m => ({
          timestamp: m.timestamp,
          value: m.value,
          metadata: { 
            context: m.metadata?.context,
            event: m.metadata?.event 
          }
        })),
      errorRate: errorMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.value,
        metadata: m.metadata
      })),
      lockEvents: lockMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.value,
        metadata: m.metadata
      })),
      throughput: [] as TimeSeriesMetric[] // Calculé par intervalles de temps
    };

    // Calculer le débit par intervalles de 5 minutes
    const fiveMinuteIntervals = Math.floor((Date.now() - Date.now() % 300000) / 300000);
    const intervalStart = fiveMinuteIntervals * 300000;
    
    for (let i = 0; i < 12; i++) { // Dernières 12 intervalles de 5 minutes (1 heure)
      const intervalTime = intervalStart - (i * 300000);
      const intervalEnd = intervalTime + 300000;
      
      const operationsInInterval = connectionLogs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= intervalTime && logTime < intervalEnd;
      }).length;

      databaseMetrics.throughput.unshift({
        timestamp: new Date(intervalTime).toISOString(),
        value: operationsInInterval,
        metadata: { 
          interval: '5min',
          operationsPerMinute: operationsInInterval / 5 
        }
      });
    }

    // Métriques système
    const systemMetrics = {
      memoryUsage: [{
        timestamp: new Date().toISOString(),
        value: memoryUsage.heapUsed,
        metadata: {
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        }
      }],
      uptime: process.uptime(),
      processId: process.pid
    };

    // Calculer le résumé
    const summary = calculateSummaryMetrics(connectionLogs, errorLogs, monitoringLogs);

    const responseTime = Date.now() - startTime;

    const report: MetricsReport = {
      connectionPool: poolMetrics,
      database: databaseMetrics,
      system: systemMetrics,
      summary
    };

    return NextResponse.json({
      metrics: report,
      metadata: {
        timestamp: new Date().toISOString(),
        responseTime,
        dataPoints: {
          connections: connectionLogs.length,
          errors: errorLogs.length,
          locks: lockLogs.length,
          monitoring: monitoringLogs.length
        },
        parameters: {
          limit,
          timeRange,
          requestedBy: user.username
        }
      }
    });

  } catch (error) {
    console.error("Error in metrics endpoint:", error);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      error: "Metrics collection failed",
      message: "Unable to retrieve performance metrics",
      timestamp: new Date().toISOString(),
      responseTime,
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Utiliser le handler optimisé sans base de données car on fait nos propres vérifications
export const GET = createNonDatabaseHandler(metricsHandler);