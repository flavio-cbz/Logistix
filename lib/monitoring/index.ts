/**
 * Monitoring Module - Unified System Monitoring
 * 
 * This module provides a comprehensive monitoring solution that includes:
 * - Performance metrics collection and analysis
 * - Structured logging with multiple levels
 * - Health checks for system components
 * - Alerting system for critical issues
 * - Real-time system status monitoring
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */

// Main unified monitoring service
import { UnifiedMonitoringService, getUnifiedMonitoring, monitorPerformance, type MonitoringConfig, type SystemStatus, type ComponentStatus, type PerformanceMetrics, type AlertMetrics, type CriticalMetrics } from './unified-monitoring-service';
import { HealthCheckService } from './health-check';

export {
  UnifiedMonitoringService,
  getUnifiedMonitoring,
  monitorPerformance,
  MonitoringConfig,
  SystemStatus,
  ComponentStatus,
  PerformanceMetrics,
  AlertMetrics,
  CriticalMetrics,
};

// Structured logging
export {
  StructuredLoggingService,
  MetricsCollectionService,
} from './unified-monitoring-service';

// Performance monitoring
export {
  PerformanceMonitoringService,
  getPerformanceMonitor,
  type PerformanceAlert,
  type SystemMetrics,
  type DatabaseMetrics,
  type ApiMetrics,
} from './performance-monitor';

// Performance metrics collection
export {
  performanceCollector,
  measurePerformance,
  measureOperation,
  getPerformanceMetrics,
  resetPerformanceMetrics,
  type PerformanceMetric,
  type PerformanceStats,
} from './performance-metrics';

// Health checks
export {
  HealthCheckService,
  HealthChecks,
  type HealthCheckResult,
  type SystemHealthStatus,
  type HealthCheckConfig,
} from './health-check';

// Alerting system
export {
  AlertingService,
  type Alert,
  type AlertAction,
  type AlertRule,
  type AlertCondition,
  type AlertActionConfig,
} from './alerting-system';

// Metrics dashboard
export {
  MetricsDashboard,
  createMetricsDashboard,
  type DashboardMetrics,
  type MetricsExportOptions,
} from './metrics-dashboard';

// ============================================================================
// CONVENIENCE FUNCTIONS AND FACTORY METHODS
// ============================================================================

/**
 * Initialize the complete monitoring system with default configuration
 */
export function initializeMonitoring(config?: Partial<import('./unified-monitoring-service').MonitoringConfig>) {
  const monitoring = getUnifiedMonitoring(config);
  
  // Log initialization
  monitoring.logEvent('system', 'Monitoring system initialized', 'info', {
    config: config || 'default',
    timestamp: new Date().toISOString(),
  });

  return monitoring;
}

/**
 * Quick health check function
 */
export async function quickHealthCheck() {
  const healthService = HealthCheckService.getInstance();
  return await healthService.getSystemHealth();
}

/**
 * Get current system metrics
 */
export async function getCurrentMetrics() {
  const monitoring = getUnifiedMonitoring();
  return await monitoring.getSystemStatus();
}

/**
 * Create a performance logger for a specific operation
 */
export function createOperationLogger(operation: string) {
  const monitoring = getUnifiedMonitoring();
  const startTime = Date.now();

  return {
    success: (metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      monitoring.recordPerformance(operation, duration, true, metadata);
    },
    failure: (error: Error | string, metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      monitoring.recordPerformance(operation, duration, false, metadata);
      monitoring.logEvent('error', `Operation failed: ${operation}`, 'error', {
        operation,
        duration,
        error: error instanceof Error ? error.message : error,
        ...metadata,
      });
    },
    checkpoint: (message: string, metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      monitoring.logEvent('performance', `${operation} checkpoint: ${message}`, 'debug', {
        operation,
        duration,
        checkpoint: message,
        ...metadata,
      });
    },
  };
}

/**
 * Log a business event with structured context
 */
export function logBusinessEvent(
  event: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  const monitoring = getUnifiedMonitoring();
  monitoring.logEvent('business', event, 'info', {
    entityType,
    entityId,
    ...metadata,
  });
}

/**
 * Log a security event
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>
) {
  const monitoring = getUnifiedMonitoring();
  monitoring.logEvent('security', event, severity === 'critical' ? 'error' : 'warn', {
    severity,
    ...metadata,
  });
}

/**
 * Create an alert for critical issues
 */
export async function createCriticalAlert(
  title: string,
  message: string,
  metadata?: Record<string, any>
) {
  const monitoring = getUnifiedMonitoring();
  return await monitoring.createAlert('system', 'critical', title, message, metadata);
}

/**
 * Get monitoring dashboard data
 */
export async function getMonitoringDashboard() {
  const monitoring = getUnifiedMonitoring();
  const [systemStatus, criticalMetrics, activeAlerts] = await Promise.all([
    monitoring.getSystemStatus(),
    monitoring.getCriticalMetrics(),
    monitoring.getActiveAlerts(),
  ]);

  return {
    systemStatus,
    criticalMetrics,
    activeAlerts,
    summary: {
      overall: systemStatus.overall,
      uptime: systemStatus.uptime,
      activeAlerts: activeAlerts.length,
      criticalMetrics: criticalMetrics.filter((m: any) => m.status === 'critical').length,
      warningMetrics: criticalMetrics.filter((m: any) => m.status === 'warning').length,
    },
  };
}

// ============================================================================
// MONITORING MIDDLEWARE AND UTILITIES
// ============================================================================

/**
 * Express-like middleware for request monitoring
 */
export function createMonitoringMiddleware() {
  const monitoring = getUnifiedMonitoring();

  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const operation = `${req.method} ${req.path}`;

    // Log request start
    monitoring.logEvent('system', `Request started: ${operation}`, 'debug', {
      method: req.method,
      path: req.path,
      userAgent: req.headers?.['user-agent'],
      ip: req.ip,
    });

    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;

      // Record performance
      monitoring.recordPerformance(operation, duration, success, {
        statusCode: res.statusCode,
        method: req.method,
        path: req.path,
      });

      // Log request completion
      monitoring.logEvent('system', `Request completed: ${operation}`, success ? 'info' : 'warn', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        success,
      });

      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Database query monitoring wrapper
 */
export function monitorDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const monitoring = getUnifiedMonitoring();
  const startTime = Date.now();

  return queryFn()
    .then(result => {
      const duration = Date.now() - startTime;
      monitoring.recordPerformance(`db.${queryName}`, duration, true);
      
      if (duration > 1000) {
        monitoring.logEvent('performance', `Slow database query: ${queryName}`, 'warn', {
          queryName,
          duration,
        });
      }

      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      monitoring.recordPerformance(`db.${queryName}`, duration, false);
      monitoring.logEvent('error', `Database query failed: ${queryName}`, 'error', {
        queryName,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });
}

/**
 * Cache operation monitoring wrapper
 */
export function monitorCacheOperation<T>(
  operation: 'get' | 'set' | 'delete' | 'clear',
  key: string,
  operationFn: () => Promise<T>
): Promise<T> {
  const monitoring = getUnifiedMonitoring();
  const startTime = Date.now();

  return operationFn()
    .then(result => {
      const duration = Date.now() - startTime;
      monitoring.recordPerformance(`cache.${operation}`, duration, true, { key });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      monitoring.recordPerformance(`cache.${operation}`, duration, false, { key });
      monitoring.logEvent('error', `Cache operation failed: ${operation}`, 'error', {
        operation,
        key,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });
}

// ============================================================================
// MONITORING CONSTANTS AND DEFAULTS
// ============================================================================

export const MONITORING_DEFAULTS = {
  METRICS_RETENTION_PERIOD: 24 * 60 * 60 * 1000, // 24 hours
  HEALTH_CHECK_INTERVAL: 30 * 1000, // 30 seconds
  ALERT_COOLDOWN_PERIOD: 5 * 60 * 1000, // 5 minutes
  PERFORMANCE_THRESHOLD: 1000, // 1 second
  MEMORY_WARNING_THRESHOLD: 80, // 80%
  MEMORY_CRITICAL_THRESHOLD: 90, // 90%
  ERROR_RATE_WARNING_THRESHOLD: 0.05, // 5%
  ERROR_RATE_CRITICAL_THRESHOLD: 0.1, // 10%
} as const;

export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn', 
  INFO: 'info',
  DEBUG: 'debug',
} as const;

export const METRIC_TYPES = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  TIMER: 'timer',
} as const;

export const ALERT_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const COMPONENT_STATUSES = {
  OPERATIONAL: 'operational',
  DEGRADED: 'degraded',
  DOWN: 'down',
} as const;

// ============================================================================
// TESTING AND VALIDATION
// ============================================================================

// Integration test utilities (for development and testing)
export {
  runMonitoringIntegrationTest,
  runAndLogMonitoringTest,
} from './monitoring-integration-test';