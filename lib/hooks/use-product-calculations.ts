import { useCallback } from "react";
import { calculateProductProfit, type ProductWithLegacyFields } from "@/lib/utils/product-field-normalizers";
import { Product } from "@/lib/shared/types/entities";

export function useProductCalculations() {
    const calculateProfit = useCallback((product: Product) => {
        return calculateProductProfit(product as ProductWithLegacyFields) ?? 0;
    }, []);

    const hasProfit = useCallback((product: Product, profit: number) => {
        return product.vendu === "1" && profit > 0;
    }, []);

    return {
        calculateProfit,
        hasProfit,
    };
}
