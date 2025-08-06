import { describe, it, expect } from 'vitest'
import { 
  validateCreateMarketAnalysis, 
  validatePagination, 
  validateTaskId,
  SimilarSaleInputSchema,
  PaginationSchema,
  TaskIdSchema
} from '../validation'

describe('Validation Schemas', () => {
  describe('SimilarSaleInputSchema', () => {
    const validSale = {
      id: 'item-1',
      price: { amount: 25.99, currency: 'EUR' },
      size_title: 'T-shirt Medium',
      status: 'sold',
      user: { login: 'seller1', feedback_reputation: 95 },
      photos: [{ url: 'https://example.com/photo1.jpg' }],
      created_at: '2023-01-01T10:00:00Z',
      sold_at: '2023-01-02T15:30:00Z'
    }

    it('should validate correct similar sale data', () => {
      expect(() => SimilarSaleInputSchema.parse(validSale)).not.toThrow()
    })

    it('should reject empty ID', () => {
      const invalidSale = { ...validSale, id: '' }
      expect(() => SimilarSaleInputSchema.parse(invalidSale)).toThrow()
    })

    it('should reject negative price amount', () => {
      const invalidSale = { ...validSale, price: { amount: -10, currency: 'EUR' } }
      expect(() => SimilarSaleInputSchema.parse(invalidSale)).toThrow()
    })

    it('should reject empty currency', () => {
      const invalidSale = { ...validSale, price: { amount: 25.99, currency: '' } }
      expect(() => SimilarSaleInputSchema.parse(invalidSale)).toThrow()
    })

    it('should reject invalid photo URL', () => {
      const invalidSale = { ...validSale, photos: [{ url: 'not-a-url' }] }
      expect(() => SimilarSaleInputSchema.parse(invalidSale)).toThrow()
    })

    it('should reject negative feedback reputation', () => {
      const invalidSale = { ...validSale, user: { login: 'seller1', feedback_reputation: -1 } }
      expect(() => SimilarSaleInputSchema.parse(invalidSale)).toThrow()
    })
  })

  describe('validateCreateMarketAnalysis', () => {
    const validSales = [
      {
        id: 'item-1',
        price: { amount: 25.99, currency: 'EUR' },
        size_title: 'T-shirt Medium',
        status: 'sold',
        user: { login: 'seller1', feedback_reputation: 95 },
        photos: [{ url: 'https://example.com/photo1.jpg' }],
        created_at: '2023-01-01T10:00:00Z',
        sold_at: '2023-01-02T15:30:00Z'
      }
    ]

    it('should validate correct array of sales', () => {
      expect(() => validateCreateMarketAnalysis(validSales)).not.toThrow()
    })

    it('should reject empty array', () => {
      expect(() => validateCreateMarketAnalysis([])).toThrow()
    })

    it('should reject non-array input', () => {
      expect(() => validateCreateMarketAnalysis('not an array')).toThrow()
    })

    it('should reject array with invalid sales', () => {
      const invalidSales = [{ ...validSales[0], id: '' }]
      expect(() => validateCreateMarketAnalysis(invalidSales)).toThrow()
    })
  })

  describe('PaginationSchema', () => {
    it('should validate correct pagination parameters', () => {
      const result = PaginationSchema.parse({ page: 2, limit: 5 })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(5)
    })

    it('should use default values', () => {
      const result = PaginationSchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('should reject page less than 1', () => {
      expect(() => PaginationSchema.parse({ page: 0, limit: 10 })).toThrow()
    })

    it('should reject limit greater than 50', () => {
      expect(() => PaginationSchema.parse({ page: 1, limit: 100 })).toThrow()
    })

    it('should reject negative limit', () => {
      expect(() => PaginationSchema.parse({ page: 1, limit: -5 })).toThrow()
    })
  })

  describe('validatePagination', () => {
    it('should validate URLSearchParams correctly', () => {
      const searchParams = new URLSearchParams('page=2&limit=5')
      const result = validatePagination(searchParams)
      expect(result.page).toBe(2)
      expect(result.limit).toBe(5)
    })

    it('should use defaults for missing parameters', () => {
      const searchParams = new URLSearchParams('')
      const result = validatePagination(searchParams)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('should handle invalid string values', () => {
      const searchParams = new URLSearchParams('page=invalid&limit=abc')
      // Should use defaults when parsing fails
      const result = validatePagination(searchParams)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })
  })

  describe('TaskIdSchema', () => {
    it('should validate correct UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(() => TaskIdSchema.parse({ id: validUuid })).not.toThrow()
    })

    it('should reject invalid UUID format', () => {
      expect(() => TaskIdSchema.parse({ id: 'not-a-uuid' })).toThrow()
    })

    it('should reject empty string', () => {
      expect(() => TaskIdSchema.parse({ id: '' })).toThrow()
    })
  })

  describe('validateTaskId', () => {
    it('should validate correct UUID string', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(() => validateTaskId(validUuid)).not.toThrow()
    })

    it('should reject invalid UUID string', () => {
      expect(() => validateTaskId('not-a-uuid')).toThrow()
    })
  })
})