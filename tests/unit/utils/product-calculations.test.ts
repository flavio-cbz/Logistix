import { describe, it, expect } from 'vitest';
import {
    calculateShippingCost,
    calculateTotalCost,
    calculateProfit,
    calculateProfitPercentage,
    calculateMargin,
    calculateDaysBetween,
    calculateProductMetrics,
    validateSoldProductFields,
    getMissingSoldFields
} from '@/lib/utils/product-calculations';
import type { Parcel } from '@/lib/types/entities';

describe('Product Calculations Utils', () => {

    describe('calculateShippingCost', () => {
        it('should calculate cost correctly', () => {
            expect(calculateShippingCost(100, 0.05)).toBe(5);
        });

        it('should return 0 if weight is 0 or pricePerGram is missing', () => {
            expect(calculateShippingCost(0, 0.05)).toBe(0);
            expect(calculateShippingCost(100, undefined)).toBe(0);
            expect(calculateShippingCost(100, null)).toBe(0);
        });
    });

    describe('calculateTotalCost', () => {
        it('should sum purchase price and shipping', () => {
            expect(calculateTotalCost(10, 5)).toBe(15);
        });
    });

    describe('calculateProfit', () => {
        it('should subtract total cost from sales price', () => {
            expect(calculateProfit(20, 15)).toBe(5);
            expect(calculateProfit(10, 15)).toBe(-5); // Loss
        });
    });

    describe('calculateProfitPercentage', () => {
        it('should calculate percentage of total cost', () => {
            // Profit 5, Cost 10 -> 50%
            expect(calculateProfitPercentage(5, 10)).toBe(50);
        });

        it('should return 0 if cost is 0', () => {
            expect(calculateProfitPercentage(10, 0)).toBe(0);
        });
    });

    describe('calculateMargin', () => {
        it('should calculate percentage of sales price', () => {
            // Profit 5, Sales 20 -> 25%
            expect(calculateMargin(5, 20)).toBe(25);
        });

        it('should return 0 if sales price is 0', () => {
            expect(calculateMargin(5, 0)).toBe(0);
        });
    });

    describe('calculateDaysBetween', () => {
        it('should calculate correct days', () => {
            expect(calculateDaysBetween('2023-01-01', '2023-01-10')).toBe(9);
        });

        it('should handle leap years', () => {
            expect(calculateDaysBetween('2024-02-28', '2024-03-01')).toBe(2);
        });

        it('should return null for invalid dates', () => {
            expect(calculateDaysBetween(null, '2023-01-01')).toBeNull();
            expect(calculateDaysBetween('invalid', '2023-01-01')).toBeNull();
        });
    });

    describe('calculateProductMetrics', () => {
        it('should multiply calculate all metrics for unsold product', () => {
            const metrics = calculateProductMetrics(10, 100, null, '2023-01-01', null, { pricePerGram: 0.05 } as Parcel);

            expect(metrics.coutLivraison).toBe(5); // 100 * 0.05
            expect(metrics.coutTotal).toBe(15);    // 10 + 5
            expect(metrics.benefice).toBeNull();
            expect(metrics.pourcentageBenefice).toBeNull();
            expect(metrics.marge).toBeNull();
            expect(metrics.joursEnVente).toBeNull();
        });

        it('should calculate all metrics for sold product', () => {
            const metrics = calculateProductMetrics(
                10, // Purchase
                100, // Weight
                30, // Sale
                '2023-01-01', // Listed
                '2023-01-11', // Sold
                { pricePerGram: 0.05 } as Parcel
            );

            expect(metrics.coutLivraison).toBe(5);
            expect(metrics.coutTotal).toBe(15);
            expect(metrics.benefice).toBe(15); // 30 - 15
            expect(metrics.pourcentageBenefice).toBe(100); // 15 / 15 * 100
            expect(metrics.marge).toBe(50); // 15 / 30 * 100
            expect(metrics.joursEnVente).toBe(10);
        });
    });

    describe('validateSoldProductFields', () => {
        it('should return true if all fields present', () => {
            expect(validateSoldProductFields('date', 'date', 10)).toBe(true);
        });

        it('should return false if missing fields', () => {
            expect(validateSoldProductFields(null, 'date', 10)).toBe(false);
            expect(validateSoldProductFields('date', null, 10)).toBe(false);
            expect(validateSoldProductFields('date', 'date', 0)).toBe(false);
        });
    });

    describe('getMissingSoldFields', () => {
        it('should return empty array if valid', () => {
            expect(getMissingSoldFields('date', 'date', 10)).toEqual([]);
        });

        it('should return list of missing fields', () => {
            const missing = getMissingSoldFields(null, null, null);
            expect(missing).toContain('Date de mise en ligne');
            expect(missing).toContain('Date de vente');
            expect(missing).toContain('Prix de vente');
        });
    });
});
