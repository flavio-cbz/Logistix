import { describe, it, expect } from 'vitest';
import {
    transformToCamelCase,
    transformToSnakeCase,
    transformParcelleFromDb,
    transformParcelleToDb
} from '@/lib/utils/case-transformer';

describe('Case Transformer Utils', () => {

    describe('transformToCamelCase', () => {
        it('should transform simple object', () => {
            const input = { user_id: 1, first_name: 'John' };
            const expected = { userId: 1, firstName: 'John' };
            expect(transformToCamelCase(input)).toEqual(expected);
        });

        it('should transform nested objects', () => {
            const input = { user_data: { last_name: 'Doe' } };
            const expected = { userData: { lastName: 'Doe' } };
            expect(transformToCamelCase(input)).toEqual(expected);
        });

        it('should transform array of objects', () => {
            const input = [{ item_id: 1 }, { item_id: 2 }];
            const expected = [{ itemId: 1 }, { itemId: 2 }];
            expect(transformToCamelCase(input)).toEqual(expected);
        });

        it('should return null/undefined as is', () => {
            expect(transformToCamelCase(null)).toBeNull();
            expect(transformToCamelCase(undefined)).toBeUndefined();
        });

        it('should return primitives as is', () => {
            expect(transformToCamelCase('string')).toBe('string');
            expect(transformToCamelCase(123)).toBe(123);
        });
    });

    describe('transformToSnakeCase', () => {
        it('should transform simple object', () => {
            const input = { userId: 1, firstName: 'John' };
            const expected = { user_id: 1, first_name: 'John' };
            expect(transformToSnakeCase(input)).toEqual(expected);
        });

        it('should transform nested objects', () => {
            const input = { userData: { lastName: 'Doe' } };
            const expected = { user_data: { last_name: 'Doe' } };
            expect(transformToSnakeCase(input)).toEqual(expected);
        });

        it('should transform array of objects', () => {
            const input = [{ itemId: 1 }];
            const expected = [{ item_id: 1 }];
            expect(transformToSnakeCase(input)).toEqual(expected);
        });
    });

    describe('transformParcelleFromDb', () => {
        it('should map DB fields to frontend fields', () => {
            const dbRecord = {
                id: '123',
                user_id: 'u1',
                numero: 'P1',
                prix_par_gramme: 0.5,
                actif: 1
            };

            const result = transformParcelleFromDb(dbRecord);

            expect(result).toEqual(expect.objectContaining({
                id: '123',
                userId: 'u1',
                numero: 'P1',
                prixParGramme: 0.5,
                actif: true
            }));
        });

        it('should return null for null input', () => {
            expect(transformParcelleFromDb(null as any)).toBeNull();
        });
    });

    describe('transformParcelleToDb', () => {
        it('should map frontend fields to DB fields', () => {
            const frontendRecord = {
                id: '123',
                userId: 'u1',
                numero: 'P1',
                prixParGramme: 0.5,
                actif: true
            };

            const result = transformParcelleToDb(frontendRecord);

            expect(result).toEqual(expect.objectContaining({
                id: '123',
                user_id: 'u1',
                numero: 'P1',
                prix_par_gramme: 0.5,
                actif: 1
            }));
        });
    });

});
