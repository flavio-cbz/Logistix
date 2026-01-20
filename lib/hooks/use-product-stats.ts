import { useMemo } from "react";
import { Product } from "@/lib/shared/types/entities";
import { calculateProductProfit, type ProductWithLegacyFields } from "@/lib/utils/product-field-normalizers";

export interface ProductStats {
    total: number;
    vendus: number;
    enLigne: number;
    brouillons: number;
    totalBenefices: number;
}

/**
 * Hook pour calculer les statistiques d'une liste de produits.
 */
export function useProductStats(products: Product[]): ProductStats {
    return useMemo(() => {
        const total = products.length;
        const vendus = products.filter(p => p.vendu === '1').length;
        const enLigne = products.filter(p => p.dateMiseEnLigne && p.vendu !== '1').length;
        const brouillons = total - vendus - enLigne;

        const totalBenefices = products
            .filter(p => p.vendu === '1')
            .reduce((sum, p) => {
                const profit = calculateProductProfit(p as ProductWithLegacyFields);
                return sum + (profit ?? 0);
            }, 0);

        return { total, vendus, enLigne, brouillons, totalBenefices };
    }, [products]);
}
