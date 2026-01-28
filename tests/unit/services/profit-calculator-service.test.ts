import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfitCalculatorService } from '@/lib/services/profit-calculator-service';
import { ParcelRepository } from '@/lib/repositories';
import { type Parcel } from '@/lib/shared/types/entities';

// Mock ParcelRepository
const mockParcelRepository = {
    findById: vi.fn(),
} as unknown as ParcelRepository;

describe('ProfitCalculatorService', () => {
    let profitService: ProfitCalculatorService;

    beforeEach(() => {
        vi.clearAllMocks();
        profitService = new ProfitCalculatorService(mockParcelRepository);
    });

    describe('calculateShippingCost', () => {
        it('should calculate shipping cost based on weight and parcel price per gram', async () => {
            const mockParcel: Parcel = {
                id: 'parcel-1',
                userId: 'user-1',
                superbuyId: 'SB123',
                status: 'shipped',
                isActive: 1,
                createdAt: new Date().toISOString(),
                pricePerGram: 0.05,
            };

            vi.mocked(mockParcelRepository.findById).mockResolvedValue(mockParcel);

            const cost = await profitService.calculateShippingCost({
                poids: 1000,
                parcelId: 'parcel-1',
            });

            expect(cost).toBe(50); // 1000 * 0.05
            expect(mockParcelRepository.findById).toHaveBeenCalledWith('parcel-1');
        });

        it('should return 0 if weight is invalid', async () => {
            const cost = await profitService.calculateShippingCost({
                poids: 0,
                parcelId: 'parcel-1',
            });

            expect(cost).toBe(0);
            expect(mockParcelRepository.findById).not.toHaveBeenCalled();
        });

        it('should return 0 if parcel not found', async () => {
            vi.mocked(mockParcelRepository.findById).mockResolvedValue(null);

            const cost = await profitService.calculateShippingCost({
                poids: 1000,
                parcelId: 'parcel-unknown',
            });

            expect(cost).toBe(0);
        });

        it('should return 0 if parcel has no pricePerGram', async () => {
            const mockParcel: Parcel = {
                id: 'parcel-1',
                userId: 'user-1',
                superbuyId: 'SB123',
                status: 'shipped',
                isActive: 1,
                createdAt: new Date().toISOString(),
                pricePerGram: undefined, // No price
            };

            vi.mocked(mockParcelRepository.findById).mockResolvedValue(mockParcel);

            const cost = await profitService.calculateShippingCost({
                poids: 1000,
                parcelId: 'parcel-1',
            });

            expect(cost).toBe(0);
        });
    });

    describe('calculateProfit', () => {
        it('should calculate profit and margin correctly', () => {
            const result = profitService.calculateProfit({
                price: 100,
                coutLivraison: 20,
                prixVente: 200,
            });

            expect(result.profit).toBe(80); // 200 - (100 + 20)
            expect(result.coutLivraison).toBe(20);

            // Margin = (Profit / TotalCost) * 100 => (80 / 120) * 100 = 66.666...
            expect(result.profitMargin).toBeCloseTo(66.666, 2);
        });

        it('should handle zero costs', () => {
            const result = profitService.calculateProfit({
                price: 0,
                coutLivraison: 0,
                prixVente: 100,
            });

            expect(result.profit).toBe(100);
            expect(result.profitMargin).toBe(0); // division by zero handled? code says "totalCost > 0" check
        });
    });

    describe('calculateProfitWithShipping', () => {
        it('should use provided shipping cost if available', async () => {
            const result = await profitService.calculateProfitWithShipping({
                price: 100,
                prixVente: 200,
                poids: 1000,
                parcelId: 'parcel-1',
                coutLivraison: 50, // Provided explicitly
            });

            expect(result.coutLivraison).toBe(50);
            expect(result.profit).toBe(50); // 200 - (100+50)
            expect(mockParcelRepository.findById).not.toHaveBeenCalled();
        });

        it('should calculate shipping cost if not provided', async () => {
            const mockParcel: Parcel = {
                id: 'parcel-1',
                userId: 'user-1',
                superbuyId: 'SB123',
                status: 'shipped',
                isActive: 1,
                createdAt: new Date().toISOString(),
                pricePerGram: 0.05,
            };
            vi.mocked(mockParcelRepository.findById).mockResolvedValue(mockParcel);

            const result = await profitService.calculateProfitWithShipping({
                price: 100,
                prixVente: 200,
                poids: 1000,
                parcelId: 'parcel-1',
                // coutLivraison undefined
            });

            expect(result.coutLivraison).toBe(50);
            expect(result.profit).toBe(50);
            expect(mockParcelRepository.findById).toHaveBeenCalledWith('parcel-1');
        });
    });
});
