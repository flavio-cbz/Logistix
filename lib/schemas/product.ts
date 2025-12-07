<<<<<<< HEAD
import { z } from "zod";
import { ProductStatus, Platform } from "../types/entities";

// Base schema aligned with backend API validation and shared types
const baseProductSchema = z.object({
  // Basic information - aligned with backend createProductSchema
  name: z
    .string()
    .min(1, "Le titre du produit est requis")
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .trim(),

  // Brand and categorization
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

  // Physical properties
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

  // Weight and pricing - aligned with backend validation
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
  price: z.union([
    z.number().min(0, "Le prix d'achat doit être positif ou zéro"),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Le prix d'achat doit être un nombre valide")
      .transform((val) => parseFloat(val))
      .refine((val) => val >= 0, "Le prix d'achat doit être positif ou zéro"),
  ]),
  prixVente: z
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

  // Additional fields
  currency: z.string().default("EUR"),
  coutLivraison: z.number().min(0).optional().nullable(),
  parcelleId: z.string().optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal("")),
  photoUrl: z.string()
    .refine((val) => {
      if (!val || val === "") return true;
      // Accepter les URLs absolues (http/https) et relatives (commençant par /)
      return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
    }, "L'URL de la photo doit être une URL valide (absolue ou relative)")
    .optional()
    .nullable()
    .or(z.literal("")),

  // Status and platform information
  status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.DRAFT),
  plateforme: z.nativeEnum(Platform).optional().nullable(),

  // Legacy compatibility fields
  vendu: z.enum(["0", "1"]).optional().default("0"), // Simplified: 0=not sold, 1=sold
  dateMiseEnLigne: z.string().optional().nullable(),
  dateVente: z.string().optional().nullable(),

  // System fields (will be set by backend)
  userId: z.string().optional().nullable(),
  soldAt: z.string().optional().nullable(),
});

// Validation schema with conditional requirements based on product status
export const productSchema = baseProductSchema.superRefine((data, ctx) => {
  // Validation for sold products (vendu = '1')
  if (data.vendu === "1") {
    if (!data.dateMiseEnLigne) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de mise en ligne est requise pour un produit vendu.",
        path: ["dateMiseEnLigne"],
      });
    }
    if (!data.dateVente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de vente est requise pour un produit vendu.",
        path: ["dateVente"],
      });
    }
    if (!data.prixVente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le prix de vente est requis pour un produit vendu.",
        path: ["prixVente"],
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

// Schema for creating products - aligned with backend API
export const createProductSchema = baseProductSchema
  .omit({
    userId: true,
    soldAt: true,
  })
  .superRefine((data, ctx) => {
    // Validate required fields for creation - only name and price are truly required for arbitrage
    if (!data.name || data.name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le nom du produit est requis.",
        path: ["name"],
      });
    }

    // Apply the same conditional validation as productSchema
    if (data.vendu === "1") {
      if (!data.dateMiseEnLigne) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La date de mise en ligne est requise pour un produit vendu.",
          path: ["dateMiseEnLigne"],
        });
      }
      if (!data.dateVente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date de vente est requise pour un produit vendu.",
          path: ["dateVente"],
        });
      }
      if (!data.prixVente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le prix de vente est requis pour un produit vendu.",
          path: ["prixVente"],
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

// Schema for updating products - all fields optional except validation rules
export const updateProductSchema = baseProductSchema
  .omit({
    userId: true,
    soldAt: true,
  })
  .partial()
  .superRefine((data, ctx) => {
    // Apply conditional validation only if vendu is being set to '1'
    if (data.vendu === "1") {
      if (!data.dateMiseEnLigne) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La date de mise en ligne est requise pour un produit vendu.",
          path: ["dateMiseEnLigne"],
        });
      }
      if (!data.dateVente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date de vente est requise pour un produit vendu.",
          path: ["dateVente"],
        });
      }
      if (!data.prixVente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le prix de vente est requis pour un produit vendu.",
          path: ["prixVente"],
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

// Inferred types aligned with shared entity types
export type ProductFormData = z.infer<typeof productSchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;

// Re-export shared types for consistency
export type {
  Product,
  CreateProductInput,
  UpdateProductInput,
} from "../types/entities";
=======
import { z } from "zod";
import { ProductStatus, Platform } from "../types/entities";

// Base schema aligned with backend API validation and shared types
const baseProductSchema = z.object({
  // Basic information - aligned with backend createProductSchema
  name: z
    .string()
    .min(1, "Le titre du produit est requis")
    .max(200, "Le titre ne peut pas dépasser 200 caractères")
    .trim(),

  // Brand and categorization
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

  // Physical properties
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

  // Weight and pricing - aligned with backend validation
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
  price: z.union([
    z.number().min(0, "Le prix d'achat doit être positif ou zéro"),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Le prix d'achat doit être un nombre valide")
      .transform((val) => parseFloat(val))
      .refine((val) => val >= 0, "Le prix d'achat doit être positif ou zéro"),
  ]),
  prixVente: z
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

  // Additional fields
  currency: z.string().default("EUR"),
  coutLivraison: z.number().min(0).optional().nullable(),
  parcelleId: z.string().optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal("")),
  photoUrl: z.string()
    .refine((val) => {
      if (!val || val === "") return true;
      // Accepter les URLs absolues (http/https) et relatives (commençant par /)
      return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
    }, "L'URL de la photo doit être une URL valide (absolue ou relative)")
    .optional()
    .nullable()
    .or(z.literal("")),

  // Status and platform information
  status: z.nativeEnum(ProductStatus).optional().default(ProductStatus.DRAFT),
  plateforme: z.nativeEnum(Platform).optional().nullable(),

  // Legacy compatibility fields
  vendu: z.enum(["0", "1"]).optional().default("0"), // Simplified: 0=not sold, 1=sold
  dateMiseEnLigne: z.string().optional().nullable(),
  dateVente: z.string().optional().nullable(),

  // System fields (will be set by backend)
  userId: z.string().optional().nullable(),
  soldAt: z.string().optional().nullable(),
});

// Validation schema with conditional requirements based on product status
export const productSchema = baseProductSchema.superRefine((data, ctx) => {
  // Validation for sold products (vendu = '1')
  if (data.vendu === "1") {
    if (!data.dateMiseEnLigne) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de mise en ligne est requise pour un produit vendu.",
        path: ["dateMiseEnLigne"],
      });
    }
    if (!data.dateVente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de vente est requise pour un produit vendu.",
        path: ["dateVente"],
      });
    }
    if (!data.prixVente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le prix de vente est requis pour un produit vendu.",
        path: ["prixVente"],
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

// Schema for creating products - aligned with backend API
export const createProductSchema = baseProductSchema
  .omit({
    userId: true,
    soldAt: true,
  })
  .superRefine((data, ctx) => {
    // Validate required fields for creation - only name and price are truly required for arbitrage
    if (!data.name || data.name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le nom du produit est requis.",
        path: ["name"],
      });
    }

    // Apply the same conditional validation as productSchema
    if (data.vendu === "1") {
      if (!data.dateMiseEnLigne) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La date de mise en ligne est requise pour un produit vendu.",
          path: ["dateMiseEnLigne"],
        });
      }
      if (!data.dateVente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date de vente est requise pour un produit vendu.",
          path: ["dateVente"],
        });
      }
      if (!data.prixVente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le prix de vente est requis pour un produit vendu.",
          path: ["prixVente"],
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

// Schema for updating products - all fields optional except validation rules
export const updateProductSchema = baseProductSchema
  .omit({
    userId: true,
    soldAt: true,
  })
  .partial()
  .superRefine((data, ctx) => {
    // Apply conditional validation only if vendu is being set to '1'
    if (data.vendu === "1") {
      if (!data.dateMiseEnLigne) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La date de mise en ligne est requise pour un produit vendu.",
          path: ["dateMiseEnLigne"],
        });
      }
      if (!data.dateVente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La date de vente est requise pour un produit vendu.",
          path: ["dateVente"],
        });
      }
      if (!data.prixVente) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le prix de vente est requis pour un produit vendu.",
          path: ["prixVente"],
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

// Inferred types aligned with shared entity types
export type ProductFormData = z.infer<typeof productSchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;

// Re-export shared types for consistency
export type {
  Product,
  CreateProductInput,
  UpdateProductInput,
} from "../types/entities";
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
