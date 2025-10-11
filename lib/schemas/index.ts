/**
 * Schémas de validation Zod centralisés pour LogistiX
 * 
 * Ce fichier expose tous les schémas de validation utilisés par les APIs.
 * Organisé par domaine métier pour une maintenance facile.
 */

// =============================================================================
// SCHEMAS DE BASE (RÉUTILISABLES)
// =============================================================================

import { z } from "zod";

// IDs et identifiants
export const idSchema = z.string().uuid("ID invalide");
export const optionalIdSchema = idSchema.optional();

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "La page doit être >= 1").default(1),
  limit: z.coerce.number().int().min(1).max(100, "Limite maximum: 100").default(20),
  sort: z.enum(["asc", "desc"]).optional().default("desc"),
  sortBy: z.string().optional()
});

// Recherche et filtres
export const searchSchema = z.object({
  q: z.string().trim().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  status: z.string().optional()
});

// Dates
export const dateRangeSchemaBase = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export const dateRangeSchema = dateRangeSchemaBase.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: "La date de début doit être antérieure à la date de fin",
    path: ["startDate"]
  }
);

// Métadonnées communes
export const metadataSchema = z.object({
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional()
});

// =============================================================================
// SCHEMAS MÉTIER (DOMAINES)
// =============================================================================

// Re-export des schémas existants
export * from "./product";
export * from "./parcelle";

// Auth & Users
export const loginSchema = z.object({
  username: z.string()
    .min(2, "Le nom d'utilisateur doit faire au moins 2 caractères")
    .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères")
    .regex(/^[a-zA-Z0-9_-]+$/, "Nom d'utilisateur invalide"),
  password: z.string()
    .min(6, "Le mot de passe doit faire au moins 6 caractères")
    .max(100, "Le mot de passe ne peut pas dépasser 100 caractères")
});

export const signupSchema = loginSchema.extend({
  email: z.string().email("Email invalide").optional(),
  bio: z.string().max(500, "La bio ne peut pas dépasser 500 caractères").optional()
});

// Profile
export const updateProfileSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  language: z.enum(["fr", "en"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional()
});

// Settings
export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["fr", "en"]).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    marketing: z.boolean().optional()
  }).optional(),
  privacy: z.object({
    profileVisible: z.boolean().optional(),
    dataCollection: z.boolean().optional()
  }).optional()
});

// Stats & Analytics
export const statsQuerySchema = z.object({
  period: z.enum(["day", "week", "month", "year"]).default("month"),
  category: z.string().optional(),
  userId: idSchema.optional()
}).merge(dateRangeSchemaBase);

// Import/Export
export const importDataSchema = z.object({
  data: z.record(z.array(z.record(z.any()))).refine(
    (data) => Object.keys(data).length > 0, 
    { message: "Au moins une table de données est requise" }
  ),
  options: z.object({
    overwrite: z.boolean().default(false),
    validateOnly: z.boolean().default(false), 
    skipDuplicates: z.boolean().default(true),
    tablesToImport: z.array(z.string()).default([]),
    batchSize: z.number().min(1).max(1000).default(100)
  }).optional().default({})
});

export const exportDataQuerySchema = z.object({
  format: z.enum(["json", "csv", "xlsx"]),
  tables: z.string().optional().transform((val) => {
    if (!val) return ["produits", "parcelles"];
    return val.split(",").filter(table => ["produits", "parcelles", "notifications", "users"].includes(table));
  }),
  metadata: z.string().optional().transform((val) => val === "true"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  includeDeleted: z.string().optional().transform((val) => val === "true"),
  compress: z.string().optional().transform((val) => val === "true")
});

// Market Analysis
export const marketAnalysisQuerySchema = z.object({
  platform: z.enum(["vinted", "leboncoin", "facebook", "all"]).default("all"),
  category: z.string().optional(),
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional()
  }).optional()
}).merge(dateRangeSchemaBase);

// Vinted Integration
export const vintedSearchSchema = z.object({
  query: z.string().min(2, "La recherche doit contenir au moins 2 caractères"),
  category: z.string().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  condition: z.enum(['neuf', 'tres_bon', 'bon', 'correct']).optional(),
  location: z.string().optional(),
  limit: z.number().min(1).max(100).default(20)
});

export const advancedSearchSchema = z.object({
  query: z.string().min(2, "La requête doit contenir au moins 2 caractères").max(200, "Requête trop longue"),
  filters: z.object({
    category: z.string().optional(),
    brand: z.string().optional(),
    priceMin: z.number().min(0).optional(),
    priceMax: z.number().min(0).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.enum(['active', 'sold', 'reserved', 'archived']).optional(),
    tags: z.array(z.string()).optional()
  }).optional().default({}),
  sortBy: z.enum(['relevance', 'createdAt', 'updatedAt', 'price', 'name']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  searchTypes: z.array(z.enum(['produits', 'parcelles', 'analyses', 'notifications'])).min(1).default(['produits', 'parcelles']),
  includeArchived: z.boolean().default(false),
  fuzzySearch: z.boolean().default(true)
});

// =============================================================================
// QUERY PARAMETER SCHEMAS
// =============================================================================

export const productsQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? Math.max(1, parseInt(val)) : 1),
  pageSize: z.string().optional().transform((val) => val ? Math.min(100, Math.max(1, parseInt(val))) : 10),
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  status: z.enum(['active', 'sold', 'reserved', 'archived']).optional(),
  minPrice: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  maxPrice: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  sortBy: z.enum(['createdAt', 'updatedAt', 'price', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export const parcellesQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? Math.max(1, parseInt(val)) : 1),
  pageSize: z.string().optional().transform((val) => val ? Math.min(100, Math.max(1, parseInt(val))) : 10),
  search: z.string().optional(),
  status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']).optional(),
  transporteur: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dateEnvoi', 'numero']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Helper pour valider les query params avec transformation automatique
 */
export function createQueryValidator<T extends z.ZodSchema>(schema: T) {
  return (searchParams: URLSearchParams) => {
    const params = Object.fromEntries(searchParams.entries());
    return schema.safeParse(params);
  };
}

/**
 * Helper pour valider les body JSON
 */
export function createBodyValidator<T extends z.ZodSchema>(schema: T) {
  return async (request: Request) => {
    try {
      const body = await request.json();
      return schema.safeParse(body);
    } catch (error) {
      return { success: false, error: { message: "JSON invalide" } } as const;
    }
  };
}

/**
 * Helper pour valider les path params
 */
export function createParamsValidator<T extends z.ZodSchema>(schema: T) {
  return (params: Record<string, string>) => {
    return schema.safeParse(params);
  };
}

// =============================================================================
// SCHEMAS MARKET ANALYSIS
// =============================================================================

// Énumérations pour Market Analysis
const marketConditionEnum = z.enum([
  "new", "like_new", "very_good", "good", "satisfactory"
], { message: "Condition produit invalide" });

const marketCategoryEnum = z.enum([
  "fashion", "electronics", "home", "books", "toys", 
  "sports", "beauty", "automotive", "other"
], { message: "Catégorie invalide" });

const predictionTimeframeEnum = z.enum([
  "week", "month", "quarter", "year"
], { message: "Période de prédiction invalide" });

// Schéma pour les paramètres d'analyse de marché
export const marketAnalysisParamsSchema = z.object({
  id: idSchema
});

// Schéma pour la comparaison d'analyses de marché
export const marketAnalysisCompareSchema = z.object({
  analysisIds: z.array(idSchema)
    .min(2, "Au moins 2 analyses sont requises pour la comparaison")
    .max(10, "Maximum 10 analyses peuvent être comparées"),
  includeDetails: z.boolean().optional().default(false),
  comparisonType: z.enum(["basic", "detailed", "trends"]).optional().default("basic")
});

// Schéma pour la prédiction de prix
export const marketPredictionSchema = z.object({
  productName: z.string()
    .trim()
    .min(2, "Le nom du produit doit contenir au moins 2 caractères")
    .max(200, "Nom du produit trop long"),
  category: marketCategoryEnum,
  condition: marketConditionEnum.optional().default("good"),
  brand: z.string()
    .trim()
    .max(100, "Nom de marque trop long")
    .optional(),
  size: z.string()
    .trim()
    .max(50, "Taille trop longue")
    .optional(),
  color: z.string()
    .trim()
    .max(50, "Couleur trop longue")
    .optional(),
  description: z.string()
    .trim()
    .max(1000, "Description trop longue")
    .optional(),
  timeframe: predictionTimeframeEnum.optional().default("month"),
  confidence: z.number()
    .min(0.1, "Seuil de confiance minimum: 10%")
    .max(1.0, "Seuil de confiance maximum: 100%")
    .optional()
    .default(0.8)
});

// Schéma pour les tendances d'une analyse
export const marketTrendsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).optional().default("30d"),
  metric: z.enum(["price", "demand", "competition", "all"]).optional().default("all"),
  format: z.enum(["json", "csv"]).optional().default("json")
});

// Schéma pour le statut des analyses de marché
export const marketStatusQuerySchema = z.object({
  id: idSchema,
  includeStats: z.boolean().optional().default(true),
  includeActive: z.boolean().optional().default(true),
  includePending: z.boolean().optional().default(false),
  includeCompleted: z.boolean().optional().default(true)
});

// =============================================================================
// STATISTICS SCHEMAS
// =============================================================================

// Schéma pour les requêtes du dashboard statistique
export const statisticsDashboardQuerySchema = z.object({
  period: z.enum(["today", "week", "month", "quarter", "year"]).optional().default("month"),
  includeSales: z.boolean().optional().default(true),
  includeProfits: z.boolean().optional().default(true),
  includeProducts: z.boolean().optional().default(true),
  includeParcelles: z.boolean().optional().default(true),
  format: z.enum(["detailed", "summary"]).optional().default("summary"),
  refresh: z.boolean().optional().default(false)
});

// Schéma pour l'export de statistiques
export const statisticsExportQuerySchema = z.object({
  type: z.enum(["sales", "profits", "products", "parcelles", "full"]).default("full"),
  format: z.enum(["csv", "xlsx", "json", "pdf"]).default("xlsx"),
  period: z.enum(["week", "month", "quarter", "year", "all"]).default("month"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  includeCharts: z.boolean().optional().default(false),
  groupBy: z.enum(["day", "week", "month"]).optional().default("day")
}).refine((data) => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo);
  }
  return true;
}, {
  message: "La date de début doit être antérieure à la date de fin",
  path: ["dateFrom"]
});

// Schéma pour la génération de statistiques
export const statisticsGenerateBodySchema = z.object({
  reportType: z.enum(["sales_summary", "profit_analysis", "product_performance", "market_trends", "custom"]),
  parameters: z.object({
    period: z.enum(["week", "month", "quarter", "year"]).optional().default("month"),
    metrics: z.array(z.enum(["sales", "profits", "volume", "growth", "trends"])).min(1, "Au moins une métrique requise"),
    filters: z.object({
      category: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      condition: z.string().optional()
    }).optional(),
    includeForecasts: z.boolean().optional().default(false)
  }),
  outputFormat: z.enum(["json", "report"]).optional().default("json"),
  priority: z.enum(["low", "normal", "high"]).optional().default("normal")
});

// =============================================================================
// NOTIFICATIONS SCHEMAS (Complémentaires)
// =============================================================================

// Schéma pour les paramètres de notification (par ID)
export const notificationParamsSchema = z.object({
  id: idSchema
});

// Schéma pour marquer les notifications comme lues
export const notificationsReadBodySchema = z.object({
  notificationIds: z.array(idSchema)
    .min(1, "Au moins une notification requise")
    .max(50, "Maximum 50 notifications à la fois"),
  markAllRead: z.boolean().optional().default(false),
  userId: z.string().optional() // pour les admins
});

// =============================================================================
// PRODUCTS & PARCELLES SCHEMAS (Relations)
// =============================================================================

// Schéma pour les statistiques de produits
export const productsStatsQuerySchema = z.object({
  category: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(["day", "week", "month"]).optional().default("month"),
  includeDeleted: z.boolean().optional().default(false)
});

// Schéma pour les ventes d'un produit
export const productSalesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

// Schéma pour les statistiques de parcelles
export const parcellesStatsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(["day", "week", "month"]).optional().default("month"),
  includeEmpty: z.boolean().optional().default(false)
});

// Schéma pour les produits d'une parcelle
export const parcelleProductsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  includeDetails: z.boolean().optional().default(true)
});

// =============================================================================
// SYSTEM & ADMIN SCHEMAS
// =============================================================================

// Schéma pour le cache clear
export const clearCacheQuerySchema = z.object({
  type: z.enum(["all", "vinted", "categories", "products", "parcelles"]).optional().default("all"),
  force: z.boolean().optional().default(false)
});

// Schéma pour le profil utilisateur
export const profileUpdateBodySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().optional(),
  preferences: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional()
});

// Schéma pour les settings
export const settingsUpdateBodySchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["fr", "en"]).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    desktop: z.boolean().optional()
  }).optional(),
  privacy: z.object({
    publicProfile: z.boolean().optional(),
    showActivity: z.boolean().optional()
  }).optional()
});

// =============================================================================
// VINTED & EXTERNAL APIS SCHEMAS
// =============================================================================

// Schéma pour les catégories Vinted
export const vintedCategoriesQuerySchema = z.object({
  refresh: z.boolean().optional().default(false),
  parentId: z.string().optional(),
  depth: z.coerce.number().min(1).max(5).optional().default(3)
});

// =============================================================================
// HEALTH & MONITORING SCHEMAS
// =============================================================================

// Schéma simple pour les health checks (pas de paramètres complexes)
export const healthCheckQuerySchema = z.object({
  detailed: z.boolean().optional().default(false),
  includeMetrics: z.boolean().optional().default(true)
});

// =============================================================================
// SCHEMAS STATISTICS & REPORTING
// =============================================================================

// Schéma pour l'export des statistiques
export const statisticsExportsQuerySchema = z.object({
  format: z.enum(["json", "csv", "xlsx"]).optional().default("json"),
  period: z.enum(["all", "month", "quarter", "year"]).optional().default("all"),
  charts: z.string().optional().transform((val) => val === "true"),
  includeMetadata: z.string().optional().transform((val) => val === "true"),
  compression: z.string().optional().transform((val) => val === "true")
});

// Schéma doublon supprimé - utiliser la version dans la section STATISTICS SCHEMAS