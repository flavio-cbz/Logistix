import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  createErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  validateRequestBody,
  validateQueryParams,
  createApiHandler,
} from '@/lib/middleware/error-handling';
import { z } from 'zod';
import { logger } from '@/lib/utils/logging/logger';

// Mock des dépendances
vi.mock('@/lib/utils/logging/logger');
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

  describe('createErrorHandler', () => {
    it('should handle ValidationError correctly', () => {
      const errorHandler = createErrorHandler();
      const error = new ValidationError('Invalid email format', { field: 'email' });
      
      const response = errorHandler(error);
      
      expect(response.status).toBe(400);
      // Note: Dans un vrai test, vous devriez vérifier le contenu JSON de la réponse
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API Error occurred',
        expect.objectContaining({
          error: 'Invalid email format',
          stack: expect.any(String),
        })
      );
    });

    it('should handle ZodError correctly', () => {
      const errorHandler = createErrorHandler();
      const zodSchema = z.object({ email: z.string().email() });
      
      try {
        zodSchema.parse({ email: 'invalid-email' });
      } catch (error) {
        const response = errorHandler(error);
        expect(response.status).toBe(400);
      }
    });

    it('should handle generic errors correctly', () => {
      const errorHandler = createErrorHandler();
      const error = new Error('Unexpected error');
      
      const response = errorHandler(error);
      
      expect(response.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('createSuccessResponse', () => {
    it('should create proper success response', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data, 'req-123');
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata).toEqual({
        timestamp: expect.any(String),
        requestId: 'req-123',
        version: 'v1',
      });
    });

    it('should generate requestId if not provided', () => {
      const data = { test: true };
      const response = createSuccessResponse(data);
      
      expect(response.success).toBe(true);
      expect(response.metadata?.requestId).toBeTruthy();
    });
  });

  describe('createErrorResponse', () => {
    it('should create proper error response with details', () => {
      const response = createErrorResponse(
        'TEST_ERROR',
        'Test message',
        { field: 'test' },
        'req-123'
      );
      
      expect(response.success).toBe(false);
      expect(response.error).toEqual({
        code: 'TEST_ERROR',
        message: 'Test message',
        details: { field: 'test' },
      });
      expect(response.metadata).toEqual({
        timestamp: expect.any(String),
        requestId: 'req-123',
        version: 'v1',
      });
    });

    it('should create proper error response without details', () => {
      const response = createErrorResponse('TEST_ERROR', 'Test message');
      
      expect(response.success).toBe(false);
      expect(response.error).toEqual({
        code: 'TEST_ERROR',
        message: 'Test message',
      });
    });
  });

  describe('withErrorHandling', () => {
    it('should catch and handle errors in wrapped function', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new ValidationError('Test error'));
      const wrappedHandler = withErrorHandling(mockHandler);
      
      const result = await wrappedHandler('arg1', 'arg2');
      
      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result.status).toBe(400);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return result when no error occurs', async () => {
      const mockResponse = NextResponse.json({ success: true });
      const mockHandler = vi.fn().mockResolvedValue(mockResponse);
      const wrappedHandler = withErrorHandling(mockHandler);
      
      const result = await wrappedHandler('arg1');
      
      expect(result).toBe(mockResponse);
      expect(mockHandler).toHaveBeenCalledWith('arg1');
    });
  });

  describe('validateRequestBody', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    it('should validate valid request body', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ name: 'John', email: 'john@example.com' }),
      } as unknown as NextRequest;

      const validator = validateRequestBody(schema);
      const result = await validator(mockRequest);
      
      expect(result).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should throw ValidationError for invalid data', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ name: 'John', email: 'invalid-email' }),
      } as unknown as NextRequest;

      const validator = validateRequestBody(schema);
      
      await expect(validator(mockRequest)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid JSON', async () => {
      const mockRequest = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest;

      const validator = validateRequestBody(schema);
      
      await expect(validator(mockRequest)).rejects.toThrow(ValidationError);
    });
  });

  describe('validateQueryParams', () => {
    const schema = z.object({
      page: z.string().transform(Number),
      limit: z.string().transform(Number),
    });

    it('should validate valid query parameters', () => {
      const mockRequest = {
        url: 'https://example.com/api?page=1&limit=10',
      } as NextRequest;

      const validator = validateQueryParams(schema);
      const result = validator(mockRequest);
      
      expect(result).toEqual({ page: 1, limit: 10 });
    });

    it('should throw ValidationError for invalid parameters', () => {
      const mockRequest = {
        url: 'https://example.com/api?page=invalid&limit=10',
      } as NextRequest;

      const validator = validateQueryParams(schema);
      
      expect(() => validator(mockRequest)).toThrow(ValidationError);
    });
  });

  describe('createApiHandler', () => {
    const bodySchema = z.object({ name: z.string() });
    const querySchema = z.object({ id: z.string() });

    it('should create handler that validates body and query', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const apiHandler = createApiHandler({
        bodySchema,
        querySchema,
        handler: mockHandler,
      });

      const mockRequest = {
        method: 'POST',
        url: 'https://example.com/api?id=123',
        json: vi.fn().mockResolvedValue({ name: 'Test' }),
      } as unknown as NextRequest;

      await apiHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith({
        request: mockRequest,
        body: { name: 'Test' },
        query: { id: '123' },
        userId: undefined,
      });
    });

    it('should handle validation errors', async () => {
      const mockHandler = vi.fn();
      const apiHandler = createApiHandler({
        bodySchema,
        handler: mockHandler,
      });

      const mockRequest = {
        method: 'POST',
        url: 'https://example.com/api',
        json: vi.fn().mockResolvedValue({ invalid: 'data' }),
      } as unknown as NextRequest;

      const response = await apiHandler(mockRequest);

      expect(response.status).toBe(400);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should skip body validation for GET requests', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const apiHandler = createApiHandler({
        bodySchema,
        handler: mockHandler,
      });

      const mockRequest = {
        method: 'GET',
        url: 'https://example.com/api',
      } as unknown as NextRequest;

      await apiHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith({
        request: mockRequest,
        body: undefined,
        query: undefined,
        userId: undefined,
      });
    });

    it('should handle authentication requirement', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const apiHandler = createApiHandler({
        requireAuth: true,
        handler: mockHandler,
      });

      const mockRequest = {
        method: 'GET',
        url: 'https://example.com/api',
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      const response = await apiHandler(mockRequest);

      expect(response.status).toBe(401);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});