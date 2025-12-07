/**
 * Tests unitaires pour les erreurs personnalisées
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CustomError,
  BaseError,
  ValidationError,
  NotFoundError,
  AuthError,
  AuthorizationError,
  BusinessLogicError,
  DatabaseError,
  AuthenticationError,
  isCustomError
} from '../../lib/errors/custom-error';

describe('Erreurs personnalisées', () => {
  const mockTimestamp = '2024-01-15T10:30:00.000Z';

  beforeEach(() => {
    // Mock Date pour des tests prévisibles
    vi.useFakeTimers();
    vi.setSystemTime(new Date(mockTimestamp));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('CustomError', () => {
    it('devrait créer une erreur avec les propriétés de base', () => {
      const error = new CustomError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.name).toBe('CustomError');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.timestamp).toBe(mockTimestamp);
      expect(error.context).toEqual({});
      expect(error.field).toBeUndefined();
    });

    it('devrait créer une erreur avec tous les paramètres', () => {
      const context = { userId: '123', action: 'test' };
      const error = new CustomError(
        'Custom message',
        'CUSTOM_CODE',
        context,
        'testField'
      );

      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.context).toEqual(context);
      expect(error.field).toBe('testField');
    });

    it('devrait sérialiser correctement en JSON', () => {
      const context = { key: 'value' };
      const error = new CustomError('Test', 'TEST_CODE', context, 'field');
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'CustomError',
        message: 'Test',
        code: 'TEST_CODE',
        statusCode: 500,
        context,
        timestamp: mockTimestamp,
        stack: expect.any(String)
      });
    });

    it('devrait retourner le message utilisateur', () => {
      const error = new CustomError('Test message');
      expect(error.toUserMessage()).toBe('Test message');
    });

    it('devrait être une instance d\'Error', () => {
      const error = new CustomError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CustomError);
    });
  });

  describe('BaseError', () => {
    it('devrait hériter de CustomError', () => {
      const error = new BaseError('Base error');

      expect(error).toBeInstanceOf(CustomError);
      expect(error).toBeInstanceOf(BaseError);
      expect(error.statusCode).toBe(500);
    });
  });

  describe('ValidationError', () => {
    it('devrait créer une erreur de validation avec le bon code', () => {
      const error = new ValidationError('Invalid field', 'username');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('username');
      expect(error.message).toBe('Invalid field');
    });

    it('devrait fonctionner sans champ spécifique', () => {
      const error = new ValidationError('General validation error');

      expect(error.field).toBeUndefined();
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('devrait accepter un contexte personnalisé', () => {
      const context = { rules: ['required', 'minLength'] };
      const error = new ValidationError('Invalid', 'email', context);

      expect(error.context).toEqual(context);
    });
  });

  describe('NotFoundError', () => {
    it('devrait créer un message approprié avec identificateur', () => {
      const error = new NotFoundError('User', '123');

      expect(error.message).toBe("User with identifier '123' not found");
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('devrait créer un message approprié sans identificateur', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
    });

    it('devrait accepter un contexte', () => {
      const context = { searchCriteria: 'active' };
      const error = new NotFoundError('Product', 'ABC123', context);

      expect(error.context).toEqual(context);
    });
  });

  describe('AuthError', () => {
    it('devrait créer une erreur d\'authentification', () => {
      const error = new AuthError('Invalid credentials');

      expect(error.code).toBe('AUTH_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid credentials');
    });

    it('devrait accepter un contexte', () => {
      const context = { attemptedUsername: 'john' };
      const error = new AuthError('Login failed', context);

      expect(error.context).toEqual(context);
    });
  });

  describe('AuthorizationError', () => {
    it('devrait créer une erreur d\'autorisation', () => {
      const error = new AuthorizationError('Access denied');

      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
    });
  });

  describe('BusinessLogicError', () => {
    it('devrait créer une erreur de logique métier', () => {
      const error = new BusinessLogicError('Business rule violated');

      expect(error.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Business rule violated');
    });
  });

  describe('DatabaseError', () => {
    it('devrait créer une erreur de base de données', () => {
      const error = new DatabaseError('Connection failed', 'SELECT');

      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Connection failed');
      expect(error.operation).toBe('SELECT');
      expect(error.context).toEqual({ operation: 'SELECT' });
    });

    it('devrait fonctionner sans opération', () => {
      const error = new DatabaseError('Database error');

      expect(error.operation).toBeUndefined();
      expect(error.context).toEqual({ operation: undefined });
    });

    it('devrait combiner le contexte avec l\'opération', () => {
      const context = { table: 'users', retry: 3 };
      const error = new DatabaseError('Query failed', 'UPDATE', context);

      expect(error.context).toEqual({
        operation: 'UPDATE',
        table: 'users',
        retry: 3
      });
    });
  });

  describe('Aliases d\'erreurs', () => {
    it('AuthenticationError devrait être un alias de AuthError', () => {
      expect(AuthenticationError).toBe(AuthError);

      const error = new AuthenticationError('Auth failed');
      expect(error).toBeInstanceOf(AuthError);
      expect(error.code).toBe('AUTH_ERROR');
    });


  });

  describe('isCustomError type guard', () => {
    it('devrait identifier les CustomError', () => {
      const customError = new CustomError('Test');
      const validationError = new ValidationError('Invalid');
      const regularError = new Error('Regular');
      const notAnError = { message: 'Not an error' };

      expect(isCustomError(customError)).toBe(true);
      expect(isCustomError(validationError)).toBe(true);
      expect(isCustomError(regularError)).toBe(false);
      expect(isCustomError(notAnError)).toBe(false);
      expect(isCustomError(null)).toBe(false);
      expect(isCustomError(undefined)).toBe(false);
    });
  });

  describe('Héritage et polymorphisme', () => {
    it('toutes les erreurs personnalisées devraient hériter de CustomError', () => {
      const errors = [
        new BaseError('Base'),
        new ValidationError('Validation'),
        new NotFoundError('Resource'),
        new AuthError('Auth'),
        new AuthorizationError('Authorization'),
        new BusinessLogicError('Business'),
        new DatabaseError('Database')
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(CustomError);
        expect(error).toBeInstanceOf(Error);
        expect(isCustomError(error)).toBe(true);
      });
    });

    it('devrait avoir des codes d\'erreur uniques', () => {
      const errors = [
        new CustomError('Test'),
        new ValidationError('Validation'),
        new NotFoundError('Resource'),
        new AuthError('Auth'),
        new AuthorizationError('Authorization'),
        new BusinessLogicError('Business'),
        new DatabaseError('Database')
      ];

      const codes = errors.map(e => e.code);
      const uniqueCodes = [...new Set(codes)];

      expect(codes).toHaveLength(uniqueCodes.length);
    });

    it('devrait avoir des statusCodes HTTP appropriés', () => {
      const errorStatusPairs = [
        [new ValidationError('Test'), 400],
        [new NotFoundError('Test'), 404],
        [new AuthError('Test'), 401],
        [new AuthorizationError('Test'), 403],
        [new BusinessLogicError('Test'), 422],
        [new DatabaseError('Test'), 500],
        [new BaseError('Test'), 500],
        [new CustomError('Test'), 500]
      ] as const;

      errorStatusPairs.forEach(([error, expectedStatus]) => {
        expect(error.statusCode).toBe(expectedStatus);
      });
    });
  });
});