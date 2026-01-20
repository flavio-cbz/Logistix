import { useState, useCallback, useMemo } from "react";

/**
 * Hook pour gérer la sélection multiple de produits dans une liste.
 */
export function useProductSelection<T extends { id: string }>(items: T[]) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(p => p.id)));
        }
    }, [selectedIds.size, items]);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(new Set(items.map(p => p.id)));
    }, [items]);

    const isAllSelected = useMemo(() =>
        items.length > 0 && selectedIds.size === items.length,
        [items.length, selectedIds.size]
    );

    const isSomeSelected = useMemo(() =>
        selectedIds.size > 0 && selectedIds.size < items.length,
        [selectedIds.size, items.length]
    );

    const isSelected = useCallback((id: string) =>
        selectedIds.has(id),
        [selectedIds]
    );

    const selectRange = useCallback((startId: string, endId: string) => {
        const startIndex = items.findIndex(item => item.id === startId);
        const endIndex = items.findIndex(item => item.id === endId);

        if (startIndex === -1 || endIndex === -1) return;

        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);

        const idsToSelect = items.slice(start, end + 1).map(item => item.id);

        setSelectedIds(prev => {
            const next = new Set(prev);
            idsToSelect.forEach(id => next.add(id));
            return next;
        });
    }, [items]);

    return {
        selectedIds,
        selectedCount: selectedIds.size,
        toggleSelectAll,
        toggleSelect,
        clearSelection,
        selectAll,
        selectRange,
        isAllSelected,
        isSomeSelected,
        isSelected,
    };
}
