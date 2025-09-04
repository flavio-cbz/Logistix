import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { databaseService } from "@/lib/services/database/db";
import { checkDatabaseStatus } from "@/lib/middlewares/database-initialization";
import { createNonDatabaseHandler } from "@/lib/utils/api-route-optimization";
import { formatApiError } from "@/lib/utils/error-handler";

async function poolStatusHandler(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const user = await getSessionUser();
    const isAuthenticated = !!user;

    const dbStatus = await checkDatabaseStatus();

    const basicInfo = {
      database: {
        initialized: dbStatus.isInitialized,
        context: dbStatus.context,
        state: dbStatus.initializationState,
      },
      execution: {
        timestamp: new Date().toISOString(),
        responseTime: 0, // Will be updated at the end
      },
    };

    if (!isAuthenticated) {
      const responseTime = Date.now() - startTime;
      return NextResponse.json({
        ...basicInfo,
        execution: {
          ...basicInfo.execution,
          responseTime,
        },
        _message: "Authentication required for detailed pool status",
      });
    }

    try {
      const poolStatus = databaseService.getPoolStatus();
      const detailedStats = databaseService.getDetailedStats();
      const activeConnections = databaseService.getActiveConnectionsDetails();
      const loggingStats = databaseService.getLoggingStats();

      // Obtenir les logs récents pour les métriques de performance
      const connectionLogs = databaseService.getRecentLogs('connections', 50);
      const errorLogs = databaseService.getRecentLogs('errors', 20);
      const lockLogs = databaseService.getRecentLogs('locks', 20);

      // Calculer les métriques de performance
      const connectionTimes = connectionLogs
        .filter((log: { duration?: number }) => typeof log.duration === 'number' && log.duration > 0)
        .map((log: { duration: number }) => log.duration);

      const averageConnectionTime = connectionTimes.length > 0
        ? connectionTimes.reduce((sum: number, time: number) => sum + time, 0) / connectionTimes.length
        : 0;

      const responseTime = Date.now() - startTime;

      return NextResponse.json({
        ...basicInfo,
        execution: {
          ...basicInfo.execution,
          responseTime,
        },
        pool: {
          status: poolStatus,
          detailed: detailedStats,
          activeConnections,
          health: {
            isHealthy: poolStatus.totalConnections > 0 && poolStatus.activeConnections <= poolStatus.totalConnections,
            utilizationPercent: poolStatus.totalConnections > 0
              ? (poolStatus.activeConnections / poolStatus.totalConnections) * 100
              : 0,
            queueLength: detailedStats.waitingRequests, // Utiliser detailedStats.waitingRequests
            alerts: generatePoolAlerts(detailedStats, activeConnections), // Passer detailedStats
          },
        },
        performance: {
          averageConnectionTime: Math.round(averageConnectionTime),
          totalOperations: connectionLogs.length,
          errorCount: errorLogs.length,
          lockEvents: lockLogs.length,
        },
        logging: {
          stats: loggingStats,
          recent: {
            connections: connectionLogs,
            errors: errorLogs,
            locks: lockLogs,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching detailed pool status:", error);
      const responseTime = Date.now() - startTime;
      return NextResponse.json({
        ...basicInfo,
        execution: {
          ...basicInfo.execution,
          responseTime,
        },
        ...formatApiError(
          error,
          { message: "Some pool status features are temporarily unavailable" }
        ),
      });
    }
  } catch (error) {
    console.error("Error in database pool status endpoint:", error);
    const responseTime = Date.now() - startTime;
    return NextResponse.json(
      {
        ...formatApiError(
          error,
          {
            message: "Unable to retrieve pool status data",
            timestamp: new Date().toISOString(),
            responseTime,
          }
        ),
      },
      { status: 500 }
    );
  }
}

function generatePoolAlerts(poolStatus: any, activeConnections: any): string[] {
  const alerts: string[] = [];
  
  // Alerte utilisation élevée
  const utilizationPercent = poolStatus.poolSize > 0 ? 
    (poolStatus.currentActive / poolStatus.poolSize) * 100 : 0;
  
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
  if (poolStatus.transactionCount > 2) { // Utiliser poolStatus.transactionCount
    alerts.push(`HIGH_TRANSACTION_COUNT: ${poolStatus.transactionCount} active transactions`);
  }
  
  return alerts;
}

export const GET = createNonDatabaseHandler(poolStatusHandler);