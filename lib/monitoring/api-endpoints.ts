/**
 * Monitoring API Endpoints
 * 
 * Provides API endpoints for accessing monitoring data, health checks,
 * metrics, and system status information.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */

import { getUnifiedMonitoring } from './unified-monitoring-service';
import { HealthCheckService } from './health-check';
import { AlertingService } from './alerting-system';
import { getCompleteMonitoringConfig, validateMonitoringConfig } from './monitoring-config';
import type { NextRequest } from 'next/server';

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    duration: number;
  }>;
}

export interface MetricsResponse {
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    uptime: number;
  };
  performance: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  alerts: {
    active: number;
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  timestamp: string;
}

export interface StatusResponse {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, {
    status: 'operational' | 'degraded' | 'down';
    message: string;
    lastCheck: string;
  }>;
  uptime: number;
  version: string;
  environment: string;
  timestamp: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  requestId?: string
): ApiResponse<T> {
  return {
    success,
    ...(data && { data }),
    ...(error && { error }),
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
  };
}

function getRequestId(request?: NextRequest): string | undefined {
  return request?.headers.get('x-request-id') || 
         request?.headers.get('x-correlation-id') ||
         undefined;
}

async function handleApiRequest<T>(
  handler: () => Promise<T>,
  request?: NextRequest
): Promise<Response> {
  const requestId = getRequestId(request);
  
  try {
    const data = await handler();
    const response = createApiResponse(true, data, undefined, requestId);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...(requestId && { 'X-Request-ID': requestId }),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response = createApiResponse(false, undefined, errorMessage, requestId);
    
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...(requestId && { 'X-Request-ID': requestId }),
      },
    });
  }
}

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

/**
 * GET /api/health - Basic health check
 */
export async function handleHealthCheck(request?: NextRequest): Promise<Response> {
  return handleApiRequest(async () => {
    const healthService = HealthCheckService.getInstance();
    const healthStatus = await healthService.getSystemHealth();
    
    const response: HealthResponse = {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      uptime: healthStatus.uptime,
      version: healthStatus.version,
      environment: healthStatus.environment,
      checks: healthStatus.checks.map(check => ({
        name: check.name,
        status: check.status,
        message: check.message,
        duration: check.duration,
      })),
    };
    
    return response;
  }, request);
}

/**
 * GET /api/health/ready - Readiness probe
 */
export async function handleReadinessCheck(request?: NextRequest): Promise<Response> {
  return handleApiRequest(async () => {
    const healthService = HealthCheckService.getInstance();
    const healthStatus = await healthService.getSystemHealth();
    
    // Ready if no critical failures
    const isReady = healthStatus.summary.unhealthy === 0;
    
    if (!isReady) {
      throw new Error(`System not ready: ${healthStatus.summary.unhealthy} critical failures`);
    }
    
    return {
      ready: true,
      timestamp: new Date().toISOString(),
      checks: healthStatus.summary,
    };
  }, request);
}

/**
 * GET /api/health/live - Liveness probe
 */
export async function handleLivenessCheck(request?: NextRequest): Promise<Response> {
  return handleApiRequest(async () => {
    // Simple liveness check - just return if the service is running
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
    };
  }, request);
}

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

/**
 * GET /api/metrics - System metrics
 */
export async function handleMetrics(request?: NextRequest): Promise<Response> {
  return handleApiRequest(async () => {
    const monitoring = getUnifiedMonitoring();
    const systemStatus = await monitoring.getSystemStatus();
    const activeAlerts = monitoring.getActiveAlerts();
    
    const response: MetricsResponse = {
      system: {
        memory: {
          used: systemStatus.metrics.system.memoryUsage.heapUsed,
          total: systemStatus.metrics.system.memoryUsage.heapTotal,
          percentage: (systemStatus.metrics.system.memoryUsage.heapUsed / 
                      systemStatus.metrics.system.memoryUsage.heapTotal) * 100,
        },
        cpu: {
          usage: systemStatus.metrics.system.cpuUsage,
        },
        uptime: systemStatus.uptime,
      },
      performance: {
        requestsPerSecond: systemStatus.metrics.performance.requestsPerSecond,
        averageResponseTime: systemStatus.metrics.performance.averageResponseTime,
        errorRate: systemStatus.metrics.performance.errorRate,
        activeConnections: systemStatus.metrics.performance.activeConnections,
      },
      alerts: {
        active: activeAlerts.length,
        total: systemStatus.metrics.alerts.total,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        high: activeAlerts.filter(a => a.severity === 'high').length,
        medium: activeAlerts.filter(a => a.severity === 'medium').length,
        low: activeAlerts.filter(a => a.severity === 'low').length,
      },
      timestamp: new Date().toISOString(),
    };
    
    return response;
  }, request);
}

/**
 * GET /api/metrics/prometheus - Prometheus format metrics
 */
export async function handlePrometheusMetrics(request?: NextRequest): Promise<Response> {
  const requestId = getRequestId(request);
  
  try {
    const monitoring = getUnifiedMonitoring();
    const systemStatus = await monitoring.getSystemStatus();
    const timestamp = Date.now();
    
    const metrics = [
      `# HELP system_memory_usage_bytes Memory usage in bytes`,
      `# TYPE system_memory_usage_bytes gauge`,
      `system_memory_usage_bytes{type="heap_used"} ${systemStatus.metrics.system.memoryUsage.heapUsed} ${timestamp}`,
      `system_memory_usage_bytes{type="heap_total"} ${systemStatus.metrics.system.memoryUsage.heapTotal} ${timestamp}`,
      
      `# HELP system_uptime_seconds System uptime in seconds`,
      `# TYPE system_uptime_seconds counter`,
      `system_uptime_seconds ${Math.floor(systemStatus.uptime / 1000)} ${timestamp}`,
      
      `# HELP http_requests_per_second Current requests per second`,
      `# TYPE http_requests_per_second gauge`,
      `http_requests_per_second ${systemStatus.metrics.performance.requestsPerSecond} ${timestamp}`,
      
      `# HELP http_response_time_milliseconds Average response time`,
      `# TYPE http_response_time_milliseconds gauge`,
      `http_response_time_milliseconds ${systemStatus.metrics.performance.averageResponseTime} ${timestamp}`,
      
      `# HELP http_error_rate Error rate percentage`,
      `# TYPE http_error_rate gauge`,
      `http_error_rate ${systemStatus.metrics.performance.errorRate} ${timestamp}`,
      
      `# HELP alerts_active_total Number of active alerts`,
      `# TYPE alerts_active_total gauge`,
      `alerts_active_total ${systemStatus.metrics.alerts.active} ${timestamp}`,
    ];
    
    return new Response(metrics.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...(requestId && { 'X-Request-ID': requestId }),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`# Error: ${errorMessage}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        ...(requestId && { 'X-Request-ID': requestId }),
      },
    });
  }
}

// ============================================================================
// STATUS ENDPOINTS
// ============================================================================

/**
 * GET /api/status - System status overview
 */
export async function handleStatus(request?: NextRequest): Promise<Response> {
  return handleApiRequest(async () => {
    const monitoring = getUnifiedMonitoring();
    const systemStatus = await monitoring.getSystemStatus();
    
    const response: StatusResponse = {
      overall: systemStatus.overall,
      components: Object.entries(systemStatus.components).reduce((acc, [name, component]) => {
        acc[name] = {
          status: component.status,
          message: component.message,
          lastCheck: component.lastCheck,
        };
        return acc;
      }, {} as Record<string, any>),
      uptime: systemStatus.uptime,
      version: systemStatus.version,
      environment: systemStatus.environment,
      timestamp: systemStatus.timestamp,
    };
    
    return response;
  }, request);
}

// ============================================================================
// ALERTS ENDPOINTS
// ============================================================================

/**
 * GET /api/alerts - Active alerts
 */
export async function handleAlerts(request?: NextRequest): Promise<Response> {
  return handleApiRequest(async () => {
    const alertingService = AlertingService.getInstance();
    const activeAlerts = alertingService.getActiveAlerts();
    
    return {
      alerts: activeAlerts.map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp,
        source: alert.source,
      })),
      count: activeAlerts.length,
      timestamp: new Date().toISOString(),
    };
  }, request);
}

/**
 * POST /api/alerts/:id/resolve - Resolve an alert
 */
export async function handleResolveAlert(
  alertId: string,
  request?: NextRequest
): Promise<Response> {
  return handleApiRequest(async () => {
    const alertingService = AlertingService.getInstance();
    const resolved = await alertingService.resolveAlert(alertId, 'api');
    
    if (!resolved) {
      throw new Error(`Alert ${alertId} not found or already resolved`);
    }
    
    return {
      alertId,
      resolved: true,
      timestamp: new Date().toISOString(),
    };
  }, request);
}

// ============================================================================
// CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /api/monitoring/config - Monitoring configuration
 */
export async function handleMonitoringConfig(request?: NextRequest): Promise<Response> {
  return handleApiRequest(async () => {
    const config = getCompleteMonitoringConfig();
    const validation = validateMonitoringConfig(config);
    
    return {
      config,
      validation,
      timestamp: new Date().toISOString(),
    };
  }, request);
}

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

/**
 * GET /api/dashboard - Monitoring dashboard data
 */
export async function handleDashboard(request?: NextRequest): Promise<Response> {
  return handleApiRequest(async () => {
    const monitoring = getUnifiedMonitoring();
    const [systemStatus, criticalMetrics, activeAlerts] = await Promise.all([
      monitoring.getSystemStatus(),
      monitoring.getCriticalMetrics(),
      monitoring.getActiveAlerts(),
    ]);
    
    return {
      systemStatus,
      criticalMetrics: criticalMetrics.slice(0, 10), // Top 10 critical metrics
      activeAlerts: activeAlerts.slice(0, 10), // Top 10 active alerts
      summary: {
        overall: systemStatus.overall,
        uptime: systemStatus.uptime,
        activeAlerts: activeAlerts.length,
        criticalMetrics: criticalMetrics.filter(m => m.status === 'critical').length,
        warningMetrics: criticalMetrics.filter(m => m.status === 'warning').length,
        memoryUsage: systemStatus.metrics.performance.memoryUsage,
        responseTime: systemStatus.metrics.performance.averageResponseTime,
        errorRate: systemStatus.metrics.performance.errorRate,
      },
      timestamp: new Date().toISOString(),
    };
  }, request);
}

// ============================================================================
// EXPORT ROUTE HANDLERS
// ============================================================================

export const monitoringApiHandlers = {
  // Health endpoints
  health: handleHealthCheck,
  ready: handleReadinessCheck,
  live: handleLivenessCheck,
  
  // Metrics endpoints
  metrics: handleMetrics,
  prometheusMetrics: handlePrometheusMetrics,
  
  // Status endpoints
  status: handleStatus,
  
  // Alerts endpoints
  alerts: handleAlerts,
  resolveAlert: handleResolveAlert,
  
  // Configuration endpoints
  config: handleMonitoringConfig,
  
  // Dashboard endpoints
  dashboard: handleDashboard,
};

export default monitoringApiHandlers;