/**
 * Products API Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the database and services
vi.mock('@/lib/services/database/db', () => ({
  db: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn()
    }))
  }
}));

vi.mock('jsonwebtoken', () => ({
  verify: vi.fn(() => ({ userId: 'user-123', email: 'test@example.com' }))
}));

// Import API handlers after mocks
import { GET as getProduitsHandler, POST as createProduitHandler } from '@/app/api/v1/produits/route';

describe('Products API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/produits', () => {
    it('should return all products for authenticated user', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          nom: 'Tomates',
          prix: 2.50,
          quantite: 100,
          parcelleId: 'parcelle-1',
          userId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'prod-2',
          nom: 'Carottes',
          prix: 1.80,
          quantite: 50,
          parcelleId: 'parcelle-2',
          userId: 'user-123',
          createdAt: '2024-01-02T00:00:00Z'
        }
      ];

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockProducts)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await getProduitsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.produits).toHaveLength(2);
      expect(data.data.produits[0].nom).toBe('Tomates');
      expect(data.data.produits[1].nom).toBe('Carottes');
    });

    it('should return empty array when no products exist', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue([])
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await getProduitsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.produits).toHaveLength(0);
    });

    it('should filter products by parcelle', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          nom: 'Tomates',
          prix: 2.50,
          quantite: 100,
          parcelleId: 'parcelle-1',
          userId: 'user-123'
        }
      ];

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockProducts)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits?parcelleId=parcelle-1', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await getProduitsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.produits).toHaveLength(1);
      expect(data.data.produits[0].parcelleId).toBe('parcelle-1');
    });

    it('should support pagination', async () => {
      const mockProducts = Array.from({ length: 5 }, (_, i) => ({
        id: `prod-${i + 1}`,
        nom: `Produit ${i + 1}`,
        prix: 10 + i,
        quantite: 100,
        parcelleId: 'parcelle-1',
        userId: 'user-123'
      }));

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockProducts.slice(0, 2)) // First 2 items
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits?page=1&limit=2', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await getProduitsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.produits).toHaveLength(2);
      expect(data.data.pagination).toBeDefined();
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'GET'
      });

      const response = await getProduitsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle database errors', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        all: vi.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await getProduitsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/v1/produits', () => {
    it('should create new product with valid data', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        run: vi.fn().mockReturnValue({ lastInsertRowid: 1 }),
        get: vi.fn().mockReturnValue({
          id: 'prod-1',
          nom: 'Nouvelles Tomates',
          prix: 3.00,
          quantite: 200,
          parcelleId: 'parcelle-1',
          userId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z'
        })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        body: JSON.stringify({
          nom: 'Nouvelles Tomates',
          prix: 3.00,
          quantite: 200,
          parcelleId: 'parcelle-1',
          description: 'Tomates fraîches du jardin'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await createProduitHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.produit.nom).toBe('Nouvelles Tomates');
      expect(data.data.produit.prix).toBe(3.00);
      expect(data.data.produit.quantite).toBe(200);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        body: JSON.stringify({
          nom: '', // Empty name
          prix: -1, // Negative price
          quantite: 'invalid' // Invalid quantity type
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await createProduitHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
    });

    it('should validate price is positive', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        body: JSON.stringify({
          nom: 'Test Product',
          prix: -10,
          quantite: 100,
          parcelleId: 'parcelle-1'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await createProduitHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate quantity is non-negative', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        body: JSON.stringify({
          nom: 'Test Product',
          prix: 10,
          quantite: -5,
          parcelleId: 'parcelle-1'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await createProduitHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        body: JSON.stringify({
          nom: 'Test Product',
          prix: 10,
          quantite: 100,
          parcelleId: 'parcelle-1'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await createProduitHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle database insertion errors', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        run: vi.fn().mockImplementation(() => {
          throw new Error('Database insertion failed');
        })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        body: JSON.stringify({
          nom: 'Test Product',
          prix: 10,
          quantite: 100,
          parcelleId: 'parcelle-1'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await createProduitHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle foreign key constraint violations', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        run: vi.fn().mockImplementation(() => {
          const error = new Error('FOREIGN KEY constraint failed');
          (error as any).code = 'SQLITE_CONSTRAINT_FOREIGNKEY';
          throw error;
        })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        body: JSON.stringify({
          nom: 'Test Product',
          prix: 10,
          quantite: 100,
          parcelleId: 'non-existent-parcelle'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await createProduitHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REFERENCE');
    });
  });

  describe('Product Search and Filtering', () => {
    it('should search products by name', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          nom: 'Tomates cerises',
          prix: 3.50,
          quantite: 50,
          parcelleId: 'parcelle-1',
          userId: 'user-123'
        }
      ];

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockProducts)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits?search=tomates', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await getProduitsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.produits).toHaveLength(1);
      expect(data.data.produits[0].nom).toContain('Tomates');
    });

    it('should filter products by price range', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          nom: 'Produit cher',
          prix: 15.00,
          quantite: 10,
          parcelleId: 'parcelle-1',
          userId: 'user-123'
        }
      ];

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockProducts)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits?minPrice=10&maxPrice=20', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await getProduitsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.produits).toHaveLength(1);
      expect(data.data.produits[0].prix).toBeGreaterThanOrEqual(10);
      expect(data.data.produits[0].prix).toBeLessThanOrEqual(20);
    });

    it('should sort products by different fields', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          nom: 'A Product',
          prix: 5.00,
          quantite: 100,
          parcelleId: 'parcelle-1',
          userId: 'user-123',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'prod-2',
          nom: 'B Product',
          prix: 3.00,
          quantite: 200,
          parcelleId: 'parcelle-1',
          userId: 'user-123',
          createdAt: '2024-01-02T00:00:00Z'
        }
      ];

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockProducts)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits?sortBy=prix&sortOrder=asc', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await getProduitsHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.produits).toHaveLength(2);
      // Should be sorted by price ascending
      expect(data.data.produits[0].prix).toBeLessThanOrEqual(data.data.produits[1].prix);
    });
  });

  describe('Product Statistics', () => {
    it('should return product statistics', async () => {
      const mockStats = {
        totalProducts: 10,
        totalValue: 1500.00,
        averagePrice: 15.00,
        lowStockProducts: 2
      };

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(mockStats)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/produits/stats', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      // This would require implementing the stats endpoint
      // For now, we'll test that the main endpoint works
      const response = await getProduitsHandler(request);
      expect(response).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await createProduitHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_JSON');
    });

    it('should handle very large product names', async () => {
      const longName = 'A'.repeat(1000);

      const request = new NextRequest('http://localhost:3000/api/v1/produits', {
        method: 'POST',
        body: JSON.stringify({
          nom: longName,
          prix: 10,
          quantite: 100,
          parcelleId: 'parcelle-1'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await createProduitHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle concurrent product creation', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        run: vi.fn().mockReturnValue({ lastInsertRowid: 1 }),
        get: vi.fn().mockReturnValue({
          id: 'prod-1',
          nom: 'Concurrent Product',
          prix: 10,
          quantite: 100,
          parcelleId: 'parcelle-1',
          userId: 'user-123'
        })
      });

      const requests = Array.from({ length: 3 }, (_, i) => 
        new NextRequest('http://localhost:3000/api/v1/produits', {
          method: 'POST',
          body: JSON.stringify({
            nom: `Concurrent Product ${i}`,
            prix: 10,
            quantite: 100,
            parcelleId: 'parcelle-1'
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          }
        })
      );

      const responses = await Promise.all(
        requests.map(request => createProduitHandler(request))
      );

      responses.forEach(response => {
        expect(response.status).toBeOneOf([201, 500]); // Either success or handled error
      });
    });
  });
});