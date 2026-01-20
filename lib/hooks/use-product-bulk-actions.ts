import { useState, useCallback } from "react";
import { toast } from "sonner";

interface BulkActionsOptions {
    onSuccess?: () => void;
}

/**
 * Hook pour gérer les actions groupées sur les produits (suppression, duplication, archivage).
 */
export function useProductBulkActions(selectedIds: Set<string>, options?: BulkActionsOptions) {
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const executeBulkAction = useCallback(async (action: "delete" | "duplicate" | "archive" | "enrich") => {
        setLoading(true);
        try {
            const response = await fetch("/api/v1/produits/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ids: Array.from(selectedIds) }),
            });
            const data = await response.json();

            if (data.success) {
                const messages = {
                    delete: { title: "Supprimés", desc: `${data.data.affected} produit(s) supprimé(s).` },
                    duplicate: { title: "Dupliqués", desc: `${data.data.affected} produit(s) dupliqué(s).` },
                    archive: { title: "Archivés", desc: `${data.data.affected} produit(s) archivé(s).` },
                    enrich: { title: "Enrichissement terminé", desc: `${data.data.affected} produit(s) enrichi(s).` },
                };
                toast.success(messages[action].title, { description: messages[action].desc });
                options?.onSuccess?.();
                return true;
            } else {
                throw new Error(data.error?.message || "Erreur");
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Une erreur est survenue";
            const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("Too Many Requests");

            const messages = {
                delete: "Échec de la suppression",
                duplicate: "Échec de la duplication",
                archive: "Échec de l'archivage",
                enrich: "Échec de l'enrichissement",
            };

            const description = isQuotaError
                ? "Quota Gemini dépassé. Veuillez attendre une minute avant de réessayer."
                : errorMsg;

            toast.error(messages[action], { description });
            return false;
        } finally {
            setLoading(false);
            if (action === "delete") {
                setDeleteDialogOpen(false);
            }
        }
    }, [selectedIds, options]);

    const handleBulkDelete = useCallback(() => executeBulkAction("delete"), [executeBulkAction]);
    const handleBulkDuplicate = useCallback(() => executeBulkAction("duplicate"), [executeBulkAction]);
    const handleBulkArchive = useCallback(() => executeBulkAction("archive"), [executeBulkAction]);
    const handleBulkEnrich = useCallback(() => executeBulkAction("enrich"), [executeBulkAction]);

    return {
        loading,
        deleteDialogOpen,
        setDeleteDialogOpen,
        handleBulkDelete,
        handleBulkDuplicate,
        handleBulkArchive,
        handleBulkEnrich,
    };
}
