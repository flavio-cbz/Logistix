import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/v1/market-analysis/route';
import { getSessionUser } from '@/lib/services/auth';
import { db } from '@/lib/services/database/drizzle-client';
import { marketAnalyses } from '@/lib/services/database/drizzle-schema';
import { vintedMarketAnalysisService } from '@/lib/services/vinted-market-analysis';
import { vintedCatalogHierarchyService } from '@/lib/services/vinted-catalog-hierarchy';
import { cacheManager } from '@/lib/services/cache-manager';

// Mock dependencies
vi.mock('@/lib/services/auth');
vi.mock('@/lib/services/database/drizzle-client');
vi.mock('@/lib/services/vinted-market-analysis');
vi.mock('@/lib/services/vinted-catalog-hierarchy');
vi.mock('@/lib/services/cache-manager');

const mockGetSessionUser = vi.mocked(getSessionUser);
const mockDb = vi.mocked(db);
const mockVintedMarketAnalysisService = vi.mocked(vintedMarketAnalysisService);
const mockVintedCatalogHierarchyService = vi.mocked(vintedCatalogHierarchyService);
const mockCacheManager = vi.mocked(cacheManager);

describe('Market Analysis API - Direct HTTP Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser'
  };

  const mockAnalysisResult = {
    salesVolume: 25,
    avgPrice: 45.50,
    priceRange: { min: 20.00, max: 80.00 },
    brandInfo: { id: 123, name: 'Nike' },
    catalogInfo: { id: 456, name: 'Sneakers' },
    rawItems: [],
    analysisDate: '2025-01-01T00:00:00.000Z'
  };

  const mockCategory = {
    id: 456,
    name: 'Sneakers',
    level: 3,
    isValidForAnalysis: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockGetSessionUser.mockResolvedValue(mockUser);
    mockVintedCatalogHierarchyService.findCategoryById.mockReturnValue(mockCategory);
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);
    
    // Mock database operations
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    });
    mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    });
    mockDb.query = {
      marketAnalyses: {
        findMany: vi.fn().mockResolvedValue([])
      }
    } as any;
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }])
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/market-analysis', () => {
    it('should successfully create market analysis with valid data', async () => {
      // Arrange
      const validRequest = {
        productName: 'Nike Air Max',
        catalogId: 456,
        categoryName: 'Sneakers'
      };

      mockVintedMarketAnalysisService.analyzeProduct.mockResolvedValue(mockAnalysisResult);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify(validRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        salesVolume: mockAnalysisResult.salesVolume,
        avgPrice: mockAnalysisResult.avgPrice,
        priceRange: mockAnalysisResult.priceRange,
        brandInfo: mockAnalysisResult.brandInfo,
        analysisDate: mockAnalysisResult.analysisDate
      });
      expect(mockVintedMarketAnalysisService.analyzeProduct).toHaveBeenCalledWith({
        productName: validRequest.productName,
        catalogId: validRequest.catalogId,
        token: 'valid-session-cookie'
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetSessionUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
      expect(data.error.message).toBe('Authentification requise');
    });

    it('should return 400 when request body is invalid JSON', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_JSON');
      expect(data.error.message).toBe('Corps de requête JSON invalide');
    });

    it('should return 400 when catalogId is missing', async () => {
      // Arrange
      const invalidRequest = {
        productName: 'Nike Air Max'
        // catalogId is missing
      };

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('MISSING_CATALOG_ID');
      expect(data.error.message).toBe("L'ID de catalogue est requis");
    });

    it('should return 400 when catalogId is invalid', async () => {
      // Arrange
      mockVintedCatalogHierarchyService.findCategoryById.mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Test', catalogId: 999 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_CATALOG_ID');
      expect(data.error.message).toBe('Catégorie avec l\'ID 999 non trouvée');
    });

    it('should return 400 when category is not level 3', async () => {
      // Arrange
      const invalidCategory = {
        id: 456,
        name: 'Parent Category',
        level: 2,
        isValidForAnalysis: false
      };
      mockVintedCatalogHierarchyService.findCategoryById.mockReturnValue(invalidCategory);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_CATEGORY_LEVEL');
      expect(data.error.message).toBe('La catégorie doit être de niveau 3 pour l\'analyse de marché');
    });

    it('should return 400 when Vinted session cookie is missing', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
        // x-vinted-auth header is missing
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('SESSION_COOKIE_NOT_CONFIGURED');
      expect(data.error.message).toBe('Cookie de session Vinted non configuré');
    });

    it('should handle Vinted API errors gracefully', async () => {
      // Arrange
      const vintedError = new Error('Vinted API Error');
      vintedError.name = 'VintedApiError';
      (vintedError as any).status = 502;
      
      mockVintedMarketAnalysisService.analyzeProduct.mockRejectedValue(vintedError);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(502);
      expect(data.error.code).toBe('VINTED_API_ERROR');
      expect(data.error.message).toBe('Vinted API Error');
    });

    it('should return cached results when available', async () => {
      // Arrange
      mockCacheManager.get.mockResolvedValue(mockAnalysisResult);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify({ productName: 'Nike Air Max', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        salesVolume: mockAnalysisResult.salesVolume,
        avgPrice: mockAnalysisResult.avgPrice
      });
      expect(mockVintedMarketAnalysisService.analyzeProduct).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/market-analysis', () => {
    const mockAnalyses = [
      {
        id: 'analysis-1',
        productName: 'Nike Air Max',
        catalogId: 456,
        categoryName: 'Sneakers',
        brandId: 123,
        status: 'completed',
        error: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:05:00.000Z',
        result: mockAnalysisResult
      },
      {
        id: 'analysis-2',
        productName: 'Adidas Ultraboost',
        catalogId: 456,
        categoryName: 'Sneakers',
        brandId: 124,
        status: 'pending',
        error: null,
        createdAt: '2025-01-01T01:00:00.000Z',
        updatedAt: null,
        result: null
      }
    ];

    it('should return paginated list of user analyses', async () => {
      // Arrange
      mockDb.query.marketAnalyses.findMany.mockResolvedValue(mockAnalyses);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }])
        })
      });

      const request = new NextRequest('http://localhost/api/v1/market-analysis?page=1&limit=10');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        analyses: mockAnalyses
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockGetSessionUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/market-analysis');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });

    it('should filter analyses by product name', async () => {
      // Arrange
      const filteredAnalyses = [mockAnalyses[0]];
      mockDb.query.marketAnalyses.findMany.mockResolvedValue(filteredAnalyses);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }])
        })
      });

      const request = new NextRequest('http://localhost/api/v1/market-analysis?productName=Nike');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.analyses).toHaveLength(1);
      expect(data.analyses[0].productName).toContain('Nike');
    });

    it('should filter analyses by status', async () => {
      // Arrange
      const completedAnalyses = [mockAnalyses[0]];
      mockDb.query.marketAnalyses.findMany.mockResolvedValue(completedAnalyses);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }])
        })
      });

      const request = new NextRequest('http://localhost/api/v1/market-analysis?status=completed');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.analyses).toHaveLength(1);
      expect(data.analyses[0].status).toBe('completed');
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      mockDb.query.marketAnalyses.findMany.mockResolvedValue([mockAnalyses[1]]);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }])
        })
      });

      const request = new NextRequest('http://localhost/api/v1/market-analysis?page=2&limit=1');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDb.query.marketAnalyses.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/v1/market-analysis');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Authentication and Token Management', () => {
    it('should handle JWT Bearer token format', async () => {
      // Arrange
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      mockVintedMarketAnalysisService.analyzeProduct.mockResolvedValue(mockAnalysisResult);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': jwtToken
        },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockVintedMarketAnalysisService.analyzeProduct).toHaveBeenCalledWith({
        productName: 'Test',
        catalogId: 456,
        token: jwtToken
      });
    });

    it('should handle session cookie format', async () => {
      // Arrange
      const sessionCookie = 'session-cookie-value';
      mockVintedMarketAnalysisService.analyzeProduct.mockResolvedValue(mockAnalysisResult);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': sessionCookie
        },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockVintedMarketAnalysisService.analyzeProduct).toHaveBeenCalledWith({
        productName: 'Test',
        catalogId: 456,
        token: sessionCookie
      });
    });
  });

  describe('Data Processing and Aggregation', () => {
    it('should process and aggregate market data correctly', async () => {
      // Arrange
      const complexAnalysisResult = {
        ...mockAnalysisResult,
        salesVolume: 150,
        avgPrice: 67.89,
        priceRange: { min: 15.00, max: 120.00 },
        rawItems: Array(150).fill(null).map((_, i) => ({
          title: `Product ${i}`,
          price: { amount: (15 + i * 0.7).toFixed(2), currency: 'EUR' },
          brand: { id: 123, title: 'Nike' }
        }))
      };

      mockVintedMarketAnalysisService.analyzeProduct.mockResolvedValue(complexAnalysisResult);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify({ productName: 'Nike Collection', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.salesVolume).toBe(150);
      expect(data.avgPrice).toBe(67.89);
      expect(data.priceRange).toEqual({ min: 15.00, max: 120.00 });
      expect(data.brandInfo).toEqual({ id: 123, name: 'Nike' });
    });

    it('should handle empty analysis results', async () => {
      // Arrange
      const emptyResult = {
        salesVolume: 0,
        avgPrice: 0,
        priceRange: { min: 0, max: 0 },
        brandInfo: null,
        catalogInfo: { id: 456, name: 'Sneakers' },
        rawItems: [],
        analysisDate: '2025-01-01T00:00:00.000Z'
      };

      mockVintedMarketAnalysisService.analyzeProduct.mockResolvedValue(emptyResult);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify({ productName: 'Rare Product', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.salesVolume).toBe(0);
      expect(data.avgPrice).toBe(0);
      expect(data.brandInfo).toBeNull();
    });
  });

  describe('Error Handling for External API Failures', () => {
    it('should handle network timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'VintedApiError';
      (timeoutError as any).status = 408;
      
      mockVintedMarketAnalysisService.analyzeProduct.mockRejectedValue(timeoutError);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(408);
      expect(data.error.code).toBe('VINTED_API_ERROR');
      expect(data.error.message).toBe('Network timeout');
    });

    it('should handle rate limiting errors', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'VintedApiError';
      (rateLimitError as any).status = 429;
      
      mockVintedMarketAnalysisService.analyzeProduct.mockRejectedValue(rateLimitError);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(data.error.code).toBe('VINTED_API_ERROR');
      expect(data.error.message).toBe('Rate limit exceeded');
    });

    it('should handle validation errors from Vinted', async () => {
      // Arrange
      const validationError = new Error('Invalid product data');
      validationError.name = 'VintedValidationError';
      
      mockVintedMarketAnalysisService.analyzeProduct.mockRejectedValue(validationError);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VINTED_VALIDATION_ERROR');
      expect(data.error.message).toBe('Invalid product data');
    });

    it('should handle server errors from Vinted API', async () => {
      // Arrange
      const serverError = new Error('Internal server error');
      serverError.name = 'VintedApiError';
      (serverError as any).status = 500;
      
      mockVintedMarketAnalysisService.analyzeProduct.mockRejectedValue(serverError);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('VINTED_API_ERROR');
      expect(data.error.message).toBe('Internal server error');
    });

    it('should update database status on analysis failure', async () => {
      // Arrange
      const analysisError = new Error('Analysis failed');
      analysisError.name = 'VintedApiError';
      (analysisError as any).status = 502;
      
      mockVintedMarketAnalysisService.analyzeProduct.mockRejectedValue(analysisError);

      const request = new NextRequest('http://localhost/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vinted-auth': 'valid-session-cookie'
        },
        body: JSON.stringify({ productName: 'Test', catalogId: 456 })
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(502);
      expect(mockDb.update).toHaveBeenCalledWith(marketAnalyses);
      expect(mockDb.update().set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'Analysis failed'
        })
      );
    });
  });
});