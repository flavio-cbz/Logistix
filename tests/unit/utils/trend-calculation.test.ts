import { describe, it, expect } from 'vitest';

// Helper function to test (extracted from the API logic)
const calculateTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

describe('Statistics Trend Calculation', () => {
    it('should calculate positive trend correctly', () => {
        const current = 150;
        const previous = 100;
        const trend = calculateTrend(current, previous);
        expect(trend).toBe(50); // +50%
    });

    it('should calculate negative trend correctly', () => {
        const current = 80;
        const previous = 100;
        const trend = calculateTrend(current, previous);
        expect(trend).toBe(-20); // -20%
    });

    it('should handle zero previous value (growth from 0)', () => {
        const current = 100;
        const previous = 0;
        const trend = calculateTrend(current, previous);
        expect(trend).toBe(100); // 100% (or infinite, but capped at 100 for UI)
    });

    it('should handle zero current value (drop to 0)', () => {
        const current = 0;
        const previous = 100;
        const trend = calculateTrend(current, previous);
        expect(trend).toBe(-100); // -100%
    });

    it('should handle both zero', () => {
        const current = 0;
        const previous = 0;
        const trend = calculateTrend(current, previous);
        expect(trend).toBe(0); // 0%
    });
});
