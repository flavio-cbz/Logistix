import { renderHook, act } from '@testing-library/react';
import { useTablePreferences } from '@/lib/hooks/use-table-preferences';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('useTablePreferences', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    const mockKey = 'test-table';
    const defaultPrefs = { density: 'comfortable' as const };

    it('should initialize with default preferences if storage empty', () => {
        const { result } = renderHook(() => useTablePreferences({ key: mockKey, defaultPreferences: defaultPrefs }));
        expect(result.current.preferences).toEqual(defaultPrefs);
    });

    it('should initialize with stored preferences', () => {
        const stored = { density: 'compact' };
        localStorage.setItem(`table-prefs-${mockKey}`, JSON.stringify(stored));

        const { result } = renderHook(() => useTablePreferences({ key: mockKey, defaultPreferences: defaultPrefs }));
        expect(result.current.preferences).toEqual(stored);
    });

    it('should fall back to default if storage invalid', () => {
        localStorage.setItem(`table-prefs-${mockKey}`, 'invalid-json');

        const { result } = renderHook(() => useTablePreferences({ key: mockKey, defaultPreferences: defaultPrefs }));
        expect(result.current.preferences).toEqual(defaultPrefs);
    });

    it('should update preferences and save to localStorage', () => {
        const { result } = renderHook(() => useTablePreferences({ key: mockKey, defaultPreferences: defaultPrefs }));

        act(() => {
            result.current.updatePreferences({ density: 'compact' });
        });

        expect(result.current.preferences.density).toBe('compact');
        const stored = localStorage.getItem(`table-prefs-${mockKey}`);
        expect(JSON.parse(stored!)).toEqual({ density: 'compact' });
    });

    it('should reset preferences', () => {
        const { result } = renderHook(() => useTablePreferences({ key: mockKey, defaultPreferences: defaultPrefs }));

        act(() => {
            result.current.updatePreferences({ density: 'compact' });
        });

        act(() => {
            result.current.resetPreferences();
        });

        expect(result.current.preferences).toEqual(defaultPrefs);
        // Reset also triggers the effect that saves to local storage?
        // Yes, [preferences] dep array.
        const stored = localStorage.getItem(`table-prefs-${mockKey}`);
        expect(JSON.parse(stored!)).toEqual(defaultPrefs);
    });
});
