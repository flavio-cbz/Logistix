import { z } from "zod";

// Base schema aligned with backend API validation and shared types
const baseOrderSchema = z.object({
  superbuyId: z
    .string()
    .min(1, "Le numéro de commande est requis")
    .max(50, "Le numéro de commande ne peut pas dépasser 50 caractères")
    .trim(),
  status: z
    .string()
    .min(1, "Le statut est requis")
    .max(50, "Le statut ne peut pas dépasser 50 caractères")
    .trim(),
  platform: z
    .string()
    .max(50, "La plateforme ne peut pas dépasser 50 caractères")
    .trim()
    .optional(),
  trackingNumber: z
    .string()
    .max(100, "Le numéro de suivi ne peut pas dépasser 100 caractères")
    .trim()
    .optional(),
  warehouse: z
    .string()
    .max(100, "L'entrepôt ne peut pas dépasser 100 caractères")
    .trim()
    .optional(),
  totalPrice: z.union([
    z.number().min(0, "Le prix total doit être positif"),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Le prix total doit être un nombre valide")
      .transform((val) => parseFloat(val))
      .refine((val) => val >= 0, "Le prix total doit être positif"),
  ]).optional(),
  currency: z
    .string()
    .max(10, "La devise ne peut pas dépasser 10 caractères")
    .trim()
    .optional(),
  userId: z.string().optional(), // Will be set by backend
});

// Schema for creating orders
export const createOrderSchema = baseOrderSchema.omit({
  userId: true,
});

// Schema for updating orders
export const updateOrderSchema = baseOrderSchema
  .omit({
    userId: true,
  })
  .partial();

// Types inférés
export type OrderFormData = z.infer<typeof baseOrderSchema>;
export type CreateOrderFormData = z.infer<typeof createOrderSchema>;
export type UpdateOrderFormData = z.infer<typeof updateOrderSchema>;

// Re-export shared types for consistency
export type {
  Order,
  CreateOrderInput,
  UpdateOrderInput,
} from "../types/entities";
