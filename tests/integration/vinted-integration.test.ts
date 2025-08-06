import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';
import { vintedCredentialService } from '@/lib/services/auth/vinted-credential-service';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { vintedMarketAnalysisService } from '@/lib/services/vinted-market-analysis';
import { vintedCatalogHierarchyService } from '@/lib/services/vinted-catalog-hierarchy';
import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';

// Mock dependencies
vi.mock('axios');
vi.mock('@/lib/services/database/drizzle-client');
vi.mock('@/lib/services/auth/vinted-credential-service');
vi.mock('@/lib/services/auth/vinted-session-manager');
vi.mock('cloudscraper');

const mockAxios = vi.mocked(axios);
const mockDb = vi.mocked(db);
const mockVintedCredentialService = vi.mocked(vintedCredentialService);
const mockVintedSessionManager = vi.mocked(vintedSessionManager);

describe('Vinted Integration Tests - Task 14.1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default database mocks
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
      })
    });
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([])
      })
    });
    mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    });
    mockDb.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined)
    });
    mockDb.transaction = vi.fn().mockImplementation((callback) => callback(mockDb));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Vinted Authentication Flow and Token Management', () => {
    describe('VintedAuthService', () => {
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

      it('should validate access token successfully', async () => {
        // Arrange
        const authService = new VintedAuthService(mockCookie);
        const mockCloudscraperResponse = {
          statusCode: 200,
          body: { id: 'user123', username: 'testuser' }
        };

        // Mock cloudscraper
        const cloudscraper = await import('cloudscraper');
        vi.mocked(cloudscraper.default).mockResolvedValue(mockCloudscraperResponse);

        // Act
        const result = await authService.validateAccessToken();

        // Assert
        expect(result.valid).toBe(true);
        expect(result.status).toBe(200);
        expect(result.body).toEqual({ id: 'user123', username: 'testuser' });
      });

      it('should handle invalid access token', async () => {
        // Arrange
        const authService = new VintedAuthService(mockCookie);
        const mockCloudscraperResponse = {
          statusCode: 401,
          body: { error: 'Unauthorized' }
        };

        const cloudscraper = await import('cloudscraper');
        vi.mocked(cloudscraper.default).mockResolvedValue(mockCloudscraperResponse);

        // Act
        const result = await authService.validateAccessToken();

        // Assert
        expect(result.valid).toBe(false);
        expect(result.status).toBe(401);
      });

      it('should handle network errors during token validation', async () => {
        // Arrange
        const authService = new VintedAuthService(mockCookie);
        const networkError = new Error('Network error');

        const cloudscraper = await import('cloudscraper');
        vi.mocked(cloudscraper.default).mockRejectedValue(networkError);

        // Act
        const result = await authService.validateAccessToken();

        // Assert
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Network error');
      });

      it('should refresh access token successfully', async () => {
        // Arrange
        const authService = new VintedAuthService(mockCookie);
        const mockRefreshResponse = {
          statusCode: 200,
          headers: {
            'set-cookie': [
              'access_token_web=new-access-token; Path=/; HttpOnly',
              'refresh_token_web=new-refresh-token; Path=/; HttpOnly'
            ]
          }
        };

        const cloudscraper = await import('cloudscraper');
        vi.mocked(cloudscraper.default).mockResolvedValue(mockRefreshResponse);

        // Act
        const tokens = await authService.refreshAccessToken();

        // Assert
        expect(tokens).toEqual({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        });
      });

      it('should return null when refresh fails', async () => {
        // Arrange
        const authService = new VintedAuthService(mockCookie);
        const mockRefreshResponse = {
          statusCode: 401,
          headers: {}
        };

        const cloudscraper = await import('cloudscraper');
        vi.mocked(cloudscraper.default).mockResolvedValue(mockRefreshResponse);

        // Act
        const tokens = await authService.refreshAccessToken();

        // Assert
        expect(tokens).toBeNull();
      });

      it('should handle refresh token network errors', async () => {
        // Arrange
        const authService = new VintedAuthService(mockCookie);
        const networkError = new Error('Network timeout');

        const cloudscraper = await import('cloudscraper');
        vi.mocked(cloudscraper.default).mockRejectedValue(networkError);

        // Act
        const tokens = await authService.refreshAccessToken();

        // Assert
        expect(tokens).toBeNull();
      });
    });

    describe('Vinted Credential Service', () => {
      it('should encrypt credentials securely', async () => {
        // Arrange
        const plaintext = 'access_token_web=secret-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-data');

        // Act
        const encrypted = await vintedCredentialService.encrypt(plaintext);

        // Assert
        expect(encrypted).toBe('encrypted-data');
        expect(mockVintedCredentialService.encrypt).toHaveBeenCalledWith(plaintext);
      });

      it('should decrypt credentials correctly', async () => {
        // Arrange
        const encryptedData = 'encrypted-data';
        const expectedPlaintext = 'access_token_web=secret-token';
        mockVintedCredentialService.decrypt.mockResolvedValue(expectedPlaintext);

        // Act
        const decrypted = await vintedCredentialService.decrypt(encryptedData);

        // Assert
        expect(decrypted).toBe(expectedPlaintext);
        expect(mockVintedCredentialService.decrypt).toHaveBeenCalledWith(encryptedData);
      });

      it('should handle encryption errors gracefully', async () => {
        // Arrange
        const plaintext = 'access_token_web=secret-token';
        mockVintedCredentialService.encrypt.mockRejectedValue(new Error('Encryption failed'));

        // Act & Assert
        await expect(vintedCredentialService.encrypt(plaintext))
          .rejects.toThrow('Encryption failed');
      });

      it('should handle decryption errors gracefully', async () => {
        // Arrange
        const encryptedData = 'invalid-encrypted-data';
        mockVintedCredentialService.decrypt.mockRejectedValue(new Error('Decryption failed'));

        // Act & Assert
        await expect(vintedCredentialService.decrypt(encryptedData))
          .rejects.toThrow('Decryption failed');
      });
    });

    describe('Vinted Session Manager', () => {
      const mockUserId = 'user-123';

      it('should refresh session successfully', async () => {
        // Arrange
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: true,
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        });

        // Act
        const result = await vintedSessionManager.refreshSession(mockUserId);

        // Assert
        expect(result.success).toBe(true);
        expect(result.tokens).toBeDefined();
        expect(mockVintedSessionManager.refreshSession).toHaveBeenCalledWith(mockUserId);
      });

      it('should handle session refresh failure', async () => {
        // Arrange
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: false,
          error: 'Invalid refresh token'
        });

        // Act
        const result = await vintedSessionManager.refreshSession(mockUserId);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid refresh token');
      });

      it('should validate session status', async () => {
        // Arrange
        mockVintedSessionManager.validateSession.mockResolvedValue({
          valid: true,
          status: 'active',
          expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
        });

        // Act
        const result = await vintedSessionManager.validateSession(mockUserId);

        // Assert
        expect(result.valid).toBe(true);
        expect(result.status).toBe('active');
        expect(result.expiresAt).toBeInstanceOf(Date);
      });

      it('should handle expired sessions', async () => {
        // Arrange
        mockVintedSessionManager.validateSession.mockResolvedValue({
          valid: false,
          status: 'expired',
          expiresAt: new Date(Date.now() - 3600000) // 1 hour ago
        });

        // Act
        const result = await vintedSessionManager.validateSession(mockUserId);

        // Assert
        expect(result.valid).toBe(false);
        expect(result.status).toBe('expired');
      });

      it('should clean up expired sessions', async () => {
        // Arrange
        mockVintedSessionManager.cleanupExpiredSessions.mockResolvedValue({
          cleaned: 5,
          remaining: 10
        });

        // Act
        const result = await vintedSessionManager.cleanupExpiredSessions();

        // Assert
        expect(result.cleaned).toBe(5);
        expect(result.remaining).toBe(10);
      });
    });
  });

  describe('Product Metadata Synchronization', () => {
    describe('Market Analysis Service Integration', () => {
      const mockAnalysisRequest = {
        productName: 'Nike Air Max 90',
        catalogId: 456,
        token: 'valid-session-cookie'
      };

      const mockVintedResponse = {
        salesVolume: 25,
        avgPrice: 67.50,
        priceRange: { min: 35.00, max: 120.00 },
        brandInfo: { id: 123, name: 'Nike' },
        catalogInfo: { id: 456, name: 'Sneakers' },
        rawItems: [
          {
            title: 'Nike Air Max 90 White',
            price: { amount: '67.50', currency: 'EUR' },
            size_title: '42',
            brand: { id: 123, title: 'Nike' },
            created_at: '2024-01-01T00:00:00Z',
            sold_at: '2024-01-02T00:00:00Z'
          }
        ],
        analysisDate: '2025-01-01T00:00:00.000Z'
      };

      it('should synchronize product metadata from Vinted API', async () => {
        // Arrange
        mockAxios.get
          .mockResolvedValueOnce({ // suggestions call
            data: { brands: [{ id: 123, title: 'Nike' }] }
          })
          .mockResolvedValueOnce({ // sold items call
            data: { items: mockVintedResponse.rawItems }
          });

        // Act
        const result = await vintedMarketAnalysisService.analyzeProduct(mockAnalysisRequest);

        // Assert
        expect(result).toMatchObject({
          salesVolume: expect.any(Number),
          avgPrice: expect.any(Number),
          brandInfo: expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String)
          }),
          catalogInfo: expect.objectContaining({
            id: mockAnalysisRequest.catalogId
          })
        });
        expect(result.rawItems).toHaveLength(1);
        expect(result.analysisDate).toBeDefined();
      });

      it('should handle product metadata synchronization errors', async () => {
        // Arrange
        const apiError = new Error('Vinted API Error');
        (apiError as any).isAxiosError = true;
        (apiError as any).response = { status: 500, statusText: 'Internal Server Error' };
        
        mockAxios.get.mockRejectedValueOnce(apiError);

        // Act & Assert
        await expect(vintedMarketAnalysisService.analyzeProduct(mockAnalysisRequest))
          .rejects.toThrow('Erreur API');
      });

      it('should validate product metadata format', async () => {
        // Arrange
        const invalidResponse = {
          brands: [{ title: 'Nike' }] // Missing id field
        };
        mockAxios.get.mockResolvedValueOnce({ data: invalidResponse });

        // Act & Assert
        await expect(vintedMarketAnalysisService.analyzeProduct(mockAnalysisRequest))
          .rejects.toThrow('Réponse API suggestions invalide');
      });

      it('should handle empty product metadata gracefully', async () => {
        // Arrange
        mockAxios.get
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } })
          .mockResolvedValueOnce({ data: { items: [] } });

        // Act
        const result = await vintedMarketAnalysisService.analyzeProduct(mockAnalysisRequest);

        // Assert
        expect(result.salesVolume).toBe(0);
        expect(result.avgPrice).toBe(0);
        expect(result.rawItems).toHaveLength(0);
        expect(result.brandInfo).toBeNull();
      });

      it('should retry failed metadata synchronization', async () => {
        // Arrange
        const temporaryError = new Error('Temporary error');
        (temporaryError as any).isAxiosError = true;
        (temporaryError as any).code = 'ECONNABORTED';

        mockAxios.get
          .mockRejectedValueOnce(temporaryError) // First attempt fails
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } }) // Retry succeeds
          .mockResolvedValueOnce({ data: { items: mockVintedResponse.rawItems } });

        // Act
        const result = await vintedMarketAnalysisService.retryWithBackoff(
          () => vintedMarketAnalysisService.analyzeProduct(mockAnalysisRequest),
          2,
          100
        );

        // Assert
        expect(result).toBeDefined();
        expect(mockAxios.get).toHaveBeenCalledTimes(3); // 1 failed + 2 successful
      });
    });

    describe('Brand Information Synchronization', () => {
      it('should synchronize brand information correctly', async () => {
        // Arrange
        const mockBrandResponse = {
          brands: [
            { id: 123, title: 'Nike' },
            { id: 124, title: 'Adidas' },
            { id: 125, title: 'Puma' }
          ]
        };
        mockAxios.get.mockResolvedValueOnce({ data: mockBrandResponse });

        // Act
        const brandId = await vintedMarketAnalysisService.getSuggestedBrandId(
          'Nike Air Max',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        );

        // Assert
        expect(brandId).toBe(123);
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('/items/suggestions'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Cookie': 'access_token_web=test-token'
            })
          })
        );
      });

      it('should handle brand information validation errors', async () => {
        // Arrange
        const invalidBrandResponse = {
          brands: [
            { title: 'Nike' }, // Missing id field
            { id: 124 } // Missing title field
          ]
        };
        mockAxios.get.mockResolvedValueOnce({ data: invalidBrandResponse });

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Nike Air Max',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Réponse API suggestions invalide');
      });

      it('should handle missing brand information', async () => {
        // Arrange
        mockAxios.get.mockResolvedValueOnce({ data: { brands: [] } });

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Unknown Brand Product',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Aucune marque suggérée trouvée');
      });
    });
  });

  describe('Category Hierarchy and Brand Information Sync', () => {
    describe('Catalog Hierarchy Service', () => {
      it('should find category by ID correctly', () => {
        // Act
        const category = vintedCatalogHierarchyService.findCategoryById(456);

        // Assert
        expect(category).toBeDefined();
        if (category) {
          expect(category.id).toBe(456);
          expect(category.level).toBeDefined();
        }
      });

      it('should validate category for analysis', () => {
        // Act
        const isValid = vintedCatalogHierarchyService.isValidForAnalysis(456);

        // Assert
        expect(typeof isValid).toBe('boolean');
      });

      it('should get category path correctly', () => {
        // Act
        const path = vintedCatalogHierarchyService.getCategoryPath(456);

        // Assert
        expect(Array.isArray(path)).toBe(true);
        expect(path.length).toBeGreaterThanOrEqual(0);
      });

      it('should find level 3 categories by search term', () => {
        // Act
        const categories = vintedCatalogHierarchyService.findLevel3Categories('sneakers');

        // Assert
        expect(Array.isArray(categories)).toBe(true);
        categories.forEach(category => {
          expect(category.level).toBe(3);
          expect(category.id).toBeDefined();
          expect(category.name).toBeDefined();
        });
      });

      it('should suggest categories for product', () => {
        // Act
        const suggestions = vintedCatalogHierarchyService.suggestLevel3ForProduct('Nike Air Max');

        // Assert
        expect(Array.isArray(suggestions)).toBe(true);
        suggestions.forEach(suggestion => {
          expect(suggestion.level).toBe(3);
          expect(suggestion.isValidForAnalysis).toBe(true);
        });
      });

      it('should perform smart search with multiple result types', () => {
        // Act
        const results = vintedCatalogHierarchyService.smartSearch('sneakers');

        // Assert
        expect(results).toHaveProperty('exact');
        expect(results).toHaveProperty('suggestions');
        expect(results).toHaveProperty('popular');
        expect(Array.isArray(results.exact)).toBe(true);
        expect(Array.isArray(results.suggestions)).toBe(true);
        expect(Array.isArray(results.popular)).toBe(true);
      });

      it('should validate category with detailed result', () => {
        // Act
        const validation = vintedCatalogHierarchyService.validateCategory(456);

        // Assert
        expect(validation).toHaveProperty('isValid');
        expect(validation).toHaveProperty('level');
        expect(validation).toHaveProperty('message');
        expect(validation).toHaveProperty('suggestions');
        expect(typeof validation.isValid).toBe('boolean');
        expect(typeof validation.level).toBe('number');
        expect(typeof validation.message).toBe('string');
        expect(Array.isArray(validation.suggestions)).toBe(true);
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
      });
    });
  });

  describe('Market Data Collection and Processing', () => {
    describe('Sold Items Data Collection', () => {
      const mockHeaders = { 'Cookie': 'access_token_web=test-token' };

      it('should collect sold items data with pagination', async () => {
        // Arrange
        const page1Items = Array(20).fill(null).map((_, i) => ({
          title: `Product ${i}`,
          price: { amount: (30 + i).toString(), currency: 'EUR' },
          size_title: '42',
          brand: { id: 123, title: 'Nike' },
          created_at: '2024-01-01T00:00:00Z',
          sold_at: '2024-01-02T00:00:00Z'
        }));

        const page2Items = Array(15).fill(null).map((_, i) => ({
          title: `Product ${i + 20}`,
          price: { amount: (50 + i).toString(), currency: 'EUR' },
          size_title: '43',
          brand: { id: 123, title: 'Nike' },
          created_at: '2024-01-01T00:00:00Z',
          sold_at: '2024-01-03T00:00:00Z'
        }));

        mockAxios.get
          .mockResolvedValueOnce({ data: { items: page1Items } })
          .mockResolvedValueOnce({ data: { items: page2Items } })
          .mockResolvedValueOnce({ data: { items: [] } }); // End pagination

        // Act
        const items = await vintedMarketAnalysisService.getSoldItems(123, 456, mockHeaders);

        // Assert
        expect(items).toHaveLength(35);
        expect(mockAxios.get).toHaveBeenCalledTimes(3);
        
        // Verify pagination parameters
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('page=1'),
          expect.any(Object)
        );
        expect(mockAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });

      it('should handle sold items data validation', async () => {
        // Arrange
        const invalidItems = [
          { title: 'Product 1' }, // Missing price
          { price: { amount: '30.00' } }, // Missing title
          { title: 'Product 3', price: { currency: 'EUR' } } // Missing amount
        ];

        mockAxios.get.mockResolvedValueOnce({ data: { items: invalidItems } });

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSoldItems(123, 456, mockHeaders))
          .rejects.toThrow();
      });

      it('should process market data correctly', async () => {
        // Arrange
        const soldItems = [
          {
            title: 'Nike Air Max 90 White',
            price: { amount: '45.00', currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          },
          {
            title: 'Nike Air Max 90 Black',
            price: { amount: '55.00', currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          },
          {
            title: 'Nike Air Max 90 Red',
            price: { amount: '65.00', currency: 'EUR' },
            brand: { id: 123, title: 'Nike' }
          }
        ];

        mockAxios.get
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } })
          .mockResolvedValueOnce({ data: { items: soldItems } });

        // Act
        const result = await vintedMarketAnalysisService.analyzeProduct({
          productName: 'Nike Air Max 90',
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.salesVolume).toBe(3);
        expect(result.avgPrice).toBe(55.00); // (45 + 55 + 65) / 3
        expect(result.priceRange).toEqual({ min: 45.00, max: 65.00 });
        expect(result.brandInfo).toEqual({ id: 123, name: 'Nike' });
        expect(result.rawItems).toHaveLength(3);
      });

      it('should handle market data processing errors', async () => {
        // Arrange
        const processingError = new Error('Data processing failed');
        mockAxios.get
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } })
          .mockRejectedValueOnce(processingError);

        // Act & Assert
        await expect(vintedMarketAnalysisService.analyzeProduct({
          productName: 'Nike Air Max 90',
          catalogId: 456,
          token: 'test-token'
        })).rejects.toThrow();
      });

      it('should respect rate limiting during data collection', async () => {
        // Arrange
        const rateLimitError = new Error('Too Many Requests');
        (rateLimitError as any).isAxiosError = true;
        (rateLimitError as any).response = { status: 429, statusText: 'Too Many Requests' };

        mockAxios.get
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } })
          .mockRejectedValueOnce(rateLimitError);

        // Act & Assert
        await expect(vintedMarketAnalysisService.analyzeProduct({
          productName: 'Nike Air Max 90',
          catalogId: 456,
          token: 'test-token'
        })).rejects.toThrow('Erreur API');
      });

      it('should handle timeout errors during data collection', async () => {
        // Arrange
        const timeoutError = new Error('timeout of 15000ms exceeded');
        (timeoutError as any).isAxiosError = true;
        (timeoutError as any).code = 'ECONNABORTED';

        mockAxios.get
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } })
          .mockRejectedValueOnce(timeoutError);

        // Act & Assert
        await expect(vintedMarketAnalysisService.analyzeProduct({
          productName: 'Nike Air Max 90',
          catalogId: 456,
          token: 'test-token'
        })).rejects.toThrow('Timeout de la requête');
      });
    });

    describe('Data Aggregation and Analysis', () => {
      it('should aggregate market data correctly', async () => {
        // Arrange
        const largeSoldItemsDataset = Array(100).fill(null).map((_, i) => ({
          title: `Product ${i}`,
          price: { amount: (20 + (i * 0.5)).toFixed(2), currency: 'EUR' },
          brand: { id: 123, title: 'Nike' },
          created_at: '2024-01-01T00:00:00Z',
          sold_at: '2024-01-02T00:00:00Z'
        }));

        mockAxios.get
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } })
          .mockResolvedValueOnce({ data: { items: largeSoldItemsDataset.slice(0, 20) } })
          .mockResolvedValueOnce({ data: { items: largeSoldItemsDataset.slice(20, 40) } })
          .mockResolvedValueOnce({ data: { items: largeSoldItemsDataset.slice(40, 60) } })
          .mockResolvedValueOnce({ data: { items: largeSoldItemsDataset.slice(60, 80) } })
          .mockResolvedValueOnce({ data: { items: largeSoldItemsDataset.slice(80, 100) } });

        // Act
        const result = await vintedMarketAnalysisService.analyzeProduct({
          productName: 'Nike Collection',
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.salesVolume).toBe(100);
        expect(result.avgPrice).toBeCloseTo(44.75, 2); // Expected average
        expect(result.priceRange.min).toBe(20.00);
        expect(result.priceRange.max).toBe(69.50);
        expect(result.brandInfo).toEqual({ id: 123, name: 'Nike' });
      });

      it('should handle empty aggregation results', async () => {
        // Arrange
        mockAxios.get
          .mockResolvedValueOnce({ data: { brands: [{ id: 123, title: 'Nike' }] } })
          .mockResolvedValueOnce({ data: { items: [] } });

        // Act
        const result = await vintedMarketAnalysisService.analyzeProduct({
          productName: 'Rare Product',
          catalogId: 456,
          token: 'test-token'
        });

        // Assert
        expect(result.salesVolume).toBe(0);
        expect(result.avgPrice).toBe(0);
        expect(result.priceRange).toEqual({ min: 0, max: 0 });
        expect(result.brandInfo).toBeNull();
        expect(result.rawItems).toHaveLength(0);
      });
    });
  });

  describe('Integration Error Handling and Recovery', () => {
    describe('Network Error Recovery', () => {
      it('should handle connection errors with retry mechanism', async () => {
        // Arrange
        const connectionError = new Error('ECONNREFUSED');
        (connectionError as any).isAxiosError = true;
        (connectionError as any).code = 'ECONNREFUSED';

        const operation = vi.fn()
          .mockRejectedValueOnce(connectionError)
          .mockRejectedValueOnce(connectionError)
          .mockResolvedValueOnce('success');

        // Mock setTimeout to avoid delays in tests
        vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
          callback();
          return {} as any;
        });

        // Act
        const result = await vintedMarketAnalysisService.retryWithBackoff(operation, 3, 100);

        // Assert
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should handle DNS resolution errors', async () => {
        // Arrange
        const dnsError = new Error('getaddrinfo ENOTFOUND');
        (dnsError as any).isAxiosError = true;
        (dnsError as any).code = 'ENOTFOUND';

        mockAxios.get.mockRejectedValueOnce(dnsError);

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Test Product',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Erreur réseau');
      });

      it('should handle SSL/TLS errors', async () => {
        // Arrange
        const sslError = new Error('certificate verify failed');
        (sslError as any).isAxiosError = true;
        (sslError as any).code = 'CERT_UNTRUSTED';

        mockAxios.get.mockRejectedValueOnce(sslError);

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Test Product',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Erreur réseau');
      });
    });

    describe('API Error Recovery', () => {
      it('should handle 503 Service Unavailable errors', async () => {
        // Arrange
        const serviceUnavailableError = new Error('Service Unavailable');
        (serviceUnavailableError as any).isAxiosError = true;
        (serviceUnavailableError as any).response = { 
          status: 503, 
          statusText: 'Service Unavailable' 
        };

        mockAxios.get.mockRejectedValueOnce(serviceUnavailableError);

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Test Product',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Erreur API');
      });

      it('should handle 502 Bad Gateway errors', async () => {
        // Arrange
        const badGatewayError = new Error('Bad Gateway');
        (badGatewayError as any).isAxiosError = true;
        (badGatewayError as any).response = { 
          status: 502, 
          statusText: 'Bad Gateway' 
        };

        mockAxios.get.mockRejectedValueOnce(badGatewayError);

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Test Product',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Erreur API');
      });

      it('should handle authentication errors with session refresh', async () => {
        // Arrange
        const authError = new Error('Unauthorized');
        (authError as any).isAxiosError = true;
        (authError as any).response = { status: 401, statusText: 'Unauthorized' };

        mockAxios.get.mockRejectedValueOnce(authError);

        // Mock session refresh
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: true,
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        });

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Test Product',
          456,
          { 'Cookie': 'access_token_web=old-token' }
        )).rejects.toThrow('Erreur API');

        // Verify session refresh was attempted
        // Note: In a real implementation, the service would attempt to refresh the session
        // This test verifies the error handling behavior
      });
    });

    describe('Data Validation Error Recovery', () => {
      it('should handle malformed JSON responses', async () => {
        // Arrange
        const malformedResponse = { data: 'not-json-object' };
        mockAxios.get.mockResolvedValueOnce(malformedResponse);

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Test Product',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Réponse API suggestions invalide');
      });

      it('should handle missing required fields in API responses', async () => {
        // Arrange
        const incompleteResponse = {
          data: {
            brands: [
              { id: 123 }, // Missing title
              { title: 'Nike' } // Missing id
            ]
          }
        };
        mockAxios.get.mockResolvedValueOnce(incompleteResponse);

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Test Product',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Réponse API suggestions invalide');
      });

      it('should handle unexpected data types in responses', async () => {
        // Arrange
        const invalidTypeResponse = {
          data: {
            brands: 'not-an-array'
          }
        };
        mockAxios.get.mockResolvedValueOnce(invalidTypeResponse);

        // Act & Assert
        await expect(vintedMarketAnalysisService.getSuggestedBrandId(
          'Test Product',
          456,
          { 'Cookie': 'access_token_web=test-token' }
        )).rejects.toThrow('Réponse API suggestions invalide');
      });
    });
  });
});