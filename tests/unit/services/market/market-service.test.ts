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
