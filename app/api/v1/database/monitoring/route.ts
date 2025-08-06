import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { databaseService } from "@/lib/services/database/db";
import { checkDatabaseStatus, getExecutionContext } from "@/lib/middlewares/database-initialization";
import { getApiOptimizationStats, getRecentPerformanceMetrics } from "@/lib/utils/api-route-optimization";
import { createNonDatabaseHandler } from "@/lib/utils/api-route-optimization";

interface PerformanceMetrics {
  connectionPool: {
    utilization: number;
    averageWaitTime: number;
    peakConnections: number;
    totalRequests: number;
  };
  database: {
    averageQueryTime: number;
    slowQueries: number;
    errorRate: number;
    lockEvents: number;
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
  };
}

function logHasDuration(log: any): log is { duration: number } {
  return log && 'duration' in log && typeof log.duration === 'number' && log.duration > 0;
}
async function calculatePerformanceMetrics(): Promise<PerformanceMetrics> {
  const poolStatus = databaseService.getPoolStatus();
  const detailedStats = databaseService.getDetailedStats();
  const loggingStats = databaseService.getLoggingStats();
  
  // Calculer l'utilisation du pool
  const utilization = poolStatus.totalConnections > 0 ? 
    (poolStatus.activeConnections / poolStatus.totalConnections) * 100 : 0;

  // Obtenir les métriques de performance récentes
  const recentLogs = databaseService.getRecentLogs('monitoring', 100);
  const connectionLogs = databaseService.getRecentLogs('connections', 100);
  const errorLogs = databaseService.getRecentLogs('errors', 50);
  const lockLogs = databaseService.getRecentLogs('locks', 50);

  // Calculer les métriques de base de données
  let averageQueryTime = 0;
  let slowQueries = 0;
  
  if (connectionLogs.length > 0) {
    const queryTimes = connectionLogs
      .filter(logHasDuration)
      .map(log => (log as { duration: number }).duration);
    
    if (queryTimes.length > 0) {
      averageQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      slowQueries = queryTimes.filter(time => time > 1000).length; // Requêtes > 1s
    }
  }

  const errorRate = errorLogs.length;
  const lockEvents = lockLogs.length;

  // Métriques système
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  return {
    connectionPool: {
      utilization,
      averageWaitTime: detailedStats.queue?.averageWaitTime || 0,
      peakConnections: poolStatus.totalConnections,
      totalRequests: (loggingStats.totalLogs.connections + loggingStats.totalLogs.locks + loggingStats.totalLogs.errors + loggingStats.totalLogs.monitoring) || 0
    },
    database: {
      averageQueryTime,
      slowQueries,
      errorRate,
      lockEvents
    },
    system: {
      uptime,
      memoryUsage,
      cpuUsage: 0 // CPU usage would require additional monitoring
    }
  };
}

async function monitoringHandler(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Vérifier l'authentification pour les informations sensibles
    const user = await getSessionUser();
    const isAuthenticated = !!user;

    // Informations de base disponibles sans authentification
    const dbStatus = await checkDatabaseStatus();
    const context = getExecutionContext();
    
    const basicInfo = {
      database: {
        initialized: dbStatus.isInitialized,
        context: dbStatus.context,
        state: dbStatus.initializationState
      },
      execution: {
        context,
        timestamp: new Date().toISOString(),
        responseTime: 0 // Will be updated at the end
      }
    };

    // Si pas authentifié, retourner seulement les informations de base
    if (!isAuthenticated) {
      const responseTime = Date.now() - startTime;
      return NextResponse.json({
        ...basicInfo,
        execution: {
          ...basicInfo.execution,
          responseTime
        },
        message: "Authentication required for detailed monitoring data"
      });
    }

    // Informations détaillées pour les utilisateurs authentifiés
    try {
      const poolStatus = databaseService.getPoolStatus();
      const detailedStats = databaseService.getDetailedStats();
      const apiStats = getApiOptimizationStats();
      const recentMetrics = getRecentPerformanceMetrics(20);
      const loggingStats = databaseService.getLoggingStats();
      const activeConnections = databaseService.getActiveConnectionsDetails();
      
      // Calculer les métriques de performance
      const performanceMetrics = await calculatePerformanceMetrics();
      
      // Obtenir les logs récents par catégorie
      const recentLogs = {
        connections: databaseService.getRecentLogs('connections', 10),
        locks: databaseService.getRecentLogs('locks', 10),
        errors: databaseService.getRecentLogs('errors', 10),
        monitoring: databaseService.getRecentLogs('monitoring', 5)
      };

      // Forcer une mise à jour des statistiques de monitoring
      databaseService.forceMonitoringUpdate();

      const responseTime = Date.now() - startTime;

      return NextResponse.json({
        ...basicInfo,
        execution: {
          ...basicInfo.execution,
          responseTime
        },
        pool: {
          status: poolStatus,
          detailed: detailedStats,
          activeConnections,
          health: {
            isHealthy: poolStatus.totalConnections > 0 && poolStatus.activeConnections <= poolStatus.totalConnections,
            utilizationPercent: poolStatus.totalConnections > 0 ? 
              (poolStatus.activeConnections / poolStatus.totalConnections) * 100 : 0,
            queueLength: poolStatus.waitingRequests,
            alerts: generatePoolAlerts(poolStatus, activeConnections)
          }
        },
        performance: performanceMetrics,
        api: {
          optimization: apiStats,
          recentMetrics
        },
        logging: {
          stats: loggingStats,
          recent: recentLogs
        },
        monitoring: {
          lastUpdate: new Date().toISOString(),
          version: "1.1.0",
          features: [
            "connection-pool-monitoring",
            "performance-metrics",
            "real-time-alerts",
            "detailed-logging"
          ]
        }
      });

    } catch (error) {
      // Si erreur lors de la récupération des stats détaillées, 
      // retourner au moins les informations de base
      console.error("Error fetching detailed monitoring data:", error);
      
      const responseTime = Date.now() - startTime;
      
      return NextResponse.json({
        ...basicInfo,
        execution: {
          ...basicInfo.execution,
          responseTime
        },
        error: "Partial monitoring data available",
        message: "Some monitoring features are temporarily unavailable",
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error("Error in database monitoring endpoint:", error);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      error: "Monitoring endpoint failed",
      message: "Unable to retrieve monitoring data",
      timestamp: new Date().toISOString(),
      responseTime,
      errorDetails: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generatePoolAlerts(poolStatus: any, activeConnections: any): string[] {
  const alerts: string[] = [];
  
  // Alerte utilisation élevée
  const utilizationPercent = poolStatus.totalConnections > 0 ? 
    (poolStatus.activeConnections / poolStatus.totalConnections) * 100 : 0;
  
  if (utilizationPercent > 90) {
    alerts.push(`HIGH_UTILIZATION: Pool utilization at ${utilizationPercent.toFixed(1)}%`);
  }
  
  // Alerte file d'attente longue
  if (poolStatus.waitingRequests > 5) {
    alerts.push(`HIGH_QUEUE_LENGTH: ${poolStatus.waitingRequests} requests waiting`);
  }
  
  // Alerte connexions anciennes
  if (activeConnections.connections) {
    const oldConnections = activeConnections.connections.filter((conn: any) => conn.idleMs > 300000); // 5 minutes
    if (oldConnections.length > 0) {
      alerts.push(`LONG_RUNNING_CONNECTIONS: ${oldConnections.length} connections idle > 5min`);
    }
  }
  
  // Alerte transactions bloquées
  if (activeConnections.transactionCount > 2) {
    alerts.push(`HIGH_TRANSACTION_COUNT: ${activeConnections.transactionCount} active transactions`);
  }
  
  return alerts;
}

// Utiliser le handler optimisé sans base de données car on fait nos propres vérifications
export const GET = createNonDatabaseHandler(monitoringHandler);