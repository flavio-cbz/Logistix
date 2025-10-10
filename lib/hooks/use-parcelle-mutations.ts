"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { useStore } from "@/lib/services/admin/store";
import type {
  Parcelle,
} from "@/lib/types/entities";
import type {
  CreateParcelleFormData,
  UpdateParcelleFormData,
} from "@/lib/schemas/parcelle";
import { autoPerf } from "@/lib/services/auto-performance-integration";
import {
  validateApiResponse,
  validateParcelle,
} from "@/lib/utils/api-validation";

// --- Add Parcelle ---
const addParcelle = async (
  parcelle: CreateParcelleFormData,
): Promise<Parcelle> => {
  const response = await autoPerf.autoFetch("/api/v1/parcelles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parcelle),
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Erreur inconnue" }));
    throw new Error(errorData.message || "Failed to create parcelle");
  }

  const jsonResponse = await response.json();
  const validatedResponse = validateApiResponse<Parcelle>(
    jsonResponse,
    "addParcelle",
  );

  if (!validatedResponse.success) {
    throw new Error(
      validatedResponse.error?.message || "Failed to create parcelle",
    );
  }

  return validateParcelle(validatedResponse.data, "addParcelle");
};

export const useAddParcelle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation<Parcelle, Error, CreateParcelleFormData>({
    mutationFn: addParcelle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      toast({
        title: "Parcelle ajoutée",
        description: "La nouvelle parcelle a été ajoutée avec succès.",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    },
  });
};

// --- Update Parcelle ---
const updateParcelle = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateParcelleFormData;
}): Promise<Parcelle> => {
  const response = await autoPerf.autoFetch(`/api/v1/parcelles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update parcelle");
  }

  const jsonResponse = await response.json();
  const validatedResponse = validateApiResponse<Parcelle>(
    jsonResponse,
    "updateParcelle",
  );

  if (!validatedResponse.success) {
    throw new Error(
      validatedResponse.error?.message || "Failed to update parcelle",
    );
  }

  return validateParcelle(validatedResponse.data, "updateParcelle");
};

export const useUpdateParcelle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation<
    Parcelle,
    Error,
    { id: string; data: UpdateParcelleFormData }
  >({
    mutationFn: updateParcelle,
    onSuccess: (updatedParcelle) => {
      queryClient.setQueryData(
        ["parcelles"],
        (oldData: Parcelle[] | undefined) => {
          if (!oldData) return [updatedParcelle];
          return oldData.map((p) =>
            p.id === updatedParcelle.id ? updatedParcelle : p,
          );
        },
      );
      toast({
        title: "Parcelle mise à jour",
        description: "La parcelle a été mise à jour avec succès.",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    },
  });
};

// --- Delete Parcelle ---
export const useDeleteParcelle = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const store = useStore();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await autoPerf.autoFetch(`/api/v1/parcelles/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Erreur inconnue" }));
        throw new Error(
          error.message || "Erreur lors de la suppression de la parcelle",
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["parcelles"] });
      // Mettre à jour le store Zustand
      store.deleteParcelle(variables);
      toast({
        title: "Succès",
        description: "La parcelle a été supprimée avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
