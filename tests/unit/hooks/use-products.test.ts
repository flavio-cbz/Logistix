import { renderHook, waitFor } from '@testing-library/react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useProductFormData } from '@/lib/hooks/use-products';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import * as ReactQuery from '@tanstack/react-query';
import { ProductStatus, Platform } from '@/lib/shared/types/entities';

// Mock Dependencies
vi.mock('@tanstack/react-query', async (importOriginal) => {
    const actual = await importOriginal<typeof ReactQuery>();
    return {
        ...actual,
        useQueryClient: vi.fn(() => ({
            invalidateQueries: vi.fn(),
        })),
        useQuery: vi.fn(),
        useMutation: vi.fn(),
    };
});

// Mock optimistic mutation to inspect configs
const mockOptimisticMutation = vi.fn((opts) => opts); // Just return opts to inspect them
vi.mock('@/lib/hooks/use-optimistic-mutation', () => ({
    useOptimisticMutation: (opts: any) => mockOptimisticMutation(opts),
}));

global.fetch = vi.fn();

describe('use-products hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useProducts', () => {
        it('should fetch products', async () => {
            renderHook(() => useProducts());
            const queryOptions = (ReactQuery.useQuery as Mock).mock.calls[0][0];
            const queryFn = queryOptions.queryFn;

            const mockResponse = { success: true, data: [] };
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await queryFn();
            expect(global.fetch).toHaveBeenCalledWith('/api/v1/produits');
            expect(result).toEqual(mockResponse);
        });

        it('should handle fetch errors', async () => {
            renderHook(() => useProducts());
            const queryFn = (ReactQuery.useQuery as Mock).mock.calls[0][0].queryFn;

            (global.fetch as Mock).mockResolvedValue({
                ok: false,
            });

            await expect(queryFn()).rejects.toThrow('Erreur lors de la récupération des produits');
        });
    });

    describe('useCreateProduct', () => {
        it('should create product and invalidate queries', async () => {
            const mockInvalidate = vi.fn();
            (ReactQuery.useQueryClient as Mock).mockReturnValue({ invalidateQueries: mockInvalidate });
            (ReactQuery.useMutation as Mock).mockImplementation((opts) => opts);

            const { result } = renderHook(() => useCreateProduct());
            const options = result.current as any;

            // Test mutationFn
            const productData = { name: 'New Product' };
            const mockResponse = { success: true };
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const res = await options.mutationFn(productData);
            expect(global.fetch).toHaveBeenCalledWith('/api/v1/produits', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(productData),
            }));
            expect(res).toEqual(mockResponse);

            // Test onSuccess
            await options.onSuccess();
            expect(mockInvalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['products'] }));
        });
    });

    describe('useUpdateProduct', () => {
        it('should configure optimistic mutation correctly', async () => {
            renderHook(() => useUpdateProduct());

            expect(mockOptimisticMutation).toHaveBeenCalled();
            const options = mockOptimisticMutation.mock.calls[0][0];

            // Test mutationFn
            const updateData = { id: '1', data: { name: 'Updated' } };
            const mockResponse = { success: true, data: [] };
            (global.fetch as Mock).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const res = await options.mutationFn(updateData);
            expect(global.fetch).toHaveBeenCalledWith('/api/v1/produits/1', expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify(updateData.data),
            }));
            expect(res).toEqual(mockResponse);

            // Test optimisticUpdate
            const currentData = { success: true, data: [{ id: '1', name: 'Old' }, { id: '2', name: 'Other' }] };
            const newData = options.optimisticUpdate(currentData, updateData);

            expect(newData.data[0].name).toBe('Updated');
            expect(newData.data[1].name).toBe('Other');
        });
    });

    describe('useDeleteProduct', () => {
        it('should configure optimistic mutation correctly', async () => {
            renderHook(() => useDeleteProduct());

            const options = mockOptimisticMutation.mock.calls[0][0];

            // Test mutationFn
            (global.fetch as Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
            await options.mutationFn('1');
            expect(global.fetch).toHaveBeenCalledWith('/api/v1/produits/1', expect.objectContaining({ method: 'DELETE' }));

            // Test optimisticUpdate
            const currentData = { success: true, data: [{ id: '1' }, { id: '2' }], count: 2 };
            const newData = options.optimisticUpdate(currentData, '1');

            expect(newData.data).toHaveLength(1);
            expect(newData.data[0].id).toBe('2');
            expect(newData.count).toBe(1);
        });
    });

    describe('useProductFormData', () => {
        it('should format product for form', () => {
            const product = {
                id: '1',
                name: 'Test',
                price: 10,
                status: ProductStatus.AVAILABLE,
                // missing fields
            } as any;

            const { result } = renderHook(() => useProductFormData(product));

            expect(result.current).toEqual({
                name: 'Test',
                brand: '',
                category: '',
                subcategory: '',
                size: '',
                color: '',
                price: 10,
                poids: 0,
                parcelId: '',
                vendu: '0',
                dateMiseEnLigne: '',
                dateVente: '',
                prixVente: 0,
                plateforme: Platform.LEBONCOIN,
                url: '',
                photoUrl: '',
                coutLivraison: 0,
                currency: 'EUR',
                status: ProductStatus.AVAILABLE,
            });
        });

        it('should return undefined if no product', () => {
            const { result } = renderHook(() => useProductFormData(undefined));
            expect(result.current).toBeUndefined();
        });
    });
});
