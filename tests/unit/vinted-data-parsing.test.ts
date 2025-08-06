import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  vintedMarketAnalysisService,
  VintedMarketAnalysisService,
  VintedApiError,
  VintedValidationError
} from '@/lib/services/vinted-market-analysis';
import { vintedCatalogHierarchyService } from '@/lib/services/vinted-catalog-hierarchy';
import axios from 'axios';

// Mock dependencies
vi.mock('axios');
vi.mock('@/lib/utils/logging/logger');
vi.mock('@/lib/services/logging-instrumentation');
vi.mock('@/lib/utils/logging');

// Mock environment variables
process.env.VINTED_CREDENTIALS_SECRET = 'test-secret-key-for-testing';

const mockAxios = vi.mocked(axios);

// Mock instrumentation
vi.mock('@/lib/services/logging-instrumentation', () => ({
  VintedIntegrationInstrumentation: {
    instrumentApiCall: vi.fn().mockImplementation((name, method, fn) => fn()),
  },
  MarketAnalysisInstrumentation: {
    instrumentAnalysis: vi.fn().mockImplementation((name, fn) => fn()),
    instrumentDataFetch: vi.fn().mockImplementation((name, fn) => fn()),
  }
}));

describe('Vinted Data Parsing and Processing Tests - Task 14.2', () => {
  let service: VintedMarketAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = VintedMarketAnalysisService.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Semantic Query Analysis Algorithms', () => {
    describe('Product Name Analysis', () => {
      it('should analyze simple product names correctly', async () => {
        // Arrange
        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: [
            {
              title: 'Nike Air Max 90',
              price: { amount: '65.00', currency: 'EUR' },
              brand: { id: 123, title: 'Nike' }
            }
          ]
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act
        const result = await service.analyzeProduct({
          productName: 'Nike Air Max',
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.brandInfo?.name).toBe('Nike');
        expect(result.salesVolume).toBe(1);
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('title=Nike%20Air%20Max'),
          expect.any(Object)
        );
      });

      it('should handle complex product names with special characters', async () => {
        // Arrange
        const complexProductName = 'Nike Air Max 90 "Off-White" x Virgil Abloh (2019)';
        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: [
            {
              title: 'Nike Air Max 90 Off-White Virgil Abloh',
              price: { amount: '1200.00', currency: 'EUR' },
              brand: { id: 123, title: 'Nike' }
            }
          ]
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act
        const result = await service.analyzeProduct({
          productName: complexProductName,
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.brandInfo?.name).toBe('Nike');
        expect(result.avgPrice).toBe(1200.00);
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(complexProductName)),
          expect.any(Object)
        );
      });

      it('should handle empty or whitespace-only product names', async () => {
        // Arrange
        const emptyProductName = '   ';
        const mockSuggestionsResponse = {
          brands: []
        };

        mockAxios.get.mockResolvedValueOnce({ data: mockSuggestionsResponse });

        // Act & Assert
        await expect(service.analyzeProduct({
          productName: emptyProductName,
          catalogId: 456,
          token: 'test-token'
        })).rejects.toThrow('Aucune marque suggérée trouvée');
      });
    });

    describe('Category Analysis', () => {
      it('should analyze category hierarchy correctly', () => {
        // Act
        const level3Categories = vintedCatalogHierarchyService.findLevel3Categories('sneakers');

        // Assert
        expect(Array.isArray(level3Categories)).toBe(true);
        level3Categories.forEach(category => {
          expect(category.level).toBe(3);
          expect(category.name).toBeDefined();
          expect(category.id).toBeDefined();
        });
      });

      it('should suggest appropriate categories for products', () => {
        // Arrange
        const productNames = [
          'Nike Air Max 90',
          'Adidas Ultraboost',
          'Converse Chuck Taylor'
        ];

        productNames.forEach(productName => {
          // Act
          const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct(productName);

          // Assert
          expect(Array.isArray(suggestions)).toBe(true);
          suggestions.forEach(suggestion => {
            expect(suggestion.level).toBe(3);
            expect(suggestion.isValidForAnalysis).toBe(true);
          });
        });
      });

      it('should validate category levels correctly', () => {
        // Arrange
        const testCategoryIds = [100, 200, 300];

        testCategoryIds.forEach(categoryId => {
          // Act
          const validation = vintedCatalogHierarchyService.validateCategory(categoryId);

          // Assert
          expect(validation).toHaveProperty('isValid');
          expect(validation).toHaveProperty('level');
          expect(validation).toHaveProperty('message');
          expect(validation).toHaveProperty('suggestions');
          expect(typeof validation.isValid).toBe('boolean');
          expect([1, 2, 3].includes(validation.level)).toBe(true);
        });
      });
    });
  });

  describe('Entity Extraction Accuracy and Performance', () => {
    describe('Brand Entity Extraction', () => {
      it('should extract brand entities accurately from product titles', async () => {
        // Arrange
        const testCases = [
          {
            input: 'Nike Air Max 90 White',
            expectedBrand: 'Nike'
          },
          {
            input: 'Adidas Ultraboost 22 Black',
            expectedBrand: 'Adidas'
          }
        ];

        for (const testCase of testCases) {
          const mockSuggestionsResponse = {
            brands: [{ id: 123, title: testCase.expectedBrand }]
          };
          const mockSoldItemsResponse = {
            items: [
              {
                title: testCase.input,
                price: { amount: '75.00', currency: 'EUR' },
                brand: { id: 123, title: testCase.expectedBrand }
              }
            ]
          };

          mockAxios.get
            .mockResolvedValueOnce({ data: mockSuggestionsResponse })
            .mockResolvedValueOnce({ data: mockSoldItemsResponse });

          // Act
          const result = await service.analyzeProduct({
            productName: testCase.input,
            catalogId: 456,
            token: 'test-token'
          });

          // Assert
          expect(result.brandInfo?.name).toBe(testCase.expectedBrand);
        }
      });

      it('should extract size entities from product descriptions', async () => {
        // Arrange
        const productWithSizes = 'Nike Air Max 90 Size 42 EU / 8.5 US';
        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: [
            {
              title: productWithSizes,
              price: { amount: '90.00', currency: 'EUR' },
              size_title: '42',
              brand: { id: 123, title: 'Nike' }
            }
          ]
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act
        const result = await service.analyzeProduct({
          productName: productWithSizes,
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.rawItems[0].size_title).toBe('42');
        expect(result.brandInfo?.name).toBe('Nike');
      });
    });

    describe('Price Entity Extraction', () => {
      it('should extract price entities with different formats', async () => {
        // Arrange
        const priceFormats = [
          { amount: '45.50', expected: 45.50 },
          { amount: '120.00', expected: 120.00 },
          { amount: '99.99', expected: 99.99 }
        ];

        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: priceFormats.map(price => ({
            title: 'Nike Air Max 90',
            price: { amount: price.amount, currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }))
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act
        const result = await service.analyzeProduct({
          productName: 'Nike Air Max 90',
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.salesVolume).toBe(priceFormats.length);
        result.rawItems.forEach((item, index) => {
          expect(parseFloat(item.price.amount)).toBe(priceFormats[index].expected);
        });
      });

      it('should calculate price statistics accurately', async () => {
        // Arrange
        const priceData = [
          { amount: '25.00' },
          { amount: '50.00' },
          { amount: '75.00' }
        ];

        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: priceData.map(price => ({
            title: 'Nike Air Max 90',
            price: { ...price, currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }))
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act
        const result = await service.analyzeProduct({
          productName: 'Nike Air Max 90',
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.avgPrice).toBe(50.00); // (25+50+75)/3
        expect(result.priceRange.min).toBe(25.00);
        expect(result.priceRange.max).toBe(75.00);
        expect(result.salesVolume).toBe(3);
      });
    });
  });

  describe('Automatic Suggestion Generation', () => {
    describe('Product Suggestions', () => {
      it('should generate relevant product suggestions', () => {
        // Arrange
        const testProducts = [
          'Nike Air Max',
          'Running shoes',
          'Basketball sneakers'
        ];

        testProducts.forEach(product => {
          // Act
          const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct(product);

          // Assert
          expect(Array.isArray(suggestions)).toBe(true);
          expect(suggestions.length).toBeGreaterThanOrEqual(0);
          suggestions.forEach(suggestion => {
            expect(suggestion.level).toBe(3);
            expect(suggestion.isValidForAnalysis).toBe(true);
            expect(suggestion.name).toBeDefined();
            expect(suggestion.id).toBeDefined();
          });
        });
      });

      it('should handle suggestion generation for edge cases', () => {
        // Arrange
        const edgeCases = [
          '', // Empty string
          '   ', // Whitespace only
          'xyz123', // Non-existent product
          'a' // Single character
        ];

        edgeCases.forEach(edgeCase => {
          // Act
          const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct(edgeCase);

          // Assert
          expect(Array.isArray(suggestions)).toBe(true);
          // Should handle gracefully without throwing errors
          suggestions.forEach(suggestion => {
            expect(suggestion.level).toBe(3);
            expect(suggestion.isValidForAnalysis).toBe(true);
          });
        });
      });
    });

    describe('Category Suggestions', () => {
      it('should generate category suggestions based on search terms', () => {
        // Arrange
        const searchTerms = [
          'sneakers',
          'running',
          'basketball'
        ];

        searchTerms.forEach(term => {
          // Act
          const categories = vintedCatalogHierarchyService.findLevel3Categories(term);

          // Assert
          expect(Array.isArray(categories)).toBe(true);
          categories.forEach(category => {
            expect(category.level).toBe(3);
            expect(category.name).toBeDefined();
            expect(category.id).toBeDefined();
          });
        });
      });

      it('should perform smart search with multiple suggestion types', () => {
        // Arrange
        const searchQuery = 'nike sneakers';

        // Act
        const results = vintedCatalogHierarchyService.smartSearch(searchQuery);

        // Assert
        expect(results).toHaveProperty('exact');
        expect(results).toHaveProperty('suggestions');
        expect(results).toHaveProperty('popular');
        
        expect(Array.isArray(results.exact)).toBe(true);
        expect(Array.isArray(results.suggestions)).toBe(true);
        expect(Array.isArray(results.popular)).toBe(true);

        // Verify all results are level 3 categories
        [...results.exact, ...results.suggestions, ...results.popular].forEach(category => {
          expect(category.level).toBe(3);
          expect(category.isValidForAnalysis).toBe(true);
        });
      });
    });
  });

  describe('Error Correction and Validation Algorithms', () => {
    describe('Data Validation', () => {
      it('should validate API response schemas correctly', async () => {
        // Arrange
        const validResponse = {
          brands: [
            { id: 123, title: 'Nike' },
            { id: 124, title: 'Adidas' }
          ]
        };

        mockAxios.get.mockResolvedValueOnce({ data: validResponse });

        // Act
        const brandId = await service.getSuggestedBrandId(
          'Nike Air Max',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        );

        // Assert
        expect(brandId).toBe(123);
      });

      it('should detect and reject invalid response schemas', async () => {
        // Arrange
        const invalidResponses = [
          { brands: 'not-an-array' },
          { brands: [{ id: 'not-a-number', title: 'Nike' }] },
          { brands: [{ id: 123 }] }, // Missing title
          { brands: [{ title: 'Nike' }] }, // Missing id
          { invalid: 'structure' }
        ];

        for (const invalidResponse of invalidResponses) {
          mockAxios.get.mockResolvedValueOnce({ data: invalidResponse });

          // Act & Assert
          await expect(service.getSuggestedBrandId(
            'Nike Air Max',
            456,
            { 'Cookie': 'access_token_web=test-token' }
          )).rejects.toThrow('Réponse API suggestions invalide');
        }
      });

      it('should validate sold items response schemas', async () => {
        // Arrange
        const validSoldItemsResponse = {
          items: [
            {
              title: 'Nike Air Max 90',
              price: { amount: '75.00', currency: 'EUR' },
              brand: { id: 123, title: 'Nike' }
            }
          ]
        };

        mockAxios.get.mockResolvedValueOnce({ data: validSoldItemsResponse });

        // Act
        const items = await service.getSoldItems(
          123,
          456,
          { 'Cookie': 'access_token_web=test-token' }
        );

        // Assert
        expect(items).toHaveLength(1);
        expect(items[0].title).toBe('Nike Air Max 90');
        expect(items[0].price.amount).toBe('75.00');
      });
    });

    describe('Error Correction', () => {
      it('should handle missing optional fields gracefully', async () => {
        // Arrange
        const responseWithMissingOptionalFields = {
          items: [
            {
              title: 'Nike Air Max 90',
              price: { amount: '75.00', currency: 'EUR' }
              // Missing optional fields: brand, size_title, created_at, sold_at
            }
          ]
        };

        mockAxios.get.mockResolvedValueOnce({ data: responseWithMissingOptionalFields });

        // Act
        const items = await service.getSoldItems(
          123,
          456,
          { 'Cookie': 'access_token_web=test-token' }
        );

        // Assert
        expect(items).toHaveLength(1);
        expect(items[0].title).toBe('Nike Air Max 90');
        expect(items[0].price.amount).toBe('75.00');
        expect(items[0].brand).toBeUndefined();
        expect(items[0].size_title).toBeUndefined();
      });
    });
  });
});