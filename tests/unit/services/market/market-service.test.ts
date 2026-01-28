<<<<<<< HEAD
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { marketService } from '@/lib/services/market/market-service';
import { vintedClient } from '@/lib/services/market/vinted-client-wrapper';
import { databaseService } from '@/lib/database/database-service';

// Mock dependencies
vi.mock('@/lib/services/market/vinted-client-wrapper', () => ({
  vintedClient: {
    searchItems: vi.fn()
  }
}));

vi.mock('@/lib/database/database-service', () => ({
  databaseService: {
    executeQuery: vi.fn()
  }
}));

describe('MarketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchProducts', () => {
    it('should return empty array (mock implementation)', async () => {
      const result = await marketService.searchProducts({ query: 'test' });
      expect(result).toEqual([]);
    });
  });

  describe('analyzeProduct', () => {
    const mockProductId = 'prod-123';
    const mockProduct = {
      id: mockProductId,
      name: 'Nike Shoes',
      enrichmentData: { confidence: 0, enrichmentStatus: 'pending' }
    };

    it('should analyze product successfully', async () => {
      // Mock DB to return product
      (databaseService.executeQuery as any).mockImplementation(async (cb: any) => {
        return mockProduct;
      });

      // We need to handle the two executeQuery calls:
      // 1. getProduct -> returns product
      // 2. updateProduct -> returns void (or we don't care)
      (databaseService.executeQuery as any)
        .mockResolvedValueOnce(mockProduct) // getProduct
        .mockResolvedValueOnce(undefined);  // update

      // Mock Vinted search
      (vintedClient.searchItems as any).mockResolvedValue({
        items: [
          { price: { amount: '10.00' } },
          { price: { amount: '20.00' } },
          { price: { amount: '30.00' } }
        ]
      });

      const userId = "user-123";
      const result = await marketService.analyzeProduct(mockProductId, userId);

      expect(databaseService.executeQuery).toHaveBeenCalledTimes(2);
      expect(vintedClient.searchItems).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          searchText: 'Nike Shoes',
          statusIds: [3],
          order: 'relevance'
        })
      );

      // Verify the result structure (it should be the updated product)
      expect(result).toHaveProperty('id', mockProductId);
      expect(result.enrichmentData).toBeDefined();
      expect(result.enrichmentData?.marketStats).toBeDefined();
      expect(result.enrichmentData?.marketStats?.minPrice).toBe(10);
      expect(result.enrichmentData?.marketStats?.maxPrice).toBe(30);
      expect(result.enrichmentData?.marketStats?.avgPrice).toBe(20);
      expect(result.enrichmentData?.marketStats?.sampleSize).toBe(3);
    });

    it('should throw error if product not found', async () => {
      (databaseService.executeQuery as any).mockResolvedValue(null);

      await expect(marketService.analyzeProduct('missing-id', 'user-123'))
        .rejects.toThrow('Produit non trouvé');
    });

    it('should throw error if no sold items found on Vinted', async () => {
      (databaseService.executeQuery as any).mockResolvedValue(mockProduct);
      (vintedClient.searchItems as any).mockResolvedValue({ items: [] });

      await expect(marketService.analyzeProduct(mockProductId, 'user-123'))
        .rejects.toThrow('Aucun article similaire vendu trouvé');
    });

    it('should throw error if prices cannot be extracted', async () => {
      (databaseService.executeQuery as any).mockResolvedValue(mockProduct);
      (vintedClient.searchItems as any).mockResolvedValue({
        items: [{ price: null }, { price: { amount: 'invalid' } }]
      });

      await expect(marketService.analyzeProduct(mockProductId, 'user-123'))
        .rejects.toThrow("Impossible d'extraire les prix");
    });
  });
});

=======
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketService } from '@/lib/services/market/market-service';

describe('MarketService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('searchProducts', () => {
        it('should return empty array if query is empty', async () => {
            const promise = MarketService.searchProducts({ query: '' });

            // Fast-forward time
            vi.advanceTimersByTime(800);

            const result = await promise;
            expect(result).toEqual([]);
        });

        it('should filter products by title (case insensitive)', async () => {
            const promise = MarketService.searchProducts({ query: 'nike' });

            vi.advanceTimersByTime(800);

            const result = await promise;
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].title.toLowerCase()).toContain('nike');

            // Verify structure
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('price');
        });

        it('should return filtered results specific to query', async () => {
            const promise = MarketService.searchProducts({ query: 'Shadow' });

            vi.advanceTimersByTime(800);

            const result = await promise;
            expect(result.length).toBe(1);
            expect(result[0].title).toContain('Shadow');
        });
    });

    describe('analyzeProduct', () => {
        it('should return analysis for a valid product ID', async () => {
            // ID '1' exists in mock data
            const promise = MarketService.analyzeProduct('1');

            vi.advanceTimersByTime(1500);

            const result = await promise;

            expect(result.productId).toBe('1');
            expect(result.recommendation).toBeDefined();
            expect(result.priceDistribution).toHaveLength(4);
            expect(result.bestPlatform).toBe('Vinted');
        });

        it('should throw error if product not found', async () => {
            const promise = MarketService.analyzeProduct('non-existent-id');

            vi.advanceTimersByTime(1500);

            await expect(promise).rejects.toThrow('Produit non trouvé');
        });
    });
});
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
