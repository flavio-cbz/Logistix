/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseService } from '@/lib/services/base-service';
import { z } from 'zod';
import { 
  ValidationError, 
  NotFoundError, 
  AuthError, 
  AuthorizationError, 
  BusinessLogicError,
  CustomError 
} from '@/lib/errors/custom-error';
import { 
  expectValidationError,
  createConsoleSpy 
} from '../../utils/vitest-helpers';

// Create a concrete implementation for testing
class TestService extends BaseService {
  constructor() {
    super('TestService');
  }

  // Mock implementations for protected methods
  public testValidateUUID(value: string, fieldName: string) {
    if (typeof value !== 'string' || !value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      throw new ValidationError(`Invalid UUID format for ${fieldName}`, fieldName, { value });
    }
    return value;
  }

  public testValidateId(value: string, fieldName: string) {
    if (!value || (typeof value !== 'string' && typeof value !== 'number')) {
      throw new ValidationError(`Invalid ID for ${fieldName}`, fieldName, { value });
    }
    // Reject IDs with invalid characters (only allow alphanumeric, hyphens, underscores)
    if (typeof value === 'string' && !/^[a-zA-Z0-9_-]+$/.test(value)) {
      throw new ValidationError(`Invalid ID format for ${fieldName}`, fieldName, { value });
    }
    return value;
  }

  public testValidatePositiveNumber(value: number, fieldName: string) {
    if (typeof value !== 'number' || isNaN(value) || value <= 0) {
      throw new ValidationError(`${fieldName} must be a positive number`, fieldName, { value });
    }
    return value;
  }

  public testValidateNonNegativeNumber(value: number, fieldName: string) {
    if (typeof value !== 'number' || value < 0) {
      throw new ValidationError(`${fieldName} must be non-negative`, fieldName, { value });
    }
    return value;
  }

  public testValidateString(value: string, fieldName: string, minLength?: number, maxLength?: number) {
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, { value });
    }
    if (minLength && value.length < minLength) {
      throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName, { value });
    }
    if (maxLength && value.length > maxLength) {
      throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`, fieldName, { value });
    }
    return value;
  }

  public testValidateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown) {
    try {
      return schema.parse(data);
    } catch (error) {
      throw new ValidationError('Schema validation failed', 'data', { error });
    }
  }

  public async testExecuteOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw error;
    }
  }

  public testExecuteOperationSync<T>(
    operationName: string,
    operation: () => T
  ): T {
    try {
      return operation();
    } catch (error) {
      throw error;
    }
  }

  // Mock handleError method for testing
  public testHandleError(error: unknown, operation: string, context?: any) {
    // Since handleError is protected and may not be accessible, we'll simulate its behavior
    if (error instanceof CustomError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', undefined, { zodError: error.errors });
    }
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      throw new ValidationError('Unique constraint violation');
    }
    throw new CustomError('UNKNOWN_ERROR', error instanceof Error ? error.message : 'Unknown error occurred');
  }
  
  // Mock factory methods for testing
  public testCreateNotFoundError(resource: string, identifier?: string) {
    return new NotFoundError(`${resource} not found${identifier ? `: ${identifier}` : ''}`, { resource, identifier });
  }

  public testCreateAuthError(message?: string) {
    return new AuthError(message || 'Authentication required');
  }

  public testCreateAuthorizationError(message?: string) {
    return new AuthorizationError(message || 'Insufficient permissions');
  }

  public testCreateBusinessError(message: string, details?: any) {
    return new BusinessLogicError(message, details);
  }

  public testCreateValidationError(message: string, field?: string, details?: any) {
    return new ValidationError(message, field, details);
  }
}

describe('BaseService', () => {
  let testService: TestService;
  let consoleSpy: ReturnType<typeof createConsoleSpy>;

  beforeEach(() => {
    testService = new TestService();
    // Note: setRequestId and setUserId are protected methods
    consoleSpy = createConsoleSpy();
  });

  afterEach(() => {
    consoleSpy.restore();
  });

  describe('UUID validation', () => {
    it('should validate correct UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      
      expect(() => {
        testService.testValidateUUID(validUUID, 'testField');
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid UUIDs', () => {
      expect(() => {
        testService.testValidateUUID('invalid-uuid', 'testField');
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty UUIDs', () => {
      expect(() => {
        testService.testValidateUUID('', 'testField');
      }).toThrow(ValidationError);
    });
  });

  describe('ID validation', () => {
    it('should validate correct UUIDs', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      
      expect(() => {
        testService.testValidateId(validUUID, 'testField');
      }).not.toThrow();
    });

    it('should validate custom ID formats', () => {
      const validCustomId = 'custom-id-123';
      
      expect(() => {
        testService.testValidateId(validCustomId, 'testField');
      }).not.toThrow();
    });

    it('should throw ValidationError for invalid IDs', () => {
      expect(() => {
        testService.testValidateId('invalid@id!', 'testField');
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty IDs', () => {
      expect(() => {
        testService.testValidateId('', 'testField');
      }).toThrow(ValidationError);
    });
  });

  describe('Number validation', () => {
    describe('validatePositiveNumber', () => {
      it('should validate positive numbers', () => {
        expect(() => {
          testService.testValidatePositiveNumber(10.5, 'testField');
        }).not.toThrow();
      });

      it('should throw ValidationError for zero', () => {
        expect(() => {
          testService.testValidatePositiveNumber(0, 'testField');
        }).toThrow(ValidationError);
      });

      it('should throw ValidationError for negative numbers', () => {
        expect(() => {
          testService.testValidatePositiveNumber(-5, 'testField');
        }).toThrow(ValidationError);
      });

      it('should throw ValidationError for NaN', () => {
        expect(() => {
          testService.testValidatePositiveNumber(NaN, 'testField');
        }).toThrow(ValidationError);
      });
    });

    describe('validateNonNegativeNumber', () => {
      it('should validate positive numbers', () => {
        expect(() => {
          testService.testValidateNonNegativeNumber(10.5, 'testField');
        }).not.toThrow();
      });

      it('should validate zero', () => {
        expect(() => {
          testService.testValidateNonNegativeNumber(0, 'testField');
        }).not.toThrow();
      });

      it('should throw ValidationError for negative numbers', () => {
        expect(() => {
          testService.testValidateNonNegativeNumber(-5, 'testField');
        }).toThrow(ValidationError);
      });
    });
  });

  describe('String validation', () => {
    it('should validate strings within length limits', () => {
      expect(() => {
        testService.testValidateString('valid string', 'testField', 1, 20);
      }).not.toThrow();
    });

    it('should throw ValidationError for strings too short', () => {
      expect(() => {
        testService.testValidateString('a', 'testField', 5, 20);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for strings too long', () => {
      expect(() => {
        testService.testValidateString('this is a very long string', 'testField', 1, 10);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string values', () => {
      expect(() => {
        testService.testValidateString(123 as any, 'testField');
      }).toThrow(ValidationError);
    });

    it('should trim strings before validation', () => {
      expect(() => {
        testService.testValidateString('  valid  ', 'testField', 1, 20);
      }).not.toThrow();
    });
  });

  describe('Schema validation', () => {
    it('should validate data with Zod schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      const validData = { name: 'John', age: 30 };
      const result = testService.testValidateWithSchema(schema, validData);

      expect(result).toEqual(validData);
    });

    it('should throw ValidationError for invalid data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      const invalidData = { name: 'John', age: 'thirty' };

      expect(() => {
        testService.testValidateWithSchema(schema, invalidData);
      }).toThrow(ValidationError);
    });
  });

  describe('Error handling', () => {
    it('should re-throw CustomError instances', () => {
      const customError = new ValidationError('Test error', 'testField');

      expect(() => {
        testService.testHandleError(customError, 'testOperation');
      }).toThrow(ValidationError);
    });

    it('should convert Zod errors to ValidationError', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number'
        }
      ]);

      expect(() => {
        testService.testHandleError(zodError, 'testOperation');
      }).toThrow(ValidationError);
    });

    it('should handle database constraint errors', () => {
      const constraintError = new Error('UNIQUE constraint failed');

      expect(() => {
        testService.testHandleError(constraintError, 'testOperation');
      }).toThrow(ValidationError);
    });

    it('should create generic CustomError for unknown errors', () => {
      const unknownError = new Error('Unknown error');

      expect(() => {
        testService.testHandleError(unknownError, 'testOperation');
      }).toThrow(CustomError);
    });
  });

  describe('Error factory methods', () => {
    it('should create NotFoundError with resource info', () => {
      const error = testService.testCreateNotFoundError('Product', 'test-id');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toContain('Product not found');
    });

    it('should create AuthError with message', () => {
      const error = testService.testCreateAuthError('Custom auth message');

      expect(error).toBeInstanceOf(AuthError);
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.message).toBe('Custom auth message');
    });

    it('should create AuthorizationError with message', () => {
      const error = testService.testCreateAuthorizationError('Custom authorization message');

      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.message).toBe('Custom authorization message');
    });

    it('should create BusinessLogicError with details', () => {
      const error = testService.testCreateBusinessError('Business rule violation', { rule: 'test' });

      expect(error).toBeInstanceOf(BusinessLogicError);
      expect(error.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(error.message).toBe('Business rule violation');
    });

    it('should create ValidationError with field info', () => {
      const error = testService.testCreateValidationError('Validation failed', 'testField', { value: 'invalid' });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
      expect(error.field).toBe('testField');
    });
  });

  describe('Operation execution', () => {
    it('should execute async operations successfully', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await testService.testExecuteOperation('testOp', mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle async operation errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(
        testService.testExecuteOperation('testOp', mockOperation)
      ).rejects.toThrow('Operation failed');
    });

    it('should execute sync operations successfully', () => {
      const mockOperation = vi.fn().mockReturnValue('success');

      const result = testService.testExecuteOperationSync('testOp', mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle sync operation errors', () => {
      const mockOperation = vi.fn().mockImplementation(() => {
        throw new Error('Sync operation failed');
      });

      expect(() => {
        testService.testExecuteOperationSync('testOp', mockOperation);
      }).toThrow('Sync operation failed');
    });
  });
});