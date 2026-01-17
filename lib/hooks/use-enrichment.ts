"use client";

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
        const response = await fetch(`/api/v1/produits/${productId}/retry-enrichment`, {
            method: "POST",
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || "Échec du ré-enrichissement");
        }

        // Invalidate products to refresh the UI
        await queryClient.invalidateQueries({ queryKey: ["products"] });

        return response.json();
    }, [queryClient]);

    return { retryEnrichment };
}
