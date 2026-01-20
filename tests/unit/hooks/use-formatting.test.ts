/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormatting } from '@/lib/hooks/use-formatting';
import React from 'react';

// Mock the usePreferences hook
const mockPreferences = {
    currency: 'EUR' as const,
    dateFormat: 'DD/MM/YYYY' as const,
    weightUnit: 'g' as const,
};

const mockGetExchangeRate = vi.fn(() => 1.0);
const mockExchangeRates = { USD: 1.08, CNY: 7.5, EUR: 1.0 };

vi.mock('@/lib/contexts/preferences-context', () => ({
    usePreferences: vi.fn(() => ({
        preferences: mockPreferences,
        isLoading: false,
        getExchangeRate: mockGetExchangeRate,
        exchangeRates: mockExchangeRates,
    })),
}));

// Mock the formatting utilities to test the hook's logic, not the utilities
vi.mock('@/lib/utils/formatting', () => ({
    formatCurrency: vi.fn((value, currency) =>
        value === null ? '-' : `${value.toFixed(2)} ${currency}`
    ),
    formatDate: vi.fn((date, format) =>
        date ? `formatted-${format}` : '-'
    ),
    formatDateTime: vi.fn((date, format) =>
        date ? `datetime-${format}` : '-'
    ),
    formatWeight: vi.fn((weight, unit) =>
        weight === null ? '-' : `${weight} ${unit}`
    ),
}));

describe('useFormatting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetExchangeRate.mockReturnValue(1.0);
        mockPreferences.currency = 'EUR';
        mockPreferences.dateFormat = 'DD/MM/YYYY';
        mockPreferences.weightUnit = 'g';
    });

    describe('formatCurrency', () => {
        it('should format currency with default EUR settings', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatCurrency(25.50);

            expect(formatted).toBe('25.50 EUR');
        });

        it('should handle null value', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatCurrency(null);

            expect(formatted).toBe('-');
        });

        it('should handle undefined value', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatCurrency(undefined);

            expect(formatted).toBe('-');
        });

        it('should handle NaN value', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatCurrency(NaN);

            expect(formatted).toBe('-');
        });

        it('should apply exchange rate conversion for non-EUR currencies', () => {
            mockPreferences.currency = 'USD';
            mockGetExchangeRate.mockReturnValue(1.08);

            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatCurrency(100);

            // 100 * 1.08 = 108
            expect(formatted).toBe('108.00 USD');
        });

        it('should use override currency when provided', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatCurrency(50, 'CNY');

            // With override, no conversion should happen
            expect(formatted).toBe('50.00 CNY');
        });
    });

    describe('formatDate', () => {
        it('should format date with user preferences', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatDate(new Date());

            expect(formatted).toBe('formatted-DD/MM/YYYY');
        });

        it('should handle null date', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatDate(null);

            expect(formatted).toBe('-');
        });

        it('should use override format when provided', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatDate(new Date(), 'YYYY-MM-DD');

            expect(formatted).toBe('formatted-YYYY-MM-DD');
        });
    });

    describe('formatDateTime', () => {
        it('should format datetime with user preferences', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatDateTime(new Date());

            expect(formatted).toBe('datetime-DD/MM/YYYY');
        });

        it('should handle null datetime', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatDateTime(null);

            expect(formatted).toBe('-');
        });
    });

    describe('formatWeight', () => {
        it('should format weight with user preferences', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatWeight(1500);

            expect(formatted).toBe('1500 g');
        });

        it('should handle null weight', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatWeight(null);

            expect(formatted).toBe('-');
        });

        it('should use override unit when provided', () => {
            const { result } = renderHook(() => useFormatting());

            const formatted = result.current.formatWeight(1500, 'kg');

            expect(formatted).toBe('1500 kg');
        });
    });

    describe('getCurrencySymbol', () => {
        it('should return EUR symbol', () => {
            mockPreferences.currency = 'EUR';
            const { result } = renderHook(() => useFormatting());

            expect(result.current.getCurrencySymbol()).toBe('€');
        });

        it('should return USD symbol', () => {
            mockPreferences.currency = 'USD';
            const { result } = renderHook(() => useFormatting());

            expect(result.current.getCurrencySymbol()).toBe('$');
        });

        it('should return CNY symbol', () => {
            mockPreferences.currency = 'CNY';
            const { result } = renderHook(() => useFormatting());

            expect(result.current.getCurrencySymbol()).toBe('¥');
        });
    });

    describe('getCurrentExchangeRate', () => {
        it('should return the current exchange rate', () => {
            mockGetExchangeRate.mockReturnValue(1.15);
            const { result } = renderHook(() => useFormatting());

            const rate = result.current.getCurrentExchangeRate();

            expect(rate).toBe(1.15);
            expect(mockGetExchangeRate).toHaveBeenCalled();
        });
    });

    describe('returned values', () => {
        it('should return all expected values', () => {
            const { result } = renderHook(() => useFormatting());

            expect(result.current).toHaveProperty('formatCurrency');
            expect(result.current).toHaveProperty('formatDate');
            expect(result.current).toHaveProperty('formatDateTime');
            expect(result.current).toHaveProperty('formatWeight');
            expect(result.current).toHaveProperty('getCurrencySymbol');
            expect(result.current).toHaveProperty('getCurrentExchangeRate');
            expect(result.current).toHaveProperty('exchangeRates');
            expect(result.current).toHaveProperty('preferences');
            expect(result.current).toHaveProperty('isLoading');
        });
    });
});
