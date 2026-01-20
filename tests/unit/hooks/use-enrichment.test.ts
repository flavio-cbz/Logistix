import { renderHook, act } from '@testing-library/react';
import { useEnrichmentPolling, useRetryEnrichment } from '@/lib/hooks/use-enrichment';
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';

// Mock React Query
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: mockInvalidateQueries,
    })),
}));

// Mock global fetch
global.fetch = vi.fn();

describe('use-enrichment hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('useEnrichmentPolling', () => {
        it('should do nothing if disabled', () => {
            renderHook(() => useEnrichmentPolling({ enabled: false, pendingProductIds: ['123'] }));

            // Fast-forward
            vi.advanceTimersByTime(10000);

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should do nothing if no pending product IDs', () => {
            renderHook(() => useEnrichmentPolling({ enabled: true, pendingProductIds: [] }));

            vi.advanceTimersByTime(10000);

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should poll immediately and then at intervals', async () => {
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ completedIds: [] }),
            });

            renderHook(() => useEnrichmentPolling({
                enabled: true,
                pendingProductIds: ['123'],
                intervalMs: 5000
            }));

            // Initial call
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Advance by 5s
            await act(async () => {
                vi.advanceTimersByTime(5000);
            });

            expect(global.fetch).toHaveBeenCalledTimes(2);

            // Verify payload
            expect(global.fetch).toHaveBeenCalledWith('/api/v1/produits/enrichment-status', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ productIds: ['123'] }),
            }));
        });

        it('should invalidate queries when enrichment completes', async () => {
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ completedIds: ['123'] }),
            });

            renderHook(() => useEnrichmentPolling({
                enabled: true,
                pendingProductIds: ['123']
            }));

            // Wait for promise resolution inside the hook
            await act(async () => {
                // The hook calls fetch immediately. We need to wait for the microtask.
                // advancing timers helps if there's deferred execution, but here it's promise-based.
                // We can cycle runAllTicks or just advance a bit.
                await Promise.resolve();
            });

            expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
        });

        it('should handle fetch errors gracefully', async () => {
            (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

            renderHook(() => useEnrichmentPolling({
                enabled: true,
                pendingProductIds: ['123']
            }));

            await act(async () => {
                vi.advanceTimersByTime(5000);
            });

            // Should not throw, should just retry next interval (implied by no crash)
            expect(global.fetch).toHaveBeenCalled();
            expect(mockInvalidateQueries).not.toHaveBeenCalled();
        });
    });

    describe('useRetryEnrichment', () => {
        it('should call retry endpoint and invalidate queries on success', async () => {
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            });

            const { result } = renderHook(() => useRetryEnrichment());

            await act(async () => {
                await result.current.retryEnrichment('123');
            });

            expect(global.fetch).toHaveBeenCalledWith('/api/v1/produits/123/retry-enrichment', expect.objectContaining({
                method: 'POST',
            }));
            expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['products'] });
        });

        it('should throw error on API failure', async () => {
            (global.fetch as Mock).mockResolvedValue({
                ok: false,
                json: async () => ({ message: 'Custom Error' }),
            });

            const { result } = renderHook(() => useRetryEnrichment());

            await expect(async () => {
                await act(async () => {
                    await result.current.retryEnrichment('123');
                });
            }).rejects.toThrow('Custom Error');

            expect(mockInvalidateQueries).not.toHaveBeenCalled();
        });
    });
});
