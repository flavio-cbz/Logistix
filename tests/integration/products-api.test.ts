/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  setupTestDatabase,
  createMockRequest,
  createAuthenticatedRequest,
  createTestSession,
  extractJsonResponse,
  assertApiResponse,
  assertValidationError,
  assertAuthError,
  assertNotFoundError
} from './api-test-setup';
import { createTestProduct } from '../setup/test-data-factory';

// Mock dependencies
vi.mock('@/lib/services/database/enhanced-database-service', () => ({
  EnhancedDatabaseService: {
    getInstance: vi.fn(() => ({
      queryOne: vi.fn(),
      execute: vi.fn(),
      queryAll: vi.fn(),
    })),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe.skip('Products API Integration Tests', () => {
  let testDb: any;
  let mockEnhancedDb: any;
  let mockCookies: any;
  let testSessionId: string;
  let getProductsHandler: any;
  let createProductHandler: any;

  beforeEach(async () => {
    ({ GET: getProductsHandler, POST: createProductHandler } = await import('@/app/api/v1/produits/route'));
    testDb = await setupTestDatabase();
    testSessionId = await createTestSession(testDb.db, testDb.testUser.id);
    
    mockEnhancedDb = {
      queryOne: vi.fn(),
      execute: vi.fn(),
      queryAll: vi.fn(),
    };
    
    const { cookies } = require('next/headers');
    mockCookies = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    cookies.mockReturnValue(mockCookies);
  });

  afterEach(() => {
    if (testDb?.cleanup) {
      testDb.cleanup();
    }
    vi.clearAllMocks();
  });

  describe('GET /api/v1/produits', () => {
    it('should return all products for authenticated user', async () => {
      // Arrange
      const products = [
        createTestProduct({ userId: testDb.testUser.id }),
        createTestProduct({ userId: testDb.testUser.id })
      ];

      // Mock authentication
      mockCookies.get.mockReturnValue({ value: testSessionId });
      mockEnhancedDb.queryOne.mockResolvedValue({
        session_id: testSessionId,
        user_id: testDb.testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testDb.testUser.username,
        email: testDb.testUser.email
      });

      // Mock products query
      mockEnhancedDb.queryAll.mockResolvedValue(products);

      const request = createAuthenticatedRequest(
        'GET', 
        'http://localhost:3000/api/v1/produits',
        testSessionId
      );

      // Act
      const response = await getProductsHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(200);
      assertApiResponse(responseData, 'success');
      expect(responseData.data).toHaveProperty('products');
      expect(responseData.data.products).toHaveLength(2);
      expect(responseData.data.products[0]).toHaveProperty('id');
      expect(responseData.data.products[0]).toHaveProperty('name');
    });

    it('should return 401 for unauthenticated request', async () => {
      // Arrange
      mockCookies.get.mockReturnValue(undefined);

      const request = createMockRequest('GET', 'http://localhost:3000/api/v1/produits');

      // Act
      const response = await getProductsHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(401);
      assertAuthError(responseData, 'Authentication required');
    });

    it('should return 401 for expired session', async () => {
      // Arrange
      mockCookies.get.mockReturnValue({ value: testSessionId });
      mockEnhancedDb.queryOne.mockResolvedValue({
        session_id: testSessionId,
        user_id: testDb.testUser.id,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired
        username: testDb.testUser.username,
        email: testDb.testUser.email
      });
      mockEnhancedDb.execute.mockResolvedValue(undefined); // For cleanup

      const request = createAuthenticatedRequest(
        'GET', 
        'http://localhost:3000/api/v1/produits',
        testSessionId
      );

      // Act
      const response = await getProductsHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(401);
      assertAuthError(responseData, 'Session expired');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockCookies.get.mockReturnValue({ value: testSessionId });
      mockEnhancedDb.queryOne.mockResolvedValue({
        session_id: testSessionId,
        user_id: testDb.testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testDb.testUser.username,
        email: testDb.testUser.email
      });
      mockEnhancedDb.queryAll.mockRejectedValue(new Error('Database error'));

      const request = createAuthenticatedRequest(
        'GET', 
        'http://localhost:3000/api/v1/produits',
        testSessionId
      );

      // Act
      const response = await getProductsHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(500);
      assertApiResponse(responseData, 'error');
      expect(responseData.error.code).toBe('SERVICE_ERROR');
    });
  });

  describe('POST /api/v1/produits', () => {
    it('should create a new product successfully', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        brand: 'Test Brand',
        price: 29.99,
        poids: 0.5,
        condition: 'neuf',
        description: 'Test description'
      };

      const createdProduct = createTestProduct({
        ...productData,
        userId: testDb.testUser.id
      });

      // Mock authentication
      mockCookies.get.mockReturnValue({ value: testSessionId });
      mockEnhancedDb.queryOne.mockResolvedValue({
        session_id: testSessionId,
        user_id: testDb.testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testDb.testUser.username,
        email: testDb.testUser.email
      });

      // Mock product creation
      mockEnhancedDb.execute.mockResolvedValue(undefined);
      mockEnhancedDb.queryOne.mockResolvedValueOnce(createdProduct); // For returning created product

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/produits',
        testSessionId,
        productData
      );

      // Act
      const response = await createProductHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(201);
      assertApiResponse(responseData, 'success');
      expect(responseData.data).toHaveProperty('product');
      expect(responseData.data.product).toHaveProperty('name', productData.name);
      expect(responseData.data.product).toHaveProperty('brand', productData.brand);
      expect(responseData.data.product).toHaveProperty('price', productData.price);
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      const productData = {
        brand: 'Test Brand'
        // Missing name/titre and price
      };

      // Mock authentication
      mockCookies.get.mockReturnValue({ value: testSessionId });
      mockEnhancedDb.queryOne.mockResolvedValue({
        session_id: testSessionId,
        user_id: testDb.testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testDb.testUser.username,
        email: testDb.testUser.email
      });

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/produits',
        testSessionId,
        productData
      );

      // Act
      const response = await createProductHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertValidationError(responseData, undefined, 'Le nom ou le titre du produit est requis');
    });

    it('should return 400 for missing price', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        brand: 'Test Brand'
        // Missing price
      };

      // Mock authentication
      mockCookies.get.mockReturnValue({ value: testSessionId });
      mockEnhancedDb.queryOne.mockResolvedValue({
        session_id: testSessionId,
        user_id: testDb.testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testDb.testUser.username,
        email: testDb.testUser.email
      });

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/produits',
        testSessionId,
        productData
      );

      // Act
      const response = await createProductHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertValidationError(responseData, undefined, 'Le prix du produit est requis');
    });

    it('should return 400 for invalid price value', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        brand: 'Test Brand',
        price: -10 // Invalid negative price
      };

      // Mock authentication
      mockCookies.get.mockReturnValue({ value: testSessionId });
      mockEnhancedDb.queryOne.mockResolvedValue({
        session_id: testSessionId,
        user_id: testDb.testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testDb.testUser.username,
        email: testDb.testUser.email
      });

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/produits',
        testSessionId,
        productData
      );

      // Act
      const response = await createProductHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertValidationError(responseData, undefined, 'Le prix doit être positif ou zéro');
    });

    it('should return 401 for unauthenticated request', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        brand: 'Test Brand',
        price: 29.99
      };

      mockCookies.get.mockReturnValue(undefined);

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/produits',
        productData
      );

      // Act
      const response = await createProductHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(401);
      assertAuthError(responseData, 'Authentication required');
    });

    it('should validate parcelle ownership when parcelleId provided', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        brand: 'Test Brand',
        price: 29.99,
        parcelleId: testDb.testParcelle.id
      };

      // Mock authentication
      mockCookies.get.mockReturnValue({ value: testSessionId });
      mockEnhancedDb.queryOne
        .mockResolvedValueOnce({
          session_id: testSessionId,
          user_id: testDb.testUser.id,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          username: testDb.testUser.username,
          email: testDb.testUser.email
        })
        .mockResolvedValueOnce(testDb.testParcelle); // Parcelle validation

      const createdProduct = createTestProduct({
        ...productData,
        userId: testDb.testUser.id,
        parcelleId: testDb.testParcelle.id
      });

      mockEnhancedDb.execute.mockResolvedValue(undefined);
      mockEnhancedDb.queryOne.mockResolvedValueOnce(createdProduct);

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/produits',
        testSessionId,
        productData
      );

      // Act
      const response = await createProductHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(201);
      assertApiResponse(responseData, 'success');
      expect(responseData.data.product).toHaveProperty('parcelleId', testDb.testParcelle.id);
    });

    it('should return 400 for invalid JSON body', async () => {
      // Arrange
      const request = new Request('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cookie': `logistix_session=${testSessionId}`
        },
        body: 'invalid json'
      });

      // Act
      const response = await createProductHandler(request as any);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertApiResponse(responseData, 'error');
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database constraint errors', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        brand: 'Test Brand',
        price: 29.99
      };

      // Mock authentication
      mockCookies.get.mockReturnValue({ value: testSessionId });
      mockEnhancedDb.queryOne.mockResolvedValue({
        session_id: testSessionId,
        user_id: testDb.testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testDb.testUser.username,
        email: testDb.testUser.email
      });

      // Mock database constraint error
      mockEnhancedDb.execute.mockRejectedValue(new Error('UNIQUE constraint failed'));

      const request = createAuthenticatedRequest(
        'POST',
        'http://localhost:3000/api/v1/produits',
        testSessionId,
        productData
      );

      // Act
      const response = await createProductHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertValidationError(responseData, undefined, 'A record with this value already exists');
    });
  });
});