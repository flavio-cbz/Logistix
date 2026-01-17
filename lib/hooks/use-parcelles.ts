import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Parcelle } from "@/lib/types/entities";
import { apiFetch, postJson, patchJson, deleteJson } from "@/lib/utils/api-fetch";
import { toast } from "sonner";
import {
  validateApiResponse,
  assertSuccessfulResponse,
} from "@/lib/utils/api-validation";
import type {
  CreateParcelFormData,
  UpdateParcelFormData,
} from "@/lib/schemas/parcelle";

// ============================================================================
// API Functions
// ============================================================================

async function fetchParcelles(): Promise<Parcelle[]> {
  const data = await apiFetch<unknown>("/api/v1/parcelles");

  // Validate API response structure
  const validatedResponse = validateApiResponse<Parcelle[]>(
    data,
    "fetchParcelles",
  );

  if (!validatedResponse.success) {
    throw new Error(
      validatedResponse.error?.message || "Failed to fetch parcelles",
    );
  }

  // Extract parcelles from the validated response
  // The API now returns { success: true, data: [...] } where data IS the array
  const responseData = validatedResponse.data as Parcelle[] | { parcelles?: Parcelle[] };
  const parcelles = Array.isArray(responseData)
    ? responseData
    : (responseData?.parcelles || []);

  // No transformation needed if API returns correct format
  // But we might want to validate

  return parcelles;
}

const createParcelle = async (
  formData: CreateParcelFormData,
): Promise<Parcelle> => {
  // formData should already match API requirement thanks to Zod schema update
  const apiData = formData;

  const jsonResponse = await postJson<typeof apiData, unknown>("/api/v1/parcelles", apiData);
  const responseData = assertSuccessfulResponse<{ parcelle: Parcelle }>(
    jsonResponse,
    "createParcelle",
  );

  return responseData.parcelle;
};

const updateParcelle = async (
  id: string,
  formData: UpdateParcelFormData,
): Promise<Parcelle> => {
  // formData matches schema
  const apiData = formData;

  const jsonResponse = await patchJson<typeof apiData, unknown>(`/api/v1/parcelles/${id}`, apiData);
  const responseData = assertSuccessfulResponse<{ parcelle: Parcelle }>(
    jsonResponse,
    "updateParcelle",
  );

  return responseData.parcelle;
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


  const router = useRouter();

  return useMutation<Parcelle, Error, CreateParcelFormData>({
    mutationFn: createParcelle,
    onSuccess: async () => {
      // Invalider et refetch le cache React Query - ATTENDRE la fin
      await queryClient.invalidateQueries({
        queryKey: ['parcelles'],
        refetchType: 'active' // Force le refetch immédiat des queries actives
      });
      // Petit délai pour s'assurer que le refetch est terminé
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    onError: (error: unknown) => {
      // Type guard for error object with status
      const status = error && typeof error === 'object' && 'status' in error
        ? (error as { status: number }).status
        : undefined;

      const message = error instanceof Error
        ? error.message
        : 'Échec de création de la parcelle';

      if (status === 401) {
        toast.error('Session expirée', {
          description: 'Veuillez vous reconnecter pour créer une parcelle.'
        });
        router.push('/login');
        return;
      }

      toast.error('Erreur création', {
        description: message,
      });
    }
  });
};

/**
 * Hook pour mettre à jour une parcelle existante avec transformation automatique des données
 * @returns Une mutation pour mettre à jour une parcelle
 */
export const useUpdateParcelle = () => {
  const queryClient = useQueryClient();

  return useMutation<Parcelle, Error, { id: string; data: UpdateParcelFormData }>({
    mutationFn: ({ id, data }) => updateParcelle(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["parcelles"],
        refetchType: 'active' // Force le refetch immédiat des queries actives
      });
      // Petit délai pour s'assurer que le refetch est terminé
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    onError: (error: unknown) => {
      const status = error && typeof error === 'object' && 'status' in error
        ? (error as { status: number }).status
        : undefined;

      if (status === 401) {
        // Silently ignore; apiFetch will have redirected
        return;
      }
      // logger.error("Failed to update parcelle:", error);
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
      // Invalider et refetch le cache React Query - ATTENDRE la fin
      await queryClient.invalidateQueries({
        queryKey: ['parcelles'],
        refetchType: 'active' // Force le refetch immédiat des queries actives
      });
      // Petit délai pour s'assurer que le refetch est terminé
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    onError: (error: unknown) => {
      const status = error && typeof error === 'object' && 'status' in error
        ? (error as { status: number }).status
        : undefined;

      if (status === 401) { return; }
      // logger.error("Failed to delete parcelle:", error);
    },
  });
};

// Removed unused transformer hooks
