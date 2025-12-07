import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logging/logger';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
} from '@/lib/shared/errors/base-errors';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
} from '@/lib/utils/api-response';
import {
  validateBody,
  validateQuery,
  RequestValidationError,
} from '@/lib/middleware/validation-middleware';

// Mock logger
vi.mock('@/lib/utils/logging/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  getLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
  LogLevel: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
  },
}));

const mockLogger = vi.mocked(logger);

describe('Error Handling Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid data', { field: 'email' });

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid data');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('ValidationError');
    });

    it('should create AuthenticationError with correct properties', () => {
      const error = new AuthenticationError('Token expired');

      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Token expired');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create AuthorizationError with correct properties', () => {
      const error = new AuthorizationError('Admin access required');

      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Admin access required');
      expect(error.name).toBe('AuthorizationError');
    });

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User');

      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.name).toBe('NotFoundError');
    });

    it('should create ConflictError with correct properties', () => {
      const error = new ConflictError('Email already exists');

      expect(error.code).toBe('CONFLICT_ERROR');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
      expect(error.name).toBe('ConflictError');
    });

    it('should create DatabaseError with correct properties', () => {
      const error = new DatabaseError('Connection failed', { timeout: true });

      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Connection failed');
      expect(error.details).toEqual({ timeout: true });
      expect(error.name).toBe('DatabaseError');
    });

    it('should create ExternalServiceError with correct properties', () => {
      const error = new ExternalServiceError('Vinted API', 'Rate limit exceeded');

      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('Vinted API: Rate limit exceeded');
      expect(error.service).toBe('Vinted API');
      expect(error.name).toBe('ExternalServiceError');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create proper success response', async () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data, { requestId: 'req-123' });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.meta).toEqual(expect.objectContaining({
        requestId: 'req-123',
        version: '1.0.0',
      }));
    });

    it('should generate requestId if not provided', async () => {
      const data = { test: true };
      const response = createSuccessResponse(data);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.meta?.requestId).toBeTruthy();
    });
  });

  describe('createErrorResponse', () => {
    it('should create proper error response from CustomError', async () => {
      const error = new ValidationError('Test message', { field: 'test' });
      const response = createErrorResponse(error, { requestId: 'req-123' });
      const body = await response.json();
      
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create proper error response from generic Error', async () => {
      const error = new Error('Test message');
      const response = createErrorResponse(error);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });

  describe('withErrorHandling', () => {
    it('should catch and handle errors in wrapped function', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new ValidationError('Test error'));
      const wrappedHandler = withErrorHandling(mockHandler);
      const mockRequest = { url: 'http://localhost/api/test', method: 'GET' } as unknown as NextRequest;

      const result = await wrappedHandler(mockRequest, 'arg2');

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, 'arg2');
      expect(result.status).toBe(400);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return result when no error occurs', async () => {
      const mockResponse = NextResponse.json({ success: true });
      const mockHandler = vi.fn().mockResolvedValue(mockResponse);
      const wrappedHandler = withErrorHandling(mockHandler);
      const mockRequest = { url: 'http://localhost/api/test', method: 'GET' } as unknown as NextRequest;

      const result = await wrappedHandler(mockRequest);

      expect(result).toBe(mockResponse);
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('validateBody', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    it('should validate valid request body', async () => {
      const mockRequest = {
        text: vi.fn().mockResolvedValue(JSON.stringify({ name: 'John', email: 'john@example.com' })),
        nextUrl: { pathname: '/api/test' },
        method: 'POST',
      } as unknown as NextRequest;

      const result = await validateBody(schema, mockRequest);

      expect(result.data).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should throw RequestValidationError for invalid data', async () => {
      const mockRequest = {
        text: vi.fn().mockResolvedValue(JSON.stringify({ name: 'John', email: 'invalid-email' })),
        nextUrl: { pathname: '/api/test' },
        method: 'POST',
      } as unknown as NextRequest;

      await expect(validateBody(schema, mockRequest)).rejects.toThrow(RequestValidationError);
    });

    it('should throw RequestValidationError for invalid JSON', async () => {
      const mockRequest = {
        text: vi.fn().mockResolvedValue('invalid-json'),
        nextUrl: { pathname: '/api/test' },
        method: 'POST',
      } as unknown as NextRequest;

      await expect(validateBody(schema, mockRequest)).rejects.toThrow(RequestValidationError);
    });
  });

  describe('validateQuery', () => {
    const schema = z.object({
      page: z.string().transform((val) => {
        const n = Number(val);
        if (isNaN(n)) throw new Error("Invalid number");
        return n;
      }),
      limit: z.string().transform(Number),
    });

    it('should validate valid query parameters', () => {
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('page', '1');
      mockSearchParams.set('limit', '10');

      const mockRequest = {
        nextUrl: { 
          pathname: '/api/test',
          searchParams: mockSearchParams
        },
        method: 'GET',
      } as unknown as NextRequest;

      const result = validateQuery(schema, mockRequest);

      expect(result.data).toEqual({ page: 1, limit: 10 });
    });

    it('should throw RequestValidationError for invalid parameters', () => {
      const mockSearchParams = new URLSearchParams();
      mockSearchParams.set('page', 'invalid');
      mockSearchParams.set('limit', '10');

      const mockRequest = {
        nextUrl: { 
          pathname: '/api/test',
          searchParams: mockSearchParams
        },
        method: 'GET',
      } as unknown as NextRequest;

      expect(() => validateQuery(schema, mockRequest)).toThrow(RequestValidationError);
    });
  });
});