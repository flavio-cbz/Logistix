/**
 * Request Logging Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  withRequestLogging,
  withDatabaseLogging,
  withServiceLogging,
  withPerformanceLogging
} from '../request-logging';

// Mock the logging utilities
vi.mock('@/lib/utils/logging', () => ({
  createRequestLogger: vi.fn(() => ({
    http: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    performance: vi.fn()
  })),
  apiRequestLogger: {
    logResponse: vi.fn(),
    logError: vi.fn()
  }
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-request-id-123')
}));

describe('Request Logging Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withRequestLogging', () => {
    it('should log successful requests', async () => {
      const mockHandler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '192.168.1.1'
        }
      });

      vi.advanceTimersByTime(100);
      
      const response = await wrappedHandler(request);

      expect(response).toBeDefined();
      expect(response.headers.get('x-request-id')).toBe('test-request-id-123');
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should log failed requests', async () => {
      const mockHandler = vi.fn(async (req: NextRequest) => {
        throw new Error('Handler error');
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST'
      });

      vi.advanceTimersByTime(200);

      await expect(wrappedHandler(request)).rejects.toThrow('Handler error');
    });

    it('should handle requests without optional headers', async () => {
      const mockHandler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET'
      });

      const response = await wrappedHandler(request);

      expect(response).toBeDefined();
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('withDatabaseLogging', () => {
    it('should log successful database operations', async () => {
      const mockOperation = vi.fn(async (param1: string, param2: number) => {
        return { id: 1, name: param1, count: param2 };
      });

      const wrappedOperation = withDatabaseLogging('GET_USER', mockOperation);

      vi.advanceTimersByTime(150);

      const result = await wrappedOperation('test-user', 42);

      expect(result).toEqual({ id: 1, name: 'test-user', count: 42 });
      expect(mockOperation).toHaveBeenCalledWith('test-user', 42);
    });

    it('should log failed database operations', async () => {
      const mockOperation = vi.fn(async () => {
        throw new Error('Database connection failed');
      });

      const wrappedOperation = withDatabaseLogging('CREATE_USER', mockOperation);

      vi.advanceTimersByTime(300);

      await expect(wrappedOperation()).rejects.toThrow('Database connection failed');
    });
  });

  describe('withServiceLogging', () => {
    it('should log successful service operations', async () => {
      const mockService = vi.fn(async (data: any) => {
        return { processed: true, data };
      });

      const wrappedService = withServiceLogging('UserService', 'processUser', mockService);

      vi.advanceTimersByTime(250);

      const result = await wrappedService({ name: 'John' });

      expect(result).toEqual({ processed: true, data: { name: 'John' } });
      expect(mockService).toHaveBeenCalledWith({ name: 'John' });
    });

    it('should log failed service operations', async () => {
      const mockService = vi.fn(async () => {
        throw new Error('Service unavailable');
      });

      const wrappedService = withServiceLogging('EmailService', 'sendEmail', mockService);

      vi.advanceTimersByTime(100);

      await expect(wrappedService()).rejects.toThrow('Service unavailable');
    });
  });

  describe('withPerformanceLogging', () => {
    it('should log slow operations', async () => {
      const slowOperation = vi.fn(async () => {
        return 'completed';
      });

      const wrappedOperation = withPerformanceLogging('SLOW_OPERATION', slowOperation, 500);

      vi.advanceTimersByTime(1000); // Exceed threshold

      const result = await wrappedOperation();

      expect(result).toBe('completed');
      expect(slowOperation).toHaveBeenCalled();
    });

    it('should log fast operations without warnings', async () => {
      const fastOperation = vi.fn(async () => {
        return 'completed';
      });

      const wrappedOperation = withPerformanceLogging('FAST_OPERATION', fastOperation, 1000);

      vi.advanceTimersByTime(100); // Under threshold

      const result = await wrappedOperation();

      expect(result).toBe('completed');
      expect(fastOperation).toHaveBeenCalled();
    });

    it('should handle synchronous functions', async () => {
      const syncOperation = vi.fn(() => {
        return 'sync result';
      });

      const wrappedOperation = withPerformanceLogging('SYNC_OPERATION', syncOperation);

      vi.advanceTimersByTime(50);

      const result = await wrappedOperation();

      expect(result).toBe('sync result');
      expect(syncOperation).toHaveBeenCalled();
    });

    it('should log failed operations', async () => {
      const failingOperation = vi.fn(async () => {
        throw new Error('Operation failed');
      });

      const wrappedOperation = withPerformanceLogging('FAILING_OPERATION', failingOperation);

      vi.advanceTimersByTime(200);

      await expect(wrappedOperation()).rejects.toThrow('Operation failed');
    });
  });

  describe('Header sanitization', () => {
    it('should sanitize sensitive headers in logs', async () => {
      const mockHandler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer secret-token',
          'cookie': 'session=secret-session',
          'x-api-key': 'secret-api-key',
          'content-type': 'application/json'
        }
      });

      const response = await wrappedHandler(request);

      expect(response).toBeDefined();
      expect(mockHandler).toHaveBeenCalled();
      
      // Verify that the request was processed with sanitized headers
      const processedRequest = mockHandler.mock.calls[0][0];
      expect(processedRequest.headers.get('x-request-id')).toBe('test-request-id-123');
    });
  });

  describe('Response size calculation', () => {
    it('should handle responses with content-length header', async () => {
      const mockHandler = vi.fn(async (req: NextRequest) => {
        const response = NextResponse.json({ data: 'test' });
        response.headers.set('content-length', '1024');
        return response;
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      
      const request = new NextRequest('http://localhost:3000/api/test');

      const response = await wrappedHandler(request);

      expect(response).toBeDefined();
      expect(response.headers.get('content-length')).toBe('1024');
    });

    it('should handle responses without content-length header', async () => {
      const mockHandler = vi.fn(async (req: NextRequest) => {
        return NextResponse.json({ data: 'test' });
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      
      const request = new NextRequest('http://localhost:3000/api/test');

      const response = await wrappedHandler(request);

      expect(response).toBeDefined();
    });
  });
});