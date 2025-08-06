import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { 
  VintedMarketAnalysisService, 
  CatalogService,
  VintedApiError,
  VintedValidationError,
  vintedMarketAnalysisService,
  catalogService
} from '@/lib/services/vinted-market-analysis';
import { logger } from '@/lib/utils/logging/logger';

// Mock dependencies
vi.mock('axios');
vi.mock('@/lib/utils/logging/logger');
vi.mock('@/lib/services/logging-instrumentation');
vi.mock('@/lib/utils/logging');

const mockAxios = vi.mocked(axios);
const mockLogger = vi.mocked(logger);

describe('Market Analysis Services - Classic Backend Tests', () => {
  let service: VintedMarketAnalysisService;
  let catalogServiceInstance: CatalogService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = VintedMarketAnalysisService.getInstance();
    catalogServiceInstance = CatalogService.getInstance();
    
    // Mock logger methods
    mockLogger.info = vi.fn();
    mockLogger.warn = vi.fn();
    mockLogger.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('VintedMarketAnalysisService', () => {
    describe('analyzeProduct', () => {
      const mockRequest = {
        productName: 'Nike Air Max',
        catalogId: 456,
        token: 'test-session-cookie'
      };

      const mockSuggestionsResponse = {
        brands: [
          { id: 123, title: 'Nike' },
          { id: 124, title: 'Adidas' }
        ]
      };

      const mockSoldItemsResponse = {
        items: [
          {
            title: 'Nike Air Max 90',
            price: { amount: '45.50', currency: 'EUR' },
            size_title: '42',
            brand: { id: 123, title: 'Nike' },
            created_at: '2024-01-01T00:00:00Z',
            sold_at: '2024-01-02T00:00:00Z'
          },
          {
            title: 'Nike Air Max 95',
            price: { amount: '67.00', currency: 'EUR' },
            size_title: '43',
            brand: { id: 123, title: 'Nike' },
            created_at: '2024-01-01T00:00:00Z',
            sold_at: '2024-01-03T00:00:00Z'
          }
        ]
      };

      it('should successfully analyze a product with valid data', async () => {
        // Arrange
        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse }) // suggestions call
          .mockResolvedValueOnce({ data: mockSoldItemsResponse }); // sold items call

        // Act
        const result = await service.analyzeProduct(mockRequest);

        // Assert
        expect(result).toMatchObject({
          salesVolume: 2,
          avgPrice: 56.25, // (45.50 + 67.00) / 2
          priceRange: { min: 45.50, max: 67.00 },
          brandInfo: { id: 123, name: 'Nike' },
          catalogInfo: { id: 456, name: 'Unknown' },
          rawItems: mockSoldItemsResponse.items
        });
        expect(result.analysisDate).toBeDefined();
      });

      it('should handle empty sold items gracefully', async () => {
        // Arrange
        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: { items: [] } });

        // Act
        const result = await service.analyzeProduct(mockRequest);

        // Assert
        expect(result).toMatchObject({
          salesVolume: 0,
          avgPrice: 0,
          priceRange: { min: 0, max: 0 },
          brandInfo: null,
          catalogInfo: { id: 456, name: 'Unknown' },
          rawItems: []
        });
      });

      it('should throw VintedValidationError when no brands are suggested', async () => {
        // Arrange
        mockAxios.get.mockResolvedValueOnce({ data: { brands: [] } });

        // Act & Assert
        await expect(service.analyzeProduct(mockRequest))
          .rejects.toThrow(VintedValidationError);
        await expect(service.analyzeProduct(mockRequest))
          .rejects.toThrow('Aucune marque suggérée trouvée pour le titre "Nike Air Max"');
      });

      it('should handle invalid suggestions response format', async () => {
        // Arrange
        mockAxios.get.mockResolvedValueOnce({ data: { invalid: 'format' } });

        // Act & Assert
        await expect(service.analyzeProduct(mockRequest))
          .rejects.toThrow(VintedValidationError);
      });

      it('should handle invalid sold items response format', async () => {
        // Arrange
        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: { invalid: 'format' } });

        // Act & Assert
        await expect(service.analyzeProduct(mockRequest))
          .rejects.toThrow(VintedValidationError);
      });
    });

    describe('getSuggestedBrandId', () => {
      it('should return the first suggested brand ID', async () => {
        // Arrange
        const mockResponse = {
          brands: [
            { id: 123, title: 'Nike' },
            { id: 124, title: 'Adidas' }
          ]
        };
        mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

        const headers = { 'Cookie': 'access_token_web=test-cookie' };

        // Act
        const brandId = await service.getSuggestedBrandId('Nike Air Max', 456, headers);

        // Assert
        expect(brandId).toBe(123);
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/items/suggestions'),
          expect.objectContaining({ headers })
        );
      });

      it('should throw error when no brands are found', async () => {
        // Arrange
        mockAxios.get.mockResolvedValueOnce({ data: { brands: [] } });
        const headers = { 'Cookie': 'access_token_web=test-cookie' };

        // Act & Assert
        await expect(service.getSuggestedBrandId('Unknown Product', 456, headers))
          .rejects.toThrow('Aucune marque suggérée trouvée pour le titre "Unknown Product"');
      });

      it('should handle network errors', async () => {
        // Arrange
        const networkError = new Error('Network Error');
        (networkError as any).isAxiosError = true;
        (networkError as any).code = 'ECONNABORTED';
        mockAxios.get.mockRejectedValueOnce(networkError);

        const headers = { 'Cookie': 'access_token_web=test-cookie' };

        // Act & Assert
        await expect(service.getSuggestedBrandId('Nike Air Max', 456, headers))
          .rejects.toThrow(VintedApiError);
      });

      it('should handle HTTP error responses', async () => {
        // Arrange
        const httpError = new Error('Request failed');
        (httpError as any).isAxiosError = true;
        (httpError as any).response = { status: 404, statusText: 'Not Found' };
        mockAxios.get.mockRejectedValueOnce(httpError);

        const headers = { 'Cookie': 'access_token_web=test-cookie' };

        // Act & Assert
        await expect(service.getSuggestedBrandId('Nike Air Max', 456, headers))
          .rejects.toThrow(VintedApiError);
      });
    });

    describe('getSoldItems', () => {
      const mockHeaders = { 'Cookie': 'access_token_web=test-cookie' };

      it('should fetch sold items with pagination', async () => {
        // Arrange
        const page1Response = {
          items: Array(20).fill(null).map((_, i) => ({
            title: `Product ${i}`,
            price: { amount: (20 + i).toString(), currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }))
        };
        const page2Response = {
          items: Array(10).fill(null).map((_, i) => ({
            title: `Product ${i + 20}`,
            price: { amount: (40 + i).toString(), currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }))
        };
        const page3Response = { items: [] };

        mockAxios.get
          .mockResolvedValueOnce({ data: page1Response })
          .mockResolvedValueOnce({ data: page2Response })
          .mockResolvedValueOnce({ data: page3Response });

        // Act
        const items = await service.getSoldItems(123, 456, mockHeaders);

        // Assert
        expect(items).toHaveLength(30);
        expect(mockAxios.get).toHaveBeenCalledTimes(3);
      });

      it('should stop pagination when no items are returned', async () => {
        // Arrange
        const page1Response = {
          items: Array(5).fill(null).map((_, i) => ({
            title: `Product ${i}`,
            price: { amount: (20 + i).toString(), currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }))
        };
        const page2Response = { items: [] };

        mockAxios.get
          .mockResolvedValueOnce({ data: page1Response })
          .mockResolvedValueOnce({ data: page2Response });

        // Act
        const items = await service.getSoldItems(123, 456, mockHeaders);

        // Assert
        expect(items).toHaveLength(5);
        expect(mockAxios.get).toHaveBeenCalledTimes(2);
      });

      it('should continue with next page on individual page errors', async () => {
        // Arrange
        const page1Response = {
          items: Array(5).fill(null).map((_, i) => ({
            title: `Product ${i}`,
            price: { amount: (20 + i).toString(), currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }))
        };
        const page3Response = {
          items: Array(3).fill(null).map((_, i) => ({
            title: `Product ${i + 10}`,
            price: { amount: (30 + i).toString(), currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }))
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: page1Response })
          .mockRejectedValueOnce(new Error('Page 2 error'))
          .mockResolvedValueOnce({ data: page3Response });

        // Act
        const items = await service.getSoldItems(123, 456, mockHeaders);

        // Assert
        expect(items).toHaveLength(8); // 5 from page 1 + 3 from page 3
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Erreur page 2'),
          expect.any(Error)
        );
      });

      it('should respect maximum pages limit', async () => {
        // Arrange
        const mockResponse = {
          items: Array(20).fill(null).map((_, i) => ({
            title: `Product ${i}`,
            price: { amount: (20 + i).toString(), currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }))
        };

        // Mock 6 successful responses (more than MAX_PAGES_TO_FETCH = 5)
        for (let i = 0; i < 6; i++) {
          mockAxios.get.mockResolvedValueOnce({ data: mockResponse });
        }

        // Act
        const items = await service.getSoldItems(123, 456, mockHeaders);

        // Assert
        expect(items).toHaveLength(100); // 5 pages * 20 items each
        expect(mockAxios.get).toHaveBeenCalledTimes(5); // Should stop at 5 pages
      });
    });

    describe('createHeaders', () => {
      it('should create Bearer token headers for JWT tokens', async () => {
        // Arrange
        const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
        
        // Act - using a public method to test header creation indirectly
        mockAxios.get.mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } });
        await service.getSuggestedBrandId('Test', 456, { 'Authorization': `Bearer ${jwtToken}` });

        // Assert
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': `Bearer ${jwtToken}`
            })
          })
        );
      });

      it('should create Cookie headers for session tokens', async () => {
        // Arrange
        const sessionToken = 'session-cookie-value';
        
        // Act
        mockAxios.get.mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } });
        await service.getSuggestedBrandId('Test', 456, { 'Cookie': `access_token_web=${sessionToken}` });

        // Assert
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Cookie': `access_token_web=${sessionToken}`
            })
          })
        );
      });
    });

    describe('retryWithBackoff', () => {
      it('should retry failed operations with exponential backoff', async () => {
        // Arrange
        let attemptCount = 0;
        const operation = vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error(`Attempt ${attemptCount} failed`);
          }
          return Promise.resolve('success');
        });

        // Mock setTimeout to avoid actual delays in tests
        vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
          callback();
          return {} as any;
        });

        // Act
        const result = await service.retryWithBackoff(operation, 3, 100);

        // Assert
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
        expect(mockLogger.warn).toHaveBeenCalledTimes(2); // 2 failed attempts before success
      });

      it('should throw the last error after max retries', async () => {
        // Arrange
        const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

        vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
          callback();
          return {} as any;
        });

        // Act & Assert
        await expect(service.retryWithBackoff(operation, 2, 100))
          .rejects.toThrow('Persistent error');
        expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      });

      it('should succeed on first attempt when operation works', async () => {
        // Arrange
        const operation = vi.fn().mockResolvedValue('immediate success');

        // Act
        const result = await service.retryWithBackoff(operation, 3, 100);

        // Assert
        expect(result).toBe('immediate success');
        expect(operation).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });
    });

    describe('calculateMetrics', () => {
      it('should calculate correct metrics from sold items', async () => {
        // Arrange
        const soldItems = [
          {
            title: 'Product 1',
            price: { amount: '20.00', currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          },
          {
            title: 'Product 2',
            price: { amount: '40.00', currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          },
          {
            title: 'Product 3',
            price: { amount: '60.00', currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }
        ];

        mockAxios.get
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } })
          .mockResolvedValueOnce({ data: { items: soldItems } });

        // Act
        const result = await service.analyzeProduct({
          productName: 'Test Product',
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.salesVolume).toBe(3);
        expect(result.avgPrice).toBe(40.00); // (20 + 40 + 60) / 3
        expect(result.priceRange).toEqual({ min: 20.00, max: 60.00 });
        expect(result.brandInfo).toEqual({ id: 123, name: 'Nike' });
      });

      it('should handle items without brand information', async () => {
        // Arrange
        const soldItems = [
          {
            title: 'Product 1',
            price: { amount: '25.00', currency: 'EUR' }
            // No brand property
          },
          {
            title: 'Product 2',
            price: { amount: '35.00', currency: 'EUR' }
            // No brand property
          }
        ];

        mockAxios.get
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } })
          .mockResolvedValueOnce({ data: { items: soldItems } });

        // Act
        const result = await service.analyzeProduct({
          productName: 'Test Product',
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.brandInfo).toEqual({ id: 123, name: 'Unknown' });
      });
    });
  });

  describe('CatalogService', () => {
    describe('findCatalogByName', () => {
      it('should find catalogs by exact name match', async () => {
        // Arrange
        const mockCatalogs = [
          {
            id: 1,
            title: 'Sneakers',
            catalogs: [
              { id: 2, title: 'Running Shoes' },
              { id: 3, title: 'Basketball Shoes' }
            ]
          },
          {
            id: 4,
            title: 'Clothing',
            catalogs: [
              { id: 5, title: 'T-Shirts' }
            ]
          }
        ];

        // Mock the private catalogs property
        (catalogServiceInstance as any).catalogs = mockCatalogs;

        // Act
        const results = await catalogServiceInstance.findCatalogByName('Sneakers');

        // Assert
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({ id: 1, title: 'Sneakers' });
      });

      it('should find catalogs in nested structure', async () => {
        // Arrange
        const mockCatalogs = [
          {
            id: 1,
            title: 'Shoes',
            catalogs: [
              {
                id: 2,
                title: 'Sneakers',
                catalogs: [
                  { id: 3, title: 'Running Shoes' }
                ]
              }
            ]
          }
        ];

        (catalogServiceInstance as any).catalogs = mockCatalogs;

        // Act
        const results = await catalogServiceInstance.findCatalogByName('Running Shoes');

        // Assert
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({ id: 3, title: 'Running Shoes' });
      });

      it('should return empty array when no matches found', async () => {
        // Arrange
        const mockCatalogs = [
          { id: 1, title: 'Sneakers' },
          { id: 2, title: 'Clothing' }
        ];

        (catalogServiceInstance as any).catalogs = mockCatalogs;

        // Act
        const results = await catalogServiceInstance.findCatalogByName('Non-existent Category');

        // Assert
        expect(results).toHaveLength(0);
      });

      it('should handle case-insensitive search', async () => {
        // Arrange
        const mockCatalogs = [
          { id: 1, title: 'Sneakers' }
        ];

        (catalogServiceInstance as any).catalogs = mockCatalogs;

        // Act
        const results = await catalogServiceInstance.findCatalogByName('sneakers');

        // Assert
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({ id: 1, title: 'Sneakers' });
      });

      it('should load catalogs if not already loaded', async () => {
        // Arrange
        (catalogServiceInstance as any).catalogs = null;
        const loadCatalogsSpy = vi.spyOn(catalogServiceInstance as any, 'loadCatalogs')
          .mockResolvedValue(undefined);

        // Act
        await catalogServiceInstance.findCatalogByName('Test');

        // Assert
        expect(loadCatalogsSpy).toHaveBeenCalled();
      });
    });

    describe('loadCatalogs', () => {
      it('should initialize empty catalogs array', async () => {
        // Arrange
        (catalogServiceInstance as any).catalogs = null;

        // Act
        await (catalogServiceInstance as any).loadCatalogs();

        // Assert
        expect((catalogServiceInstance as any).catalogs).toEqual([]);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Catalogues chargés')
        );
      });

      it('should handle errors during catalog loading', async () => {
        // Arrange
        (catalogServiceInstance as any).catalogs = null;
        
        // Mock an error during loading (simulate file read error)
        const originalLoadCatalogs = (catalogServiceInstance as any).loadCatalogs;
        (catalogServiceInstance as any).loadCatalogs = vi.fn().mockImplementation(async () => {
          throw new Error('File not found');
        });

        // Act & Assert
        await expect((catalogServiceInstance as any).loadCatalogs()).rejects.toThrow('File not found');
      });
    });

    describe('Singleton Pattern', () => {
      it('should return the same instance', () => {
        // Act
        const instance1 = CatalogService.getInstance();
        const instance2 = CatalogService.getInstance();

        // Assert
        expect(instance1).toBe(instance2);
      });
    });
  });

  describe('Error Recovery and Retry Mechanisms', () => {
    describe('Network Error Recovery', () => {
      it('should handle connection timeouts gracefully', async () => {
        // Arrange
        const timeoutError = new Error('timeout of 10000ms exceeded');
        (timeoutError as any).isAxiosError = true;
        (timeoutError as any).code = 'ECONNABORTED';
        
        mockAxios.get.mockRejectedValueOnce(timeoutError);

        // Act & Assert
        await expect(service.getSuggestedBrandId('Test', 456, {}))
          .rejects.toThrow(VintedApiError);
        await expect(service.getSuggestedBrandId('Test', 456, {}))
          .rejects.toThrow('Timeout de la requête');
      });

      it('should handle DNS resolution errors', async () => {
        // Arrange
        const dnsError = new Error('getaddrinfo ENOTFOUND');
        (dnsError as any).isAxiosError = true;
        (dnsError as any).code = 'ENOTFOUND';
        
        mockAxios.get.mockRejectedValueOnce(dnsError);

        // Act & Assert
        await expect(service.getSuggestedBrandId('Test', 456, {}))
          .rejects.toThrow(VintedApiError);
        await expect(service.getSuggestedBrandId('Test', 456, {}))
          .rejects.toThrow('Erreur réseau');
      });
    });

    describe('API Rate Limiting', () => {
      it('should handle 429 Too Many Requests errors', async () => {
        // Arrange
        const rateLimitError = new Error('Too Many Requests');
        (rateLimitError as any).isAxiosError = true;
        (rateLimitError as any).response = { status: 429, statusText: 'Too Many Requests' };
        
        mockAxios.get.mockRejectedValueOnce(rateLimitError);

        // Act & Assert
        await expect(service.getSuggestedBrandId('Test', 456, {}))
          .rejects.toThrow(VintedApiError);
      });
    });

    describe('Data Validation Recovery', () => {
      it('should handle malformed API responses', async () => {
        // Arrange
        mockAxios.get.mockResolvedValueOnce({ data: null });

        // Act & Assert
        await expect(service.getSuggestedBrandId('Test', 456, {}))
          .rejects.toThrow(VintedValidationError);
      });

      it('should handle missing required fields in responses', async () => {
        // Arrange
        mockAxios.get.mockResolvedValueOnce({ 
          data: { 
            brands: [{ title: 'Nike' }] // Missing id field
          } 
        });

        // Act & Assert
        await expect(service.getSuggestedBrandId('Test', 456, {}))
          .rejects.toThrow(VintedValidationError);
      });
    });
  });

  describe('Caching and Performance Optimization', () => {
    describe('Request Optimization', () => {
      it('should use appropriate timeout values', async () => {
        // Arrange
        mockAxios.get.mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } });

        // Act
        await service.getSuggestedBrandId('Test', 456, {});

        // Assert
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            timeout: 10000
          })
        );
      });

      it('should use longer timeout for sold items requests', async () => {
        // Arrange
        mockAxios.get.mockResolvedValueOnce({ data: { items: [] } });

        // Act
        await service.getSoldItems(123, 456, {});

        // Assert
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            timeout: 15000
          })
        );
      });
    });

    describe('Pagination Optimization', () => {
      it('should limit maximum pages to prevent excessive API calls', async () => {
        // Arrange
        const mockResponse = { items: Array(20).fill({ title: 'Test', price: { amount: '20' } }) };
        
        // Mock more responses than the limit
        for (let i = 0; i < 10; i++) {
          mockAxios.get.mockResolvedValueOnce({ data: mockResponse });
        }

        // Act
        await service.getSoldItems(123, 456, {});

        // Assert
        expect(mockAxios.get).toHaveBeenCalledTimes(5); // Should respect MAX_PAGES_TO_FETCH
      });

      it('should use appropriate page size for API requests', async () => {
        // Arrange
        mockAxios.get.mockResolvedValueOnce({ data: { items: [] } });

        // Act
        await service.getSoldItems(123, 456, {});

        // Assert
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('per_page=20'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Service Integration', () => {
    it('should maintain singleton pattern for service instances', () => {
      // Act
      const instance1 = VintedMarketAnalysisService.getInstance();
      const instance2 = VintedMarketAnalysisService.getInstance();

      // Assert
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(vintedMarketAnalysisService);
    });

    it('should properly export service instances', () => {
      // Assert
      expect(vintedMarketAnalysisService).toBeInstanceOf(VintedMarketAnalysisService);
      expect(catalogService).toBeInstanceOf(CatalogService);
    });
  });
});