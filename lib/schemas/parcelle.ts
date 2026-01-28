import { z } from "zod";

// Statuts valides pour les parcelles
import { ParcelStatus } from "../shared/types/entities";



// Base schema aligned with backend API validation and shared types
// Base schema aligned with backend API validation and shared types
const baseParcelSchema = z.object({
  superbuyId: z
    .string()
    .min(1, "Le numéro de parcelle est requis")
    .max(50, "Le numéro de parcelle ne peut pas dépasser 50 caractères")
    .trim(),
  trackingNumber: z
    .string()
    .max(100, "Le numéro de suivi ne peut pas dépasser 100 caractères")
    .trim()
    .optional(),
  carrier: z
    .string()
    .min(1, "Le transporteur est requis")
    .max(100, "Le nom du transporteur ne peut pas dépasser 100 caractères")
    .trim(),
  name: z
    .string()
    .min(1, "Le nom de la parcelle est requis")
    .max(200, "Le nom de la parcelle ne peut pas dépasser 200 caractères")
    .trim(),
  status: z
    .nativeEnum(ParcelStatus, {
      message: `Le statut est invalide`
    }),
  totalPrice: z.union([
    z.number().positive("Le prix d'achat doit être positif"),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Le prix d'achat doit être un nombre valide")
      .transform((val) => parseFloat(val))
      .refine((val) => val > 0, "Le prix d'achat doit être positif"),
  ]),
  weight: z.union([
    z.number().positive("Le poids doit être positif (en grammes)"),
    z
      .string()
      .regex(/^\d+(\.\d*)?$/, "Le poids doit être un nombre valide (en grammes)")
      .transform((val) => Math.round(parseFloat(val)))
      .refine((val) => val > 0, "Le poids doit être positif"),
  ]),
  // Calculated fields - will be computed from totalPrice and weight
  // Note: totalPrice is already the "Buying Price"
  pricePerGram: z
    .number()
    .min(0, "Le prix par gramme doit être positif")
    .optional(),
  // System fields
  userId: z.string().optional(), // Will be set by backend
  isActive: z.boolean().optional().default(true),
});

// Schema for creating parcelles - aligned with backend API requirements
export const createParcelSchema = baseParcelSchema
  .omit({
    userId: true,
    pricePerGram: true,
  })
  .transform((data) => {
    // Calculate derived fields
    const pricePerGram = data.totalPrice / data.weight;

    return {
      ...data,
      pricePerGram,
    };
  });

// Schema for updating parcelles
export const updateParcelSchema = baseParcelSchema
  .omit({
    userId: true,
  })
  .partial()
  .transform((data) => {
    // Recalculate derived fields if base values change
    if (data.totalPrice !== undefined && data.weight !== undefined) {
      data.pricePerGram = data.totalPrice / data.weight;
    }

    return data;
  });

// Types inférés alignés avec les types partagés
export type ParcelFormData = z.infer<typeof baseParcelSchema>;
export type CreateParcelFormData = z.infer<typeof createParcelSchema>;
export type UpdateParcelFormData = z.infer<typeof updateParcelSchema>;

// Re-export shared types for consistency
export type {
  Parcel,
  CreateParcelInput,
  UpdateParcelInput,
} from "../shared/types/entities";
