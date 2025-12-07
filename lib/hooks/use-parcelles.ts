import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Parcelle } from "@/lib/types/entities";
import { apiFetch, postJson, patchJson, deleteJson } from "@/lib/utils/api-fetch";
import { toast } from "sonner";
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

// =====================================================================