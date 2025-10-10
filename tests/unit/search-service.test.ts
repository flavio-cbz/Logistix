import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchService } from '@/lib/services/search-service';
import { databaseService } from '@/lib/services/database/db';
import { logger } from '@/lib/utils/logging/logger';

// Mock des dépendances
vi.mock('@/lib/services/database/db');
vi.mock('@/lib/utils/logging/logger');

const mockDatabaseService = vi.mocked(databaseService);
const mockLogger = vi.mocked(logger);

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim();

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = SearchService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getBrandSuggestions', () => {
    it('should return brand suggestions from database', async () => {
      // Arrange
      const mockResults = [
        { brand: 'Nike', count: 15 },
        { brand: 'Adidas', count: 12 },
        { brand: 'Puma', count: 8 },
      ];

      mockDatabaseService.query.mockResolvedValueOnce(mockResults);

      // Act
      const result = await searchService.getBrandSuggestions('ni');

      // Assert
      expect(result).toEqual([
        { brand: 'Nike', count: 15 },
        { brand: 'Adidas', count: 12 },
        { brand: 'Puma', count: 8 },
      ]);

  const calls = mockDatabaseService.query.mock.calls;
  expect(calls).toHaveLength(1);
  const [sql, params] = calls[0] as [string, unknown[]];
      expect(normalizeSql(sql)).toContain(
        'SELECT plateforme as brand, COUNT(*) as count FROM products WHERE plateforme LIKE ? GROUP BY plateforme ORDER BY count DESC LIMIT 5'
      );
      expect(params).toEqual(['%ni%']);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Fetching brand suggestions for query: ni'
      );
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDatabaseService.query.mockRejectedValueOnce(new Error('Database error'));

      // Act
      const result = await searchService.getBrandSuggestions('test');

      // Assert
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching brand suggestions: Database error'
      );
    });

    it('should handle empty results', async () => {
      // Arrange
      mockDatabaseService.query.mockResolvedValueOnce([]);

      // Act
      const result = await searchService.getBrandSuggestions('nonexistent');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getCategorySuggestions', () => {
    it('should return category suggestions from database', async () => {
      // Arrange
      const mockResults = [
        { category: 'Vêtements', count: 25 },
        { category: 'Chaussures', count: 18 },
      ];

      mockDatabaseService.query.mockResolvedValueOnce(mockResults);

      // Act
      const result = await searchService.getCategorySuggestions('vêt');

      // Assert
      expect(result).toEqual([
        { category: 'Vêtements', count: 25 },
        { category: 'Chaussures', count: 18 },
      ]);

  const calls = mockDatabaseService.query.mock.calls;
  expect(calls).toHaveLength(1);
  const [sql, params] = calls[0] as [string, unknown[]];
      expect(normalizeSql(sql)).toContain(
        'SELECT nom as category, COUNT(*) as count FROM products WHERE nom LIKE ? GROUP BY nom ORDER BY count DESC LIMIT 5'
      );
      expect(params).toEqual(['%vêt%']);
    });
  });

  describe('searchProducts', () => {
    const mockUserId = 'user-123';

    it('should search products by name', async () => {
      // Arrange
      const mockResults = [
        {
          id: 'product-1',
          user_id: mockUserId,
          product_name: 'Nike Air Max',
          external_product_id: 'ext-123',
          last_checked_at: '2025-01-01T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockDatabaseService.query.mockResolvedValueOnce(mockResults);

      // Act
      const result = await searchService.searchProducts({
        name: 'Nike',
        userId: mockUserId,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'product-1',
        userId: mockUserId,
        productName: 'Nike Air Max',
        externalProductId: 'ext-123',
        lastCheckedAt: '2025-01-01T00:00:00Z',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      });

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND product_name LIKE ?'),
        [mockUserId, '%Nike%'],
        'search-products'
      );
    });

    it('should search products with multiple criteria', async () => {
      // Arrange
      mockDatabaseService.query.mockResolvedValueOnce([]);

      // Act
      await searchService.searchProducts({
        name: 'Nike',
        category: 'Chaussures',
        brand: 'Nike',
        userId: mockUserId,
      });

      // Assert
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ? AND product_name LIKE ? AND product_name LIKE ? AND product_name LIKE ?'),
        [mockUserId, '%Nike%', '%Chaussures%', '%Nike%'],
        'search-products'
      );
    });

    it('should handle null values correctly', async () => {
      // Arrange
      const mockResults = [
        {
          id: 'product-1',
          user_id: mockUserId,
          product_name: 'Test Product',
          external_product_id: null,
          last_checked_at: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: null,
        },
      ];

      mockDatabaseService.query.mockResolvedValueOnce(mockResults);

      // Act
      const result = await searchService.searchProducts({
        name: 'Test',
        userId: mockUserId,
      });

      // Assert
      expect(result[0]).toEqual({
        id: 'product-1',
        userId: mockUserId,
        productName: 'Test Product',
        externalProductId: null,
        lastCheckedAt: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: null,
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDatabaseService.query.mockRejectedValueOnce(new Error('DB Connection failed'));

      // Act
      const result = await searchService.searchProducts({
        name: 'Test',
        userId: mockUserId,
      });

      // Assert
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error searching products: DB Connection failed',
        expect.objectContaining({
          criteria: { name: 'Test', userId: mockUserId },
        })
      );
    });
  });

  describe('searchParcelsByCriteria', () => {
    const mockUserId = 'user-123';

    it('should search parcels by numero', async () => {
      // Arrange
      const mockResults = [
        {
          id: 'parcel-1',
          user_id: mockUserId,
          numero: 'LP123456789FR',
          transporteur: 'La Poste',
          prix_achat: 15.50,
          poids: 500,
          prix_total: 20.00,
          prix_par_gramme: 0.04,
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockDatabaseService.query.mockResolvedValueOnce(mockResults);

      // Act
      const result = await searchService.searchParcelsByCriteria({
        numero: 'LP123',
        userId: mockUserId,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'parcel-1',
        userId: mockUserId,
        numero: 'LP123456789FR',
        transporteur: 'La Poste',
        prixAchat: 15.50,
        poids: 500,
        prixTotal: 20.00,
        prixParGramme: 0.04,
        createdAt: '2025-01-01T00:00:00Z',
      });

      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND numero LIKE ?'),
        [mockUserId, '%LP123%'],
        'search-parcels'
      );
    });

    it('should search parcels by transporteur', async () => {
      // Arrange
      mockDatabaseService.query.mockResolvedValueOnce([]);

      // Act
      await searchService.searchParcelsByCriteria({
        transporteur: 'Colissimo',
        userId: mockUserId,
      });

      // Assert
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND transporteur = ?'),
        [mockUserId, 'Colissimo'],
        'search-parcels'
      );
    });

    it('should search with multiple criteria', async () => {
      // Arrange
      mockDatabaseService.query.mockResolvedValueOnce([]);

      // Act
      await searchService.searchParcelsByCriteria({
        numero: 'LP123',
        transporteur: 'La Poste',
        userId: mockUserId,
      });

      // Assert
      expect(mockDatabaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = ? AND numero LIKE ? AND transporteur = ?'),
        [mockUserId, '%LP123%', 'La Poste'],
        'search-parcels'
      );
    });

    it('should handle null values in parcel data', async () => {
      // Arrange
      const mockResults = [
        {
          id: 'parcel-1',
          user_id: mockUserId,
          numero: 'TEST123',
          transporteur: 'Test Transport',
          prix_achat: null,
          poids: null,
          prix_total: null,
          prix_par_gramme: null,
          created_at: null,
        },
      ];

      mockDatabaseService.query.mockResolvedValueOnce(mockResults);

      // Act
      const result = await searchService.searchParcelsByCriteria({
        numero: 'TEST',
        userId: mockUserId,
      });

      // Assert
      expect(result[0]).toEqual({
        id: 'parcel-1',
        userId: mockUserId,
        numero: 'TEST123',
        transporteur: 'Test Transport',
        prixAchat: null,
        poids: null,
        prixTotal: null,
        prixParGramme: null,
        createdAt: null,
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDatabaseService.query.mockRejectedValueOnce(new Error('Connection timeout'));

      // Act
      const result = await searchService.searchParcelsByCriteria({
        numero: 'TEST',
        userId: mockUserId,
      });

      // Assert
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error searching parcels by criteria: Connection timeout',
        expect.objectContaining({
          criteria: { numero: 'TEST', userId: mockUserId },
        })
      );
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      // Act
      const instance1 = SearchService.getInstance();
      const instance2 = SearchService.getInstance();

      // Assert
      expect(instance1).toBe(instance2);
    });
  });
});