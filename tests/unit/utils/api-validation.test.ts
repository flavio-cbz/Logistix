import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    validateApiResponse,
    validateProduct,
    validateParcelle,
    validateUser,
    validateEntityArray,
    assertSuccessfulResponse,
    validateAndTransform
} from '@/lib/utils/api-validation';
import { z } from 'zod';
import { ProductStatus, Platform } from '@/lib/shared/types/entities';

// Mock process.env
const originalEnv = process.env;

describe('API Validation Utils', () => {

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv, ENABLE_API_VALIDATION: 'true' };
    });

    describe('validateApiResponse', () => {
        it('should validate successful response', () => {
            const valid = { success: true, data: { id: 1 }, meta: { timestamp: '2023', requestId: '1' } };
            expect(validateApiResponse(valid)).toEqual(valid);
        });

        it('should validate error response', () => {
            const error = { success: false, error: { code: 'ERR', message: 'Fail' } };
            // Note: Schema requires error details to match specific shape if present
            expect(validateApiResponse(error)).toEqual(error);
        });

        it('should throw on invalid structure', () => {
            const invalid = { success: 'yes' }; // boolean expected
            expect(() => validateApiResponse(invalid)).toThrow("API response validation failed");
        });
    });

    describe('validateProduct', () => {
        const validProduct = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Product',
            poids: 100,
            price: 10,
            currency: 'EUR',
            vendu: '0',
            status: ProductStatus.AVAILABLE,
            createdAt: '2023-01-01T00:00:00Z',
        };

        it('should validate valid product', () => {
            expect(validateProduct(validProduct)).toEqual(validProduct);
        });

        it('should throw on invalid product', () => {
            const invalid = { ...validProduct, poids: -5 }; // Positive required
            expect(() => validateProduct(invalid)).toThrow("Product validation failed");
        });
    });

    describe('validateParcelle', () => {
        const validParcelle = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            numero: 'P123',
            transporteur: 'DHL',
            nom: 'My Parcel',
            statut: 'pending',
            actif: true,
            createdAt: '2023-01-01T00:00:00Z',
        };

        it('should validate valid parcelle', () => {
            expect(validateParcelle(validParcelle)).toEqual(validParcelle);
        });
    });

    describe('validateEntityArray', () => {
        it('should validate array of entities', () => {
            const items = [1, 2, 3];
            const validator = (n: any) => {
                if (typeof n !== 'number') throw new Error('Not number');
                return n;
            };
            expect(validateEntityArray(items, validator)).toEqual(items);
        });

        it('should throw if any item fails', () => {
            const items = [1, '2', 3];
            const validator = (n: any) => {
                if (typeof n !== 'number') throw new Error('Not number');
                return n;
            };
            expect(() => validateEntityArray(items, validator)).toThrow("Array validation failed");
        });
    });

    describe('assertSuccessfulResponse', () => {
        it('should return data if success', () => {
            const resp = { success: true, data: 'ok', meta: { timestamp: '', requestId: '' } };
            expect(assertSuccessfulResponse(resp)).toBe('ok');
        });

        it('should throw if not success', () => {
            const resp = { success: false, error: { code: 'E', message: 'M' } };
            expect(() => assertSuccessfulResponse(resp)).toThrow("API request failed");
        });
    });
});
