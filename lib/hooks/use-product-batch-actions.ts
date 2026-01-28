"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
// Simple fetch wrapper
async function postJson<T>(url: string, body: unknown): Promise<{ data: T }> {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return { data: await response.json() };
}
import { toast } from "sonner";
import { ProductStatus } from "@/lib/shared/types/entities";

type BatchActionType = "delete" | "archive" | "update_status" | "assign_parcel" | "enrich" | "duplicate";

interface BatchActionData {
    status?: ProductStatus;
    parcelId?: string;
}

interface BatchActionPayload {
    action: BatchActionType;
    productIds: string[];
    data?: BatchActionData;
}

interface UseProductBatchActionsProps {
    onSuccess?: () => void;
    selectedIds: Set<string>;
    clearSelection: () => void;
}

export function useProductBatchActions({ onSuccess, selectedIds, clearSelection }: UseProductBatchActionsProps) {
    const queryClient = useQueryClient();

    const batchMutation = useMutation({
        mutationFn: async (payload: BatchActionPayload) => {
            return postJson<{
                success: boolean;
                data: {
                    processed: number;
                    results: { success: string[]; failed: { id: string; error: string }[] };
                };
            }>("/api/v1/produits/batch", payload);
        },
        onSuccess: (response, variables) => {
            const { results } = response.data.data;
            const successCount = results.success.length;
            const failCount = results.failed.length;

            if (successCount > 0) {
                let actionLabel = "";
                switch (variables.action) {
                    case "delete": actionLabel = "supprimés"; break;
                    case "archive": actionLabel = "archivés"; break;
                    case "update_status": actionLabel = "mis à jour"; break;
                    case "assign_parcel": actionLabel = "modifiés"; break;
                    case "enrich": actionLabel = "envoyés pour enrichissement"; break;
                    case "duplicate": actionLabel = "dupliqués"; break;
                }

                toast.success(`${successCount} produit(s) ${actionLabel}`);
            }

            if (failCount > 0) {
                toast.error(`Échec pour ${failCount} produit(s)`);
            }

            queryClient.invalidateQueries({ queryKey: ["products"] });
            clearSelection();
            onSuccess?.();
        },
        onError: (error) => {
            toast.error("Erreur lors de l'opération groupée", {
                description: error instanceof Error ? error.message : "Erreur inconnue"
            });
        }
    });

    const executeAction = (action: BatchActionType, data?: BatchActionData) => {
        if (selectedIds.size === 0) return;

        batchMutation.mutate({
            action,
            productIds: Array.from(selectedIds),
            data
        });
    };

    return {
        isLoading: batchMutation.isPending,
        executeAction,
        deleteSelection: () => executeAction("delete"),
        archiveSelection: () => executeAction("archive"),
        duplicateSelection: () => executeAction("duplicate"),
        enrichSelection: () => executeAction("enrich"),
        updateStatus: (status: ProductStatus) => executeAction("update_status", { status }),
        assignParcel: (parcelId: string | null) => executeAction("assign_parcel", { parcelId: parcelId ?? undefined }),
    };
}
