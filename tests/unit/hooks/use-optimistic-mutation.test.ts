import { renderHook, waitFor } from '@testing-library/react';
import { useOptimisticMutation } from '@/lib/hooks/use-optimistic-mutation';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import * as ReactQuery from '@tanstack/react-query';

// Mock React Query
const mockCancelQueries = vi.fn();
const mockGetQueryData = vi.fn();
const mockSetQueryData = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
    const actual = await importOriginal<typeof ReactQuery>();
    return {
        ...actual,
        useQueryClient: vi.fn(() => ({
            cancelQueries: mockCancelQueries,
            getQueryData: mockGetQueryData,
            setQueryData: mockSetQueryData,
            invalidateQueries: mockInvalidateQueries,
        })),
        // usage of useMutation is standard, but we might want to verify its options.
        // But since we are testing the hook *logic* which *returns* useMutation result,
        // we can probably rely on the real useMutation behavior from the library 
        // OR mock it to inspect passed options.
        // However, the hook logic is mainly in the *options object* passed to useMutation.
        // A better approach for unit testing the *wrapper* logic is to spy on useMutation
        // and assert that it was called with the correct onMutate/onError/onSuccess wrappers.
        useMutation: vi.fn(),
    };
});

describe('useOptimisticMutation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should configure useMutation with optimistic updates', async () => {
        const mutationFn = vi.fn();
        const optimisticUpdate = vi.fn();
        const queryKey = ['test-key'];

        // Mock useMutation implementation to simply return its arguments for inspection
        // or execute callbacks.
        (ReactQuery.useMutation as Mock).mockImplementation((options) => {
            // Expose options for testing
            return { mutate: vi.fn(), options };
        });

        renderHook(() => useOptimisticMutation({
            mutationFn,
            queryKey,
            optimisticUpdate,
        }));

        const options = (ReactQuery.useMutation as Mock).mock.calls[0][0];

        expect(options.mutationFn).toBe(mutationFn);
        expect(options.onMutate).toBeDefined();
        expect(options.onError).toBeDefined();
        expect(options.onSuccess).toBeDefined();
    });

    it('should handle onMutate: cancel queries, set optimistic data, return context', async () => {
        // Setup scenarios
        const mutationFn = vi.fn();
        const optimisticUpdate = vi.fn((old) => ({ ...old, name: 'new' }));
        const queryKey = ['test-key'];

        // Mock existing data
        const previousData = { name: 'old' };
        mockGetQueryData.mockReturnValue(previousData);

        let capturedOptions: any;
        (ReactQuery.useMutation as Mock).mockImplementation((options) => {
            capturedOptions = options;
            return {};
        });

        renderHook(() => useOptimisticMutation({
            mutationFn,
            queryKey,
            optimisticUpdate,
        }));

        // Execute onMutate
        const variables = { name: 'new' };
        const context = await capturedOptions.onMutate(variables);

        expect(mockCancelQueries).toHaveBeenCalledWith({ queryKey });
        expect(mockGetQueryData).toHaveBeenCalledWith(queryKey);
        expect(mockSetQueryData).toHaveBeenCalledWith(queryKey, expect.any(Function));

        // Verify optimistic update logic
        const updateFn = mockSetQueryData.mock.calls[0][1];
        const newData = updateFn(previousData);
        expect(newData).toEqual({ name: 'new' });
        expect(optimisticUpdate).toHaveBeenCalledWith(previousData, variables);

        // Verify context
        expect(context).toEqual({ previousData, customContext: undefined });
    });

    it('should handle onError: rollback to previous data', () => {
        const mutationFn = vi.fn();
        const optimisticUpdate = vi.fn();
        const queryKey = ['test-key'];

        let capturedOptions: any;
        (ReactQuery.useMutation as Mock).mockImplementation((options) => {
            capturedOptions = options;
            return {};
        });

        renderHook(() => useOptimisticMutation({
            mutationFn,
            queryKey,
            optimisticUpdate,
        }));

        const error = new Error('fail');
        const variables = {};
        const context = { previousData: { name: 'old' }, customContext: undefined };

        capturedOptions.onError(error, variables, context);

        expect(mockSetQueryData).toHaveBeenCalledWith(queryKey, context.previousData);
    });

    it('should handle onSuccess: invalidate queries', () => {
        const mutationFn = vi.fn();
        const optimisticUpdate = vi.fn();
        const queryKey = ['test-key'];

        let capturedOptions: any;
        (ReactQuery.useMutation as Mock).mockImplementation((options) => {
            capturedOptions = options;
            return {};
        });

        renderHook(() => useOptimisticMutation({
            mutationFn,
            queryKey,
            optimisticUpdate,
        }));

        capturedOptions.onSuccess({}, {}, {});

        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey });
    });
});
