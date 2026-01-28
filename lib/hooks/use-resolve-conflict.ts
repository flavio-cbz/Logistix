import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ResolveConflictParams {
  productId: string;
  candidateId?: string;
  name?: string;
  brand?: string;
  category?: string;
  url?: string;
  description?: string;
  skip?: boolean;
}

interface ResolveConflictResponse {
  success: boolean;
  message?: string;
}

/**
 * Hook to resolve product enrichment conflicts
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation<ResolveConflictResponse, Error, ResolveConflictParams>({
    mutationFn: async ({ productId, ...data }) => {
      const response = await fetch(`/api/v1/produits/${productId}/resolve-conflict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Erreur réseau" }));
        throw new Error(errorData.message || "Échec de la résolution du conflit");
      }

      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate product queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", variables.productId] });

      if (variables.skip) {
        toast.info("Conflit ignoré");
      } else if (variables.candidateId === "merged") {
        toast.success("✓ Données fusionnées", {
          description: "Le produit a été mis à jour avec les données fusionnées",
        });
      } else {
        toast.success("✓ Conflit résolu", {
          description: data.message || "Le produit a été mis à jour avec succès",
        });
      }
    },
    onError: (error) => {
      toast.error("Erreur", {
        description: error.message || "Impossible de résoudre le conflit",
      });
    },
  });
}
