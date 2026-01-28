/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import {
    PreferencesProvider,
    usePreferences,
    defaultPreferences,
    DEFAULT_EXCHANGE_RATES
} from '@/lib/contexts/preferences-context';

// Helper wrapper for tests
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PreferencesProvider>{children}</PreferencesProvider>
);

describe('preferences-context', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset fetch mock
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('usePreferences without provider', () => {
        it('should return default values when used outside provider', () => {
            const { result } = renderHook(() => usePreferences());

            expect(result.current.preferences).toEqual(defaultPreferences);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.exchangeRates).toEqual(DEFAULT_EXCHANGE_RATES);
            expect(result.current.getExchangeRate()).toBe(1);
        });

        it('should have a noop refetch function', async () => {
            const { result } = renderHook(() => usePreferences());

            // Should not throw
            await expect(result.current.refetch()).resolves.toBeUndefined();
        });
    });

    describe('usePreferences with provider', () => {
        it('should show loading state initially', () => {
            (global.fetch as any).mockImplementation(() => new Promise(() => { })); // Never resolves

            const { result } = renderHook(() => usePreferences(), { wrapper });

            expect(result.current.isLoading).toBe(true);
        });

        it('should fetch preferences on mount', async () => {
            const mockPreferences = {
                currency: 'USD',
                weightUnit: 'kg',
                dateFormat: 'MM/DD/YYYY',
                autoExchangeRate: false,
                manualExchangeRate: 1.1,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ok: true, data: { preferences: mockPreferences } }),
            });

            const { result } = renderHook(() => usePreferences(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.preferences.currency).toBe('USD');
            expect(result.current.preferences.weightUnit).toBe('kg');
            expect(result.current.preferences.dateFormat).toBe('MM/DD/YYYY');
        });

        it('should handle fetch error gracefully', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            const { result } = renderHook(() => usePreferences(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBe('Failed to fetch preferences');
            // Should keep default preferences on error
            expect(result.current.preferences).toEqual(defaultPreferences);
        });

        it('should handle network error', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => usePreferences(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBe('Network error');
        });
    });

    describe('getExchangeRate', () => {
        it('should return 1 for EUR currency', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    ok: true,
                    data: { preferences: { currency: 'EUR' } }
                }),
            });

            const { result } = renderHook(() => usePreferences(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.getExchangeRate()).toBe(1);
        });

        it('should return default exchange rate for non-EUR currency with autoExchangeRate', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    ok: true,
                    data: { preferences: { currency: 'USD', autoExchangeRate: true } }
                }),
            });

            const { result } = renderHook(() => usePreferences(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.getExchangeRate()).toBe(DEFAULT_EXCHANGE_RATES.USD);
        });

        it('should return manual exchange rate when autoExchangeRate is false', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    ok: true,
                    data: {
                        preferences: {
                            currency: 'USD',
                            autoExchangeRate: false,
                            manualExchangeRate: 1.25
                        }
                    }
                }),
            });

            const { result } = renderHook(() => usePreferences(), { wrapper });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.getExchangeRate()).toBe(1.25);
        });
    });

    describe('refetch', () => {
        it('should be able to refetch preferences', async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        ok: true,
                        data: { preferences: { currency: 'EUR' } }
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        ok: true,
                        data: { preferences: { currency: 'USD' } }
                    }),
                });

            const { result } = renderHook(() => usePreferences(), { wrapper });

            // Wait for initial load
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.preferences.currency).toBe('EUR');

            // Trigger refetch
            await act(async () => {
                await result.current.refetch();
            });

            await waitFor(() => {
                expect(result.current.preferences.currency).toBe('USD');
            });
        });
    });

    describe('exported constants', () => {
        it('should export defaultPreferences with correct structure', () => {
            expect(defaultPreferences).toEqual({
                currency: 'EUR',
                weightUnit: 'g',
                dateFormat: 'DD/MM/YYYY',
                autoExchangeRate: true,
            });
        });

        it('should export DEFAULT_EXCHANGE_RATES with correct values', () => {
            expect(DEFAULT_EXCHANGE_RATES).toHaveProperty('EUR', 1);
            expect(DEFAULT_EXCHANGE_RATES).toHaveProperty('USD');
            expect(DEFAULT_EXCHANGE_RATES).toHaveProperty('CNY');
        });
    });
});
