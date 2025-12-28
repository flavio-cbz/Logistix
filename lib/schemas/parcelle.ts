import { z } from "zod";

// Statuts valides pour les parcelles
const PARCELLE_STATUTS = ['En attente', 'En transit', 'Livré', 'Retourné', 'Perdu'] as const;

// Base schema aligned with backend API validation and shared types
const baseParcelleSchema = z.object({
  numero: z
    .string()
    .min(1, "Le numéro de parcelle est requis")
    .max(50, "Le numéro de parcelle ne peut pas dépasser 50 caractères")
    .trim(),
  numero_suivi: z
    .string()
    .max(100, "Le numéro de suivi ne peut pas dépasser 100 caractères")
    .trim()
    .optional(),
  transporteur: z
    .string()
    .min(1, "Le transporteur est requis")
    .max(100, "Le nom du transporteur ne peut pas dépasser 100 caractères")
    .trim(),
  nom: z
    .string()
    .min(1, "Le nom de la parcelle est requis")
    .max(200, "Le nom de la parcelle ne peut pas dépasser 200 caractères")
    .trim(),
  statut: z
    .enum([...PARCELLE_STATUTS], {
      message: `Le statut doit être: ${PARCELLE_STATUTS.join(', ')}`
    }),
  prixAchat: z.union([
    z.number().positive("Le prix d'achat doit être positif"),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Le prix d'achat doit être un nombre valide")
      .transform((val) => parseFloat(val))
      .refine((val) => val > 0, "Le prix d'achat doit être positif"),
  ]),
  poids: z.union([
    z.number().positive("Le poids doit être positif (en grammes)"),
    z
      .string()
      .regex(/^\d+(\.\d*)?$/, "Le poids doit être un nombre valide (en grammes)")
      .transform((val) => Math.round(parseFloat(val)))
      .refine((val) => val > 0, "Le poids doit être positif"),
  ]),
  // Calculated fields - will be computed from prixAchat and poids
  prixTotal: z.number().min(0, "Le prix total doit être positif").optional(),
  prixParGramme: z
    .number()
    .min(0, "Le prix par gramme doit être positif")
    .optional(),
  // System fields
  userId: z.string().optional(), // Will be set by backend
});

// Schema for creating parcelles - aligned with backend API requirements
export const createParcelleSchema = baseParcelleSchema
  .omit({
    userId: true,
    prixTotal: true,
    prixParGramme: true,
  })
  .transform((data) => {
    // Calculate derived fields
    const prixTotal = data.prixAchat;
    const prixParGramme = data.prixAchat / data.poids;

    return {
      ...data,
      prixTotal,
      prixParGramme,
    };
  });

// Schema for updating parcelles
export const updateParcelleSchema = baseParcelleSchema
  .omit({
    userId: true,
  })
  .partial()
  .transform((data) => {
    // Recalculate derived fields if base values change
    if (data.prixAchat !== undefined && data.poids !== undefined) {
      data.prixTotal = data.prixAchat;
      data.prixParGramme = data.prixAchat / data.poids;
    }

    return data;
  });

// Types inférés alignés avec les types partagés
export type ParcelleFormData = z.infer<typeof baseParcelleSchema>;
export type CreateParcelleFormData = z.infer<typeof createParcelleSchema>;
export type UpdateParcelleFormData = z.infer<typeof updateParcelleSchema>;

// Re-export shared types for consistency
export type {
  Parcelle,
  CreateParcelleInput,
  UpdateParcelleInput,
} from "../types/entities";
