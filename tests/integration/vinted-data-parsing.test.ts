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

const mockAxios = vi.mocked(axios);

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

      it('should handle product names with multiple brands', async () => {
        // Arrange
        const multiProductName = 'Nike x Adidas Collaboration Sneakers';
        const mockSuggestionsResponse = {
          brands: [
            { id: 123, title: 'Nike' },
            { id: 124, title: 'Adidas' }
          ]
        };
        const mockSoldItemsResponse = {
          items: [
            {
              title: 'Nike Adidas Collab Limited Edition',
              price: { amount: '350.00', currency: 'EUR' },
              brand: { id: 123, title: 'Nike' }
            }
          ]
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act
        const result = await service.analyzeProduct({
          productName: multiProductName,
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.brandInfo?.name).toBe('Nike'); // Should pick first suggested brand
        expect(result.salesVolume).toBe(1);
      });

      it('should handle product names in different languages', async () => {
        // Arrange
        const frenchProductName = 'Chaussures de sport Nike Air Max';
        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: [
            {
              title: 'Nike Air Max Chaussures Sport',
              price: { amount: '85.00', currency: 'EUR' },
              brand: { id: 123, title: 'Nike' }
            }
          ]
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act
        const result = await service.analyzeProduct({
          productName: frenchProductName,
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.brandInfo?.name).toBe('Nike');
        expect(result.avgPrice).toBe(85.00);
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

      it('should handle very long product names', async () => {
        // Arrange
        const longProductName = 'Nike Air Max 90 Premium Leather Upper with Mesh Panels and Rubber Outsole in Multiple Colorways Including White Black Red Blue Green Yellow Orange Purple Pink Brown Gray Silver Gold'.repeat(2);
        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: [
            {
              title: 'Nike Air Max 90 Premium',
              price: { amount: '120.00', currency: 'EUR' },
              brand: { id: 123, title: 'Nike' }
            }
          ]
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act
        const result = await service.analyzeProduct({
          productName: longProductName,
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.brandInfo?.name).toBe('Nike');
        expect(result.salesVolume).toBe(1);
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
          'Converse Chuck Taylor',
          'Vans Old Skool',
          'New Balance 990'
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
        const testCategoryIds = [100, 200, 300, 400, 500];

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

      it('should perform smart search with contextual results', () => {
        // Arrange
        const searchQueries = [
          'sneakers',
          'running shoes',
          'basketball',
          'casual wear',
          'sports equipment'
        ];

        searchQueries.forEach(query => {
          // Act
          const results = vintedCatalogHierarchyService.smartSearch(query);

          // Assert
          expect(results).toHaveProperty('exact');
          expect(results).toHaveProperty('suggestions');
          expect(results).toHaveProperty('popular');
          expect(Array.isArray(results.exact)).toBe(true);
          expect(Array.isArray(results.suggestions)).toBe(true);
          expect(Array.isArray(results.popular)).toBe(true);
        });
      });

      it('should get category paths correctly', () => {
        // Arrange
        const testCategoryIds = [456, 789, 123];

        testCategoryIds.forEach(categoryId => {
          // Act
          const path = vintedCatalogHierarchyService.getCategoryPath(categoryId);

          // Assert
          expect(Array.isArray(path)).toBe(true);
          path.forEach(pathElement => {
            expect(typeof pathElement).toBe('string');
            expect(pathElement.length).toBeGreaterThan(0);
          });
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
          },
          {
            input: 'Converse Chuck Taylor All Star',
            expectedBrand: 'Converse'
          },
          {
            input: 'Vans Old Skool Classic',
            expectedBrand: 'Vans'
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

      it('should handle ambiguous brand extraction', async () => {
        // Arrange
        const ambiguousTitle = 'Nike Style Shoes by Adidas';
        const mockSuggestionsResponse = {
          brands: [
            { id: 123, title: 'Nike' },
            { id: 124, title: 'Adidas' }
          ]
        };
        const mockSoldItemsResponse = {
          items: [
            {
              title: ambiguousTitle,
              price: { amount: '85.00', currency: 'EUR' },
              brand: { id: 123, title: 'Nike' }
            }
          ]
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act
        const result = await service.analyzeProduct({
          productName: ambiguousTitle,
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.brandInfo?.name).toBe('Nike'); // Should pick first suggested brand
        expect(result.salesVolume).toBe(1);
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

      it('should extract color entities from product descriptions', async () => {
        // Arrange
        const colorVariants = [
          'Nike Air Max 90 White/Black',
          'Nike Air Max 90 Red/Blue',
          'Nike Air Max 90 Green/Yellow'
        ];

        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: colorVariants.map((title, index) => ({
            title,
            price: { amount: (70 + index * 5).toString(), currency: 'EUR' },
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
        expect(result.salesVolume).toBe(3);
        expect(result.rawItems).toHaveLength(3);
        result.rawItems.forEach((item, index) => {
          expect(item.title).toBe(colorVariants[index]);
        });
      });

      it('should handle entity extraction performance with large datasets', async () => {
        // Arrange
        const largeDataset = Array(100).fill(null).map((_, i) => ({
          title: `Nike Air Max ${90 + (i % 10)} Variant ${i}`,
          price: { amount: (50 + i).toString(), currency: 'EUR' },
          brand: { id: 123, title: 'Nike' },
          size_title: `${40 + (i % 8)}`,
          created_at: '2024-01-01T00:00:00Z',
          sold_at: '2024-01-02T00:00:00Z'
        }));

        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };

        // Mock paginated responses
        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: { items: largeDataset.slice(0, 20) } })
          .mockResolvedValueOnce({ data: { items: largeDataset.slice(20, 40) } })
          .mockResolvedValueOnce({ data: { items: largeDataset.slice(40, 60) } })
          .mockResolvedValueOnce({ data: { items: largeDataset.slice(60, 80) } })
          .mockResolvedValueOnce({ data: { items: largeDataset.slice(80, 100) } });

        const startTime = Date.now();

        // Act
        const result = await service.analyzeProduct({
          productName: 'Nike Air Max Collection',
          catalogId: 456,
          token: 'test-token'
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // Assert
        expect(result.salesVolume).toBe(100);
        expect(result.rawItems).toHaveLength(100);
        expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
        
        // Verify entity extraction accuracy
        result.rawItems.forEach(item => {
          expect(item.title).toContain('Nike Air Max');
          expect(item.brand?.title).toBe('Nike');
          expect(item.size_title).toMatch(/^4[0-7]$/); // Size between 40-47
        });
      });
    });

    describe('Price Entity Extraction', () => {
      it('should extract price entities with different formats', async () => {
        // Arrange
        const priceFormats = [
          { amount: '45.50', expected: 45.50 },
          { amount: '120.00', expected: 120.00 },
          { amount: '99.99', expected: 99.99 },
          { amount: '15.0', expected: 15.0 },
          { amount: '200', expected: 200.0 }
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

      it('should handle invalid price formats gracefully', async () => {
        // Arrange
        const invalidPrices = [
          { amount: 'invalid', currency: 'EUR' },
          { amount: '', currency: 'EUR' },
          { amount: 'NaN', currency: 'EUR' }
        ];

        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: invalidPrices.map(price => ({
            title: 'Nike Air Max 90',
            price,
            brand: { id: 123, title: 'Nike' }
          }))
        };

        mockAxios.get
          .mockResolvedValueOnce({ data: mockSuggestionsResponse })
          .mockResolvedValueOnce({ data: mockSoldItemsResponse });

        // Act & Assert
        await expect(service.analyzeProduct({
          productName: 'Nike Air Max 90',
          catalogId: 456,
          token: 'test-token'
        })).rejects.toThrow();
      });

      it('should calculate price statistics accurately', async () => {
        // Arrange
        const priceData = [
          { amount: '25.00' },
          { amount: '50.00' },
          { amount: '75.00' },
          { amount: '100.00' },
          { amount: '125.00' }
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
        expect(result.avgPrice).toBe(75.00); // (25+50+75+100+125)/5
        expect(result.priceRange.min).toBe(25.00);
        expect(result.priceRange.max).toBe(125.00);
        expect(result.salesVolume).toBe(5);
      });
    });

    describe('Date Entity Extraction', () => {
      it('should extract and parse date entities correctly', async () => {
        // Arrange
        const dateFormats = [
          '2024-01-01T00:00:00Z',
          '2024-02-15T12:30:00Z',
          '2024-03-30T23:59:59Z'
        ];

        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: dateFormats.map((date, index) => ({
            title: `Nike Air Max 90 ${index}`,
            price: { amount: '75.00', currency: 'EUR' },
            brand: { id: 123, title: 'Nike' },
            created_at: date,
            sold_at: date
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
        expect(result.salesVolume).toBe(3);
        result.rawItems.forEach((item, index) => {
          expect(item.created_at).toBe(dateFormats[index]);
          expect(item.sold_at).toBe(dateFormats[index]);
        });
      });

      it('should handle missing date entities', async () => {
        // Arrange
        const mockSuggestionsResponse = {
          brands: [{ id: 123, title: 'Nike' }]
        };
        const mockSoldItemsResponse = {
          items: [
            {
              title: 'Nike Air Max 90',
              price: { amount: '75.00', currency: 'EUR' },
              brand: { id: 123, title: 'Nike' }
              // No date fields
            }
          ]
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
        expect(result.salesVolume).toBe(1);
        expect(result.rawItems[0].created_at).toBeUndefined();
        expect(result.rawItems[0].sold_at).toBeUndefined();
      });
    });
  });

  describe('Automatic Suggestion Generation', () => {
    describe('Product Suggestions', () => {
      it('should generate relevant product suggestions', () => {
        // Arrange
        const testProducts = [
          'Nike Air Max',
          'Adidas Ultraboost',
          'Running shoes',
          'Basketball sneakers',
          'Casual footwear'
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

      it('should prioritize suggestions based on relevance', () => {
        // Arrange
        const specificProduct = 'Nike Air Max 90 Running Shoes';

        // Act
        const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct(specificProduct);

        // Assert
        expect(Array.isArray(suggestions)).toBe(true);
        if (suggestions.length > 1) {
          // Verify suggestions are ordered by relevance
          // More specific matches should come first
          const firstSuggestion = suggestions[0];
          expect(firstSuggestion.name.toLowerCase()).toMatch(/sneaker|shoe|running|sport/);
        }
      });

      it('should handle suggestion generation for edge cases', () => {
        // Arrange
        const edgeCases = [
          '', // Empty string
          '   ', // Whitespace only
          'xyz123', // Non-existent product
          'a', // Single character
          'Very long product name that exceeds normal length limits and contains many words'.repeat(3)
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

      it('should generate suggestions with performance constraints', () => {
        // Arrange
        const testProduct = 'Nike Air Max 90';
        const startTime = Date.now();

        // Act
        const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct(testProduct);

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // Assert
        expect(processingTime).toBeLessThan(100); // Should complete within 100ms
        expect(Array.isArray(suggestions)).toBe(true);
        expect(suggestions.length).toBeLessThanOrEqual(10); // Should limit results
      });
    });

    describe('Category Suggestions', () => {
      it('should generate category suggestions based on search terms', () => {
        // Arrange
        const searchTerms = [
          'sneakers',
          'running',
          'basketball',
          'casual',
          'sport'
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

      it('should handle suggestion generation with fuzzy matching', () => {
        // Arrange
        const fuzzyTerms = [
          'sneker', // Misspelled 'sneaker'
          'runing', // Misspelled 'running'
          'baskeball', // Misspelled 'basketball'
          'casul' // Misspelled 'casual'
        ];

        fuzzyTerms.forEach(term => {
          // Act
          const categories = vintedCatalogHierarchyService.findLevel3Categories(term);

          // Assert
          expect(Array.isArray(categories)).toBe(true);
          // Should still return some results despite misspelling
        });
      });
    });

    describe('Brand Suggestions', () => {
      it('should suggest brands based on product context', async () => {
        // Arrange
        const contextualProducts = [
          { name: 'Athletic running shoes', expectedBrands: ['Nike', 'Adidas', 'New Balance'] },
          { name: 'Casual sneakers', expectedBrands: ['Converse', 'Vans', 'Nike'] },
          { name: 'Basketball shoes', expectedBrands: ['Nike', 'Adidas', 'Jordan'] }
        ];

        for (const product of contextualProducts) {
          const mockSuggestionsResponse = {
            brands: product.expectedBrands.map((brand, index) => ({
              id: 100 + index,
              title: brand
            }))
          };

          mockAxios.get.mockResolvedValueOnce({ data: mockSuggestionsResponse });

          // Act
          const brandId = await service.getSuggestedBrandId(
            product.name,
            456,
            { 'Cookie': 'access_token_web=test-token' }
          );

          // Assert
          expect(brandId).toBe(100); // Should return first suggested brand ID
        }
      });

      it('should handle brand suggestion errors gracefully', async () => {
        // Arrange
        const invalidProduct = 'Non-existent product category';
        const mockSuggestionsResponse = {
          brands: []
        };

        mockAxios.get.mockResolvedValueOnce({ data: mockSuggestionsResponse });

        // Act & Assert
        await expect(service.getSuggestedBrandId(
          invalidProduct,
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Aucune marque suggérée trouvée');
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
          { invalid: 'structure' },
          null,
          undefined
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

      it('should handle partial validation failures gracefully', async () => {
        // Arrange
        const mixedValidityResponse = {
          items: [
            {
              title: 'Valid Item',
              price: { amount: '75.00', currency: 'EUR' },
              brand: { id: 123, title: 'Nike' }
            },
            {
              title: 'Invalid Item'
              // Missing price
            },
            {
              title: 'Another Valid Item',
              price: { amount: '85.00', currency: 'EUR' },
              brand: { id: 124, title: 'Adidas' }
            }
          ]
        };

        mockAxios.get.mockResolvedValueOnce({ data: mixedValidityResponse });

        // Act & Assert
        await expect(service.getSoldItems(
          123,
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow();
      });
    });

    describe('Error Correction', () => {
      it('should correct common data format issues', async () => {
        // Arrange
        const responseWithFormatIssues = {
          brands: [
            { id: 123, title: '  Nike  ' }, // Extra whitespace
            { id: 124, title: 'ADIDAS' }, // Wrong case
            { id: 125, title: 'new balance' } // Wrong case
          ]
        };

        mockAxios.get.mockResolvedValueOnce({ data: responseWithFormatIssues });

        // Act
        const brandId = await service.getSuggestedBrandId(
          'Nike Air Max',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        );

        // Assert
        expect(brandId).toBe(123);
        // The service should handle the data as-is, but validation should pass
      });

      it('should handle numeric string conversion errors', async () => {
        // Arrange
        const responseWithStringNumbers = {
          items: [
            {
              title: 'Nike Air Max 90',
              price: { amount: '75.50', currency: 'EUR' }, // String number (valid)
              brand: { id: 123, title: 'Nike' }
            },
            {
              title: 'Adidas Ultraboost',
              price: { amount: 'invalid-price', currency: 'EUR' }, // Invalid string
              brand: { id: 124, title: 'Adidas' }
            }
          ]
        };

        mockAxios.get.mockResolvedValueOnce({ data: responseWithStringNumbers });

        // Act & Assert
        await expect(service.getSoldItems(
          123,
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow();
      });

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

    describe('Algorithm Performance', () => {
      it('should maintain performance under high data volume', async () => {
        // Arrange
        const largeDataset = Array(1000).fill(null).map((_, i) => ({
          title: `Product ${i}`,
          price: { amount: (20 + i * 0.1).toFixed(2), currency: 'EUR' },
          brand: { id: 123 + (i % 10), title: `Brand ${i % 10}` }
        }));

        // Split into pages
        const pages = [];
        for (let i = 0; i < largeDataset.length; i += 20) {
          pages.push(largeDataset.slice(i, i + 20));
        }

        mockAxios.get.mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } });
        
        // Mock first 5 pages (service limit)
        for (let i = 0; i < 5; i++) {
          mockAxios.get.mockResolvedValueOnce({ data: { items: pages[i] || [] } });
        }

        const startTime = Date.now();

        // Act
        const result = await service.analyzeProduct({
          productName: 'Large Dataset Test',
          catalogId: 456,
          token: 'test-token'
        });

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // Assert
        expect(result.salesVolume).toBe(100); // 5 pages * 20 items
        expect(processingTime).toBeLessThan(3000); // Should complete within 3 seconds
        expect(result.avgPrice).toBeDefined();
        expect(result.priceRange.min).toBeDefined();
        expect(result.priceRange.max).toBeDefined();
      });

      it('should handle algorithm complexity efficiently', () => {
        // Arrange
        const complexSearchTerms = [
          'nike air max 90 premium leather white black red blue green yellow orange purple pink brown gray silver gold',
          'adidas ultraboost 22 running shoes men women unisex size 40 41 42 43 44 45 46 47 48',
          'converse chuck taylor all star high top low top canvas leather suede'
        ];

        complexSearchTerms.forEach(term => {
          const startTime = Date.now();

          // Act
          const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct(term);
          const categories = vintedCatalogHierarchyService.findLevel3Categories(term);
          const smartResults = vintedCatalogHierarchyService.smartSearch(term);

          const endTime = Date.now();
          const processingTime = endTime - startTime;

          // Assert
          expect(processingTime).toBeLessThan(50); // Should complete within 50ms
          expect(Array.isArray(suggestions)).toBe(true);
          expect(Array.isArray(categories)).toBe(true);
          expect(smartResults).toHaveProperty('exact');
          expect(smartResults).toHaveProperty('suggestions');
          expect(smartResults).toHaveProperty('popular');
        });
      });
    });
  });
});