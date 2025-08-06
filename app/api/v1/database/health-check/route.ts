import { NextRequest, NextResponse } from "next/server";
import { databaseService } from "@/lib/services/database/db";
import { checkDatabaseStatus } from "@/lib/middlewares/database-initialization";
import { createNonDatabaseHandler } from "@/lib/utils/api-route-optimization";

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message: string;
  details?: Record<string, any>;
}

interface DatabaseHealthReport {
  overall: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    score: number; // 0-100
    responseTime?: number;
  };
  components: HealthCheckResult[];
  alerts: {
    critical: string[];
    warnings: string[];
    info: string[];
  };
  recommendations: string[];
  timestamp: string;
}

async function performConnectivityCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const isHealthy = await databaseService.healthCheck();
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'database_connectivity',
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      message: isHealthy ? 'Database connection successful' : 'Database connection failed',
      details: {
        testQuery: 'SELECT 1 as result',
        connectionEstablished: isHealthy
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'database_connectivity',
      status: 'unhealthy',
      responseTime,
      message: `Database connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        testQuery: 'SELECT 1 as result'
      }
    };
  }
}

async function performConnectionPoolCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const poolStatus = databaseService.getPoolStatus();
    const activeConnections = databaseService.getActiveConnectionsDetails();
    const responseTime = Date.now() - startTime;
    
    // Calculer l'utilisation
    const utilizationPercent = poolStatus.totalConnections > 0 ? 
      (poolStatus.activeConnections / poolStatus.totalConnections) * 100 : 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Connection pool operating normally';
    
    if (utilizationPercent > 95) {
      status = 'unhealthy';
      message = `Critical pool utilization: ${utilizationPercent.toFixed(1)}%`;
    } else if (utilizationPercent > 80 || poolStatus.waitingRequests > 5) {
      status = 'degraded';
      message = `High pool utilization: ${utilizationPercent.toFixed(1)}% or queue length: ${poolStatus.waitingRequests}`;
    }
    
    return {
      component: 'connection_pool',
      status,
      responseTime,
      message,
      details: {
        totalConnections: poolStatus.totalConnections,
        activeConnections: poolStatus.activeConnections,
        idleConnections: poolStatus.idleConnections,
        waitingRequests: poolStatus.waitingRequests,
        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
        transactionCount: activeConnections.transactionCount
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'connection_pool',
      status: 'unhealthy',
      responseTime,
      message: `Connection pool check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function performPerformanceCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Obtenir les logs récents pour analyser les performances
    const connectionLogs = databaseService.getRecentLogs('connections', 50);
    const errorLogs = databaseService.getRecentLogs('errors', 20);
    const lockLogs = databaseService.getRecentLogs('locks', 20);
    
    const responseTime = Date.now() - startTime;
    
    // Calculer les métriques de performance
    const queryTimes = connectionLogs
      .filter(log => 'duration' in log && log.duration && log.duration > 0)
      .map(log => (log as any).duration as number);
    
    const averageQueryTime = queryTimes.length > 0 ? 
      queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length : 0;
    
    const slowQueries = queryTimes.filter(time => time > 1000).length; // > 1s
    const verySlowQueries = queryTimes.filter(time => time > 5000).length; // > 5s
    
    const errorRate = connectionLogs.length > 0 ? 
      (errorLogs.length / connectionLogs.length) * 100 : 0;
    
    const lockEventCount = lockLogs.length;
    
    // Déterminer le statut
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Database performance is optimal';
    
    if (verySlowQueries > 0 || errorRate > 10 || lockEventCount > 10) {
      status = 'unhealthy';
      message = `Performance issues detected: ${verySlowQueries} very slow queries, ${errorRate.toFixed(1)}% error rate, ${lockEventCount} lock events`;
    } else if (slowQueries > 5 || errorRate > 5 || lockEventCount > 5 || averageQueryTime > 500) {
      status = 'degraded';
      message = `Performance degradation: ${slowQueries} slow queries, ${errorRate.toFixed(1)}% error rate, ${averageQueryTime.toFixed(0)}ms avg query time`;
    }
    
    return {
      component: 'database_performance',
      status,
      responseTime,
      message,
      details: {
        averageQueryTime: Math.round(averageQueryTime),
        slowQueries,
        verySlowQueries,
        errorRate: Math.round(errorRate * 100) / 100,
        lockEvents: lockEventCount,
        totalOperations: connectionLogs.length,
        samplePeriod: 'recent_operations'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'database_performance',
      status: 'unhealthy',
      responseTime,
      message: `Performance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function performInitializationCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const dbStatus = await checkDatabaseStatus();
    const initState = databaseService.getInitializationState();
    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Database initialization completed successfully';
    
    if (!dbStatus.isInitialized || initState === 'failed') {
      status = 'unhealthy';
      message = 'Database initialization failed or incomplete';
    } else if (initState === 'in_progress') {
      status = 'degraded';
      message = 'Database initialization in progress';
    }
    
    return {
      component: 'database_initialization',
      status,
      responseTime,
      message,
      details: {
        isInitialized: dbStatus.isInitialized,
        context: dbStatus.context,
        state: dbStatus.initializationState,
        initManagerState: initState
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'database_initialization',
      status: 'unhealthy',
      responseTime,
      message: `Initialization check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

function generateAlertsAndRecommendations(components: HealthCheckResult[]): {
  alerts: DatabaseHealthReport['alerts'];
  recommendations: string[];
} {
  const alerts = {
    critical: [] as string[],
    warnings: [] as string[],
    info: [] as string[]
  };
  const recommendations: string[] = [];
  
  components.forEach(component => {
    if (component.status === 'unhealthy') {
      alerts.critical.push(`${component.component}: ${component.message}`);
      
      // Recommandations spécifiques par composant
      switch (component.component) {
        case 'database_connectivity':
          recommendations.push('Check database file permissions and disk space');
          recommendations.push('Verify SQLite database file integrity');
          break;
        case 'connection_pool':
          if (component.details?.utilizationPercent > 95) {
            recommendations.push('Increase maxConnections in pool configuration');
          }
          if (component.details?.waitingRequests > 10) {
            recommendations.push('Optimize query performance to reduce connection hold time');
          }
          break;
        case 'database_performance':
          if (component.details?.verySlowQueries > 0) {
            recommendations.push('Identify and optimize slow queries');
            recommendations.push('Consider adding database indexes');
          }
          if (component.details?.errorRate > 10) {
            recommendations.push('Investigate database errors and implement proper error handling');
          }
          break;
        case 'database_initialization':
          recommendations.push('Check database schema and initialization scripts');
          recommendations.push('Review application startup logs for initialization errors');
          break;
      }
    } else if (component.status === 'degraded') {
      alerts.warnings.push(`${component.component}: ${component.message}`);
      
      // Recommandations préventives
      switch (component.component) {
        case 'connection_pool':
          recommendations.push('Monitor pool utilization and consider scaling');
          break;
        case 'database_performance':
          recommendations.push('Monitor query performance trends');
          break;
      }
    } else {
      alerts.info.push(`${component.component}: ${component.message}`);
    }
  });
  
  return { alerts, recommendations: [...new Set(recommendations)] };
}

function calculateOverallHealth(components: HealthCheckResult[]): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  responseTime?: number;
} {
  let score = 100;
  let hasUnhealthy = false;
  let hasDegraded = false;
  
  components.forEach(component => {
    if (component.status === 'unhealthy') {
      hasUnhealthy = true;
      score -= 30;
    } else if (component.status === 'degraded') {
      hasDegraded = true;
      score -= 15;
    }
    
    // Pénalité pour les temps de réponse élevés
    if (component.responseTime > 1000) {
      score -= 10;
    } else if (component.responseTime > 500) {
      score -= 5;
    }
  });
  
  score = Math.max(0, score);
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (hasUnhealthy || score < 60) {
    status = 'unhealthy';
  } else if (hasDegraded || score < 80) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }
  
  return { status, score };
}

async function healthCheckHandler(request: NextRequest): Promise<NextResponse> {
  const overallStartTime = Date.now();
  
  try {
    // Effectuer tous les contrôles de santé en parallèle
    const [
      connectivityResult,
      poolResult,
      performanceResult,
      initializationResult
    ] = await Promise.all([
      performConnectivityCheck(),
      performConnectionPoolCheck(),
      performPerformanceCheck(),
      performInitializationCheck()
    ]);
    
    const components = [
      connectivityResult,
      poolResult,
      performanceResult,
      initializationResult
    ];
    
    // Calculer la santé globale
    const overall = calculateOverallHealth(components);
    overall.responseTime = Date.now() - overallStartTime;
    
    // Générer les alertes et recommandations
    const { alerts, recommendations } = generateAlertsAndRecommendations(components);
    
    const report: DatabaseHealthReport = {
      overall,
      components,
      alerts,
      recommendations,
      timestamp: new Date().toISOString()
    };
    
    // Déterminer le code de statut HTTP
    let httpStatus = 200;
    if (overall.status === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    } else if (overall.status === 'degraded') {
      httpStatus = 200; // OK but with warnings
    }
    
    return NextResponse.json(report, { status: httpStatus });
    
  } catch (error) {
    console.error("Error in database health check:", error);
    
    const responseTime = Date.now() - overallStartTime;
    
    return NextResponse.json({
      overall: {
        status: 'unhealthy',
        score: 0,
        responseTime
      },
      components: [],
      alerts: {
        critical: [`Health check system failure: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        info: []
      },
      recommendations: [
        'Check application logs for health check system errors',
        'Verify database service availability'
      ],
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Utiliser le handler optimisé sans base de données car on fait nos propres vérifications
export const GET = createNonDatabaseHandler(healthCheckHandler);