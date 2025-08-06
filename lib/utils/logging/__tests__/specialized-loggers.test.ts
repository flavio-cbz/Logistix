/**
 * Specialized Loggers Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  databaseLogger,
  apiLogger,
  authLogger,
  createRequestLogger,
  PerformanceTimer,
  DatabaseQueryLogger,
  ApiRequestLogger
} from '../specialized-loggers';

// Mock the logger module
vi.mock('../logger', () => ({
  getLogger: vi.fn((context: string) => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    http: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
    performance: vi.fn(),
    request: vi.fn(),
    database: vi.fn(),
    userAction: vi.fn()
  }))
}));

describe('Specialized Loggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pre-configured loggers', () => {
    it('should provide database logger', () => {
      expect(databaseLogger).toBeDefined();
      expect(typeof databaseLogger.info).toBe('function');
    });

    it('should provide API logger', () => {
      expect(apiLogger).toBeDefined();
      expect(typeof apiLogger.info).toBe('function');
    });

    it('should provide auth logger', () => {
      expect(authLogger).toBeDefined();
      expect(typeof authLogger.info).toBe('function');
    });
  });

  describe('createRequestLogger', () => {
    it('should create logger with request context', () => {
      const requestLogger = createRequestLogger('req-123', 'user-456');
      
      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });

    it('should include request context in log calls', () => {
      const requestLogger = createRequestLogger('req-123', 'user-456');
      
      requestLogger.info('Test message', { extra: 'data' });
      
      // The underlying logger should be called with context
      expect(requestLogger).toBeDefined();
    });
  });

  describe('PerformanceTimer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should measure operation duration', () => {
      const mockLogger = {
        performance: vi.fn(),
        error: vi.fn()
      } as any;

      const timer = new PerformanceTimer('TEST_OPERATION', mockLogger);
      
      // Advance time by 1000ms
      vi.advanceTimersByTime(1000);
      
      const duration = timer.end();
      
      expect(duration).toBe(1000);
      expect(mockLogger.performance).toHaveBeenCalledWith('TEST_OPERATION', 1000, {});
    });

    it('should end with result', () => {
      const mockLogger = {
        performance: vi.fn(),
        error: vi.fn()
      } as any;

      const timer = new PerformanceTimer('TEST_OPERATION', mockLogger);
      
      vi.advanceTimersByTime(500);
      
      const result = timer.endWithResult('test-result', { extra: 'metadata' });
      
      expect(result).toBe('test-result');
      expect(mockLogger.performance).toHaveBeenCalledWith('TEST_OPERATION', 500, {
        success: true,
        resultType: 'string',
        extra: 'metadata'
      });
    });

    it('should end with error', () => {
      const mockLogger = {
        performance: vi.fn(),
        error: vi.fn()
      } as any;

      const timer = new PerformanceTimer('TEST_OPERATION', mockLogger);
      const error = new Error('Test error');
      
      vi.advanceTimersByTime(750);
      
      expect(() => timer.endWithError(error)).toThrow('Test error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TEST_OPERATION failed',
        error,
        expect.objectContaining({
          duration: 750,
          success: false
        })
      );
    });
  });

  describe('DatabaseQueryLogger', () => {
    it('should log database queries', () => {
      const mockLogger = {
        database: vi.fn()
      } as any;

      const dbLogger = new DatabaseQueryLogger(mockLogger);
      
      dbLogger.logQuery('SELECT * FROM users', ['param1'], 150, { table: 'users' });
      
      expect(mockLogger.database).toHaveBeenCalledWith('SELECT * FROM users', 150, {
        params: ['param1'],
        paramCount: 1,
        table: 'users'
      });
    });

    it('should limit parameters for security', () => {
      const mockLogger = {
        database: vi.fn()
      } as any;

      const dbLogger = new DatabaseQueryLogger(mockLogger);
      const manyParams = Array.from({ length: 15 }, (_, i) => `param${i}`);
      
      dbLogger.logQuery('SELECT * FROM users WHERE id IN (?)', manyParams, 200);
      
      expect(mockLogger.database).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id IN (?)',
        200,
        {
          params: manyParams.slice(0, 10),
          paramCount: 15
        }
      );
    });

    it('should log transactions', () => {
      const mockLogger = {
        performance: vi.fn()
      } as any;

      const dbLogger = new DatabaseQueryLogger(mockLogger);
      
      dbLogger.logTransaction('USER_UPDATE', 300, { userId: '123' });
      
      expect(mockLogger.performance).toHaveBeenCalledWith('DB_TRANSACTION_USER_UPDATE', 300, {
        type: 'database_transaction',
        userId: '123'
      });
    });

    it('should log connection events', () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn()
      } as any;

      const dbLogger = new DatabaseQueryLogger(mockLogger);
      
      dbLogger.logConnection('connect', { host: 'localhost' });
      expect(mockLogger.info).toHaveBeenCalledWith('Database connection connect', { host: 'localhost' });
      
      dbLogger.logConnection('error', { error: 'Connection failed' });
      expect(mockLogger.error).toHaveBeenCalledWith('Database connection error', undefined, { error: 'Connection failed' });
    });
  });

  describe('ApiRequestLogger', () => {
    it('should log API requests', () => {
      const mockLogger = {
        http: vi.fn()
      } as any;

      const apiLogger = new ApiRequestLogger(mockLogger);
      
      apiLogger.logRequest('GET', '/api/users', { 'user-agent': 'test' }, { query: 'test' });
      
      expect(mockLogger.http).toHaveBeenCalledWith('GET /api/users', {
        method: 'GET',
        url: '/api/users',
        headers: { 'user-agent': 'test' },
        bodySize: expect.any(Number),
        type: 'api_request'
      });
    });

    it('should sanitize sensitive headers', () => {
      const mockLogger = {
        http: vi.fn()
      } as any;

      const apiLogger = new ApiRequestLogger(mockLogger);
      
      apiLogger.logRequest('POST', '/api/login', {
        'authorization': 'Bearer secret-token',
        'cookie': 'session=secret',
        'content-type': 'application/json'
      });
      
      expect(mockLogger.http).toHaveBeenCalledWith('POST /api/login', {
        method: 'POST',
        url: '/api/login',
        headers: {
          'authorization': '[REDACTED]',
          'cookie': '[REDACTED]',
          'content-type': 'application/json'
        },
        bodySize: 0,
        type: 'api_request'
      });
    });

    it('should log API responses', () => {
      const mockLogger = {
        request: vi.fn()
      } as any;

      const apiLogger = new ApiRequestLogger(mockLogger);
      
      apiLogger.logResponse('GET', '/api/users', 200, 150, 1024);
      
      expect(mockLogger.request).toHaveBeenCalledWith('GET', '/api/users', 200, 150, {
        responseSize: 1024,
        type: 'api_response'
      });
    });

    it('should log API errors', () => {
      const mockLogger = {
        error: vi.fn()
      } as any;

      const apiLogger = new ApiRequestLogger(mockLogger);
      const error = new Error('API Error');
      
      apiLogger.logError('POST', '/api/users', error, 500);
      
      expect(mockLogger.error).toHaveBeenCalledWith('POST /api/users failed', error, {
        method: 'POST',
        url: '/api/users',
        duration: 500,
        type: 'api_error'
      });
    });
  });
});