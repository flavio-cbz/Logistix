import { z } from "zod";

/**
 * Schémas de validation Zod centralisés pour LogistiX
 *
 * Ce fichier expose tous les schémas de validation utilisés par les APIs.
 * Organisé par domaine métier pour une maintenance facile.
 */

// =============================================================================
// SCHEMAS MÉTIER (DOMAINES)
// =============================================================================

// Re-export des schémas existants
export * from "./product";
export * from "./parcelle";

// Schémas utilisés dans les APIs
export const productsStatsQuerySchema = z.object({
  category: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(["day", "week", "month"]).optional().default("month"),
  includeDeleted: z.boolean().optional().default(false)
});

export const productSalesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

export const parcellesStatsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(["day", "week", "month"]).optional().default("month"),
  includeEmpty: z.boolean().optional().default(false)
});

export const parcelleProductsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  includeDetails: z.boolean().optional().default(true)
});

export const settingsUpdateBodySchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["fr", "en"]).optional(),
  privacy: z.object({
    publicProfile: z.boolean().optional(),
    showActivity: z.boolean().optional()
  }).optional()
});
