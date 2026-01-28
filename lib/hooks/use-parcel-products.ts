<<<<<<< HEAD
"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product, Parcel } from "@/lib/shared/types/entities";
import { apiFetch } from "@/lib/utils/api-fetch";

interface ParcelProductsResponse {
    success: boolean;
    data: Product[];
}

interface ParcelWithProducts extends Parcel {
    products: Product[];
    stats: ParcelProductStats;
}

export interface ParcelProductStats {
    totalProducts: number;
    soldProducts: number;
    draftProducts: number;
    onlineProducts: number;
    totalWeightUsed: number;
    totalPurchaseValue: number;
    totalSoldValue: number;
    totalProfit: number;
    averageMargin: number;
    weightUtilization: number; // percentage of parcel weight used
}

/**
 * Hook to fetch all products associated with a parcel
 */
export function useParcelProducts(parcelId: string | undefined) {
    return useQuery<Product[]>({
        queryKey: ["parcel-products", parcelId],
        queryFn: async () => {
            if (!parcelId) return [];
            const response = await apiFetch<ParcelProductsResponse>(
                `/api/v1/parcelles/${parcelId}/products`
            );
            return response.data || [];
        },
        enabled: !!parcelId,
    });
}

/**
 * Hook to calculate statistics for products in a parcel
 */
export function useParcelStats(
    products: Product[] | undefined,
    parcel: Parcel | undefined
): ParcelProductStats {
    return useMemo(() => {
        if (!products || products.length === 0) {
            return {
                totalProducts: 0,
                soldProducts: 0,
                draftProducts: 0,
                onlineProducts: 0,
                totalWeightUsed: 0,
                totalPurchaseValue: 0,
                totalSoldValue: 0,
                totalProfit: 0,
                averageMargin: 0,
                weightUtilization: 0,
            };
        }

        const pricePerGram = parcel?.pricePerGram || 0;

        let soldProducts = 0;
        let draftProducts = 0;
        let onlineProducts = 0;
        let totalWeightUsed = 0;
        let totalPurchaseValue = 0;
        let totalSoldValue = 0;
        let totalProfit = 0;
        let profitCount = 0;

        for (const product of products) {
            // Count by status
            if (product.vendu === "1") {
                soldProducts++;
            } else if (product.listedAt) {
                onlineProducts++;
            } else {
                draftProducts++;
            }

            // Weight
            const weight = product.poids || 0;
            totalWeightUsed += weight;

            // Value
            const purchasePrice = product.price || 0;
            totalPurchaseValue += purchasePrice;

            // Profit calculation for sold products
            if (product.vendu === "1" && product.sellingPrice) {
                const shippingCost = weight * pricePerGram;
                const totalCost = purchasePrice + shippingCost;
                const profit = product.sellingPrice - totalCost;

                totalSoldValue += product.sellingPrice;
                totalProfit += profit;
                profitCount++;
            }
        }

        // Calculate average margin
        const averageMargin = profitCount > 0 && totalSoldValue > 0
            ? (totalProfit / totalSoldValue) * 100
            : 0;

        // Calculate weight utilization
        const parcelWeight = parcel?.weight || 0;
        const weightUtilization = parcelWeight > 0
            ? (totalWeightUsed / parcelWeight) * 100
            : 0;

        return {
            totalProducts: products.length,
            soldProducts,
            draftProducts,
            onlineProducts,
            totalWeightUsed,
            totalPurchaseValue,
            totalSoldValue,
            totalProfit,
            averageMargin,
            weightUtilization,
        };
    }, [products, parcel]);
}

/**
 * Hook to get a parcel with all its products and calculated stats
 */
export function useParcelWithProducts(parcelId: string | undefined, parcel: Parcel | undefined): {
    data: ParcelWithProducts | undefined;
    isLoading: boolean;
    error: Error | null;
} {
    const { data: products, isLoading, error } = useParcelProducts(parcelId);
    const stats = useParcelStats(products, parcel);

    const data = useMemo(() => {
        if (!parcel) return undefined;
        return {
            ...parcel,
            products: products || [],
            stats,
        };
    }, [parcel, products, stats]);

    return { data, isLoading, error };
}
=======
"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product, Parcel } from "@/lib/shared/types/entities";
import { apiFetch } from "@/lib/utils/api-fetch";

interface ParcelProductsResponse {
    success: boolean;
    data: Product[];
}

interface ParcelWithProducts extends Parcel {
    products: Product[];
    stats: ParcelProductStats;
}

export interface ParcelProductStats {
    totalProducts: number;
    soldProducts: number;
    draftProducts: number;
    onlineProducts: number;
    totalWeightUsed: number;
    totalPurchaseValue: number;
    totalSoldValue: number;
    totalProfit: number;
    averageMargin: number;
    weightUtilization: number; // percentage of parcel weight used
}

/**
 * Hook to fetch all products associated with a parcel
 */
export function useParcelProducts(parcelId: string | undefined) {
    return useQuery<Product[]>({
        queryKey: ["parcel-products", parcelId],
        queryFn: async () => {
            if (!parcelId) return [];
            const response = await apiFetch<ParcelProductsResponse>(
                `/api/v1/parcelles/${parcelId}/products`
            );
            return response.data || [];
        },
        enabled: !!parcelId,
    });
}

/**
 * Hook to calculate statistics for products in a parcel
 */
export function useParcelStats(
    products: Product[] | undefined,
    parcel: Parcel | undefined
): ParcelProductStats {
    return useMemo(() => {
        if (!products || products.length === 0) {
            return {
                totalProducts: 0,
                soldProducts: 0,
                draftProducts: 0,
                onlineProducts: 0,
                totalWeightUsed: 0,
                totalPurchaseValue: 0,
                totalSoldValue: 0,
                totalProfit: 0,
                averageMargin: 0,
                weightUtilization: 0,
            };
        }

        const pricePerGram = parcel?.pricePerGram || 0;

        let soldProducts = 0;
        let draftProducts = 0;
        let onlineProducts = 0;
        let totalWeightUsed = 0;
        let totalPurchaseValue = 0;
        let totalSoldValue = 0;
        let totalProfit = 0;
        let profitCount = 0;

        for (const product of products) {
            // Count by status
            if (product.vendu === "1") {
                soldProducts++;
            } else if (product.listedAt) {
                onlineProducts++;
            } else {
                draftProducts++;
            }

            // Weight
            const weight = product.poids || 0;
            totalWeightUsed += weight;

            // Value
            const purchasePrice = product.price || 0;
            totalPurchaseValue += purchasePrice;

            // Profit calculation for sold products
            if (product.vendu === "1" && product.sellingPrice) {
                const shippingCost = weight * pricePerGram;
                const totalCost = purchasePrice + shippingCost;
                const profit = product.sellingPrice - totalCost;

                totalSoldValue += product.sellingPrice;
                totalProfit += profit;
                profitCount++;
            }
        }

        // Calculate average margin
        const averageMargin = profitCount > 0 && totalSoldValue > 0
            ? (totalProfit / totalSoldValue) * 100
            : 0;

        // Calculate weight utilization
        const parcelWeight = parcel?.weight || 0;
        const weightUtilization = parcelWeight > 0
            ? (totalWeightUsed / parcelWeight) * 100
            : 0;

        return {
            totalProducts: products.length,
            soldProducts,
            draftProducts,
            onlineProducts,
            totalWeightUsed,
            totalPurchaseValue,
            totalSoldValue,
            totalProfit,
            averageMargin,
            weightUtilization,
        };
    }, [products, parcel]);
}

/**
 * Hook to get a parcel with all its products and calculated stats
 */
export function useParcelWithProducts(parcelId: string | undefined, parcel: Parcel | undefined): {
    data: ParcelWithProducts | undefined;
    isLoading: boolean;
    error: Error | null;
} {
    const { data: products, isLoading, error } = useParcelProducts(parcelId);
    const stats = useParcelStats(products, parcel);

    const data = useMemo(() => {
        if (!parcel) return undefined;
        return {
            ...parcel,
            products: products || [],
            stats,
        };
    }, [parcel, products, stats]);

    return { data, isLoading, error };
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
