import "server-only";
import {
  SystemMetrics,
  PerformanceAlert,
} from "./performance-monitor";
import { DatabasePerformanceMonitor } from "../database/performance-monitor";

// Temporary interfaces for missing types
interface PerformanceMonitor {
  getMetrics(): SystemMetrics;
  getAlerts(): PerformanceAlert[];
  getHealthScore(): number;
  getCurrentSystemMetrics(): SystemMetrics;
  getAnalytics(timeRange?: number): any;
  getActiveAlerts(): PerformanceAlert[];
  getAllAlerts(limit?: number): PerformanceAlert[];
}

interface CacheManager {
  getStats(): any;
}

// ============================================================================
// METRICS DASHBOARD
// ============================================================================

export interface DashboardMetrics {
  overview: {
    status: "healthy" | "warning" | "critical";
    healthScore: number;
    uptime: number;
    version: string;
    environment: string;
  };
  performance: {
    requests: {
      total: number;
      rps: number;
      averageResponseTime: number;
      errorRate: number;
    };
    system: {
      memory: { used: number; total: number; percentage: number };
      cpu: { usage: number; loadAverage: number[] };
    };
    database: {
      connections: number;
      averageResponseTime: number;
      errorRate: number;
      slowQueries: number;
    };
    cache: {
      hitRate: number;
      size: number;
      evictions: number;
    };
  };
  alerts: {
    active: PerformanceAlert[];
    recent: PerformanceAlert[];
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  trends: {
    responseTime: Array<{ timestamp: number; value: number }>;
    errorRate: Array<{ timestamp: number; value: number }>;
    throughput: Array<{ timestamp: number; value: number }>;
    memoryUsage: Array<{ timestamp: number; value: number }>;
  };
  topEndpoints: Array<{
    path: string;
    method: string;
    count: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
  slowestRequests: Array<{
    path: string;
    method: string;
    duration: number;
    timestamp: number;
    statusCode: number;
  }>;
}

export interface MetricsExportOptions {
  format: "json" | "csv" | "prometheus";
  timeRange: number;
  metrics?: string[];
}

/**
 * Metrics Dashboard Service
 *
 * Provides a comprehensive dashboard for monitoring application performance
 */
export class MetricsDashboard {
  private performanceMonitor: PerformanceMonitor;
  private databaseMonitor: DatabasePerformanceMonitor;
  private cacheManager: CacheManager;
  private startTime: number;

  constructor(
    performanceMonitor: PerformanceMonitor,
    databaseMonitor: DatabasePerformanceMonitor,
    cacheManager: CacheManager,
  ) {
    this.performanceMonitor = performanceMonitor;
    this.databaseMonitor = databaseMonitor;
    this.cacheManager = cacheManager;
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive dashboard metrics
   */
  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [
      healthScore,
      systemMetrics,
      analytics,
      databaseMetrics,
      cacheStats,
      activeAlerts,
      recentAlerts,
    ] = await Promise.all([
      this.getHealthScore(),
      this.getSystemMetrics(),
      this.getAnalytics(),
      this.getDatabaseMetrics(),
      this.getCacheStats(),
      this.getActiveAlerts(),
      this.getRecentAlerts(),
    ]);

    // Determine overall status
    const status =
      healthScore >= 80
        ? "healthy"
        : healthScore >= 60
          ? "warning"
          : "critical";

    // Alert summary
    const alertSummary = this.summarizeAlerts([
      ...activeAlerts,
      ...recentAlerts,
    ]);

    return {
      overview: {
        status,
        healthScore,
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
      },
      performance: {
        requests: {
          total: analytics.summary.totalRequests,
          rps: analytics.summary.throughput,
          averageResponseTime: analytics.summary.averageResponseTime,
          errorRate: analytics.summary.errorRate,
        },
        system: {
          memory: {
            used: systemMetrics.memoryUsage.heapUsed,
            total: systemMetrics.memoryUsage.heapTotal,
            percentage: (systemMetrics.memoryUsage.heapUsed / systemMetrics.memoryUsage.heapTotal) * 100,
          },
          cpu: {
            usage: systemMetrics.cpuUsage,
            loadAverage: [systemMetrics.cpuUsage], // Simplified
          },
        },
        database: {
          connections: databaseMetrics.connectionStats.activeConnections,
          averageResponseTime:
            databaseMetrics.connectionStats.averageResponseTime,
          errorRate: databaseMetrics.connectionStats.errorRate,
          slowQueries: databaseMetrics.queryStats.slowQueries,
        },
        cache: {
          hitRate: cacheStats.hitRate,
          size: cacheStats.totalSize,
          evictions: cacheStats.evictionCount,
        },
      },
      alerts: {
        active: activeAlerts,
        recent: recentAlerts,
        summary: alertSummary,
      },
      trends: {
        responseTime: analytics.trends.responseTime,
        errorRate: analytics.trends.errorRate,
        throughput: analytics.trends.throughput,
        memoryUsage: this.getMemoryTrend(),
      },
      topEndpoints: analytics.topEndpoints,
      slowestRequests: analytics.slowestRequests.map((req: any) => ({
        path: req.path,
        method: req.method,
        duration: req.duration,
        timestamp: req.timestamp,
        statusCode: req.statusCode,
      })),
    };
  }

  /**
   * Get real-time metrics (lightweight)
   */
  public async getRealTimeMetrics(): Promise<{
    timestamp: number;
    rps: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    activeConnections: number;
    cacheHitRate: number;
    activeAlerts: number;
  }> {
    const systemMetrics = this.getSystemMetrics();
    const analytics = this.getAnalytics(300000); // Last 5 minutes
    const cacheStats = this.getCacheStats();
    const activeAlerts = this.getActiveAlerts();

    return {
      timestamp: Date.now(),
      rps: analytics.summary.throughput,
      averageResponseTime: analytics.summary.averageResponseTime,
      errorRate: analytics.summary.errorRate,
      memoryUsage: (systemMetrics as any).memory?.percentage || 0,
      activeConnections: (systemMetrics as any).database?.connections || 0,
      cacheHitRate: cacheStats.hitRate,
      activeAlerts: activeAlerts.length,
    };
  }

  /**
   * Export metrics in various formats
   */
  public async exportMetrics(options: MetricsExportOptions): Promise<string> {
    const metrics = await this.getDashboardMetrics();

    switch (options.format) {
      case "json":
        return JSON.stringify(metrics, null, 2);

      case "csv":
        return this.exportToCSV(metrics);

      case "prometheus":
        return this.exportToPrometheus(metrics);

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Get performance recommendations
   */
  public async getPerformanceRecommendations(): Promise<
    Array<{
      category: string;
      priority: "low" | "medium" | "high" | "critical";
      title: string;
      description: string;
      action: string;
      impact: string;
    }>
  > {
    const recommendations = [];
    const metrics = await this.getDashboardMetrics();

    // Response time recommendations
    if (metrics.performance.requests.averageResponseTime > 1000) {
      recommendations.push({
        category: "Performance",
        priority: "high" as const,
        title: "High Response Time",
        description: `Average response time is ${metrics.performance.requests.averageResponseTime.toFixed(0)}ms`,
        action: "Optimize slow endpoints, add caching, or scale infrastructure",
        impact: "Improved user experience and reduced server load",
      });
    }

    // Error rate recommendations
    if (metrics.performance.requests.errorRate > 0.05) {
      recommendations.push({
        category: "Reliability",
        priority: "critical" as const,
        title: "High Error Rate",
        description: `Error rate is ${(metrics.performance.requests.errorRate * 100).toFixed(2)}%`,
        action: "Investigate and fix the root cause of errors",
        impact: "Improved application reliability and user satisfaction",
      });
    }

    // Memory usage recommendations
    if (metrics.performance.system.memory.percentage > 80) {
      recommendations.push({
        category: "Resources",
        priority: "medium" as const,
        title: "High Memory Usage",
        description: `Memory usage is ${metrics.performance.system.memory.percentage.toFixed(1)}%`,
        action: "Optimize memory usage or increase available memory",
        impact: "Prevent out-of-memory errors and improve stability",
      });
    }

    // Cache performance recommendations
    if (metrics.performance.cache.hitRate < 0.7) {
      recommendations.push({
        category: "Caching",
        priority: "medium" as const,
        title: "Low Cache Hit Rate",
        description: `Cache hit rate is ${(metrics.performance.cache.hitRate * 100).toFixed(1)}%`,
        action: "Review cache strategy, increase TTL, or warm up cache",
        impact: "Reduced database load and improved response times",
      });
    }

    // Database performance recommendations
    if (metrics.performance.database.averageResponseTime > 200) {
      recommendations.push({
        category: "Database",
        priority: "high" as const,
        title: "Slow Database Queries",
        description: `Average database response time is ${metrics.performance.database.averageResponseTime.toFixed(0)}ms`,
        action: "Add indexes, optimize queries, or scale database",
        impact: "Faster application response times",
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get system health check
   */
  public async getHealthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: Array<{
      name: string;
      status: "pass" | "warn" | "fail";
      message: string;
      duration: number;
    }>;
    timestamp: number;
  }> {
    const checks = [];
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    // Database health check
    const dbStart = Date.now();
    try {
      const dbHealthy = await (this.databaseMonitor as any).healthCheck();
      checks.push({
        name: "database",
        status: dbHealthy ? "pass" : "fail",
        message: dbHealthy
          ? "Database is responsive"
          : "Database is not responding",
        duration: Date.now() - dbStart,
      });
      if (!dbHealthy) overallStatus = "unhealthy";
    } catch (error) {
      checks.push({
        name: "database",
        status: "fail",
        message: `Database check failed: ${error}`,
        duration: Date.now() - dbStart,
      });
      overallStatus = "unhealthy";
    }

    // Memory health check
    const memStart = Date.now();
    const memoryUsage = process.memoryUsage();
    const memoryPercentage =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const memoryStatus =
      memoryPercentage > 90 ? "fail" : memoryPercentage > 80 ? "warn" : "pass";
    checks.push({
      name: "memory",
      status: memoryStatus,
      message: `Memory usage: ${memoryPercentage.toFixed(1)}%`,
      duration: Date.now() - memStart,
    });
    if (memoryStatus === "fail") overallStatus = "unhealthy";
    else if (memoryStatus === "warn" && overallStatus === "healthy")
      overallStatus = "degraded";

    // Cache health check
    const cacheStart = Date.now();
    const cacheStats = this.getCacheStats();
    const cacheStatus = cacheStats.hitRate < 0.5 ? "warn" : "pass";
    checks.push({
      name: "cache",
      status: cacheStatus,
      message: `Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`,
      duration: Date.now() - cacheStart,
    });
    if (cacheStatus === "warn" && overallStatus === "healthy")
      overallStatus = "degraded";

    return {
      status: overallStatus,
      checks: checks as Array<{
        name: string;
        status: "pass" | "warn" | "fail";
        message: string;
        duration: number;
      }>,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getHealthScore() {
    return this.performanceMonitor.getHealthScore();
  }

  private getSystemMetrics(): SystemMetrics {
    return this.performanceMonitor.getCurrentSystemMetrics();
  }

  private getAnalytics(timeRange: number = 3600000) {
    return this.performanceMonitor.getAnalytics(timeRange);
  }

  private async getDatabaseMetrics() {
    return await this.databaseMonitor.getDatabaseMetrics();
  }

  private getCacheStats() {
    return this.cacheManager.getStats();
  }

  private getActiveAlerts(): PerformanceAlert[] {
    return this.performanceMonitor.getActiveAlerts();
  }

  private getRecentAlerts(): PerformanceAlert[] {
    return this.performanceMonitor
      .getAllAlerts(50)
      .filter((alert: any) => Date.now() - new Date(alert.timestamp).getTime() < 3600000); // Last hour
  }

  private summarizeAlerts(alerts: PerformanceAlert[]) {
    return {
      critical: alerts.filter((a) => (a as any).severity === "critical").length,
      high: alerts.filter((a) => (a as any).severity === "high").length,
      medium: alerts.filter((a) => (a as any).severity === "medium").length,
      low: alerts.filter((a) => (a as any).severity === "low").length,
    };
  }

  private getMemoryTrend(): Array<{ timestamp: number; value: number }> {
    // This would typically come from stored system metrics
    // For now, return current memory usage
    const memoryUsage = process.memoryUsage();
    const percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    return [
      {
        timestamp: Date.now(),
        value: percentage,
      },
    ];
  }

  private exportToCSV(metrics: DashboardMetrics): string {
    const lines = [];

    // Header
    lines.push("timestamp,metric,value,unit");

    // Add metrics
    const timestamp = Date.now();
    lines.push(
      `${timestamp},requests_total,${metrics.performance.requests.total},count`,
    );
    lines.push(
      `${timestamp},requests_rps,${metrics.performance.requests.rps},rps`,
    );
    lines.push(
      `${timestamp},response_time_avg,${metrics.performance.requests.averageResponseTime},ms`,
    );
    lines.push(
      `${timestamp},error_rate,${metrics.performance.requests.errorRate},percentage`,
    );
    lines.push(
      `${timestamp},memory_usage,${metrics.performance.system.memory.percentage},percentage`,
    );
    lines.push(
      `${timestamp},cache_hit_rate,${metrics.performance.cache.hitRate},percentage`,
    );

    return lines.join("\n");
  }

  private exportToPrometheus(metrics: DashboardMetrics): string {
    const lines = [];
    const timestamp = Date.now();

    // Request metrics
    lines.push(`# HELP http_requests_total Total number of HTTP requests`);
    lines.push(`# TYPE http_requests_total counter`);
    lines.push(
      `http_requests_total ${metrics.performance.requests.total} ${timestamp}`,
    );

    lines.push(
      `# HELP http_request_duration_seconds Average HTTP request duration`,
    );
    lines.push(`# TYPE http_request_duration_seconds gauge`);
    lines.push(
      `http_request_duration_seconds ${metrics.performance.requests.averageResponseTime / 1000} ${timestamp}`,
    );

    lines.push(`# HELP http_requests_per_second Current requests per second`);
    lines.push(`# TYPE http_requests_per_second gauge`);
    lines.push(
      `http_requests_per_second ${metrics.performance.requests.rps} ${timestamp}`,
    );

    // Memory metrics
    lines.push(`# HELP memory_usage_percentage Memory usage percentage`);
    lines.push(`# TYPE memory_usage_percentage gauge`);
    lines.push(
      `memory_usage_percentage ${metrics.performance.system.memory.percentage} ${timestamp}`,
    );

    // Cache metrics
    lines.push(`# HELP cache_hit_rate Cache hit rate`);
    lines.push(`# TYPE cache_hit_rate gauge`);
    lines.push(
      `cache_hit_rate ${metrics.performance.cache.hitRate} ${timestamp}`,
    );

    return lines.join("\n");
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a metrics dashboard instance
 */
export function createMetricsDashboard(
  performanceMonitor: PerformanceMonitor,
  databaseMonitor: DatabasePerformanceMonitor,
  cacheManager: CacheManager,
): MetricsDashboard {
  return new MetricsDashboard(
    performanceMonitor,
    databaseMonitor,
    cacheManager,
  );
}
