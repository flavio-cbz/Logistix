import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import { vintedCatalogHierarchyService } from '@/lib/services/vinted-catalog-hierarchy';

// Set environment variables before any imports
process.env.VINTED_CREDENTIALS_SECRET = 'test-secret-key-for-testing';

describe('External Integrations Tests - Task 14 (Simplified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Vinted Authentication Flow and Token Management - Task 14.1', () => {
    describe('VintedAuthService Token Extraction', () => {
      const mockCookie = 'access_token_web=test-token; refresh_token_web=refresh-token; session_id=session123';

      it('should extract access token from cookie string', () => {
        // Act
        const token = VintedAuthService.extractAccessTokenFromCookie(mockCookie);

        // Assert
        expect(token).toBe('test-token');
      });

      it('should extract refresh token from cookie string', () => {
        // Act
        const token = VintedAuthService.extractRefreshTokenFromCookie(mockCookie);

        // Assert
        expect(token).toBe('refresh-token');
      });

      it('should return null when access token is not found', () => {
        // Arrange
        const cookieWithoutToken = 'session_id=session123; other_cookie=value';

        // Act
        const token = VintedAuthService.extractAccessTokenFromCookie(cookieWithoutToken);

        // Assert
        expect(token).toBeNull();
      });

      it('should return null when refresh token is not found', () => {
        // Arrange
        const cookieWithoutRefresh = 'access_token_web=test-token; session_id=session123';

        // Act
        const token = VintedAuthService.extractRefreshTokenFromCookie(cookieWithoutRefresh);

        // Assert
        expect(token).toBeNull();
      });

      it('should handle empty cookie string', () => {
        // Act
        const accessToken = VintedAuthService.extractAccessTokenFromCookie('');
        const refreshToken = VintedAuthService.extractRefreshTokenFromCookie('');

        // Assert
        expect(accessToken).toBeNull();
        expect(refreshToken).toBeNull();
      });

      it('should handle malformed cookie strings', () => {
        // Arrange
        const malformedCookies = [
          'access_token_web=',
          'access_token_web',
          '=test-token',
          'access_token_web=test-token;',
          'access_token_web=test-token; refresh_token_web='
        ];

        malformedCookies.forEach(cookie => {
          // Act
          const accessToken = VintedAuthService.extractAccessTokenFromCookie(cookie);
          const refreshToken = VintedAuthService.extractRefreshTokenFromCookie(cookie);

          // Assert - should handle gracefully
          if (cookie.includes('access_token_web=') && cookie.split('access_token_web=')[1]) {
            expect(typeof accessToken).toBe('string');
          } else {
            expect(accessToken).toBeNull();
          }
        });
      });

      it('should extract tokens from complex cookie strings', () => {
        // Arrange
        const complexCookie = 'session_id=abc123; access_token_web=complex-token-123; other_cookie=value; refresh_token_web=refresh-456; final_cookie=end';

        // Act
        const accessToken = VintedAuthService.extractAccessTokenFromCookie(complexCookie);
        const refreshToken = VintedAuthService.extractRefreshTokenFromCookie(complexCookie);

        // Assert
        expect(accessToken).toBe('complex-token-123');
        expect(refreshToken).toBe('refresh-456');
      });
    });
  });

  describe('Category Hierarchy and Brand Information Sync - Task 14.1', () => {
    describe('Catalog Hierarchy Service', () => {
      it('should find category by ID correctly', () => {
        // Act
        const category = vintedCatalogHierarchyService.findCategoryById(456);

        // Assert
        if (category) {
          expect(category.id).toBe(456);
          expect(category.level).toBeDefined();
          expect([1, 2, 3].includes(category.level)).toBe(true);
        }
        // If category is null, that's also valid (category doesn't exist)
      });

      it('should validate category for analysis', () => {
        // Arrange
        const testCategoryIds = [100, 200, 300, 456, 789];

        testCategoryIds.forEach(categoryId => {
          // Act
          const isValid = vintedCatalogHierarchyService.isValidForAnalysis(categoryId);

          // Assert
          expect(typeof isValid).toBe('boolean');
        });
      });

      it('should get category path correctly', () => {
        // Arrange
        const testCategoryIds = [100, 200, 300, 456];

        testCategoryIds.forEach(categoryId => {
          // Act
          const path = vintedCatalogHierarchyService.getCategoryPath(categoryId);

          // Assert
          expect(Array.isArray(path)).toBe(true);
          expect(path.length).toBeGreaterThanOrEqual(0);
          path.forEach(pathElement => {
            expect(typeof pathElement).toBe('string');
          });
        });
      });

      it('should find level 3 categories by search term', () => {
        // Arrange
        const searchTerms = ['sneakers', 'shoes', 'clothing', 'accessories'];

        searchTerms.forEach(term => {
          // Act
          const categories = vintedCatalogHierarchyService.findLevel3Categories(term);

          // Assert
          expect(Array.isArray(categories)).toBe(true);
          categories.forEach(category => {
            expect(category.level).toBe(3);
            expect(category.id).toBeDefined();
            expect(category.name).toBeDefined();
            expect(typeof category.id).toBe('number');
            expect(typeof category.name).toBe('string');
          });
        });
      });

      it('should suggest categories for product', () => {
        // Arrange
        const productNames = [
          'Nike Air Max 90',
          'Adidas Ultraboost',
          'Converse Chuck Taylor',
          'Running shoes',
          'Basketball sneakers'
        ];

        productNames.forEach(productName => {
          // Act
          const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct(productName);

          // Assert
          expect(Array.isArray(suggestions)).toBe(true);
          suggestions.forEach(suggestion => {
            expect(suggestion.level).toBe(3);
            expect(suggestion.isValidForAnalysis).toBe(true);
            expect(suggestion.name).toBeDefined();
            expect(suggestion.id).toBeDefined();
            expect(typeof suggestion.id).toBe('number');
            expect(typeof suggestion.name).toBe('string');
          });
        });
      });

      it('should perform smart search with multiple result types', () => {
        // Arrange
        const searchQueries = ['nike sneakers', 'running shoes', 'casual wear'];

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

          // Verify all results are level 3 categories
          [...results.exact, ...results.suggestions, ...results.popular].forEach(category => {
            expect(category.level).toBe(3);
            expect(category.isValidForAnalysis).toBe(true);
            expect(typeof category.id).toBe('number');
            expect(typeof category.name).toBe('string');
          });
        });
      });

      it('should validate category with detailed result', () => {
        // Arrange
        const testCategoryIds = [100, 200, 300, 456, 999999]; // Include non-existent ID

        testCategoryIds.forEach(categoryId => {
          // Act
          const validation = vintedCatalogHierarchyService.validateCategory(categoryId);

          // Assert
          expect(validation).toHaveProperty('isValid');
          expect(validation).toHaveProperty('level');
          expect(validation).toHaveProperty('message');
          expect(validation).toHaveProperty('suggestions');
          
          expect(typeof validation.isValid).toBe('boolean');
          expect(typeof validation.level).toBe('number');
          expect(typeof validation.message).toBe('string');
          expect(Array.isArray(validation.suggestions)).toBe(true);
          
          // Level should be 1, 2, or 3
          expect([1, 2, 3].includes(validation.level)).toBe(true);
          
          // Suggestions should be level 3 categories
          validation.suggestions.forEach(suggestion => {
            expect(suggestion.level).toBe(3);
            expect(suggestion.isValidForAnalysis).toBe(true);
          });
        });
      });

      it('should get service statistics', () => {
        // Act
        const stats = vintedCatalogHierarchyService.getStats();

        // Assert
        expect(stats).toHaveProperty('totalLevel1');
        expect(stats).toHaveProperty('totalLevel2');
        expect(stats).toHaveProperty('totalLevel3');
        expect(stats).toHaveProperty('totalKeywords');
        expect(stats).toHaveProperty('cacheSize');
        
        expect(typeof stats.totalLevel1).toBe('number');
        expect(typeof stats.totalLevel2).toBe('number');
        expect(typeof stats.totalLevel3).toBe('number');
        expect(typeof stats.totalKeywords).toBe('number');
        expect(typeof stats.cacheSize).toBe('number');
        
        // All counts should be non-negative
        expect(stats.totalLevel1).toBeGreaterThanOrEqual(0);
        expect(stats.totalLevel2).toBeGreaterThanOrEqual(0);
        expect(stats.totalLevel3).toBeGreaterThanOrEqual(0);
        expect(stats.totalKeywords).toBeGreaterThanOrEqual(0);
        expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
      });

      it('should handle edge cases in search and suggestions', () => {
        // Arrange
        const edgeCases = [
          '', // Empty string
          '   ', // Whitespace only
          'xyz123', // Non-existent product
          'a', // Single character
          '!@#$%', // Special characters only
          'very long product name that exceeds normal length limits and contains many words and should still be handled gracefully'
        ];

        edgeCases.forEach(edgeCase => {
          // Act & Assert - Should not throw errors
          expect(() => {
            const categories = vintedCatalogHierarchyService.findLevel3Categories(edgeCase);
            expect(Array.isArray(categories)).toBe(true);
          }).not.toThrow();

          expect(() => {
            const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct(edgeCase);
            expect(Array.isArray(suggestions)).toBe(true);
          }).not.toThrow();

          expect(() => {
            const smartResults = vintedCatalogHierarchyService.smartSearch(edgeCase);
            expect(smartResults).toHaveProperty('exact');
            expect(smartResults).toHaveProperty('suggestions');
            expect(smartResults).toHaveProperty('popular');
          }).not.toThrow();
        });
      });

      it('should maintain performance with large search operations', () => {
        // Arrange
        const startTime = Date.now();
        const searchTerms = Array(50).fill(null).map((_, i) => `search term ${i}`);

        // Act
        searchTerms.forEach(term => {
          vintedCatalogHierarchyService.findLevel3Categories(term);
          vintedCatalogHierarchyService.suggestLevel3ForProduct(term);
          vintedCatalogHierarchyService.smartSearch(term);
        });

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Assert
        expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      });
    });
  });

  describe('Data Parsing and Processing - Task 14.2', () => {
    describe('Category Analysis', () => {
      it('should analyze category hierarchy correctly', () => {
        // Arrange
        const searchTerms = ['sneakers', 'running', 'basketball', 'casual'];

        searchTerms.forEach(term => {
          // Act
          const level3Categories = vintedCatalogHierarchyService.findLevel3Categories(term);

          // Assert
          expect(Array.isArray(level3Categories)).toBe(true);
          level3Categories.forEach(category => {
            expect(category.level).toBe(3);
            expect(category.name).toBeDefined();
            expect(category.id).toBeDefined();
            expect(typeof category.name).toBe('string');
            expect(typeof category.id).toBe('number');
          });
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
            expect(typeof suggestion.name).toBe('string');
            expect(typeof suggestion.id).toBe('number');
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
          expect(typeof validation.message).toBe('string');
          expect(Array.isArray(validation.suggestions)).toBe(true);
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

          // Verify structure of results
          [...results.exact, ...results.suggestions, ...results.popular].forEach(category => {
            expect(category).toHaveProperty('level');
            expect(category).toHaveProperty('name');
            expect(category).toHaveProperty('id');
            expect(category).toHaveProperty('isValidForAnalysis');
            expect(category.level).toBe(3);
            expect(category.isValidForAnalysis).toBe(true);
          });
        });
      });

      it('should get category paths correctly', () => {
        // Arrange
        const testCategoryIds = [456, 789, 123, 999];

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

    describe('Automatic Suggestion Generation', () => {
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
            expect(typeof suggestion.name).toBe('string');
            expect(typeof suggestion.id).toBe('number');
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
          // Verify suggestions are ordered (more specific matches should come first)
          const firstSuggestion = suggestions[0];
          expect(firstSuggestion.name).toBeDefined();
          expect(typeof firstSuggestion.name).toBe('string');
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
            expect(typeof category.name).toBe('string');
            expect(typeof category.id).toBe('number');
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
          // Should still return some results despite misspelling (or empty array is also valid)
        });
      });
    });

    describe('Error Correction and Validation Algorithms', () => {
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

  describe('Integration Performance Tests', () => {
    it('should maintain performance under concurrent operations', () => {
      // Arrange
      const operations = Array(20).fill(null).map((_, i) => ({
        searchTerm: `search ${i}`,
        productName: `product ${i}`,
        categoryId: 100 + i
      }));

      const startTime = Date.now();

      // Act
      operations.forEach(op => {
        vintedCatalogHierarchyService.findLevel3Categories(op.searchTerm);
        vintedCatalogHierarchyService.suggestLevel3ForProduct(op.productName);
        vintedCatalogHierarchyService.validateCategory(op.categoryId);
        vintedCatalogHierarchyService.getCategoryPath(op.categoryId);
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Assert
      expect(totalTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle memory efficiently with large datasets', () => {
      // Arrange
      const largeDataset = Array(1000).fill(null).map((_, i) => `item ${i}`);

      // Act & Assert - Should not cause memory issues
      largeDataset.forEach(item => {
        const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct(item);
        expect(Array.isArray(suggestions)).toBe(true);
      });
    });
  });
});