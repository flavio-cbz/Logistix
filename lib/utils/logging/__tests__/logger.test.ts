/**
 * Logger Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLogger, logger } from '../logger';
import winston from 'winston';

// Mock winston
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(() => ({
      child: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        http: vi.fn(),
        verbose: vi.fn(),
        debug: vi.fn(),
        silly: vi.fn()
      })),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      http: vi.fn(),
      verbose: vi.fn(),
      debug: vi.fn(),
      silly: vi.fn()
    })),
    addColors: vi.fn(),
    transports: {
      Console: vi.fn(),
      DailyRotateFile: vi.fn()
    }
  },
  format: {
    combine: vi.fn(() => ({})),
    colorize: vi.fn(() => ({})),
    timestamp: vi.fn(() => ({})),
    printf: vi.fn(() => ({})),
    errors: vi.fn(() => ({})),
    splat: vi.fn(() => ({})),
    json: vi.fn(() => ({}))
  }
}));

// Mock winston-daily-rotate-file
vi.mock('winston-daily-rotate-file', () => ({}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn()
}));

describe('Logger Service', () => {
  let mockWinstonLogger: any;

  beforeEach(() => {
    mockWinstonLogger = {
      child: vi.fn(() => ({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        http: vi.fn(),
        verbose: vi.fn(),
        debug: vi.fn(),
        silly: vi.fn()
      })),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      http: vi.fn(),
      verbose: vi.fn(),
      debug: vi.fn(),
      silly: vi.fn()
    };

    (winston.createLogger as any).mockReturnValue(mockWinstonLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getLogger', () => {
    it('should create a logger with context', () => {
      const contextLogger = getLogger('TEST_CONTEXT');
      
      expect(winston.createLogger).toHaveBeenCalled();
      expect(mockWinstonLogger.child).toHaveBeenCalledWith({ context: 'TEST_CONTEXT' });
      expect(contextLogger).toBeDefined();
    });

    it('should provide all logging methods', () => {
      const contextLogger = getLogger('TEST');
      
      expect(typeof contextLogger.error).toBe('function');
      expect(typeof contextLogger.warn).toBe('function');
      expect(typeof contextLogger.info).toBe('function');
      expect(typeof contextLogger.http).toBe('function');
      expect(typeof contextLogger.verbose).toBe('function');
      expect(typeof contextLogger.debug).toBe('function');
      expect(typeof contextLogger.silly).toBe('function');
      expect(typeof contextLogger.performance).toBe('function');
      expect(typeof contextLogger.request).toBe('function');
      expect(typeof contextLogger.database).toBe('function');
      expect(typeof contextLogger.userAction).toBe('function');
    });
  });

  describe('logger methods', () => {
    let testLogger: any;

    beforeEach(() => {
      testLogger = getLogger('TEST');
    });

    it('should log error messages', () => {
      const childLogger = mockWinstonLogger.child();
      mockWinstonLogger.child.mockReturnValue(childLogger);
      
      testLogger.error('Test error message');
      
      expect(childLogger.error).toHaveBeenCalledWith('Test error message', {});
    });

    it('should log error with Error object', () => {
      const childLogger = mockWinstonLogger.child();
      mockWinstonLogger.child.mockReturnValue(childLogger);
      
      const error = new Error('Test error');
      testLogger.error('Test error message', error);
      
      expect(childLogger.error).toHaveBeenCalledWith('Test error message', {
        error,
        stack: error.stack
      });
    });

    it('should log info messages with metadata', () => {
      const childLogger = mockWinstonLogger.child();
      mockWinstonLogger.child.mockReturnValue(childLogger);
      
      const metadata = { userId: '123', action: 'test' };
      testLogger.info('Test info message', metadata);
      
      expect(childLogger.info).toHaveBeenCalledWith('Test info message', metadata);
    });

    it('should log performance metrics', () => {
      const childLogger = mockWinstonLogger.child();
      mockWinstonLogger.child.mockReturnValue(childLogger);
      
      testLogger.performance('TEST_OPERATION', 1500, { userId: '123' });
      
      expect(childLogger.info).toHaveBeenCalledWith('Performance metric', {
        operation: 'TEST_OPERATION',
        duration: 1500,
        type: 'performance',
        userId: '123'
      });
    });

    it('should log HTTP requests', () => {
      const childLogger = mockWinstonLogger.child();
      mockWinstonLogger.child.mockReturnValue(childLogger);
      
      testLogger.request('GET', '/api/test', 200, 250, { userId: '123' });
      
      expect(childLogger.http).toHaveBeenCalledWith('HTTP Request', {
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
        duration: 250,
        type: 'http_request',
        userId: '123'
      });
    });

    it('should log database queries with truncation', () => {
      const childLogger = mockWinstonLogger.child();
      mockWinstonLogger.child.mockReturnValue(childLogger);
      
      const longQuery = 'SELECT * FROM users WHERE ' + 'x'.repeat(300);
      testLogger.database(longQuery, 100);
      
      expect(childLogger.debug).toHaveBeenCalledWith('Database Query', {
        query: longQuery.substring(0, 200) + '...',
        duration: 100,
        type: 'database'
      });
    });

    it('should log user actions', () => {
      const childLogger = mockWinstonLogger.child();
      mockWinstonLogger.child.mockReturnValue(childLogger);
      
      testLogger.userAction('LOGIN', 'user123', { ip: '127.0.0.1' });
      
      expect(childLogger.info).toHaveBeenCalledWith('User Action', {
        action: 'LOGIN',
        userId: 'user123',
        type: 'user_action',
        timestamp: expect.any(String),
        ip: '127.0.0.1'
      });
    });
  });

  describe('global logger', () => {
    it('should provide a global logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should log messages through global logger', () => {
      logger.info('Global test message');
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Global test message', {});
    });
  });
});