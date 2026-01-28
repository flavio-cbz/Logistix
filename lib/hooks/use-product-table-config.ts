import { useState, useCallback } from "react";

export interface ColumnVisibility {
    status: boolean;
    brand: boolean;
    category: boolean;
    size: boolean;
    color: boolean;
    price: boolean;
    weight: boolean;
    totalCost: boolean;
    salePrice: boolean;
    profit: boolean;
    platform: boolean;
}

export type TableDensity = "compact" | "comfortable";

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
    status: true,
    brand: true,
    category: true,
    size: false,
    color: false,
    price: true,
    weight: true,
    totalCost: true,
    salePrice: true,
    profit: true,
    platform: false,
};

/**
 * Hook pour gérer la configuration d'affichage du tableau de produits.
 */
export function useProductTableConfig() {
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(DEFAULT_COLUMN_VISIBILITY);
    const [density, setDensity] = useState<TableDensity>("comfortable");

    const toggleColumnVisibility = useCallback((column: keyof ColumnVisibility) => {
        setColumnVisibility(prev => ({
            ...prev,
            [column]: !prev[column]
        }));
    }, []);

    const headerPadding = density === "compact" ? "h-10 px-2 align-middle" : "h-12 px-4 align-middle";
    const cellPadding = density === "compact" ? "py-2 px-2 align-middle" : "p-4 align-middle";

    return {
        columnVisibility,
        setColumnVisibility,
        toggleColumnVisibility,
        density,
        setDensity,
        headerPadding,
        cellPadding,
    };
}
