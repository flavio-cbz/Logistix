/**
 * Performance Metrics Collection Service
 * Comprehensive performance monitoring and metrics collection
 */

import { performanceLogger, getLogger } from '@/lib/utils/logging';
import { auditPerformanceEvent } from '@/lib/services/audit-logger';

interface MetricData {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'ratio';
  tags?: Record<string, string>;
  timestamp: Date;
  context?: Record<string, any>;
}

interface PerformanceThreshold {
  operation: string;
  warningThreshold: number;
  errorThreshold: number;
  unit: 'ms' | 'bytes' | 'count';
}

interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
  timestamp: Date;
}

class PerformanceMetricsService {
  private logger = getLogger('PERFORMANCE_METRICS');
  private metrics: MetricData[] = [];
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private systemMetricsInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultThresholds();
    this.startSystemMetricsCollection();
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeDefaultThresholds(): void {
    const defaultThresholds: PerformanceThreshold[] = [
      { operation: 'api_request', warningThreshold: 1000, errorThreshold: 5000, unit: 'ms' },
      { operation: 'database_query', warningThreshold: 500, errorThreshold: 2000, unit: 'ms' },
      { operation: 'file_operation', warningThreshold: 200, errorThreshold: 1000, unit: 'ms' },
      { operation: 'external_api', warningThreshold: 2000, errorThreshold: 10000, unit: 'ms' },
      { operation: 'memory_usage', warningThreshold: 80, errorThreshold: 95, unit: 'count' },
      { operation: 'response_size', warningThreshold: 1048576, errorThreshold: 10485760, unit: 'bytes' } // 1MB, 10MB
    ];

    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.operation, threshold);
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: MetricData['unit'] = 'ms',
    tags?: Record<string, string>,
    context?: Record<string, any>
  ): void {
    const metric: MetricData = {
      name,
      value,
      unit,
      tags,
      timestamp: new Date(),
      context
    };

    this.metrics.push(metric);
    
    // Log the metric
    this.logger.info(`Metric recorded: ${name}`, {
      value,
      unit,
      tags,
      context,
      timestamp: metric.timestamp.toISOString()
    });

    // Check against thresholds
    this.checkThreshold(metric);

    // Keep only recent metrics (last 1000)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Record operation duration with automatic threshold checking
   */
  recordOperationDuration(
    operation: string,
    duration: number,
    context?: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    this.recordMetric(
      `operation_duration_${operation}`,
      duration,
      'ms',
      {
        operation,
        type: 'duration'
      },
      context
    );

    // Check performance threshold and log to audit if needed
    const threshold = this.thresholds.get(operation) || this.thresholds.get('api_request');
    if (threshold && duration > threshold.warningThreshold) {
      auditPerformanceEvent(
        {
          operation,
          duration,
          threshold: threshold.warningThreshold,
          metadata: context?.metadata
        },
        {
          userId: context?.userId,
          sessionId: context?.sessionId,
          requestId: context?.requestId
        }
      );
    }
  }

  /**
   * Record memory usage metrics
   */
  recordMemoryUsage(context?: Record<string, any>): void {
    const memoryUsage = process.memoryUsage();
    
    this.recordMetric('memory_heap_used', memoryUsage.heapUsed, 'bytes', { type: 'heap_used' }, context);
    this.recordMetric('memory_heap_total', memoryUsage.heapTotal, 'bytes', { type: 'heap_total' }, context);
    this.recordMetric('memory_external', memoryUsage.external, 'bytes', { type: 'external' }, context);
    this.recordMetric('memory_rss', memoryUsage.rss, 'bytes', { type: 'rss' }, context);

    // Calculate memory usage percentage
    const usagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    this.recordMetric('memory_usage_percentage', usagePercentage, 'percentage', { type: 'usage' }, context);
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(
    operation: 'select' | 'insert' | 'update' | 'delete' | 'transaction',
    duration: number,
    context?: {
      table?: string;
      rowCount?: number;
      queryLength?: number;
      userId?: string;
      requestId?: string;
    }
  ): void {
    this.recordMetric(
      `database_${operation}`,
      duration,
      'ms',
      {
        operation,
        table: context?.table || 'unknown',
        type: 'database'
      },
      {
        rowCount: context?.rowCount,
        queryLength: context?.queryLength,
        userId: context?.userId,
        requestId: context?.requestId
      }
    );
  }

  /**
   * Record API request metrics
   */
  recordApiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: {
      responseSize?: number;
      requestSize?: number;
      userId?: string;
      requestId?: string;
    }
  ): void {
    this.recordMetric(
      'api_request_duration',
      duration,
      'ms',
      {
        method,
        endpoint,
        status: statusCode.toString(),
        type: 'api_request'
      },
      context
    );

    if (context?.responseSize) {
      this.recordMetric(
        'api_response_size',
        context.responseSize,
        'bytes',
        {
          method,
          endpoint,
          status: statusCode.toString(),
          type: 'response_size'
        },
        context
      );
    }

    if (context?.requestSize) {
      this.recordMetric(
        'api_request_size',
        context.requestSize,
        'bytes',
        {
          method,
          endpoint,
          type: 'request_size'
        },
        context
      );
    }
  }

  /**
   * Record external service call metrics
   */
  recordExternalServiceCall(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    context?: {
      responseSize?: number;
      statusCode?: number;
      userId?: string;
      requestId?: string;
    }
  ): void {
    this.recordMetric(
      `external_service_${service}`,
      duration,
      'ms',
      {
        service,
        operation,
        success: success.toString(),
        type: 'external_service'
      },
      context
    );
  }

  /**
   * Record file operation metrics
   */
  recordFileOperation(
    operation: 'read' | 'write' | 'delete' | 'copy' | 'move',
    duration: number,
    context?: {
      fileSize?: number;
      filePath?: string;
      userId?: string;
      requestId?: string;
    }
  ): void {
    this.recordMetric(
      `file_operation_${operation}`,
      duration,
      'ms',
      {
        operation,
        type: 'file_operation'
      },
      context
    );

    if (context?.fileSize) {
      this.recordMetric(
        'file_size',
        context.fileSize,
        'bytes',
        {
          operation,
          type: 'file_size'
        },
        context
      );
    }
  }

  /**
   * Get performance summary for a time period
   */
  getPerformanceSummary(
    startTime: Date,
    endTime: Date = new Date()
  ): {
    totalMetrics: number;
    averageDuration: number;
    slowOperations: MetricData[];
    errorCount: number;
    memoryPeaks: MetricData[];
  } {
    const periodMetrics = this.metrics.filter(
      metric => metric.timestamp >= startTime && metric.timestamp <= endTime
    );

    const durationMetrics = periodMetrics.filter(
      metric => metric.unit === 'ms' && metric.name.includes('duration')
    );

    const averageDuration = durationMetrics.length > 0
      ? durationMetrics.reduce((sum, metric) => sum + metric.value, 0) / durationMetrics.length
      : 0;

    const slowOperations = durationMetrics.filter(metric => {
      const operationType = metric.tags?.operation || 'api_request';
      const threshold = this.thresholds.get(operationType);
      return threshold && metric.value > threshold.warningThreshold;
    });

    const memoryMetrics = periodMetrics.filter(
      metric => metric.name.includes('memory_usage_percentage')
    );

    const memoryPeaks = memoryMetrics.filter(metric => metric.value > 80);

    return {
      totalMetrics: periodMetrics.length,
      averageDuration,
      slowOperations,
      errorCount: periodMetrics.filter(metric => metric.tags?.success === 'false').length,
      memoryPeaks
    };
  }

  /**
   * Set custom performance threshold
   */
  setThreshold(operation: string, warningThreshold: number, errorThreshold: number, unit: 'ms' | 'bytes' | 'count'): void {
    this.thresholds.set(operation, {
      operation,
      warningThreshold,
      errorThreshold,
      unit
    });

    this.logger.info(`Performance threshold updated for ${operation}`, {
      operation,
      warningThreshold,
      errorThreshold,
      unit
    });
  }

  /**
   * Check metric against thresholds
   */
  private checkThreshold(metric: MetricData): void {
    const operationType = metric.tags?.operation || metric.name;
    const threshold = this.thresholds.get(operationType);

    if (!threshold || metric.unit !== threshold.unit) {
      return;
    }

    if (metric.value > threshold.errorThreshold) {
      this.logger.error(`Performance threshold exceeded: ${metric.name}`, undefined, {
        value: metric.value,
        threshold: threshold.errorThreshold,
        unit: metric.unit,
        tags: metric.tags,
        context: metric.context
      });
    } else if (metric.value > threshold.warningThreshold) {
      this.logger.warn(`Performance threshold warning: ${metric.name}`, {
        value: metric.value,
        threshold: threshold.warningThreshold,
        unit: metric.unit,
        tags: metric.tags,
        context: metric.context
      });
    }
  }

  /**
   * Start collecting system metrics periodically
   */
  private startSystemMetricsCollection(): void {
    // Collect system metrics every 30 seconds
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Initial collection
    this.collectSystemMetrics();
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    try {
      // Memory metrics
      this.recordMemoryUsage({ source: 'system_collection' });

      // Process uptime
      this.recordMetric('process_uptime', process.uptime(), 'count', { type: 'uptime' });

      // Event loop lag (if available)
      if (process.hrtime) {
        const start = process.hrtime();
        setImmediate(() => {
          const delta = process.hrtime(start);
          const lag = delta[0] * 1000 + delta[1] * 1e-6;
          this.recordMetric('event_loop_lag', lag, 'ms', { type: 'event_loop' });
        });
      }

    } catch (error) {
      this.logger.error('Failed to collect system metrics', error as Error);
    }
  }

  /**
   * Stop system metrics collection
   */
  stopSystemMetricsCollection(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
      this.systemMetricsInterval = undefined;
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusFormat();
    }

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics.slice(-100), // Last 100 metrics
      summary: this.getPerformanceSummary(new Date(Date.now() - 3600000)) // Last hour
    }, null, 2);
  }

  /**
   * Export metrics in Prometheus format
   */
  private exportPrometheusFormat(): string {
    const lines: string[] = [];
    const metricGroups = new Map<string, MetricData[]>();

    // Group metrics by name
    this.metrics.forEach(metric => {
      if (!metricGroups.has(metric.name)) {
        metricGroups.set(metric.name, []);
      }
      metricGroups.get(metric.name)!.push(metric);
    });

    // Convert to Prometheus format
    metricGroups.forEach((metrics, name) => {
      const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      
      metrics.forEach(metric => {
        const labels = metric.tags 
          ? Object.entries(metric.tags).map(([k, v]) => `${k}="${v}"`).join(',')
          : '';
        
        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${sanitizedName}${labelStr} ${metric.value} ${metric.timestamp.getTime()}`);
      });
    });

    return lines.join('\n');
  }
}

// Singleton instance
export const performanceMetrics = new PerformanceMetricsService();

// Convenience functions
export const recordMetric = performanceMetrics.recordMetric.bind(performanceMetrics);
export const recordOperationDuration = performanceMetrics.recordOperationDuration.bind(performanceMetrics);
export const recordMemoryUsage = performanceMetrics.recordMemoryUsage.bind(performanceMetrics);
export const recordDatabaseOperation = performanceMetrics.recordDatabaseOperation.bind(performanceMetrics);
export const recordApiRequest = performanceMetrics.recordApiRequest.bind(performanceMetrics);
export const recordExternalServiceCall = performanceMetrics.recordExternalServiceCall.bind(performanceMetrics);
export const recordFileOperation = performanceMetrics.recordFileOperation.bind(performanceMetrics);

// Performance monitoring decorator
export function monitorPerformance(
  operation: string,
  threshold?: number
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        recordOperationDuration(operation, duration, {
          metadata: {
            method: propertyName,
            service: target.constructor.name,
            success: true
          }
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        recordOperationDuration(operation, duration, {
          metadata: {
            method: propertyName,
            service: target.constructor.name,
            success: false,
            error: (error as Error).message
          }
        });

        throw error;
      }
    };

    return descriptor;
  };
}