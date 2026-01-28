"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProductListResponse } from "./use-products";
import type { EnrichmentData } from "@/lib/shared/types/entities";

interface EnrichmentPollingOptions {
    /** Polling interval in milliseconds (default: 5000) */
    intervalMs?: number;
    /** Whether polling is enabled */
    enabled?: boolean;
    /** Product IDs to watch for enrichment completion */
    pendingProductIds?: string[];
}

/**
 * Hook that polls for enrichment updates on products with 'pending' status.
 * Automatically invalidates the products query when enrichment completes.
 */
export function useEnrichmentPolling({
    intervalMs = 5000,
    enabled = true,
    pendingProductIds = [],
}: EnrichmentPollingOptions = {}) {
    const queryClient = useQueryClient();

    const checkEnrichmentStatus = useCallback(async () => {
        if (pendingProductIds.length === 0) return;

        try {
            const response = await fetch("/api/v1/produits/enrichment-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds: pendingProductIds }),
            });

            if (response.ok) {
                const data = await response.json();

                // If any product has completed enrichment, invalidate the products query
                if (data.completedIds && data.completedIds.length > 0) {
                    queryClient.invalidateQueries({ queryKey: ["products"] });
                }
            }
        } catch (_error) {
            // Silently fail - we'll try again on next poll
        }
    }, [pendingProductIds, queryClient]);

    useEffect(() => {
        if (!enabled || pendingProductIds.length === 0) {
            return undefined;
        }

        // Initial check
        checkEnrichmentStatus();

        // Set up polling interval
        const intervalId = setInterval(checkEnrichmentStatus, intervalMs);

        return () => clearInterval(intervalId);
    }, [enabled, pendingProductIds.length, intervalMs, checkEnrichmentStatus]);

    return {
        isPolling: enabled && pendingProductIds.length > 0,
        pendingCount: pendingProductIds.length,
    };
}

/**
 * Hook to retry enrichment for a failed product
 */
export function useRetryEnrichment() {
    const queryClient = useQueryClient();

    const retryEnrichment = useCallback(async (productId: string) => {
        // Optimistic update: Mark as pending immediately
        queryClient.setQueryData<ProductListResponse>(["products"], (old) => {
            if (!old?.data) return old;
            return {
                ...old,
                data: old.data.map((p) => {
                    if (p.id === productId) {
                        return {
                            ...p,
                            enrichmentData: {
                                confidence: 0, // Default for pending
                                ...(p.enrichmentData || {}),
                                enrichmentStatus: 'pending', // Force pending status
                                enrichedAt: new Date().toISOString()
                            } as EnrichmentData
                        };
                    }
                    return p;
                })
            };
        });

        try {
            const response = await fetch(`/api/v1/produits/${productId}/retry-enrichment`, {
                method: "POST",
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || "Échec du ré-enrichissement");
            }

            // Invalidate to get the final result (success or error)
            await queryClient.invalidateQueries({ queryKey: ["products"] });

            return response.json();
        } catch (error) {
            // Revert on error (invalidate will handle it, but good practice)
            await queryClient.invalidateQueries({ queryKey: ["products"] });
            throw error;
        }
    }, [queryClient]);

    return { retryEnrichment };
}
