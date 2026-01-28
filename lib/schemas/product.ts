import { z } from "zod";
import { ProductStatus, Platform } from "../types/entities";

// =============================================================================
// BASE PRODUCT SCHEMA
// =============================================================================
// Field names now match database columns directly - no mapping needed in API routes
// Legacy aliases maintained for backward compatibility during migration

const baseProductSchema = z.object({
  // -------------------------------------------------------------------------
  // Basic information
  // -------------------------------------------------------------------------
  name: z
    .string()
    .min(1, "Le titre du produit est requis")
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .trim(),

  description: z.string().optional().nullable().transform((val) => val?.trim()),

  // -------------------------------------------------------------------------
  // Brand and categorization
  // -------------------------------------------------------------------------
  brand: z
    .string()
    .max(100, "La marque ne peut pas dépasser 100 caractères")
    .trim()
    .nullable()
    .optional(),
  category: z
    .string()
    .max(100, "La catégorie ne peut pas dépasser 100 caractères")
    .trim()
    .nullable()
    .optional(),
  subcategory: z
    .string()
    .max(100, "La sous-catégorie ne peut pas dépasser 100 caractères")
    .optional()
    .nullable()
    .transform((val) => val?.trim()),

  // -------------------------------------------------------------------------
  // Physical properties
  // -------------------------------------------------------------------------
  size: z
    .string()
    .max(50, "La taille ne peut pas dépasser 50 caractères")
    .optional()
    .nullable()
    .transform((val) => val?.trim()),
  color: z
    .string()
    .max(50, "La couleur ne peut pas dépasser 50 caractères")
    .optional()
    .nullable()
    .transform((val) => val?.trim()),

  // Weight in grams (database column: poids)
  poids: z
    .union([
      z.number().min(0, "Le poids doit être positif ou zéro"),
      z
        .string()
        .regex(/^\d+(\.\d{1,3})?$/, "Le poids doit être un nombre valide")
        .transform((val) => parseFloat(val))
        .refine((val) => val >= 0, "Le poids doit être positif ou zéro"),
    ])
    .optional()
    .nullable(),

  // -------------------------------------------------------------------------
  // Pricing - Using database column names directly
  // -------------------------------------------------------------------------

  // Purchase price (database column: price)
  price: z.union([
    z.number().min(0, "Le prix d'achat doit être positif ou zéro"),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Le prix d'achat doit être un nombre valide")
      .transform((val) => parseFloat(val))
      .refine((val) => val >= 0, "Le prix d'achat doit être positif ou zéro"),
  ]),

  // Selling price (database column: selling_price) - RENAMED from prixVente
  sellingPrice: z
    .union([
      z.number().min(0, "Le prix de vente doit être positif ou zéro"),
      z
        .string()
        .regex(
          /^\d+(\.\d{1,2})?$/,
          "Le prix de vente doit être un nombre valide",
        )
        .transform((val) => parseFloat(val))
        .refine(
          (val) => val >= 0,
          "Le prix de vente doit être positif ou zéro",
        ),
    ])
    .optional()
    .nullable(),

  currency: z.string().default("EUR"),

  // Shipping cost (database column: cout_livraison)
  coutLivraison: z.number().min(0).optional().nullable(),

  // -------------------------------------------------------------------------
  // Parcel and external links
  // -------------------------------------------------------------------------

  // Parcel ID (database column: parcel_id) - RENAMED from parcelleId
  parcelId: z.string().optional().nullable(),

  url: z.string().url().optional().nullable().or(z.literal("")),
  photoUrl: z.string()
    .refine((val) => {
      if (!val || val === "") return true;
      return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
    }, "L'URL de la photo doit être une URL valide (absolue ou relative)")
    .optional()
    .nullable()
    .or(z.literal("")),

  // -------------------------------------------------------------------------
  // Status and platform
  // -------------------------------------------------------------------------
  status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.DRAFT),
  plateforme: z.nativeEnum(Platform).optional().nullable(),

  // Legacy sold flag (database column: vendu)
  vendu: z.enum(["0", "1"]).optional().default("0"),

  // -------------------------------------------------------------------------
  // Timestamps - Using database column names directly
  // -------------------------------------------------------------------------

  // Listed date (database column: listed_at) - RENAMED from dateMiseEnLigne
  listedAt: z.string().optional().nullable(),

  // Sold date (database column: sold_at) - RENAMED from dateVente
  soldAt: z.string().optional().nullable(),

  // System fields (set by backend)
  userId: z.string().optional().nullable(),
});

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

export const productSchema = baseProductSchema.superRefine((data, ctx) => {
  // Validation for sold products (vendu = '1')
  if (data.vendu === "1") {
    if (!data.listedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de mise en ligne est requise pour un produit vendu.",
        path: ["listedAt"],
      });
    }
    if (!data.soldAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de vente est requise pour un produit vendu.",
        path: ["soldAt"],
      });
    }
    if (!data.sellingPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le prix de vente est requis pour un produit vendu.",
        path: ["sellingPrice"],
      });
    }
    if (!data.plateforme) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La plateforme est requise pour un produit vendu.",
        path: ["plateforme"],
      });
    }
  }
});

// =============================================================================
// CREATE SCHEMA
// =============================================================================

export const createProductSchema = baseProductSchema
  .omit({
    userId: true,
  })
  .superRefine((data, ctx) => {
    if (!data.name || data.name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le nom du produit est requis.",
        path: ["name"],
      });
    }

    // Conditional validation for sold products
    if (data.vendu === "1") {
      if (!data.listedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date de mise en ligne est requise pour un produit vendu.",
          path: ["listedAt"],
        });
      }
      if (!data.soldAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date de vente est requise pour un produit vendu.",
          path: ["soldAt"],
        });
      }
      if (!data.sellingPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le prix de vente est requis pour un produit vendu.",
          path: ["sellingPrice"],
        });
      }
      if (!data.plateforme) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La plateforme est requise pour un produit vendu.",
          path: ["plateforme"],
        });
      }
    }
  });

// =============================================================================
// UPDATE SCHEMA
// =============================================================================

export const updateProductSchema = baseProductSchema
  .omit({
    userId: true,
  })
  .partial()
  .superRefine((data, ctx) => {
    // Conditional validation only when marking as sold
    if (data.vendu === "1") {
      if (!data.listedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date de mise en ligne est requise pour un produit vendu.",
          path: ["listedAt"],
        });
      }
      if (!data.soldAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date de vente est requise pour un produit vendu.",
          path: ["soldAt"],
        });
      }
      if (!data.sellingPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le prix de vente est requis pour un produit vendu.",
          path: ["sellingPrice"],
        });
      }
      if (!data.plateforme) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La plateforme est requise pour un produit vendu.",
          path: ["plateforme"],
        });
      }
    }
  });

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ProductFormData = z.infer<typeof productSchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;

// Re-export shared types
export type {
  Product,
  CreateProductInput,
  UpdateProductInput,
} from "../types/entities";
