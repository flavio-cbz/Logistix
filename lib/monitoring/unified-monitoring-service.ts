/**
 * Unified Monitoring Service
 * 
 * Centralizes performance metrics, logging, health checks, and alerting
 * into a single cohesive monitoring system for the Logistix application.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */

import { getLogger, type ILogger, type LogContext } from '../utils/logging/logger';
import { PerformanceMonitoringService, type SystemMetrics } from './performance-monitor';
import { HealthCheckService, type SystemHealthStatus } from './health-check';
import { AlertingService, type Alert } from './alerting-system';
import { performanceCollector } from './performance-metrics';

// ============================================================================
// UNIFIED MONITORING TYPES
// ============================================================================

export interface MonitoringConfig {
  enablePerformanceTracking: boolean;
  enableHealthChecks: boolean;
  enableAlerting: boolean;
  enableStructuredLogging: boolean;
  metricsRetentionPeriod: number; // milliseconds
  healthCheckInterval: number; // milliseconds
  alertCooldownPeriod: number; // milliseconds
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: {
    performance: ComponentStatus;
    health: ComponentStatus;
    alerting: ComponentStatus;
    logging: ComponentStatus;
  };
  metrics: {
    system: SystemMetrics;
    performance: PerformanceMetrics;
    alerts: AlertMetrics;
  };
}

export interface ComponentStatus {
  status: 'operational' | 'degraded' | 'down';
  lastCheck: string;
  message: string;
  uptime: number;
}

export interface PerformanceMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface AlertMetrics {
  active: number;
  total: number;
  resolved: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

export interface CriticalMetrics {
  name: string;
  value: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  trend: 'stable' | 'increasing' | 'decreasing';
  lastUpdated: string;
}

// ============================================================================
// STRUCTURED LOGGING SERVICE
// ============================================================================

export class StructuredLoggingService {
  private logger: ILogger;
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.logger = getLogger('StructuredLoggingService');
  }

  /**
   * Log system events with structured format
   */
  logSystemEvent(
    event: string,
    level: 'error' | 'warn' | 'info' | 'debug',
    context?: LogContext
  ): void {
    if (!this.config.enableStructuredLogging) return;

    const structuredContext = {
      ...context,
      eventType: 'system',
      component: 'monitoring',
      timestamp: new Date().toISOString(),
    };

    this.logger[level](`System Event: ${event}`, structuredContext);
  }

  /**
   * Log performance events
   */
  logPerformanceEvent(
    operation: string,
    duration: number,
    success: boolean,
    context?: LogContext
  ): void {
    if (!this.config.enableStructuredLogging) return;

    const structuredContext = {
      ...context,
      eventType: 'performance',
      operation,
      duration,
      success,
      timestamp: new Date().toISOString(),
    };

    const level = duration > 1000 ? 'warn' : 'info';
    this.logger[level](`Performance: ${operation}`, structuredContext);
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    if (!this.config.enableStructuredLogging) return;

    const structuredContext = {
      ...context,
      eventType: 'security',
      severity,
      timestamp: new Date().toISOString(),
    };

    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logger[level](`Security Event: ${event}`, structuredContext);
  }

  /**
   * Log business events
   */
  logBusinessEvent(
    event: string,
    entityType: string,
    entityId: string,
    context?: LogContext
  ): void {
    if (!this.config.enableStructuredLogging) return;

    const structuredContext = {
      ...context,
      eventType: 'business',
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
    };

    this.logger.info(`Business Event: ${event}`, structuredContext);
  }

  /**
   * Log error events with full context
   */
  logError(
    error: Error | string,
    operation: string,
    context?: LogContext
  ): void {
    if (!this.config.enableStructuredLogging) return;

    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    const structuredContext = {
      ...context,
      eventType: 'error',
      operation,
      errorMessage,
      errorStack,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(`Error in ${operation}: ${errorMessage}`, structuredContext, error);
  }
}

// ============================================================================
// METRICS COLLECTION SERVICE
// ============================================================================

export class MetricsCollectionService {
  private metrics: Map<string, CriticalMetrics[]> = new Map();
  private config: MonitoringConfig;
  private logger: ILogger;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.logger = getLogger('MetricsCollectionService');
  }

  /**
   * Record a critical system metric
   */
  recordCriticalMetric(
    name: string,
    value: number,
    threshold: number,
    context?: Record<string, any>
  ): void {
    const metric: CriticalMetrics = {
      name,
      value,
      threshold,
      status: this.determineStatus(value, threshold),
      trend: this.calculateTrend(name, value),
      lastUpdated: new Date().toISOString(),
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only recent metrics based on retention period
    const cutoffTime = Date.now() - this.config.metricsRetentionPeriod;
    const filteredHistory = metricHistory.filter(m => 
      new Date(m.lastUpdated).getTime() > cutoffTime
    );
    this.metrics.set(name, filteredHistory);

    // Log critical metrics
    if (metric.status === 'critical') {
      this.logger.error(`Critical metric threshold exceeded: ${name}`, {
        value,
        threshold,
        status: metric.status,
        ...context,
      });
    } else if (metric.status === 'warning') {
      this.logger.warn(`Metric approaching threshold: ${name}`, {
        value,
        threshold,
        status: metric.status,
        ...context,
      });
    }
  }

  /**
   * Get current critical metrics
   */
  getCriticalMetrics(): CriticalMetrics[] {
    const allMetrics: CriticalMetrics[] = [];
    
    for (const [, metricHistory] of this.metrics) {
      if (metricHistory.length > 0) {
        // Get the latest metric for each type
        allMetrics.push(metricHistory[metricHistory.length - 1]!);
      }
    }

    return allMetrics.sort((a, b) => {
      const statusPriority = { critical: 3, warning: 2, normal: 1 };
      return statusPriority[b.status] - statusPriority[a.status];
    });
  }

  /**
   * Get metric history for a specific metric
   */
  getMetricHistory(name: string, limit?: number): CriticalMetrics[] {
    const history = this.metrics.get(name) || [];
    return limit ? history.slice(-limit) : history;
  }

  private determineStatus(value: number, threshold: number): 'normal' | 'warning' | 'critical' {
    if (value >= threshold) return 'critical';
    if (value >= threshold * 0.8) return 'warning';
    return 'normal';
  }

  private calculateTrend(name: string, currentValue: number): 'stable' | 'increasing' | 'decreasing' {
    const history = this.metrics.get(name) || [];
    if (history.length < 2) return 'stable';

    const previousValue = history[history.length - 1]!.value;
    const difference = currentValue - previousValue;
    const percentageChange = Math.abs(difference) / previousValue;

    if (percentageChange < 0.05) return 'stable'; // Less than 5% change
    return difference > 0 ? 'increasing' : 'decreasing';
  }
}

// ============================================================================
// UNIFIED MONITORING SERVICE
// ============================================================================

export class UnifiedMonitoringService {
  private static instance: UnifiedMonitoringService;
  
  private config: MonitoringConfig;
  // private logger: ILogger; // Unused
  private structuredLogging: StructuredLoggingService;
  private metricsCollection: MetricsCollectionService;
  private performanceMonitor: PerformanceMonitoringService;
  private healthCheckService: HealthCheckService;
  private alertingService: AlertingService;
  
  private startTime: number;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enablePerformanceTracking: true,
      enableHealthChecks: true,
      enableAlerting: true,
      enableStructuredLogging: true,
      metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      healthCheckInterval: 30 * 1000, // 30 seconds
      alertCooldownPeriod: 5 * 60 * 1000, // 5 minutes
      logLevel: 'info',
      ...config,
    };

    this.startTime = Date.now();
    // this.logger = getLogger('UnifiedMonitoringService'); // Unused
    
    // Initialize sub-services
    this.structuredLogging = new StructuredLoggingService(this.config);
    this.metricsCollection = new MetricsCollectionService(this.config);
    this.performanceMonitor = PerformanceMonitoringService.getInstance();
    this.healthCheckService = HealthCheckService.getInstance();
    this.alertingService = AlertingService.getInstance();

    this.initializeMonitoring();
  }

  public static getInstance(config?: Partial<MonitoringConfig>): UnifiedMonitoringService {
    if (!UnifiedMonitoringService.instance) {
      UnifiedMonitoringService.instance = new UnifiedMonitoringService(config);
    }
    return UnifiedMonitoringService.instance;
  }

  /**
   * Initialize monitoring processes
   */
  private initializeMonitoring(): void {
    this.structuredLogging.logSystemEvent('Monitoring system initialized', 'info', {
      config: this.config,
    });

    // Start periodic monitoring if enabled
    if (this.config.enableHealthChecks) {
      this.startPeriodicHealthChecks();
    }

    // Start performance tracking
    if (this.config.enablePerformanceTracking) {
      this.startPerformanceTracking();
    }
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const healthStatus = await this.healthCheckService.getSystemHealth();
        
        // Process health check results for alerting
        if (this.config.enableAlerting) {
          await this.alertingService.processHealthCheckResults(healthStatus);
        }

        // Record critical metrics from health checks
        this.recordHealthMetrics(healthStatus);

      } catch (error) {
        this.structuredLogging.logError(
          error instanceof Error ? error : new Error(String(error)),
          'periodic-health-check'
        );
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Start performance tracking
   */
  private startPerformanceTracking(): void {
    // Performance tracking is handled by the PerformanceMonitoringService
    // We just need to ensure it's properly integrated
    this.structuredLogging.logSystemEvent('Performance tracking started', 'info');
  }

  /**
   * Record health metrics as critical metrics
   */
  private recordHealthMetrics(healthStatus: SystemHealthStatus): void {
    // Record overall health score
    const healthScore = this.calculateHealthScore(healthStatus);
    this.metricsCollection.recordCriticalMetric(
      'system.health.score',
      healthScore,
      80, // Threshold: 80% health score
      { status: healthStatus.status }
    );

    // Record individual check metrics
    healthStatus.checks.forEach(check => {
      const score = check.status === 'healthy' ? 100 : 
                   check.status === 'degraded' ? 50 : 0;
      
      this.metricsCollection.recordCriticalMetric(
        `health.check.${check.name}`,
        score,
        80,
        { 
          checkStatus: check.status,
          duration: check.duration,
          message: check.message 
        }
      );
    });
  }

  /**
   * Calculate overall health score from health status
   */
  private calculateHealthScore(healthStatus: SystemHealthStatus): number {
    const { summary } = healthStatus;
    const total = summary.total;
    
    if (total === 0) return 100;
    
    const healthyWeight = 100;
    const degradedWeight = 50;
    const unhealthyWeight = 0;
    
    const score = (
      (summary.healthy * healthyWeight) +
      (summary.degraded * degradedWeight) +
      (summary.unhealthy * unhealthyWeight)
    ) / total;
    
    return Math.round(score);
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const [healthStatus, systemMetrics, performanceReport] = await Promise.all([
      this.healthCheckService.getSystemHealth(),
      this.performanceMonitor.getMetrics(),
      this.performanceMonitor.getPerformanceReport(),
    ]);

    const alerts = this.alertingService.getActiveAlerts();
    const criticalMetrics = this.metricsCollection.getCriticalMetrics();

    // Determine overall status
    const overall = this.determineOverallStatus(healthStatus, criticalMetrics, alerts);

    return {
      overall,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
  version: process.env['npm_package_version'] || '1.0.0',
  environment: process.env['NODE_ENV'] || 'development',
      components: {
        performance: {
          status: 'operational',
          lastCheck: new Date().toISOString(),
          message: 'Performance monitoring active',
          uptime: Date.now() - this.startTime,
        },
        health: {
          status: healthStatus.status === 'healthy' ? 'operational' : 
                 healthStatus.status === 'degraded' ? 'degraded' : 'down',
          lastCheck: healthStatus.timestamp,
          message: `${healthStatus.summary.healthy}/${healthStatus.summary.total} checks passing`,
          uptime: healthStatus.uptime,
        },
        alerting: {
          status: 'operational',
          lastCheck: new Date().toISOString(),
          message: `${alerts.length} active alerts`,
          uptime: Date.now() - this.startTime,
        },
        logging: {
          status: 'operational',
          lastCheck: new Date().toISOString(),
          message: 'Structured logging active',
          uptime: Date.now() - this.startTime,
        },
      },
      metrics: {
        system: systemMetrics,
        performance: {
          requestsPerSecond: performanceReport.api?.requestCount || 0,
          averageResponseTime: performanceReport.api?.averageResponseTime || 0,
          errorRate: performanceReport.api?.errorRate || 0,
          throughput: performanceReport.api?.requestCount || 0,
          activeConnections: performanceReport.database?.connections || 0,
          memoryUsage: (systemMetrics.memoryUsage.heapUsed / systemMetrics.memoryUsage.heapTotal) * 100,
          cpuUsage: systemMetrics.cpuUsage,
        },
        alerts: {
          active: alerts.length,
          total: this.alertingService.getAlerts().length,
          resolved: this.alertingService.getAlerts({ resolved: true }).length,
          byType: this.groupAlertsByType(alerts),
          bySeverity: this.groupAlertsBySeverity(alerts),
        },
      },
    };
  }

  /**
   * Record a performance metric
   */
  recordPerformance(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enablePerformanceTracking) return;

    // Record in performance collector
    performanceCollector.record({
      operation,
      duration,
      timestamp: new Date().toISOString(),
      success,
      metadata: metadata ?? {},
    });

    // Log performance event
    this.structuredLogging.logPerformanceEvent(operation, duration, success, metadata);

    // Record as critical metric if slow
    if (duration > 1000) {
      this.metricsCollection.recordCriticalMetric(
        `performance.${operation}.duration`,
        duration,
        1000,
        { operation, success, ...metadata }
      );
    }
  }

  /**
   * Log a structured event
   */
  logEvent(
    type: 'system' | 'performance' | 'security' | 'business' | 'error',
    event: string,
    level: 'error' | 'warn' | 'info' | 'debug' = 'info',
    context?: LogContext
  ): void {
    switch (type) {
      case 'system':
        this.structuredLogging.logSystemEvent(event, level, context);
        break;
      case 'performance':
        if (context?.duration && context?.['success'] !== undefined) {
          this.structuredLogging.logPerformanceEvent(
            event,
            context.duration as number,
            context['success'] as boolean,
            context
          );
        }
        break;
      case 'security':
        this.structuredLogging.logSecurityEvent(
          event,
          (context?.['severity'] as any) || 'medium',
          context
        );
        break;
      case 'business':
        this.structuredLogging.logBusinessEvent(
          event,
          (context?.['entityType'] as string) || 'unknown',
          (context?.['entityId'] as string) || 'unknown',
          context
        );
        break;
      case 'error':
        this.structuredLogging.logError(
          new Error(event),
          (context?.operation as string) || 'unknown',
          context
        );
        break;
    }
  }

  /**
   * Get critical metrics
   */
  getCriticalMetrics(): CriticalMetrics[] {
    return this.metricsCollection.getCriticalMetrics();
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alertingService.getActiveAlerts();
  }

  /**
   * Create a custom alert
   */
  async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<Alert> {
    return this.alertingService.createAlert(
      type,
      severity,
      title,
      message,
      'unified-monitoring',
      metadata
    );
  }

  /**
   * Stop monitoring services
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null as any;
    }

    this.performanceMonitor.stopMonitoring();
    
    this.structuredLogging.logSystemEvent('Monitoring system stopped', 'info');
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private determineOverallStatus(
    healthStatus: SystemHealthStatus,
    criticalMetrics: CriticalMetrics[],
    alerts: Alert[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Check for critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) return 'unhealthy';

    // Check for critical metrics
    const criticalMetricsCount = criticalMetrics.filter(m => m.status === 'critical').length;
    if (criticalMetricsCount > 0) return 'unhealthy';

    // Check health status
    if (healthStatus.status === 'unhealthy') return 'unhealthy';
    if (healthStatus.status === 'degraded') return 'degraded';

    // Check for warning metrics or alerts
    const warningMetrics = criticalMetrics.filter(m => m.status === 'warning').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    
    if (warningMetrics > 2 || highAlerts > 0) return 'degraded';

    return 'healthy';
  }

  private groupAlertsByType(alerts: Alert[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupAlertsBySeverity(alerts: Alert[]): Record<string, number> {
    return alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get the unified monitoring service instance
 */
export function getUnifiedMonitoring(config?: Partial<MonitoringConfig>): UnifiedMonitoringService {
  return UnifiedMonitoringService.getInstance(config);
}

/**
 * Quick performance measurement decorator
 */
export function monitorPerformance(operation?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const monitoring = getUnifiedMonitoring();
      const startTime = Date.now();
      let success = true;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        monitoring.recordPerformance(operationName, duration, success);
      }
    };

    return descriptor;
  };
}

export default UnifiedMonitoringService;