import { renderHook, waitFor } from '@testing-library/react';
import { useParcelles, useCreateParcelle, useUpdateParcelle, useDeleteParcelle } from '@/lib/hooks/use-parcelles';
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import * as ReactQuery from '@tanstack/react-query';
import * as apiFetch from '@/lib/utils/api-fetch';
import * as apiValidation from '@/lib/utils/api-validation';
import { toast } from 'sonner';

// Mock Dependencies
vi.mock('@tanstack/react-query', async (importOriginal) => {
    const actual = await importOriginal<typeof ReactQuery>();
    return {
        ...actual,
        useQueryClient: vi.fn(() => ({
            invalidateQueries: vi.fn(),
        })),
        // Use real implementations for hooks or minimal mocks? 
        // If we want to test the *integration* with useQuery, we should probably mock it 
        // to return the fetch function or values,
        // OR we can test the `queryFn` and `mutationFn` separately?
        // The hook mostly configures useQuery/useMutation.
        // Let's spy on them to verify config.
        useQuery: vi.fn(),
        useMutation: vi.fn(),
    };
});

vi.mock('@/lib/utils/api-fetch', () => ({
    apiFetch: vi.fn(),
    postJson: vi.fn(),
    patchJson: vi.fn(),
    deleteJson: vi.fn(),
}));

vi.mock('@/lib/utils/api-validation', () => ({
    validateApiResponse: vi.fn(),
    assertSuccessfulResponse: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(() => ({
        push: vi.fn(),
    })),
}));

describe('use-parcelles hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useParcelles', () => {
        it('should configure useQuery correctly', () => {
            renderHook(() => useParcelles());

            expect(ReactQuery.useQuery).toHaveBeenCalledWith(expect.objectContaining({
                queryKey: ['parcelles'],
                staleTime: 5 * 60 * 1000,
            }));
        });

        it('fetchParcelles should call apiFetch and validate', async () => {
            renderHook(() => useParcelles());
            const queryOptions = (ReactQuery.useQuery as Mock).mock.calls[0][0];
            const fetchFn = queryOptions.queryFn;

            // Mock api response
            const mockData = [{ id: '1' }];
            (apiFetch.apiFetch as Mock).mockResolvedValue(mockData);
            (apiValidation.validateApiResponse as Mock).mockReturnValue({ success: true, data: mockData });

            const result = await fetchFn();

            expect(apiFetch.apiFetch).toHaveBeenCalledWith('/api/v1/parcelles');
            expect(apiValidation.validateApiResponse).toHaveBeenCalledWith(mockData, 'fetchParcelles');
            expect(result).toEqual(mockData);
        });

        it('fetchParcelles should throw on validation error', async () => {
            renderHook(() => useParcelles());
            const fetchFn = (ReactQuery.useQuery as Mock).mock.calls[0][0].queryFn;

            (apiFetch.apiFetch as Mock).mockResolvedValue({});
            (apiValidation.validateApiResponse as Mock).mockReturnValue({ success: false, error: { message: 'Invalid' } });

            await expect(fetchFn()).rejects.toThrow('Invalid');
        });
    });

    describe('useCreateParcelle', () => {
        it('should configure useMutation and handle success', async () => {
            const mockInvalidate = vi.fn();
            (ReactQuery.useQueryClient as Mock).mockReturnValue({ invalidateQueries: mockInvalidate });

            (ReactQuery.useMutation as Mock).mockImplementation((options) => options);

            const { result } = renderHook(() => useCreateParcelle());
            const options = result.current as any; // Since we mocked implementation to return options

            // Test mutationFn
            const formData = { superbuy_id: '123' } as any;
            const mockResponse = { parcelle: { id: '1' } };
            (apiFetch.postJson as Mock).mockResolvedValue(mockResponse);
            (apiValidation.assertSuccessfulResponse as Mock).mockReturnValue(mockResponse);

            const mutationResult = await options.mutationFn(formData);
            expect(apiFetch.postJson).toHaveBeenCalledWith('/api/v1/parcelles', formData);
            expect(mutationResult).toEqual(mockResponse.parcelle);

            // Test onSuccess
            await options.onSuccess();
            expect(mockInvalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['parcelles'] }));
        });

        it('should handle errors in mutation', async () => {
            (ReactQuery.useMutation as Mock).mockImplementation((options) => options);
            const { result } = renderHook(() => useCreateParcelle());
            const options = result.current as any;

            // Test onError generic
            options.onError(new Error('Fail'));
            expect(toast.error).toHaveBeenCalledWith('Erreur création', expect.objectContaining({ description: 'Fail' }));
        });
    });

    describe('useUpdateParcelle', () => {
        it('should call patchJson with correct id', async () => {
            (ReactQuery.useMutation as Mock).mockImplementation((options) => options);
            const { result } = renderHook(() => useUpdateParcelle());
            const options = result.current as any;

            const updateData = { id: '123', data: { weight: 100 } } as any;
            const mockResponse = { parcelle: { id: '123', weight: 100 } };
            (apiFetch.patchJson as Mock).mockResolvedValue(mockResponse);
            (apiValidation.assertSuccessfulResponse as Mock).mockReturnValue(mockResponse);

            const res = await options.mutationFn(updateData);
            expect(apiFetch.patchJson).toHaveBeenCalledWith('/api/v1/parcelles/123', updateData.data);
            expect(res).toEqual(mockResponse.parcelle);
        });
    });

    describe('useDeleteParcelle', () => {
        it('should call deleteJson', async () => {
            (ReactQuery.useMutation as Mock).mockImplementation((options) => options);
            const { result } = renderHook(() => useDeleteParcelle());
            const options = result.current as any;

            await options.mutationFn('123');
            expect(apiFetch.deleteJson).toHaveBeenCalledWith('/api/v1/parcelles/123');
        });
    });
});
