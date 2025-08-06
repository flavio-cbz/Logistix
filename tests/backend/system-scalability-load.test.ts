/**
 * System Scalability and Load Tests
 * Tests for concurrent request handling, database connection scaling, memory optimization, and CPU utilization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceMetrics, recordMetric, recordApiRequest, recordDatabaseOperation } from '@/lib/services/performance-metrics';
import { serviceInstrumentation } from '@/lib/services/comprehensive-service-instrumentation';
import { getLogger } from '@/lib/utils/logging';
import { createMockDatabase, createMockRequest, createMockResponse } from '../setup';

// Mock dependencies
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

// Mock database connection pool
const mockConnectionPool = {
  totalConnections: 10,
  activeConnections: 0,
  idleConnections: 10,
  waitingRequests: 0,
  acquireConnection: vi.fn(),
  releaseConnection: vi.fn(),
  getStats: vi.fn()
};

describe('System Scalability and Load Tests', () => {
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
    
    vi.mocked(getLogger).mockReturnValue(mockLogger);
    
    // Reset connection pool state
    mockConnectionPool.activeConnections = 0;
    mockConnectionPool.idleConnections = 10;
    mockConnectionPool.waitingRequests = 0;
  });

  afterEach(() => {
    performanceMetrics.stopSystemMetricsCollection();
  });

  describe('Concurrent Request Handling Capabilities', () => {
    it('should handle multiple concurrent API requests without degradation', async () => {
      // Arrange
      const concurrentRequests = 50;
      const requests: Promise<any>[] = [];
      const startTime = Date.now();

      const mockApiOperation = vi.fn().mockImplementation(async (requestId: string) => {
        // Simulate API processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        return { id: requestId, processed: true };
      });

      // Act - Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const requestPromise = serviceInstrumentation.instrumentOperation(
          {
            serviceName: 'api',
            operationName: 'concurrent_test',
            requestId: `req-${i}`,
            metadata: { requestIndex: i }
          },
          () => mockApiOperation(`req-${i}`),
          'api'
        );
        requests.push(requestPromise);
      }

      // Wait for all requests to complete
      const results = await Promise.all(requests);
      const totalDuration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(result => result.processed)).toBe(true);
      expect(mockApiOperation).toHaveBeenCalledTimes(concurrentRequests);
      
      // Verify that concurrent processing was efficient (should complete in reasonable time)
      expect(totalDuration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify logging for concurrent operations
      expect(mockLogger.info).toHaveBeenCalledTimes(concurrentRequests * 2); // Start and completion logs
    });

    it('should maintain response times under load', async () => {
      // Arrange
      const loadTestRequests = 100;
      const maxAcceptableResponseTime = 1000; // 1 second
      const responseTimes: number[] = [];

      const mockLoadTestOperation = vi.fn().mockImplementation(async () => {
        const processingTime = Math.random() * 200 + 100; // 100-300ms
        await new Promise(resolve => setTimeout(resolve, processingTime));
        return { success: true };
      });

      // Act - Execute load test
      const loadTestPromises = Array.from({ length: loadTestRequests }, async (_, index) => {
        const startTime = Date.now();
        
        await serviceInstrumentation.instrumentOperation(
          {
            serviceName: 'api',
            operationName: 'load_test',
            requestId: `load-${index}`,
            metadata: { loadTestIndex: index }
          },
          mockLoadTestOperation,
          'api'
        );
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        // Record API request metrics
        recordApiRequest('GET', '/api/v1/load-test', 200, responseTime, {
          requestId: `load-${index}`
        });
        
        return responseTime;
      });

      const allResponseTimes = await Promise.all(loadTestPromises);

      // Assert
      const averageResponseTime = allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length;
      const maxResponseTime = Math.max(...allResponseTimes);
      const p95ResponseTime = allResponseTimes.sort((a, b) => a - b)[Math.floor(allResponseTimes.length * 0.95)];

      expect(averageResponseTime).toBeLessThan(maxAcceptableResponseTime);
      expect(maxResponseTime).toBeLessThan(maxAcceptableResponseTime * 2); // Allow some variance
      expect(p95ResponseTime).toBeLessThan(maxAcceptableResponseTime * 1.5);

      // Verify metrics were recorded
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Metric recorded: api_request_duration'),
        expect.objectContaining({
          unit: 'ms',
          tags: expect.objectContaining({
            method: 'GET',
            endpoint: '/api/v1/load-test',
            status: '200'
          })
        })
      );
    });

    it('should handle request spikes without failures', async () => {
      // Arrange
      const spikeRequests = 200;
      const spikeWindow = 1000; // 1 second
      const batchSize = 20;
      const failures: Error[] = [];

      const mockSpikeOperation = vi.fn().mockImplementation(async (requestId: string) => {
        // Simulate varying processing times
        const processingTime = Math.random() * 150 + 50;
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        // Simulate occasional failures under high load
        if (Math.random() < 0.02) { // 2% failure rate
          throw new Error(`Simulated failure for ${requestId}`);
        }
        
        return { id: requestId, timestamp: Date.now() };
      });

      // Act - Create request spike in batches
      const spikeBatches: Promise<any>[] = [];
      
      for (let batch = 0; batch < spikeRequests / batchSize; batch++) {
        const batchPromises = Array.from({ length: batchSize }, async (_, index) => {
          const requestId = `spike-${batch}-${index}`;
          
          try {
            return await serviceInstrumentation.instrumentOperation(
              {
                serviceName: 'api',
                operationName: 'spike_test',
                requestId,
                metadata: { batch, index }
              },
              () => mockSpikeOperation(requestId),
              'api'
            );
          } catch (error) {
            failures.push(error as Error);
            return null;
          }
        });
        
        spikeBatches.push(Promise.all(batchPromises));
        
        // Small delay between batches to simulate realistic spike pattern
        if (batch < (spikeRequests / batchSize) - 1) {
          await new Promise(resolve => setTimeout(resolve, spikeWindow / (spikeRequests / batchSize)));
        }
      }

      const allBatchResults = await Promise.all(spikeBatches);
      const allResults = allBatchResults.flat().filter(result => result !== null);

      // Assert
      const successRate = (allResults.length / spikeRequests) * 100;
      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
      expect(failures.length).toBeLessThan(spikeRequests * 0.05); // Less than 5% failures
      
      // Verify system handled the spike
      expect(allResults.length).toBeGreaterThan(spikeRequests * 0.95);
    });

    it('should implement proper request queuing and throttling', async () => {
      // Arrange
      const maxConcurrentRequests = 10;
      const totalRequests = 50;
      let activeRequests = 0;
      let maxActiveRequests = 0;
      const requestQueue: string[] = [];

      const mockThrottledOperation = vi.fn().mockImplementation(async (requestId: string) => {
        // Track active requests
        activeRequests++;
        maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
        
        // Simulate request processing
        await new Promise(resolve => setTimeout(resolve, 200));
        
        activeRequests--;
        return { id: requestId, processed: true };
      });

      // Act - Create requests that should be throttled
      const throttledPromises = Array.from({ length: totalRequests }, async (_, index) => {
        const requestId = `throttled-${index}`;
        
        // Simple throttling simulation
        if (activeRequests >= maxConcurrentRequests) {
          requestQueue.push(requestId);
          await new Promise(resolve => setTimeout(resolve, 50)); // Wait before retry
        }
        
        return serviceInstrumentation.instrumentOperation(
          {
            serviceName: 'api',
            operationName: 'throttled_test',
            requestId,
            metadata: { queuePosition: requestQueue.length }
          },
          () => mockThrottledOperation(requestId),
          'api'
        );
      });

      const results = await Promise.all(throttledPromises);

      // Assert
      expect(results).toHaveLength(totalRequests);
      expect(results.every(result => result.processed)).toBe(true);
      expect(maxActiveRequests).toBeLessThanOrEqual(maxConcurrentRequests * 1.5); // Allow some variance
      
      // Record throttling metrics
      recordMetric('request_throttling_max_active', maxActiveRequests, 'count', { type: 'throttling' });
      recordMetric('request_throttling_queue_size', requestQueue.length, 'count', { type: 'throttling' });
    });
  });

  describe('Database Connection Scaling Under Load', () => {
    it('should scale database connections based on demand', async () => {
      // Arrange
      const concurrentDbOperations = 25;
      const connectionPoolStats: any[] = [];

      const mockDbOperation = vi.fn().mockImplementation(async (operationId: string) => {
        // Simulate acquiring connection
        mockConnectionPool.activeConnections++;
        mockConnectionPool.idleConnections--;
        
        // Record pool stats
        connectionPoolStats.push({
          timestamp: Date.now(),
          active: mockConnectionPool.activeConnections,
          idle: mockConnectionPool.idleConnections,
          waiting: mockConnectionPool.waitingRequests
        });
        
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));
        
        // Release connection
        mockConnectionPool.activeConnections--;
        mockConnectionPool.idleConnections++;
        
        return { operationId, completed: true };
      });

      // Act - Execute concurrent database operations
      const dbOperationPromises = Array.from({ length: concurrentDbOperations }, async (_, index) => {
        const operationId = `db-op-${index}`;
        
        return serviceInstrumentation.instrumentDatabaseOperation(
          'concurrent_query',
          () => mockDbOperation(operationId),
          `SELECT * FROM test_table WHERE id = ${index}`,
          [index],
          { requestId: operationId }
        );
      });

      const results = await Promise.all(dbOperationPromises);

      // Assert
      expect(results).toHaveLength(concurrentDbOperations);
      expect(results.every(result => result.completed)).toBe(true);
      
      // Verify connection pool scaling
      const maxActiveConnections = Math.max(...connectionPoolStats.map(stat => stat.active));
      expect(maxActiveConnections).toBeGreaterThan(1);
      expect(maxActiveConnections).toBeLessThanOrEqual(mockConnectionPool.totalConnections);
      
      // Record connection pool metrics
      recordMetric('db_connections_max_active', maxActiveConnections, 'count', { type: 'connection_scaling' });
      recordMetric('db_operations_concurrent', concurrentDbOperations, 'count', { type: 'connection_scaling' });
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      // Arrange
      const excessiveOperations = 15; // More than pool size
      mockConnectionPool.totalConnections = 10;
      let waitingRequests = 0;
      let connectionTimeouts = 0;

      const mockExhaustionOperation = vi.fn().mockImplementation(async (operationId: string) => {
        // Check if connections are available
        if (mockConnectionPool.activeConnections >= mockConnectionPool.totalConnections) {
          waitingRequests++;
          mockConnectionPool.waitingRequests = waitingRequests;
          
          // Simulate waiting for connection with timeout
          const waitTime = Math.random() * 1000 + 500;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          if (waitTime > 800) {
            connectionTimeouts++;
            throw new Error(`Connection timeout for ${operationId}`);
          }
        }
        
        mockConnectionPool.activeConnections++;
        mockConnectionPool.idleConnections--;
        
        // Simulate long-running operation
        await new Promise(resolve => setTimeout(resolve, 400));
        
        mockConnectionPool.activeConnections--;
        mockConnectionPool.idleConnections++;
        waitingRequests = Math.max(0, waitingRequests - 1);
        mockConnectionPool.waitingRequests = waitingRequests;
        
        return { operationId, completed: true };
      });

      // Act
      const exhaustionPromises = Array.from({ length: excessiveOperations }, async (_, index) => {
        const operationId = `exhaustion-${index}`;
        
        try {
          return await serviceInstrumentation.instrumentDatabaseOperation(
            'exhaustion_test',
            () => mockExhaustionOperation(operationId),
            'SELECT * FROM large_table',
            [],
            { requestId: operationId }
          );
        } catch (error) {
          return { operationId, error: (error as Error).message };
        }
      });

      const results = await Promise.all(exhaustionPromises);

      // Assert
      const successfulOperations = results.filter(result => !result.error);
      const failedOperations = results.filter(result => result.error);
      
      expect(successfulOperations.length).toBeGreaterThan(0);
      expect(failedOperations.length).toBeLessThan(excessiveOperations * 0.5); // Less than 50% failures
      
      // Record exhaustion metrics
      recordMetric('db_connection_timeouts', connectionTimeouts, 'count', { type: 'connection_exhaustion' });
      recordMetric('db_waiting_requests_peak', Math.max(waitingRequests, 0), 'count', { type: 'connection_exhaustion' });
    });

    it('should optimize connection pool size based on usage patterns', async () => {
      // Arrange
      const testDuration = 2000; // 2 seconds
      const operationInterval = 100; // New operation every 100ms
      const poolMetrics: any[] = [];
      let operationCount = 0;

      const mockOptimizationOperation = vi.fn().mockImplementation(async () => {
        mockConnectionPool.activeConnections++;
        mockConnectionPool.idleConnections--;
        
        // Record metrics every operation
        poolMetrics.push({
          timestamp: Date.now(),
          active: mockConnectionPool.activeConnections,
          idle: mockConnectionPool.idleConnections,
          utilization: (mockConnectionPool.activeConnections / mockConnectionPool.totalConnections) * 100
        });
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
        
        mockConnectionPool.activeConnections--;
        mockConnectionPool.idleConnections++;
        
        return { operationId: ++operationCount };
      });

      // Act - Run operations for test duration
      const startTime = Date.now();
      const operations: Promise<any>[] = [];
      
      while (Date.now() - startTime < testDuration) {
        operations.push(
          serviceInstrumentation.instrumentDatabaseOperation(
            'optimization_test',
            mockOptimizationOperation,
            'SELECT COUNT(*) FROM metrics',
            [],
            { requestId: `opt-${operationCount}` }
          )
        );
        
        await new Promise(resolve => setTimeout(resolve, operationInterval));
      }

      await Promise.all(operations);

      // Assert - Analyze pool utilization patterns
      const avgUtilization = poolMetrics.reduce((sum, metric) => sum + metric.utilization, 0) / poolMetrics.length;
      const maxUtilization = Math.max(...poolMetrics.map(metric => metric.utilization));
      const minUtilization = Math.min(...poolMetrics.map(metric => metric.utilization));

      expect(avgUtilization).toBeGreaterThan(0);
      expect(maxUtilization).toBeLessThanOrEqual(100);
      
      // Record optimization metrics
      recordMetric('db_pool_utilization_avg', avgUtilization, 'percentage', { type: 'pool_optimization' });
      recordMetric('db_pool_utilization_max', maxUtilization, 'percentage', { type: 'pool_optimization' });
      recordMetric('db_pool_utilization_min', minUtilization, 'percentage', { type: 'pool_optimization' });
      
      // Suggest optimal pool size based on utilization
      const suggestedPoolSize = Math.ceil(mockConnectionPool.totalConnections * (maxUtilization / 100) * 1.2);
      recordMetric('db_pool_suggested_size', suggestedPoolSize, 'count', { type: 'pool_optimization' });
    });

    it('should handle database transaction scaling under load', async () => {
      // Arrange
      const concurrentTransactions = 20;
      const transactionMetrics: any[] = [];

      const mockTransactionOperation = vi.fn().mockImplementation(async (transactionId: string) => {
        const startTime = Date.now();
        
        // Simulate transaction with multiple operations
        mockConnectionPool.activeConnections++;
        mockConnectionPool.idleConnections--;
        
        // Simulate multiple database operations within transaction
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
          recordDatabaseOperation('transaction_step', Date.now() - startTime, {
            table: 'transaction_test',
            transactionId,
            step: i + 1
          });
        }
        
        const duration = Date.now() - startTime;
        transactionMetrics.push({
          transactionId,
          duration,
          timestamp: Date.now()
        });
        
        mockConnectionPool.activeConnections--;
        mockConnectionPool.idleConnections++;
        
        return { transactionId, duration, success: true };
      });

      // Act
      const transactionPromises = Array.from({ length: concurrentTransactions }, async (_, index) => {
        const transactionId = `tx-${index}`;
        
        return serviceInstrumentation.instrumentDatabaseOperation(
          'concurrent_transaction',
          () => mockTransactionOperation(transactionId),
          'BEGIN; INSERT...; UPDATE...; COMMIT;',
          [],
          { requestId: transactionId }
        );
      });

      const results = await Promise.all(transactionPromises);

      // Assert
      expect(results).toHaveLength(concurrentTransactions);
      expect(results.every(result => result.success)).toBe(true);
      
      const avgTransactionDuration = transactionMetrics.reduce((sum, tx) => sum + tx.duration, 0) / transactionMetrics.length;
      const maxTransactionDuration = Math.max(...transactionMetrics.map(tx => tx.duration));
      
      expect(avgTransactionDuration).toBeLessThan(1000); // Average under 1 second
      expect(maxTransactionDuration).toBeLessThan(2000); // Max under 2 seconds
      
      // Record transaction scaling metrics
      recordMetric('db_transaction_avg_duration', avgTransactionDuration, 'ms', { type: 'transaction_scaling' });
      recordMetric('db_transaction_max_duration', maxTransactionDuration, 'ms', { type: 'transaction_scaling' });
      recordMetric('db_concurrent_transactions', concurrentTransactions, 'count', { type: 'transaction_scaling' });
    });
  });

  describe('Memory Usage Optimization and Limits', () => {
    it('should monitor memory usage during high-load operations', async () => {
      // Arrange
      const memorySnapshots: any[] = [];
      const highLoadOperations = 100;
      
      const mockMemoryIntensiveOperation = vi.fn().mockImplementation(async (operationId: string) => {
        // Simulate memory-intensive operation
        const largeData = new Array(10000).fill(0).map((_, i) => ({
          id: i,
          data: `operation-${operationId}-data-${i}`,
          timestamp: Date.now()
        }));
        
        // Take memory snapshot
        const memoryUsage = process.memoryUsage();
        memorySnapshots.push({
          operationId,
          timestamp: Date.now(),
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        });
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Clear large data to simulate cleanup
        largeData.length = 0;
        
        return { operationId, processed: true };
      });

      // Act
      const memoryTestPromises = Array.from({ length: highLoadOperations }, async (_, index) => {
        const operationId = `memory-${index}`;
        
        const result = await serviceInstrumentation.instrumentOperation(
          {
            serviceName: 'memory_test',
            operationName: 'high_load_operation',
            requestId: operationId,
            metadata: { memoryTest: true }
          },
          () => mockMemoryIntensiveOperation(operationId),
          'api'
        );
        
        // Record memory metrics
        const currentMemory = process.memoryUsage();
        recordMetric('memory_heap_used', currentMemory.heapUsed, 'bytes', { operation: operationId });
        
        return result;
      });

      const results = await Promise.all(memoryTestPromises);

      // Assert
      expect(results).toHaveLength(highLoadOperations);
      expect(results.every(result => result.processed)).toBe(true);
      
      // Analyze memory usage patterns
      const heapUsages = memorySnapshots.map(snapshot => snapshot.heapUsed);
      const maxHeapUsage = Math.max(...heapUsages);
      const minHeapUsage = Math.min(...heapUsages);
      const avgHeapUsage = heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length;
      
      // Record memory optimization metrics
      recordMetric('memory_heap_max', maxHeapUsage, 'bytes', { type: 'memory_optimization' });
      recordMetric('memory_heap_min', minHeapUsage, 'bytes', { type: 'memory_optimization' });
      recordMetric('memory_heap_avg', avgHeapUsage, 'bytes', { type: 'memory_optimization' });
      recordMetric('memory_heap_variance', maxHeapUsage - minHeapUsage, 'bytes', { type: 'memory_optimization' });
      
      // Verify memory usage stayed within reasonable bounds
      expect(maxHeapUsage).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
    });

    it('should implement memory leak detection', async () => {
      // Arrange
      const leakDetectionDuration = 1000; // 1 second
      const memoryCheckInterval = 100; // Check every 100ms
      const memoryReadings: number[] = [];
      let potentialLeaks = 0;

      const mockLeakyOperation = vi.fn().mockImplementation(async () => {
        // Simulate potential memory leak (not cleaning up references)
        const leakyData = new Array(1000).fill(0).map(() => ({
          data: new Array(100).fill('leak-test-data'),
          timestamp: Date.now()
        }));
        
        // Intentionally don't clean up to simulate leak
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return { processed: true, dataSize: leakyData.length };
      });

      // Act - Run operations while monitoring memory
      const startTime = Date.now();
      const operations: Promise<any>[] = [];
      
      // Start memory monitoring
      const memoryMonitor = setInterval(() => {
        const memoryUsage = process.memoryUsage();
        memoryReadings.push(memoryUsage.heapUsed);
        
        // Simple leak detection: check if memory is consistently growing
        if (memoryReadings.length > 5) {
          const recent = memoryReadings.slice(-5);
          const isGrowing = recent.every((reading, index) => 
            index === 0 || reading >= recent[index - 1]
          );
          
          if (isGrowing) {
            potentialLeaks++;
          }
        }
      }, memoryCheckInterval);

      // Run operations
      while (Date.now() - startTime < leakDetectionDuration) {
        operations.push(
          serviceInstrumentation.instrumentOperation(
            {
              serviceName: 'leak_detection',
              operationName: 'leaky_operation',
              requestId: `leak-${operations.length}`,
              metadata: { leakTest: true }
            },
            mockLeakyOperation,
            'api'
          )
        );
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      clearInterval(memoryMonitor);
      await Promise.all(operations);

      // Assert
      const memoryGrowth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0];
      const avgMemoryGrowthPerOperation = memoryGrowth / operations.length;
      
      // Record leak detection metrics
      recordMetric('memory_leak_total_growth', memoryGrowth, 'bytes', { type: 'leak_detection' });
      recordMetric('memory_leak_avg_growth_per_op', avgMemoryGrowthPerOperation, 'bytes', { type: 'leak_detection' });
      recordMetric('memory_leak_potential_leaks', potentialLeaks, 'count', { type: 'leak_detection' });
      
      // Alert if significant memory growth detected
      if (memoryGrowth > 50 * 1024 * 1024) { // More than 50MB growth
        recordMetric('memory_leak_alert', 1, 'count', { 
          type: 'leak_alert',
          growth: memoryGrowth,
          operations: operations.length
        });
      }
    });

    it('should enforce memory limits and trigger garbage collection', async () => {
      // Arrange
      const memoryLimit = 100 * 1024 * 1024; // 100MB limit
      const operations = 50;
      let gcTriggered = 0;
      let memoryLimitExceeded = 0;

      const mockMemoryLimitOperation = vi.fn().mockImplementation(async (operationId: string) => {
        // Check current memory usage
        const memoryUsage = process.memoryUsage();
        
        if (memoryUsage.heapUsed > memoryLimit) {
          memoryLimitExceeded++;
          
          // Simulate garbage collection trigger
          if (global.gc) {
            global.gc();
            gcTriggered++;
          }
          
          recordMetric('memory_limit_exceeded', 1, 'count', { 
            operationId,
            heapUsed: memoryUsage.heapUsed,
            limit: memoryLimit
          });
        }
        
        // Create some memory pressure
        const tempData = new Array(5000).fill(0).map(() => ({
          id: Math.random(),
          data: new Array(50).fill(`temp-data-${operationId}`)
        }));
        
        await new Promise(resolve => setTimeout(resolve, 30));
        
        // Clean up
        tempData.length = 0;
        
        return { operationId, memoryUsed: memoryUsage.heapUsed };
      });

      // Act
      const memoryLimitPromises = Array.from({ length: operations }, async (_, index) => {
        const operationId = `memory-limit-${index}`;
        
        return serviceInstrumentation.instrumentOperation(
          {
            serviceName: 'memory_limit',
            operationName: 'memory_pressure_test',
            requestId: operationId,
            metadata: { memoryLimitTest: true }
          },
          () => mockMemoryLimitOperation(operationId),
          'api'
        );
      });

      const results = await Promise.all(memoryLimitPromises);

      // Assert
      expect(results).toHaveLength(operations);
      
      // Record memory limit enforcement metrics
      recordMetric('memory_limit_violations', memoryLimitExceeded, 'count', { type: 'memory_limits' });
      recordMetric('memory_gc_triggered', gcTriggered, 'count', { type: 'memory_limits' });
      recordMetric('memory_limit_threshold', memoryLimit, 'bytes', { type: 'memory_limits' });
      
      // Verify memory management worked
      const finalMemory = process.memoryUsage();
      expect(finalMemory.heapUsed).toBeLessThan(memoryLimit * 2); // Allow some variance
    });
  });

  describe('CPU Utilization Efficiency and Bottlenecks', () => {
    it('should monitor CPU-intensive operations and detect bottlenecks', async () => {
      // Arrange
      const cpuIntensiveOperations = 20;
      const operationMetrics: any[] = [];

      const mockCpuIntensiveOperation = vi.fn().mockImplementation(async (operationId: string) => {
        const startTime = Date.now();
        const startCpuTime = process.cpuUsage();
        
        // Simulate CPU-intensive work
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
          result += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
        }
        
        const endTime = Date.now();
        const endCpuTime = process.cpuUsage(startCpuTime);
        
        const wallClockTime = endTime - startTime;
        const cpuTime = (endCpuTime.user + endCpuTime.system) / 1000; // Convert to milliseconds
        const cpuUtilization = (cpuTime / wallClockTime) * 100;
        
        operationMetrics.push({
          operationId,
          wallClockTime,
          cpuTime,
          cpuUtilization,
          result: result.toString().substring(0, 10) // Truncate for storage
        });
        
        return { operationId, cpuUtilization, wallClockTime };
      });

      // Act
      const cpuTestPromises = Array.from({ length: cpuIntensiveOperations }, async (_, index) => {
        const operationId = `cpu-${index}`;
        
        return serviceInstrumentation.instrumentOperation(
          {
            serviceName: 'cpu_test',
            operationName: 'cpu_intensive_operation',
            requestId: operationId,
            metadata: { cpuTest: true }
          },
          () => mockCpuIntensiveOperation(operationId),
          'api'
        );
      });

      const results = await Promise.all(cpuTestPromises);

      // Assert
      expect(results).toHaveLength(cpuIntensiveOperations);
      
      // Analyze CPU utilization patterns
      const avgCpuUtilization = operationMetrics.reduce((sum, metric) => sum + metric.cpuUtilization, 0) / operationMetrics.length;
      const maxCpuUtilization = Math.max(...operationMetrics.map(metric => metric.cpuUtilization));
      const avgWallClockTime = operationMetrics.reduce((sum, metric) => sum + metric.wallClockTime, 0) / operationMetrics.length;
      
      // Record CPU metrics
      recordMetric('cpu_utilization_avg', avgCpuUtilization, 'percentage', { type: 'cpu_efficiency' });
      recordMetric('cpu_utilization_max', maxCpuUtilization, 'percentage', { type: 'cpu_efficiency' });
      recordMetric('cpu_operation_avg_time', avgWallClockTime, 'ms', { type: 'cpu_efficiency' });
      
      // Detect potential CPU bottlenecks
      const highCpuOperations = operationMetrics.filter(metric => metric.cpuUtilization > 80);
      recordMetric('cpu_bottleneck_operations', highCpuOperations.length, 'count', { type: 'cpu_bottlenecks' });
      
      expect(avgCpuUtilization).toBeGreaterThan(0);
      expect(maxCpuUtilization).toBeLessThan(200); // Should not exceed 200% (2 cores)
    });

    it('should test concurrent CPU operations and thread efficiency', async () => {
      // Arrange
      const concurrentCpuOperations = 10;
      const operationComplexity = 500000; // Reduced for concurrent testing
      const concurrencyMetrics: any[] = [];

      const mockConcurrentCpuOperation = vi.fn().mockImplementation(async (operationId: string) => {
        const startTime = Date.now();
        
        // CPU-intensive work that can benefit from concurrency
        const result = await new Promise<number>((resolve) => {
          let computation = 0;
          for (let i = 0; i < operationComplexity; i++) {
            computation += Math.sqrt(i) * Math.random();
          }
          resolve(computation);
        });
        
        const duration = Date.now() - startTime;
        
        concurrencyMetrics.push({
          operationId,
          duration,
          startTime,
          endTime: Date.now()
        });
        
        return { operationId, duration, result: result.toString().substring(0, 10) };
      });

      // Act - Run operations concurrently
      const concurrentStartTime = Date.now();
      
      const concurrentPromises = Array.from({ length: concurrentCpuOperations }, async (_, index) => {
        const operationId = `concurrent-cpu-${index}`;
        
        return serviceInstrumentation.instrumentOperation(
          {
            serviceName: 'concurrent_cpu',
            operationName: 'concurrent_cpu_operation',
            requestId: operationId,
            metadata: { concurrentTest: true, index }
          },
          () => mockConcurrentCpuOperation(operationId),
          'api'
        );
      });

      const concurrentResults = await Promise.all(concurrentPromises);
      const totalConcurrentTime = Date.now() - concurrentStartTime;

      // Act - Run operations sequentially for comparison
      const sequentialStartTime = Date.now();
      const sequentialResults: any[] = [];
      
      for (let i = 0; i < concurrentCpuOperations; i++) {
        const operationId = `sequential-cpu-${i}`;
        const result = await mockConcurrentCpuOperation(operationId);
        sequentialResults.push(result);
      }
      
      const totalSequentialTime = Date.now() - sequentialStartTime;

      // Assert
      expect(concurrentResults).toHaveLength(concurrentCpuOperations);
      expect(sequentialResults).toHaveLength(concurrentCpuOperations);
      
      // Calculate efficiency metrics
      const concurrencySpeedup = totalSequentialTime / totalConcurrentTime;
      const avgConcurrentDuration = concurrencyMetrics.reduce((sum, metric) => sum + metric.duration, 0) / concurrencyMetrics.length;
      
      // Record concurrency efficiency metrics
      recordMetric('cpu_concurrency_speedup', concurrencySpeedup, 'ratio', { type: 'cpu_concurrency' });
      recordMetric('cpu_concurrent_total_time', totalConcurrentTime, 'ms', { type: 'cpu_concurrency' });
      recordMetric('cpu_sequential_total_time', totalSequentialTime, 'ms', { type: 'cpu_concurrency' });
      recordMetric('cpu_concurrent_avg_duration', avgConcurrentDuration, 'ms', { type: 'cpu_concurrency' });
      
      // Verify concurrency provided benefit
      expect(concurrencySpeedup).toBeGreaterThan(1); // Should be faster than sequential
      expect(totalConcurrentTime).toBeLessThan(totalSequentialTime);
    });

    it('should identify and report CPU bottlenecks in different operation types', async () => {
      // Arrange
      const operationTypes = [
        { name: 'database_query', complexity: 100000, expectedDuration: 50 },
        { name: 'api_processing', complexity: 200000, expectedDuration: 100 },
        { name: 'data_transformation', complexity: 500000, expectedDuration: 200 },
        { name: 'file_processing', complexity: 300000, expectedDuration: 150 }
      ];
      
      const bottleneckResults: any[] = [];

      // Act - Test each operation type
      for (const opType of operationTypes) {
        const startTime = Date.now();
        const startCpuTime = process.cpuUsage();
        
        // Simulate operation-specific CPU work
        let result = 0;
        for (let i = 0; i < opType.complexity; i++) {
          result += Math.sqrt(i) * (opType.name.length / 10);
        }
        
        const duration = Date.now() - startTime;
        const cpuUsage = process.cpuUsage(startCpuTime);
        const cpuTime = (cpuUsage.user + cpuUsage.system) / 1000;
        
        const isBottleneck = duration > opType.expectedDuration * 1.5; // 50% over expected
        const efficiency = (cpuTime / duration) * 100;
        
        bottleneckResults.push({
          operationType: opType.name,
          duration,
          expectedDuration: opType.expectedDuration,
          cpuTime,
          efficiency,
          isBottleneck,
          performanceRatio: duration / opType.expectedDuration
        });
        
        // Record operation-specific metrics
        recordMetric(`cpu_${opType.name}_duration`, duration, 'ms', { type: 'cpu_bottleneck_analysis' });
        recordMetric(`cpu_${opType.name}_efficiency`, efficiency, 'percentage', { type: 'cpu_bottleneck_analysis' });
        
        if (isBottleneck) {
          recordMetric(`cpu_bottleneck_${opType.name}`, 1, 'count', { 
            type: 'cpu_bottleneck_detected',
            duration,
            expected: opType.expectedDuration,
            ratio: duration / opType.expectedDuration
          });
        }
      }

      // Assert
      const bottlenecks = bottleneckResults.filter(result => result.isBottleneck);
      const avgEfficiency = bottleneckResults.reduce((sum, result) => sum + result.efficiency, 0) / bottleneckResults.length;
      
      // Record summary metrics
      recordMetric('cpu_bottlenecks_detected', bottlenecks.length, 'count', { type: 'cpu_bottleneck_summary' });
      recordMetric('cpu_avg_efficiency', avgEfficiency, 'percentage', { type: 'cpu_bottleneck_summary' });
      
      // Verify bottleneck detection worked
      expect(bottleneckResults).toHaveLength(operationTypes.length);
      expect(avgEfficiency).toBeGreaterThan(0);
      
      // Log bottleneck details if any found
      if (bottlenecks.length > 0) {
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Performance threshold warning'),
          expect.any(Object)
        );
      }
    });
  });
});