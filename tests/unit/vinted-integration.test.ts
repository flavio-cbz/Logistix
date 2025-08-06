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
vi.mock('@/lib/services/logging-instrumentation');
vi.mock('@/lib/utils/logging');

// Mock environment variables
process.env.VINTED_CREDENTIALS_SECRET = 'test-secret-key-for-testing';

const mockAxios = vi.mocked(axios);
const mockDb = vi.mocked(db);
const mockVintedCredentialService = vi.mocked(vintedCredentialService);
const mockVintedSessionManager = vi.mocked(vintedSessionManager);

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
    });
  });
});