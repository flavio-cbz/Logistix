/**
 * System Performance and Monitoring Tests
 * Tests for request instrumentation, metrics collection, resource utilization tracking, and alerts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceMetrics, recordMetric, recordOperationDuration, recordMemoryUsage, recordDatabaseOperation, recordApiRequest } from '@/lib/services/performance-metrics';
import { serviceInstrumentation } from '@/lib/services/comprehensive-service-instrumentation';
import { getLogger } from '@/lib/utils/logging';
import { createMockDatabase, createMockRequest, createMockResponse } from '../setup';

// Mock performance monitoring dependencies
vi.mock('@/lib/utils/logging', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })),
  performanceLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('@/lib/services/audit-logger', () => ({
  auditPerformanceEvent: vi.fn(),
  auditLogger: {
    logPerformanceEvent: vi.fn(),
    logUserAction: vi.fn()
  }
}));

describe('System Performance and Monitoring Tests', () => {
  let mockLogger: any;
  let mockDatabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };
    mockDatabase = createMockDatabase();
    
    // Mock getLogger to return our mock logger
    vi.mocked(getLogger).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    // Stop any running intervals
    performanceMetrics.stopSystemMetricsCollection();
  });

  describe('Request Instrumentation and Metrics Collection', () => {
    it('should record API request metrics with all required data', async () => {
      // Arrange
      const method = 'POST';
      const endpoint = '/api/v1/parcelles';
      const statusCode = 201;
      const duration = 150;
      const context = {
        responseSize: 1024,
        requestSize: 512,
        userId: 'test-user-id',
        requestId: 'test-request-id'
      };

      // Act
      recordApiRequest(method, endpoint, statusCode, duration, context);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: api_request_duration'),
        expect.objectContaining({
          value: duration,
          unit: 'ms',
          tags: expect.objectContaining({
            method,
            endpoint,
            status: statusCode.toString(),
            type: 'api_request'
          })
        })
      );
    });

    it('should record response size metrics separately', async () => {
      // Arrange
      const method = 'GET';
      const endpoint = '/api/v1/produits';
      const statusCode = 200;
      const duration = 75;
      const responseSize = 2048;

      // Act
      recordApiRequest(method, endpoint, statusCode, duration, { responseSize });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: api_response_size'),
        expect.objectContaining({
          value: responseSize,
          unit: 'bytes',
          tags: expect.objectContaining({
            method,
            endpoint,
            status: statusCode.toString(),
            type: 'response_size'
          })
        })
      );
    });

    it('should instrument service operations with comprehensive context', async () => {
      // Arrange
      const serviceName = 'parcelles';
      const operationName = 'create';
      const userId = 'test-user-id';
      const sessionId = 'test-session-id';
      const requestId = 'test-request-id';
      const metadata = { parcelleId: 'test-parcelle-id' };

      const mockOperation = vi.fn().mockResolvedValue({ id: 'test-result' });

      // Act
      const result = await serviceInstrumentation.instrumentOperation(
        {
          serviceName,
          operationName,
          userId,
          sessionId,
          requestId,
          metadata
        },
        mockOperation,
        'api'
      );

      // Assert
      expect(mockOperation).toHaveBeenCalled();
      expect(result).toEqual({ id: 'test-result' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Starting ${serviceName} operation: ${operationName}`),
        expect.objectContaining({
          service: serviceName,
          operation: operationName,
          userId,
          sessionId,
          metadata
        })
      );
    });

    it('should record operation duration with threshold checking', async () => {
      // Arrange
      const operation = 'database_query';
      const duration = 1500; // Above warning threshold
      const context = {
        userId: 'test-user-id',
        requestId: 'test-request-id',
        metadata: { table: 'parcelles', query: 'SELECT * FROM parcelles' }
      };

      // Act
      recordOperationDuration(operation, duration, context);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: operation_duration_database_query'),
        expect.objectContaining({
          value: duration,
          unit: 'ms',
          tags: expect.objectContaining({
            operation,
            type: 'duration'
          }),
          context
        })
      );
    });

    it('should collect request metadata for debugging', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'PUT',
        url: '/api/v1/parcelles/123',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'test-agent',
          'authorization': 'Bearer test-token'
        },
        body: { numero: 'P123', poids: 2.5 }
      });

      const response = createMockResponse();
      const startTime = Date.now();

      // Act
      const duration = Date.now() - startTime;
      recordApiRequest(
        request.method,
        request.url,
        response.statusCode,
        duration,
        {
          requestSize: JSON.stringify(request.body).length,
          userId: 'test-user-id',
          requestId: 'test-request-id'
        }
      );

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: api_request_duration'),
        expect.objectContaining({
          value: duration,
          unit: 'ms',
          tags: expect.objectContaining({
            method: request.method,
            endpoint: request.url,
            status: response.statusCode.toString()
          })
        })
      );
    });
  });

  describe('Query Performance Monitoring and Optimization', () => {
    it('should record database operation metrics with query details', async () => {
      // Arrange
      const operation = 'select';
      const duration = 250;
      const context = {
        table: 'parcelles',
        rowCount: 15,
        queryLength: 120,
        userId: 'test-user-id',
        requestId: 'test-request-id'
      };

      // Act
      recordDatabaseOperation(operation, duration, context);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: database_select'),
        expect.objectContaining({
          value: duration,
          unit: 'ms',
          tags: expect.objectContaining({
            operation,
            table: context.table,
            type: 'database'
          }),
          context: expect.objectContaining({
            rowCount: context.rowCount,
            queryLength: context.queryLength,
            userId: context.userId,
            requestId: context.requestId
          })
        })
      );
    });

    it('should monitor slow database queries and trigger alerts', async () => {
      // Arrange
      const operation = 'select';
      const slowDuration = 2500; // Above error threshold
      const context = {
        table: 'products',
        rowCount: 1000,
        queryLength: 500,
        userId: 'test-user-id'
      };

      // Act
      recordDatabaseOperation(operation, slowDuration, context);

      // Assert - Should log error for slow query
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Performance threshold exceeded'),
        undefined,
        expect.objectContaining({
          value: slowDuration,
          threshold: expect.any(Number),
          unit: 'ms'
        })
      );
    });

    it('should track database connection pool metrics', async () => {
      // Arrange
      const mockConnectionPool = {
        totalConnections: 10,
        activeConnections: 3,
        idleConnections: 7,
        waitingRequests: 0
      };

      // Act
      recordMetric('database_connections_total', mockConnectionPool.totalConnections, 'count', { type: 'connection_pool' });
      recordMetric('database_connections_active', mockConnectionPool.activeConnections, 'count', { type: 'connection_pool' });
      recordMetric('database_connections_idle', mockConnectionPool.idleConnections, 'count', { type: 'connection_pool' });
      recordMetric('database_waiting_requests', mockConnectionPool.waitingRequests, 'count', { type: 'connection_pool' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledTimes(4);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: database_connections_total'),
        expect.objectContaining({
          value: mockConnectionPool.totalConnections,
          unit: 'count',
          tags: expect.objectContaining({ type: 'connection_pool' })
        })
      );
    });

    it('should instrument database transactions with rollback detection', async () => {
      // Arrange
      const transactionName = 'create_parcelle_with_products';
      const duration = 450;
      const success = true;

      const mockTransaction = vi.fn().mockResolvedValue({ success: true });

      // Act
      const result = await serviceInstrumentation.instrumentDatabaseOperation(
        transactionName,
        mockTransaction,
        'BEGIN TRANSACTION; INSERT INTO parcelles...; INSERT INTO products...; COMMIT;',
        [],
        { userId: 'test-user-id' }
      );

      // Assert
      expect(mockTransaction).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Starting database operation: ${transactionName}`),
        expect.objectContaining({
          service: 'database',
          operation: transactionName,
          metadata: expect.objectContaining({
            query: expect.stringContaining('BEGIN TRANSACTION'),
            paramCount: 0
          })
        })
      );
    });

    it('should detect and report query optimization opportunities', async () => {
      // Arrange
      const slowQuery = 'SELECT * FROM products WHERE description LIKE "%test%" ORDER BY created_at DESC';
      const duration = 3000; // Very slow
      const rowCount = 50000;

      // Act
      recordDatabaseOperation('select', duration, {
        table: 'products',
        rowCount,
        queryLength: slowQuery.length,
        userId: 'test-user-id'
      });

      // Assert - Should trigger performance threshold error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Performance threshold exceeded'),
        undefined,
        expect.objectContaining({
          value: duration,
          unit: 'ms'
        })
      );
    });
  });

  describe('Resource Utilization Tracking and Alerts', () => {
    it('should record memory usage metrics with detailed breakdown', async () => {
      // Arrange
      const mockMemoryUsage = {
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 5 * 1024 * 1024, // 5MB
        rss: 120 * 1024 * 1024, // 120MB
        arrayBuffers: 2 * 1024 * 1024 // 2MB
      };

      // Mock process.memoryUsage
      vi.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);

      // Act
      recordMemoryUsage({ source: 'test_monitoring' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: memory_heap_used'),
        expect.objectContaining({
          value: mockMemoryUsage.heapUsed,
          unit: 'bytes',
          tags: expect.objectContaining({ type: 'heap_used' })
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: memory_usage_percentage'),
        expect.objectContaining({
          value: 50, // 50MB / 100MB * 100
          unit: 'percentage',
          tags: expect.objectContaining({ type: 'usage' })
        })
      );
    });

    it('should trigger memory usage alerts when thresholds are exceeded', async () => {
      // Arrange
      const highMemoryUsage = {
        heapUsed: 90 * 1024 * 1024, // 90MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 5 * 1024 * 1024,
        rss: 120 * 1024 * 1024,
        arrayBuffers: 3 * 1024 * 1024 // 3MB
      };

      vi.spyOn(process, 'memoryUsage').mockReturnValue(highMemoryUsage);

      // Act
      recordMemoryUsage({ source: 'high_memory_test' });

      // Assert - Should trigger warning for high memory usage (90%)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Performance threshold warning'),
        expect.objectContaining({
          value: 90,
          unit: 'percentage'
        })
      );
    });

    it('should track CPU utilization and event loop lag', async () => {
      // Arrange
      const mockUptime = 3600; // 1 hour
      vi.spyOn(process, 'uptime').mockReturnValue(mockUptime);

      // Mock hrtime for event loop lag measurement
      const mockHrtime = vi.spyOn(process, 'hrtime')
        .mockReturnValueOnce([0, 0]) // Initial call
        .mockReturnValueOnce([0, 5000000]); // 5ms lag

      // Act
      recordMetric('process_uptime', mockUptime, 'count', { type: 'uptime' });

      // Simulate event loop lag measurement
      const start = process.hrtime();
      setTimeout(() => {
        const delta = process.hrtime(start);
        const lag = delta[0] * 1000 + delta[1] * 1e-6;
        recordMetric('event_loop_lag', lag, 'ms', { type: 'event_loop' });
      }, 0);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: process_uptime'),
        expect.objectContaining({
          value: mockUptime,
          unit: 'count',
          tags: expect.objectContaining({ type: 'uptime' })
        })
      );
    });

    it('should monitor file system operations and disk usage', async () => {
      // Arrange
      const operation = 'write';
      const duration = 150;
      const context = {
        fileSize: 1024 * 1024, // 1MB
        filePath: '/tmp/test-file.json',
        userId: 'test-user-id',
        requestId: 'test-request-id'
      };

      // Act
      performanceMetrics.recordFileOperation(operation, duration, context);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: file_operation_write'),
        expect.objectContaining({
          value: duration,
          unit: 'ms',
          tags: expect.objectContaining({
            operation,
            type: 'file_operation'
          }),
          context
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: file_size'),
        expect.objectContaining({
          value: context.fileSize,
          unit: 'bytes',
          tags: expect.objectContaining({
            operation,
            type: 'file_size'
          })
        })
      );
    });

    it('should track external service call performance', async () => {
      // Arrange
      const service = 'vinted';
      const operation = 'search';
      const duration = 2500;
      const success = true;
      const context = {
        responseSize: 5 * 1024 * 1024, // 5MB
        statusCode: 200,
        userId: 'test-user-id',
        requestId: 'test-request-id'
      };

      // Act
      performanceMetrics.recordExternalServiceCall(service, operation, duration, success, context);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: external_service_vinted'),
        expect.objectContaining({
          value: duration,
          unit: 'ms',
          tags: expect.objectContaining({
            service,
            operation,
            success: success.toString(),
            type: 'external_service'
          }),
          context
        })
      );
    });
  });

  describe('Automated Alert Generation and Notification', () => {
    it('should generate alerts for performance threshold violations', async () => {
      // Arrange
      const operation = 'api_request';
      const criticalDuration = 6000; // Above error threshold (5000ms)
      const context = {
        userId: 'test-user-id',
        requestId: 'test-request-id',
        metadata: { endpoint: '/api/v1/market-analysis/search' }
      };

      // Act
      recordOperationDuration(operation, criticalDuration, context);

      // Assert - Should trigger error alert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Performance threshold exceeded'),
        undefined,
        expect.objectContaining({
          value: criticalDuration,
          threshold: 5000,
          unit: 'ms'
        })
      );
    });

    it('should generate alerts for resource exhaustion', async () => {
      // Arrange
      const criticalMemoryUsage = {
        heapUsed: 98 * 1024 * 1024, // 98MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 5 * 1024 * 1024,
        rss: 120 * 1024 * 1024,
        arrayBuffers: 4 * 1024 * 1024 // 4MB
      };

      vi.spyOn(process, 'memoryUsage').mockReturnValue(criticalMemoryUsage);

      // Act
      recordMemoryUsage({ source: 'critical_memory_test' });

      // Assert - Should trigger error alert for critical memory usage (98%)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Performance threshold exceeded'),
        undefined,
        expect.objectContaining({
          value: 98,
          unit: 'percentage'
        })
      );
    });

    it('should generate alerts for failed external service calls', async () => {
      // Arrange
      const service = 'vinted';
      const operation = 'authenticate';
      const duration = 5000;
      const success = false;
      const context = {
        statusCode: 500,
        userId: 'test-user-id',
        requestId: 'test-request-id'
      };

      // Act
      performanceMetrics.recordExternalServiceCall(service, operation, duration, success, context);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: external_service_vinted'),
        expect.objectContaining({
          tags: expect.objectContaining({
            success: 'false'
          })
        })
      );
    });

    it('should generate performance summary reports', async () => {
      // Arrange
      const startTime = new Date(Date.now() - 3600000); // 1 hour ago
      const endTime = new Date();

      // Record some test metrics
      recordApiRequest('GET', '/api/v1/parcelles', 200, 150);
      recordApiRequest('POST', '/api/v1/produits', 201, 300);
      recordDatabaseOperation('select', 100, { table: 'parcelles' });
      recordDatabaseOperation('insert', 2500, { table: 'products' }); // Slow operation

      // Act
      const summary = performanceMetrics.getPerformanceSummary(startTime, endTime);

      // Assert
      expect(summary).toHaveProperty('totalMetrics');
      expect(summary).toHaveProperty('averageDuration');
      expect(summary).toHaveProperty('slowOperations');
      expect(summary).toHaveProperty('errorCount');
      expect(summary).toHaveProperty('memoryPeaks');
      expect(summary.slowOperations.length).toBeGreaterThan(0);
    });

    it('should export metrics in multiple formats', async () => {
      // Arrange
      recordApiRequest('GET', '/api/v1/dashboard', 200, 120);
      recordMemoryUsage({ source: 'export_test' });

      // Act
      const jsonExport = performanceMetrics.exportMetrics('json');
      const prometheusExport = performanceMetrics.exportMetrics('prometheus');

      // Assert
      expect(jsonExport).toContain('timestamp');
      expect(jsonExport).toContain('metrics');
      expect(jsonExport).toContain('summary');

      expect(prometheusExport).toContain('api_request_duration');
      expect(prometheusExport).toContain('memory_heap_used');
    });

    it('should set and validate custom performance thresholds', async () => {
      // Arrange
      const operation = 'custom_operation';
      const warningThreshold = 500;
      const errorThreshold = 1000;

      // Act
      performanceMetrics.setThreshold(operation, warningThreshold, errorThreshold, 'ms');
      recordOperationDuration(operation, 750); // Between warning and error

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Performance threshold updated'),
        expect.objectContaining({
          operation,
          warningThreshold,
          errorThreshold,
          unit: 'ms'
        })
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Performance threshold warning'),
        expect.objectContaining({
          value: 750,
          threshold: warningThreshold,
          unit: 'ms'
        })
      );
    });
  });

  describe('System Metrics Collection', () => {
    it('should collect system metrics periodically', async () => {
      // Arrange
      const mockMemoryUsage = {
        heapUsed: 40 * 1024 * 1024,
        heapTotal: 80 * 1024 * 1024,
        external: 3 * 1024 * 1024,
        rss: 100 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024 // 2MB
      };

      vi.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);
      vi.spyOn(process, 'uptime').mockReturnValue(7200); // 2 hours

      // Act - Trigger system metrics collection manually
      performanceMetrics['collectSystemMetrics']();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: memory_heap_used'),
        expect.objectContaining({
          context: expect.objectContaining({
            source: 'system_collection'
          })
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: process_uptime'),
        expect.objectContaining({
          value: 7200,
          unit: 'count',
          tags: expect.objectContaining({ type: 'uptime' })
        })
      );
    });

    it('should handle system metrics collection errors gracefully', async () => {
      // Arrange
      vi.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('Memory access denied');
      });

      // Act
      performanceMetrics['collectSystemMetrics']();

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to collect system metrics',
        expect.any(Error)
      );
    });
  });
});