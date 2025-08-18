import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { databaseService } from "@/lib/services/database/db";
import { createNonDatabaseHandler } from "@/lib/utils/api-route-optimization";
import { formatApiError } from "@/lib/utils/error-handler";

interface PoolHealthMetrics {
  status: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
}

function calculatePoolHealth(poolStatus: any, activeConnections: any): PoolHealthMetrics {
  let score = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Vérifier l'utilisation du pool
  const utilizationPercent = poolStatus.totalConnections > 0 ? 
    (poolStatus.activeConnections / poolStatus.totalConnections) * 100 : 0;

  if (utilizationPercent > 95) {
    score -= 30;
    issues.push(`Critical pool utilization: ${utilizationPercent.toFixed(1)}%`);
    recommendations.push('Consider increasing maxConnections in pool configuration');
  } else if (utilizationPercent > 80) {
    score -= 15;
    issues.push(`High pool utilization: ${utilizationPercent.toFixed(1)}%`);
    recommendations.push('Monitor pool usage and consider scaling');
  }

  // Vérifier la file d'attente
  if (poolStatus.waitingRequests > 10) {
    score -= 25;
    issues.push(`High queue length: ${poolStatus.waitingRequests} requests waiting`);
    recommendations.push('Increase connection pool size or optimize query performance');
  } else if (poolStatus.waitingRequests > 5) {
    score -= 10;
    issues.push(`Moderate queue length: ${poolStatus.waitingRequests} requests waiting`);
  }

  // Vérifier les connexions anciennes
  if (activeConnections.connections) {
    const longRunningConnections = activeConnections.connections.filter((conn: any) => conn.idleMs > 600000); // 10 minutes
    if (longRunningConnections.length > 0) {
      score -= 20;
      issues.push(`${longRunningConnections.length} connections idle > 10min`);
      recommendations.push('Review long-running operations and implement timeouts');
    }

    const veryOldConnections = activeConnections.connections.filter((conn: any) => conn.ageMs > 3600000); // 1 hour
    if (veryOldConnections.length > 0) {
      score -= 15;
      issues.push(`${veryOldConnections.length} connections older than 1 hour`);
      recommendations.push('Consider implementing connection recycling');
    }
  }

  // Vérifier les transactions bloquées
  if (activeConnections.transactionCount > 3) {
    score -= 20;
    issues.push(`High transaction count: ${activeConnections.transactionCount} active`);
    recommendations.push('Review transaction duration and implement proper cleanup');
  }

  // Déterminer le statut global
  let status: 'healthy' | 'warning' | 'critical';
  if (score >= 80) {
    status = 'healthy';
  } else if (score >= 60) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  return { status, score: Math.max(0, score), issues, recommendations };
}

async function poolStatusHandler(): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Vérifier l'authentification
    const user = await getSessionUser();
    const isAuthenticated = !!user;

    if (!isAuthenticated) {
      return NextResponse.json({
        error: "Authentication required",
        message: "Pool status monitoring requires authentication",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Obtenir les statistiques du pool
    const poolStatus = databaseService.getPoolStatus();
    const detailedStats = databaseService.getDetailedStats();
    const activeConnections = databaseService.getActiveConnectionsDetails();
    
    // Calculer la santé du pool
    const health = calculatePoolHealth(poolStatus, activeConnections);
    
    // Obtenir les logs récents de connexions
    const recentConnectionLogs = databaseService.getRecentLogs('connections', 20);
    const recentErrorLogs = databaseService.getRecentLogs('errors', 10);
    
    // Calculer les métriques de performance
    const performanceMetrics = {
      averageConnectionTime: 0,
      peakUtilization: 0,
      errorRate: 0,
      throughput: 0
    };

    // Calculer le temps moyen de connexion
    const connectionTimes = recentConnectionLogs
      .filter(log => (log as any).duration && (log as any).duration > 0)
      .map(log => (log as any).duration);
    
    if (connectionTimes.length > 0) {
      performanceMetrics.averageConnectionTime = 
        connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length;
    }

    // Calculer le taux d'erreur
    const totalOperations = recentConnectionLogs.length;
    const errorCount = recentErrorLogs.length;
    performanceMetrics.errorRate = totalOperations > 0 ? 
      (errorCount / totalOperations) * 100 : 0;

    // Calculer l'utilisation maximale récente
    const utilizationPercent = poolStatus.totalConnections > 0 ? 
      (poolStatus.activeConnections / poolStatus.totalConnections) * 100 : 0;
    performanceMetrics.peakUtilization = utilizationPercent;

    // Calculer le débit (approximatif)
    const recentMinute = Date.now() - 60000;
    const recentOperations = recentConnectionLogs.filter(log => 
      new Date(log.timestamp).getTime() > recentMinute
    );
    performanceMetrics.throughput = recentOperations.length; // operations per minute

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      pool: {
        status: poolStatus,
        health,
        performance: performanceMetrics,
        connections: {
          active: activeConnections,
          recent: recentConnectionLogs.slice(0, 5) // Dernières 5 connexions
        }
      },
      circuit: detailedStats.circuitBreaker || null,
      queue: detailedStats.queue || null,
      monitoring: {
        timestamp: new Date().toISOString(),
        responseTime,
        dataFreshness: 'real-time'
      }
    });

  } catch (error) {
    console.error("Error in pool status endpoint:", error);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        ...formatApiError(
          error,
          {
            message: "Unable to retrieve pool status",
            timestamp: new Date().toISOString(),
            responseTime
          }
        )
      },
      { status: 500 }
    );
  }
}

// Utiliser le handler optimisé sans base de données car on fait nos propres vérifications
export const GET = createNonDatabaseHandler(poolStatusHandler);