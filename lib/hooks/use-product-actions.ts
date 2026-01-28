import { useState, useCallback } from "react";
import { useDeleteProduct } from "./use-products";
import { useRetryEnrichment } from "./use-enrichment";
import { toast } from "sonner";
import { EnrichmentData } from "@/lib/shared/types/entities";

export function useProductActions(onUpdate?: () => void) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [retryingId, setRetryingId] = useState<string | null>(null);
    const [canceledEnrichments, setCanceledEnrichments] = useState<Set<string>>(new Set());

    const deleteMutation = useDeleteProduct();
    const { retryEnrichment } = useRetryEnrichment();

    const handleDelete = useCallback(async (productId: string) => {
        setDeletingId(productId);
        deleteMutation.mutate(productId, {
            onSuccess: () => {
                toast.success("✓ Produit supprimé", {
                    description: "Le produit a été supprimé avec succès.",
                });
                setDeletingId(null);
                onUpdate?.();
            },
            onError: (error: unknown) => {
                const errorMessage = error instanceof Error
                    ? error.message
                    : "Une erreur est survenue lors de la suppression.";
                toast.error("Erreur", {
                    description: errorMessage,
                });
                setDeletingId(null);
            },
        });
    }, [deleteMutation, onUpdate]);

    const handleAnalyzeMarket = useCallback(async (productId: string) => {
        setAnalyzingId(productId);
        try {
            const response = await fetch("/api/v1/market/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId }),
            });

            if (!response.ok) throw new Error("Erreur lors de l'analyse");

            toast.success("✓ Analyse terminée", {
                description: "Les données de marché ont été mises à jour.",
            });
            onUpdate?.();
        } catch (error) {
            toast.error("Échec de l'analyse", {
                description: error instanceof Error ? error.message : "Erreur inconnue",
            });
        } finally {
            setAnalyzingId(null);
        }
    }, [onUpdate]);

    const handleRetryEnrichment = useCallback(async (productId: string) => {
        setRetryingId(productId);
        // Remove from canceled set so the pending badge shows up again
        setCanceledEnrichments(prev => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
        });

        try {
            await retryEnrichment(productId);
            toast.success("✓ Enrichissement relancé", {
                description: "Le produit est en cours d'identification.",
            });
            onUpdate?.();
        } catch (error) {
            toast.error("Échec du ré-enrichissement", {
                description: error instanceof Error ? error.message : "Erreur inconnue",
            });
        } finally {
            setRetryingId(null);
        }
    }, [retryEnrichment, onUpdate]);

    const handleCancelEnrichment = useCallback(async (
        productId: string,
        enrichmentData: EnrichmentData
    ) => {
        // Immediately mark as canceled to hide the badge
        setCanceledEnrichments(prev => new Set(prev).add(productId));

        try {
            const response = await fetch(`/api/v1/produits/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enrichmentData: {
                        ...enrichmentData,
                        enrichmentStatus: 'failed',
                        error: 'Annulé par l\'utilisateur',
                    },
                }),
            });

            if (!response.ok) throw new Error('Erreur lors de l\'annulation');

            toast.success("✓ Enrichissement annulé");
            onUpdate?.();
        } catch (error) {
            // On error, remove from canceled set to show pending badge again
            setCanceledEnrichments(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
            toast.error("Échec de l'annulation", {
                description: error instanceof Error ? error.message : "Erreur inconnue",
            });
        }
    }, [onUpdate]);

    return {
        deletingId,
        analyzingId,
        retryingId,
        canceledEnrichments,
        handleDelete,
        handleAnalyzeMarket,
        handleRetryEnrichment,
        handleCancelEnrichment,
    };
}
