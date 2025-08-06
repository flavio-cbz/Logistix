/**
 * Validation Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mock validation schemas (since we don't have the actual file yet)
const mockValidationSchemas = {
  // User validation
  userSchema: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1).max(100),
    age: z.number().min(0).max(150).optional(),
    createdAt: z.date().optional()
  }),

  // Product validation
  productSchema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    price: z.number().positive(),
    category: z.string().min(1),
    description: z.string().optional(),
    inStock: z.boolean().default(true)
  }),

  // Parcel validation
  parcelSchema: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    location: z.string().min(1),
    size: z.number().positive(),
    type: z.enum(['agricultural', 'residential', 'commercial']),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180)
    }).optional()
  }),

  // Market analysis validation
  marketAnalysisSchema: z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    platform: z.enum(['vinted', 'leboncoin', 'facebook']),
    query: z.string().min(1),
    filters: z.object({
      priceMin: z.number().min(0).optional(),
      priceMax: z.number().min(0).optional(),
      condition: z.enum(['new', 'very_good', 'good', 'satisfactory']).optional(),
      brand: z.string().optional()
    }).optional(),
    results: z.array(z.object({
      title: z.string(),
      price: z.number(),
      condition: z.string(),
      url: z.string().url(),
      imageUrl: z.string().url().optional()
    })).optional()
  }),

  // API response validation
  apiResponseSchema: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional()
    }).optional(),
    meta: z.object({
      timestamp: z.string().datetime(),
      requestId: z.string().uuid(),
      version: z.string()
    }).optional()
  })
};

describe('Validation Schemas', () => {
  describe('userSchema', () => {
    it('should validate valid user data', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John Doe',
        age: 30
      };

      const result = mockValidationSchemas.userSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validUser);
      }
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        name: 'John Doe'
      };

      const result = mockValidationSchemas.userSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path).toEqual(['email']);
      }
    });

    it('should reject invalid UUID', () => {
      const invalidUser = {
        id: 'not-a-uuid',
        email: 'test@example.com',
        name: 'John Doe'
      };

      const result = mockValidationSchemas.userSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: ''
      };

      const result = mockValidationSchemas.userSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject negative age', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John Doe',
        age: -5
      };

      const result = mockValidationSchemas.userSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const minimalUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John Doe'
      };

      const result = mockValidationSchemas.userSchema.safeParse(minimalUser);
      expect(result.success).toBe(true);
    });
  });

  describe('productSchema', () => {
    it('should validate valid product data', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 29.99,
        category: 'Electronics',
        description: 'A great product',
        inStock: true
      };

      const result = mockValidationSchemas.productSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const invalidProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: -10,
        category: 'Electronics'
      };

      const result = mockValidationSchemas.productSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
    });

    it('should reject zero price', () => {
      const invalidProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 0,
        category: 'Electronics'
      };

      const result = mockValidationSchemas.productSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
    });

    it('should use default value for inStock', () => {
      const product = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        price: 29.99,
        category: 'Electronics'
      };

      const result = mockValidationSchemas.productSchema.safeParse(product);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inStock).toBe(true);
      }
    });
  });

  describe('parcelSchema', () => {
    it('should validate valid parcel data', () => {
      const validParcel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Farm Plot A',
        location: 'Rural Area, County',
        size: 1000.5,
        type: 'agricultural' as const,
        coordinates: {
          lat: 45.5231,
          lng: -122.6765
        }
      };

      const result = mockValidationSchemas.parcelSchema.safeParse(validParcel);
      expect(result.success).toBe(true);
    });

    it('should reject invalid parcel type', () => {
      const invalidParcel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Farm Plot A',
        location: 'Rural Area, County',
        size: 1000.5,
        type: 'invalid-type'
      };

      const result = mockValidationSchemas.parcelSchema.safeParse(invalidParcel);
      expect(result.success).toBe(false);
    });

    it('should reject invalid coordinates', () => {
      const invalidParcel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Farm Plot A',
        location: 'Rural Area, County',
        size: 1000.5,
        type: 'agricultural' as const,
        coordinates: {
          lat: 95, // Invalid latitude
          lng: -122.6765
        }
      };

      const result = mockValidationSchemas.parcelSchema.safeParse(invalidParcel);
      expect(result.success).toBe(false);
    });

    it('should accept parcel without coordinates', () => {
      const parcel = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Farm Plot A',
        location: 'Rural Area, County',
        size: 1000.5,
        type: 'agricultural' as const
      };

      const result = mockValidationSchemas.parcelSchema.safeParse(parcel);
      expect(result.success).toBe(true);
    });
  });

  describe('marketAnalysisSchema', () => {
    it('should validate valid market analysis data', () => {
      const validAnalysis = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        productId: '456e7890-e89b-12d3-a456-426614174000',
        platform: 'vinted' as const,
        query: 'vintage jacket',
        filters: {
          priceMin: 10,
          priceMax: 100,
          condition: 'good' as const,
          brand: 'Nike'
        },
        results: [
          {
            title: 'Vintage Nike Jacket',
            price: 45.99,
            condition: 'good',
            url: 'https://example.com/item/1',
            imageUrl: 'https://example.com/image/1.jpg'
          }
        ]
      };

      const result = mockValidationSchemas.marketAnalysisSchema.safeParse(validAnalysis);
      expect(result.success).toBe(true);
    });

    it('should reject invalid platform', () => {
      const invalidAnalysis = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        productId: '456e7890-e89b-12d3-a456-426614174000',
        platform: 'invalid-platform',
        query: 'vintage jacket'
      };

      const result = mockValidationSchemas.marketAnalysisSchema.safeParse(invalidAnalysis);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL in results', () => {
      const invalidAnalysis = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        productId: '456e7890-e89b-12d3-a456-426614174000',
        platform: 'vinted' as const,
        query: 'vintage jacket',
        results: [
          {
            title: 'Vintage Nike Jacket',
            price: 45.99,
            condition: 'good',
            url: 'not-a-valid-url'
          }
        ]
      };

      const result = mockValidationSchemas.marketAnalysisSchema.safeParse(invalidAnalysis);
      expect(result.success).toBe(false);
    });
  });

  describe('apiResponseSchema', () => {
    it('should validate successful API response', () => {
      const successResponse = {
        success: true,
        data: { id: 1, name: 'Test' },
        meta: {
          timestamp: '2024-01-01T12:00:00Z',
          requestId: '123e4567-e89b-12d3-a456-426614174000',
          version: '1.0.0'
        }
      };

      const result = mockValidationSchemas.apiResponseSchema.safeParse(successResponse);
      expect(result.success).toBe(true);
    });

    it('should validate error API response', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: { field: 'email', reason: 'invalid format' }
        }
      };

      const result = mockValidationSchemas.apiResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid datetime format', () => {
      const invalidResponse = {
        success: true,
        meta: {
          timestamp: 'invalid-datetime',
          requestId: '123e4567-e89b-12d3-a456-426614174000',
          version: '1.0.0'
        }
      };

      const result = mockValidationSchemas.apiResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });
});

describe('Validation Utilities', () => {
  describe('Custom validation functions', () => {
    it('should validate email format', () => {
      const emailSchema = z.string().email();
      
      expect(emailSchema.safeParse('test@example.com').success).toBe(true);
      expect(emailSchema.safeParse('user+tag@domain.co.uk').success).toBe(true);
      expect(emailSchema.safeParse('invalid-email').success).toBe(false);
      expect(emailSchema.safeParse('').success).toBe(false);
    });

    it('should validate UUID format', () => {
      const uuidSchema = z.string().uuid();
      
      expect(uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
      expect(uuidSchema.safeParse('').success).toBe(false);
    });

    it('should validate URL format', () => {
      const urlSchema = z.string().url();
      
      expect(urlSchema.safeParse('https://example.com').success).toBe(true);
      expect(urlSchema.safeParse('http://localhost:3000/api').success).toBe(true);
      expect(urlSchema.safeParse('ftp://files.example.com').success).toBe(true);
      expect(urlSchema.safeParse('not-a-url').success).toBe(false);
      expect(urlSchema.safeParse('').success).toBe(false);
    });

    it('should validate datetime format', () => {
      const datetimeSchema = z.string().datetime();
      
      expect(datetimeSchema.safeParse('2024-01-01T12:00:00Z').success).toBe(true);
      expect(datetimeSchema.safeParse('2024-01-01T12:00:00.000Z').success).toBe(true);
      expect(datetimeSchema.safeParse('2024-01-01T12:00:00+02:00').success).toBe(true);
      expect(datetimeSchema.safeParse('2024-01-01 12:00:00').success).toBe(false);
      expect(datetimeSchema.safeParse('invalid-datetime').success).toBe(false);
    });
  });

  describe('Schema composition', () => {
    it('should compose schemas correctly', () => {
      const baseSchema = z.object({
        id: z.string().uuid(),
        createdAt: z.string().datetime()
      });

      const extendedSchema = baseSchema.extend({
        name: z.string().min(1),
        email: z.string().email()
      });

      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2024-01-01T12:00:00Z',
        name: 'John Doe',
        email: 'john@example.com'
      };

      expect(extendedSchema.safeParse(validData).success).toBe(true);
    });

    it('should handle optional fields in composition', () => {
      const baseSchema = z.object({
        id: z.string().uuid()
      });

      const extendedSchema = baseSchema.extend({
        name: z.string().optional(),
        email: z.string().email().optional()
      });

      const minimalData = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(extendedSchema.safeParse(minimalData).success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should provide detailed error information', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(0).max(150)
      });

      const invalidData = {
        email: 'invalid-email',
        age: -5
      };

      const result = schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
        expect(result.error.issues.some(issue => issue.path.includes('email'))).toBe(true);
        expect(result.error.issues.some(issue => issue.path.includes('age'))).toBe(true);
      }
    });

    it('should handle nested object validation errors', () => {
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
          profile: z.object({
            age: z.number().min(0)
          })
        })
      });

      const invalidData = {
        user: {
          email: 'invalid-email',
          profile: {
            age: -5
          }
        }
      };

      const result = schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
        expect(result.error.issues.some(issue => 
          issue.path.includes('user') && issue.path.includes('email')
        )).toBe(true);
        expect(result.error.issues.some(issue => 
          issue.path.includes('profile') && issue.path.includes('age')
        )).toBe(true);
      }
    });
  });
});