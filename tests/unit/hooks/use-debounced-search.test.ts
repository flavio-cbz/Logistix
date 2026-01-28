<<<<<<< HEAD
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebouncedValue, useDebouncedSearch } from '@/lib/hooks/use-debounced-search';

describe('useDebouncedSearch hooks', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('useDebouncedValue', () => {
        it('should return initial value immediately', () => {
            const { result } = renderHook(() => useDebouncedValue('initial', 300));
            expect(result.current).toBe('initial');
        });

        it('should debounce value changes', async () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebouncedValue(value, 300),
                { initialProps: { value: 'initial' } }
            );

            expect(result.current).toBe('initial');

            // Change the value
            rerender({ value: 'changed' });

            // Value should still be the old one before delay
            expect(result.current).toBe('initial');

            // Fast forward past the delay
            act(() => {
                vi.advanceTimersByTime(300);
            });

            // Now it should be updated
            expect(result.current).toBe('changed');
        });

        it('should cancel previous timeout on rapid changes', async () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebouncedValue(value, 300),
                { initialProps: { value: 'initial' } }
            );

            // Rapid changes
            rerender({ value: 'change1' });
            act(() => { vi.advanceTimersByTime(100); });

            rerender({ value: 'change2' });
            act(() => { vi.advanceTimersByTime(100); });

            rerender({ value: 'change3' });

            // Still initial because debounce hasn't completed
            expect(result.current).toBe('initial');

            // Complete the debounce
            act(() => { vi.advanceTimersByTime(300); });

            // Should be the final value, not intermediate ones
            expect(result.current).toBe('change3');
        });

        it('should use custom delay', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebouncedValue(value, 500),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'changed' });

            // 300ms shouldn't be enough
            act(() => { vi.advanceTimersByTime(300); });
            expect(result.current).toBe('initial');

            // 500ms should work
            act(() => { vi.advanceTimersByTime(200); });
            expect(result.current).toBe('changed');
        });

        it('should work with different types', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebouncedValue(value, 300),
                { initialProps: { value: 42 } }
            );

            expect(result.current).toBe(42);

            rerender({ value: 100 });
            act(() => { vi.advanceTimersByTime(300); });

            expect(result.current).toBe(100);
        });
    });

    describe('useDebouncedSearch', () => {
        it('should initialize with empty string by default', () => {
            const { result } = renderHook(() => useDebouncedSearch());

            expect(result.current.searchValue).toBe('');
            expect(result.current.debouncedSearchValue).toBe('');
            expect(typeof result.current.setSearchValue).toBe('function');
        });

        it('should initialize with custom initial value', () => {
            const { result } = renderHook(() => useDebouncedSearch('test', 300));

            expect(result.current.searchValue).toBe('test');
            expect(result.current.debouncedSearchValue).toBe('test');
        });

        it('should update searchValue immediately when setSearchValue is called', () => {
            const { result } = renderHook(() => useDebouncedSearch('', 300));

            act(() => {
                result.current.setSearchValue('new value');
            });

            expect(result.current.searchValue).toBe('new value');
            // Debounced value should still be old
            expect(result.current.debouncedSearchValue).toBe('');
        });

        it('should debounce the debouncedSearchValue', () => {
            const { result } = renderHook(() => useDebouncedSearch('', 300));

            act(() => {
                result.current.setSearchValue('search term');
            });

            // Immediate value is updated
            expect(result.current.searchValue).toBe('search term');
            // Debounced value is still old
            expect(result.current.debouncedSearchValue).toBe('');

            // After delay
            act(() => { vi.advanceTimersByTime(300); });

            // Now debounced value is updated
            expect(result.current.debouncedSearchValue).toBe('search term');
        });

        it('should handle rapid typing by only updating with final value', () => {
            const { result } = renderHook(() => useDebouncedSearch('', 300));

            // Simulate typing "hello" character by character
            act(() => { result.current.setSearchValue('h'); });
            act(() => { vi.advanceTimersByTime(50); });

            act(() => { result.current.setSearchValue('he'); });
            act(() => { vi.advanceTimersByTime(50); });

            act(() => { result.current.setSearchValue('hel'); });
            act(() => { vi.advanceTimersByTime(50); });

            act(() => { result.current.setSearchValue('hell'); });
            act(() => { vi.advanceTimersByTime(50); });

            act(() => { result.current.setSearchValue('hello'); });

            // searchValue should be current
            expect(result.current.searchValue).toBe('hello');
            // debouncedSearchValue should still be empty
            expect(result.current.debouncedSearchValue).toBe('');

            // Complete the debounce
            act(() => { vi.advanceTimersByTime(300); });

            // Now debounced value should be the final value
            expect(result.current.debouncedSearchValue).toBe('hello');
        });
    });
});
=======
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebouncedValue, useDebouncedSearch } from '@/lib/hooks/use-debounced-search';

describe('useDebouncedSearch hooks', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('useDebouncedValue', () => {
        it('should return initial value immediately', () => {
            const { result } = renderHook(() => useDebouncedValue('initial', 300));
            expect(result.current).toBe('initial');
        });

        it('should debounce value changes', async () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebouncedValue(value, 300),
                { initialProps: { value: 'initial' } }
            );

            expect(result.current).toBe('initial');

            // Change the value
            rerender({ value: 'changed' });

            // Value should still be the old one before delay
            expect(result.current).toBe('initial');

            // Fast forward past the delay
            act(() => {
                vi.advanceTimersByTime(300);
            });

            // Now it should be updated
            expect(result.current).toBe('changed');
        });

        it('should cancel previous timeout on rapid changes', async () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebouncedValue(value, 300),
                { initialProps: { value: 'initial' } }
            );

            // Rapid changes
            rerender({ value: 'change1' });
            act(() => { vi.advanceTimersByTime(100); });

            rerender({ value: 'change2' });
            act(() => { vi.advanceTimersByTime(100); });

            rerender({ value: 'change3' });

            // Still initial because debounce hasn't completed
            expect(result.current).toBe('initial');

            // Complete the debounce
            act(() => { vi.advanceTimersByTime(300); });

            // Should be the final value, not intermediate ones
            expect(result.current).toBe('change3');
        });

        it('should use custom delay', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebouncedValue(value, 500),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'changed' });

            // 300ms shouldn't be enough
            act(() => { vi.advanceTimersByTime(300); });
            expect(result.current).toBe('initial');

            // 500ms should work
            act(() => { vi.advanceTimersByTime(200); });
            expect(result.current).toBe('changed');
        });

        it('should work with different types', () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebouncedValue(value, 300),
                { initialProps: { value: 42 } }
            );

            expect(result.current).toBe(42);

            rerender({ value: 100 });
            act(() => { vi.advanceTimersByTime(300); });

            expect(result.current).toBe(100);
        });
    });

    describe('useDebouncedSearch', () => {
        it('should initialize with empty string by default', () => {
            const { result } = renderHook(() => useDebouncedSearch());

            expect(result.current.searchValue).toBe('');
            expect(result.current.debouncedSearchValue).toBe('');
            expect(typeof result.current.setSearchValue).toBe('function');
        });

        it('should initialize with custom initial value', () => {
            const { result } = renderHook(() => useDebouncedSearch('test', 300));

            expect(result.current.searchValue).toBe('test');
            expect(result.current.debouncedSearchValue).toBe('test');
        });

        it('should update searchValue immediately when setSearchValue is called', () => {
            const { result } = renderHook(() => useDebouncedSearch('', 300));

            act(() => {
                result.current.setSearchValue('new value');
            });

            expect(result.current.searchValue).toBe('new value');
            // Debounced value should still be old
            expect(result.current.debouncedSearchValue).toBe('');
        });

        it('should debounce the debouncedSearchValue', () => {
            const { result } = renderHook(() => useDebouncedSearch('', 300));

            act(() => {
                result.current.setSearchValue('search term');
            });

            // Immediate value is updated
            expect(result.current.searchValue).toBe('search term');
            // Debounced value is still old
            expect(result.current.debouncedSearchValue).toBe('');

            // After delay
            act(() => { vi.advanceTimersByTime(300); });

            // Now debounced value is updated
            expect(result.current.debouncedSearchValue).toBe('search term');
        });

        it('should handle rapid typing by only updating with final value', () => {
            const { result } = renderHook(() => useDebouncedSearch('', 300));

            // Simulate typing "hello" character by character
            act(() => { result.current.setSearchValue('h'); });
            act(() => { vi.advanceTimersByTime(50); });

            act(() => { result.current.setSearchValue('he'); });
            act(() => { vi.advanceTimersByTime(50); });

            act(() => { result.current.setSearchValue('hel'); });
            act(() => { vi.advanceTimersByTime(50); });

            act(() => { result.current.setSearchValue('hell'); });
            act(() => { vi.advanceTimersByTime(50); });

            act(() => { result.current.setSearchValue('hello'); });

            // searchValue should be current
            expect(result.current.searchValue).toBe('hello');
            // debouncedSearchValue should still be empty
            expect(result.current.debouncedSearchValue).toBe('');

            // Complete the debounce
            act(() => { vi.advanceTimersByTime(300); });

            // Now debounced value should be the final value
            expect(result.current.debouncedSearchValue).toBe('hello');
        });
    });
});
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
