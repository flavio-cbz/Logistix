/**
 * Generic table sorting utilities
 * 
 * Provides type-safe sorting functionality for table data
 */

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T extends string> {
    key: T | null;
    direction: SortDirection;
}

/**
 * Creates a comparison function for sorting
 */
export function createComparator<T>(
    key: keyof T,
    direction: SortDirection,
    options?: {
        nullsLast?: boolean;
        locale?: string;
    }
): (a: T, b: T) => number {
    const { nullsLast = true, locale = 'fr' } = options || {};
    const dir = direction === 'asc' ? 1 : -1;

    return (a: T, b: T): number => {
        const va = a[key];
        const vb = b[key];

        // Handle null/undefined/empty values
        const aEmpty = va === null || va === undefined || va === '';
        const bEmpty = vb === null || vb === undefined || vb === '';

        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return nullsLast ? 1 : -1;
        if (bEmpty) return nullsLast ? -1 : 1;

        // String comparison
        if (typeof va === 'string' && typeof vb === 'string') {
            return va.localeCompare(vb, locale, { sensitivity: 'base' }) * dir;
        }

        // Number comparison
        if (typeof va === 'number' && typeof vb === 'number') {
            return (va - vb) * dir;
        }

        // Date comparison (handles ISO strings)
        if (key.toString().toLowerCase().includes('date') || key.toString().toLowerCase().includes('at')) {
            const da = new Date(va as string).getTime();
            const db = new Date(vb as string).getTime();
            return (da - db) * dir;
        }

        // Fallback to string comparison
        return String(va).localeCompare(String(vb), locale) * dir;
    };
}

/**
 * Sorts an array of items based on sort configuration
 */
export function sortItems<T, K extends keyof T>(
    items: T[],
    sortKey: K | null,
    sortDirection: SortDirection,
    options?: {
        nullsLast?: boolean;
        locale?: string;
    }
): T[] {
    if (!sortKey) return items;

    const sorted = [...items];
    sorted.sort(createComparator(sortKey, sortDirection, options));
    return sorted;
}

/**
 * Hook-style helper for managing sort state
 */
export function toggleSortDirection(current: SortDirection): SortDirection {
    return current === 'asc' ? 'desc' : 'asc';
}

/**
 * Updates sort configuration when clicking a column header
 */
export function updateSortConfig<T extends string>(
    currentConfig: SortConfig<T>,
    clickedKey: T
): SortConfig<T> {
    if (currentConfig.key === clickedKey) {
        return {
            key: clickedKey,
            direction: toggleSortDirection(currentConfig.direction)
        };
    }
    return {
        key: clickedKey,
        direction: 'asc'
    };
}
