"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import type {
  Parcelle,
} from "@/lib/types/entities";
import { apiFetch, postJson, patchJson, deleteJson } from '@/lib/utils/api-fetch';
import {
  validateApiResponse,
  validateEntityArray,
  validateParcelle,
  assertSuccessfulResponse,
} from "@/lib/utils/api-validation";
import {
  transformParcelleFormToCreateInput,
  transformParcelleFormToUpdateInput,
  transformParcelleApiToFormData,
  transformLegacyParcelleToModern,
  formatParcelleForDisplay,
} from "@/lib/transformers/parcelle-transformer";
import type {
  CreateParcelleFormData,
  UpdateParcelleFormData,
} from "@/lib/schemas/parcelle";

// ============================================================================
// API Functions
// ============================================================================

async function fetchParcelles(): Promise<Parcelle[]> {
  const data = await apiFetch<any>("/api/v1/parcelles");

  // Validate API response structure
  const validatedResponse = validateApiResponse<{ parcelles: Parcelle[] }>(
    data,
    "fetchParcelles",
  );

  if (!validatedResponse.success) {
    throw new Error(
      validatedResponse.error?.message || "Failed to fetch parcelles",
    );
  }

  // Extract parcelles from the validated response
  const parcelles = validatedResponse.data!.parcelles;

  // Transform legacy parcelles to modern format if needed
  const transformedParcelles = parcelles.map((parcelle: any) => {
    try {
      return validateParcelle(parcelle, "fetchParcelles");
    } catch (error) {
      // Try to transform legacy format
      return transformLegacyParcelleToModern(parcelle);
    }
  });

  return validateEntityArray(
    transformedParcelles,
    validateParcelle,
    "fetchParcelles",
  );
}

const createParcelle = async (
  formData: CreateParcelleFormData,
): Promise<Parcelle> => {
  // Transform form data to API format
  const apiData = transformParcelleFormToCreateInput(formData);

  const jsonResponse = await postJson<typeof apiData, any>("/api/v1/parcelles", apiData);
  const responseData = assertSuccessfulResponse<{ parcelle: Parcelle }>(
    jsonResponse,
    "createParcelle",
  );

  return validateParcelle(responseData.parcelle, "createParcelle");
};

const updateParcelle = async (
  id: string,
  formData: UpdateParcelleFormData,
): Promise<Parcelle> => {
  // Transform form data to API format
  const apiData = transformParcelleFormToUpdateInput(formData);

  const jsonResponse = await patchJson<typeof apiData, any>(`/api/v1/parcelles/${id}`, apiData);
  const responseData = assertSuccessfulResponse<{ parcelle: Parcelle }>(
    jsonResponse,
    "updateParcelle",
  );

  return validateParcelle(responseData.parcelle, "updateParcelle");
};

const deleteParcelle = async (id: string): Promise<void> => {
  await deleteJson(`/api/v1/parcelles/${id}`);
};

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook pour récupérer la liste des parcelles avec validation et transformation automatique
 * @returns Une requête `useQuery` qui contient les données des parcelles, l'état de chargement et les erreurs
 */
export function useParcelles() {
  return useQuery<Parcelle[], Error>({
    queryKey: ["parcelles"],
    queryFn: fetchParcelles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Hook pour créer une nouvelle parcelle avec transformation automatique des données
 * @returns Une mutation pour créer une parcelle
 */
export const useCreateParcelle = () => {
  const queryClient = useQueryClient();

  const { toast } = useToast();
  const router = useRouter();

  return useMutation<Parcelle, Error, CreateParcelleFormData>({
    mutationFn: createParcelle,
    onSuccess: async () => {
      // Invalider le cache React Query
      await queryClient.invalidateQueries({ queryKey: ['parcelles'] });
    },
    onError: (error: any) => {
      const status = (error as any)?.status;
      const message = (error as any)?.message || 'Échec de création de la parcelle';

      if (status === 401) {
        toast({
          variant: 'destructive',
            title: 'Session expirée',
            description: 'Veuillez vous reconnecter pour créer une parcelle.'
        });
        router.push('/login');
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Erreur création',
        description: message,
      });
      console.error('Failed to create parcelle:', error);
    }
  });
};

/**
 * Hook pour mettre à jour une parcelle existante avec transformation automatique des données
 * @returns Une mutation pour mettre à jour une parcelle
 */
export const useUpdateParcelle = () => {
  const queryClient = useQueryClient();

  return useMutation<Parcelle, Error, { id: string; data: UpdateParcelleFormData }>({
    mutationFn: ({ id, data }) => updateParcelle(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["parcelles"] });
    },
    onError: (error: any) => {
      const status = (error as any)?.status;
      if (status === 401) {
        // Silently ignore; apiFetch will have redirected
        return;
      }
      console.error("Failed to update parcelle:", error);
    },
  });
};

/**
 * Hook pour supprimer une parcelle
 * @returns Une mutation pour supprimer une parcelle
 */
export const useDeleteParcelle = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteParcelle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["parcelles"] });
    },
    onError: (error: any) => {
      const status = (error as any)?.status;
      if (status === 401) { return; }
      console.error("Failed to delete parcelle:", error);
    },
  });
};

/**
 * Hook pour transformer une parcelle API en données de formulaire
 * @param parcelle - La parcelle à transformer
 * @returns Les données formatées pour le formulaire
 */
export const useParcelleFormData = (parcelle?: Parcelle) => {
  if (!parcelle) return undefined;

  try {
    return transformParcelleApiToFormData(parcelle);
  } catch (error) {
    console.error("Failed to transform parcelle to form data:", error);
    return undefined;
  }
};

/**
 * Hook pour formater une parcelle pour l'affichage
 * @param parcelle - La parcelle à formater
 * @returns Les données formatées pour l'affichage
 */
export const useParcelleDisplayData = (parcelle?: Parcelle) => {
  if (!parcelle) return undefined;

  try {
    return formatParcelleForDisplay(parcelle);
  } catch (error) {
    console.error("Failed to format parcelle for display:", error);
    return undefined;
  }
};
