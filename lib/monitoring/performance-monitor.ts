/**
 * Performance Monitoring System
 *
 * This module provides comprehensive performance monitoring for database operations,
 * API response times, and system metrics to ensure optimal application performance.
 *
 * Requirements: 9.4, 9.5
 */

import { getLogger } from "../utils/logging/logger";
// import { configService } from "../config/config-service";

// ============================================================================
// PERFORMANCE METRICS TYPES
// ============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags: Record<string, string>;
  metadata: Record<string, any>;
}

export interface DatabaseMetrics {
  queryCount: number;
  averageQueryTime: number;
  slowQueries: number;
  connectionPoolSize: number;
  activeConnections: number;
  failedQueries: number;
}

export interface ApiMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowRequests: number;
  errorRate: number;
  statusCodes: Record<string, number>;
}

export interface SystemMetrics {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: number;
  uptime: number;
  eventLoopLag: number;
}

export interface PerformanceAlert {
  id: string;
  type: "warning" | "critical";
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: string;
  resolved: boolean;
}

// ============================================================================
// PERFORMANCE TRACKER
// ============================================================================

export class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private logger: ReturnType<typeof getLogger>;

  // Thresholds for alerts
  private thresholds = {
    slowQueryTime: 1000, // ms
    slowApiResponse: 2000, // ms
    highMemoryUsage: 85, // percentage
    highErrorRate: 5, // percentage
    highEventLoopLag: 100, // ms
  };

  constructor() {
    this.logger = getLogger("PerformanceTracker");
    this.startEventLoopMonitoring();
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>,
    metadata?: Record<string, any>,
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags: tags || {},
      metadata: metadata || {},
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only last 1000 metrics per type
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    // Check for alerts
    this.checkThresholds(metric);

    // Log significant metrics
    if (this.isSignificantMetric(metric)) {
      this.logger.info("Performance metric recorded", {
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: metric.tags,
      });
    }
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(
    query: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>,
  ): void {
    this.recordMetric(
      "database.query.duration",
      duration,
      "ms",
      {
        success: success.toString(),
        queryType: this.getQueryType(query),
      },
      {
        query: query.substring(0, 100), // Truncate for logging
        ...metadata,
      },
    );

    this.recordMetric("database.query.count", 1, "count", {
      success: success.toString(),
      queryType: this.getQueryType(query),
    });

    if (duration > this.thresholds.slowQueryTime) {
      this.recordMetric("database.query.slow", 1, "count", {
        queryType: this.getQueryType(query),
      });
    }
  }

  /**
   * Record API request performance
   */
  recordApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    const success = statusCode < 400;

    this.recordMetric(
      "api.request.duration",
      duration,
      "ms",
      {
        method,
        path: this.sanitizePath(path),
        statusCode: statusCode.toString(),
        success: success.toString(),
      },
      metadata,
    );

    this.recordMetric("api.request.count", 1, "count", {
      method,
      path: this.sanitizePath(path),
      statusCode: statusCode.toString(),
      success: success.toString(),
    });

    if (duration > this.thresholds.slowApiResponse) {
      this.recordMetric("api.request.slow", 1, "count", {
        method,
        path: this.sanitizePath(path),
      });
    }

    if (!success) {
      this.recordMetric("api.request.error", 1, "count", {
        method,
        path: this.sanitizePath(path),
        statusCode: statusCode.toString(),
      });
    }
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Memory metrics
    this.recordMetric("system.memory.heap_used", memUsage.heapUsed, "bytes");
    this.recordMetric("system.memory.heap_total", memUsage.heapTotal, "bytes");
    this.recordMetric("system.memory.external", memUsage.external, "bytes");
    this.recordMetric("system.memory.rss", memUsage.rss, "bytes");

    // Memory usage percentage
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    this.recordMetric(
      "system.memory.usage_percent",
      memoryUsagePercent,
      "percent",
    );

    // Uptime
    this.recordMetric("system.uptime", uptime, "seconds");

    // CPU usage (simplified - would need more sophisticated monitoring in production)
    const cpuUsage = process.cpuUsage();
    this.recordMetric("system.cpu.user", cpuUsage.user, "microseconds");
    this.recordMetric("system.cpu.system", cpuUsage.system, "microseconds");
  }

  /**
   * Get aggregated database metrics
   */
  getDatabaseMetrics(timeWindow?: number): DatabaseMetrics {
    const windowStart = timeWindow ? Date.now() - timeWindow : 0;

    const queryDurations = this.getMetricsInWindow(
      "database.query.duration",
      windowStart,
    );
    const queryCounts = this.getMetricsInWindow(
      "database.query.count",
      windowStart,
    );
    const slowQueries = this.getMetricsInWindow(
      "database.query.slow",
      windowStart,
    );

    // const _successfulQueries = queryCounts.filter(
    //   (m) => m.tags?.success === "true",
    // );
    const failedQueries = queryCounts.filter(
      (m) => m.tags?.success === "false",
    );

    return {
      queryCount: queryCounts.length,
      averageQueryTime: this.calculateAverage(
        queryDurations.map((m) => m.value),
      ),
      slowQueries: slowQueries.length,
      connectionPoolSize: 10, // Would get from actual pool
      activeConnections: 1, // Would get from actual pool
      failedQueries: failedQueries.length,
    };
  }

  /**
   * Get aggregated API metrics
   */
  getApiMetrics(timeWindow?: number): ApiMetrics {
    const windowStart = timeWindow ? Date.now() - timeWindow : 0;

    const requestDurations = this.getMetricsInWindow(
      "api.request.duration",
      windowStart,
    );
    const requestCounts = this.getMetricsInWindow(
      "api.request.count",
      windowStart,
    );
    const slowRequests = this.getMetricsInWindow(
      "api.request.slow",
      windowStart,
    );
    const errorRequests = this.getMetricsInWindow(
      "api.request.error",
      windowStart,
    );

    const statusCodes: Record<string, number> = {};
    requestCounts.forEach((metric) => {
      const statusCode = metric.tags?.statusCode || "unknown";
      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
    });

    const errorRate =
      requestCounts.length > 0
        ? (errorRequests.length / requestCounts.length) * 100
        : 0;

    return {
      requestCount: requestCounts.length,
      averageResponseTime: this.calculateAverage(
        requestDurations.map((m) => m.value),
      ),
      slowRequests: slowRequests.length,
      errorRate,
      statusCodes,
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Get latest event loop lag
    const eventLoopLagMetrics = this.getLatestMetrics(
      "system.event_loop_lag",
      1,
    );
    const eventLoopLag =
      eventLoopLagMetrics.length > 0 ? eventLoopLagMetrics[0].value : 0;

    return {
      memoryUsage: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpuUsage: 0, // Would implement proper CPU monitoring
      uptime,
      eventLoopLag,
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.info("Performance alert resolved", {
        alertId,
        metric: alert.metric,
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeWindow: number = 3600000): any {
    // 1 hour default
    const dbMetrics = this.getDatabaseMetrics(timeWindow);
    const apiMetrics = this.getApiMetrics(timeWindow);
    const systemMetrics = this.getSystemMetrics();
    const activeAlerts = this.getActiveAlerts();

    return {
      timestamp: new Date().toISOString(),
      timeWindow,
      database: dbMetrics,
      api: apiMetrics,
      system: systemMetrics,
      alerts: {
        active: activeAlerts.length,
        total: this.alerts.length,
        activeAlerts: activeAlerts.slice(0, 10), // Latest 10 alerts
      },
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getQueryType(query: string): string {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.startsWith("select")) return "select";
    if (normalizedQuery.startsWith("insert")) return "insert";
    if (normalizedQuery.startsWith("update")) return "update";
    if (normalizedQuery.startsWith("delete")) return "delete";
    if (normalizedQuery.startsWith("create")) return "create";
    if (normalizedQuery.startsWith("drop")) return "drop";
    if (normalizedQuery.startsWith("alter")) return "alter";
    return "other";
  }

  private sanitizePath(path: string): string {
    // Replace dynamic segments with placeholders
    return path
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        "/:id",
      )
      .replace(/\/\d+/g, "/:id");
  }

  private getMetricsInWindow(
    name: string,
    windowStart: number,
  ): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    return metrics.filter((metric) => {
      const metricTime = new Date(metric.timestamp).getTime();
      return metricTime >= windowStart;
    });
  }

  private getLatestMetrics(name: string, count: number): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    return metrics.slice(-count);
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private isSignificantMetric(metric: PerformanceMetric): boolean {
    // Log slow queries and requests
    if (
      metric.name === "database.query.duration" &&
      metric.value > this.thresholds.slowQueryTime
    ) {
      return true;
    }
    if (
      metric.name === "api.request.duration" &&
      metric.value > this.thresholds.slowApiResponse
    ) {
      return true;
    }
    // Log errors
    if (metric.name.includes(".error")) {
      return true;
    }
    return false;
  }

  private checkThresholds(metric: PerformanceMetric): void {
    let alertType: "warning" | "critical" | null = null;
    let threshold = 0;
    let message = "";

    // Check database query thresholds
    if (metric.name === "database.query.duration") {
      if (metric.value > this.thresholds.slowQueryTime * 2) {
        alertType = "critical";
        threshold = this.thresholds.slowQueryTime * 2;
        message = `Critical database query performance: ${metric.value}ms`;
      } else if (metric.value > this.thresholds.slowQueryTime) {
        alertType = "warning";
        threshold = this.thresholds.slowQueryTime;
        message = `Slow database query detected: ${metric.value}ms`;
      }
    }

    // Check API response thresholds
    if (metric.name === "api.request.duration") {
      if (metric.value > this.thresholds.slowApiResponse * 2) {
        alertType = "critical";
        threshold = this.thresholds.slowApiResponse * 2;
        message = `Critical API response time: ${metric.value}ms`;
      } else if (metric.value > this.thresholds.slowApiResponse) {
        alertType = "warning";
        threshold = this.thresholds.slowApiResponse;
        message = `Slow API response detected: ${metric.value}ms`;
      }
    }

    // Check memory usage thresholds
    if (metric.name === "system.memory.usage_percent") {
      if (metric.value > 95) {
        alertType = "critical";
        threshold = 95;
        message = `Critical memory usage: ${metric.value.toFixed(1)}%`;
      } else if (metric.value > this.thresholds.highMemoryUsage) {
        alertType = "warning";
        threshold = this.thresholds.highMemoryUsage;
        message = `High memory usage: ${metric.value.toFixed(1)}%`;
      }
    }

    // Create alert if threshold exceeded
    if (alertType) {
      const alert: PerformanceAlert = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: alertType,
        metric: metric.name,
        threshold,
        currentValue: metric.value,
        message,
        timestamp: new Date().toISOString(),
        resolved: false,
      };

      this.alerts.push(alert);

      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts.shift();
      }

      this.logger.warn("Performance alert triggered", {
        alertId: alert.id,
        type: alert.type,
        metric: alert.metric,
        threshold: alert.threshold,
        currentValue: alert.currentValue,
      });
    }
  }

  private startEventLoopMonitoring(): void {
    setInterval(() => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        this.recordMetric("system.event_loop_lag", lag, "ms");
      });
    }, 5000); // Check every 5 seconds
  }
}

// ============================================================================
// PERFORMANCE MONITORING SERVICE
// ============================================================================

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private tracker: PerformanceTracker;
  // private monitoringInterval?: NodeJS.Timeout; // TODO: implement service-level monitoring

  private constructor() {
    this.tracker = new PerformanceTracker();
    this.startPeriodicMonitoring();
  }

  public static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance =
        new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Get the performance tracker instance
   */
  getTracker(): PerformanceTracker {
    return this.tracker;
  }

  /**
   * Start periodic system monitoring
   */
  private startPeriodicMonitoring(): void {
    // TODO: implement periodic monitoring
    // Record system metrics every 30 seconds
    // this.monitoringInterval = setInterval(() => {
    //   try {
    //     this.tracker.recordSystemMetrics();
    //   } catch (error) {
    //     this.logger.error("Failed to record system metrics", { error });
    //   }
    // }, 30000);
  }

  /**
   * Stop periodic monitoring
   */
  stopMonitoring(): void {
    // TODO: implement monitoring cleanup
    // if (this.monitoringInterval) {
    //   clearInterval(this.monitoringInterval);
    //   this.monitoringInterval = undefined;
    // }
  }

  /**
   * Get current system metrics
   */
  getMetrics(): SystemMetrics {
    return this.tracker.getSystemMetrics();
  }

  /**
   * Get current alerts
   */
  getAlerts(): PerformanceAlert[] {
    return this.tracker.getActiveAlerts();
  }

  /**
   * Get health score
   */
  getHealthScore(): number {
    // Simple health score calculation
    let score = 100;

    // Basic health check - can be enhanced
    if (this.getAlerts().length > 0) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Get current system metrics (alias for getMetrics)
   */
  getCurrentSystemMetrics(): SystemMetrics {
    return this.getMetrics();
  }

  /**
   * Get analytics data
   */
  getAnalytics(timeRange: number = 3600000): any {
    // TODO: implement analytics
    return {
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      timeRange,
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.getAlerts();
  }

  /**
   * Get all alerts with optional limit
   */
  getAllAlerts(limit?: number): PerformanceAlert[] {
    const alerts = this.getAlerts();
    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(timeWindow?: number): any {
    return this.tracker.getPerformanceSummary(timeWindow);
  }
}

/**
 * Get the singleton instance of the performance monitor
 */
export function getPerformanceMonitor(): PerformanceMonitoringService {
  return PerformanceMonitoringService.getInstance();
}

export default PerformanceMonitoringService;
