import { z } from "zod"

// Enhanced error handling types
export interface ValidationErrorDetail {
  field: string
  message: string
  code: string
}

export interface ApiErrorResponse {
  message: string
  errors?: ValidationErrorDetail[]
  code?: string
  statusCode?: number
}

// Request validation schemas with enhanced error messages
export const SimilarSaleInputSchema = z.object({
  id: z.string()
    .min(1, "L'ID de la vente est requis")
    .max(100, "L'ID de la vente ne peut pas dépasser 100 caractères"),
  price: z.object({
    amount: z.number()
      .positive("Le montant du prix doit être positif")
      .max(1000000, "Le montant du prix ne peut pas dépasser 1 000 000")
      .finite("Le montant du prix doit être un nombre valide"),
    currency: z.string()
      .min(1, "La devise est requise")
      .max(10, "La devise ne peut pas dépasser 10 caractères")
      .regex(/^[A-Z]{3}$/, "La devise doit être un code à 3 lettres (ex: EUR, USD)"),
  }),
  size_title: z.string()
    .min(1, "Le titre de la taille est requis")
    .max(200, "Le titre de la taille ne peut pas dépasser 200 caractères"),
  status: z.string()
    .min(1, "Le statut est requis")
    .max(50, "Le statut ne peut pas dépasser 50 caractères"),
  user: z.object({
    login: z.string()
      .min(1, "Le nom d'utilisateur est requis")
      .max(100, "Le nom d'utilisateur ne peut pas dépasser 100 caractères"),
    feedback_reputation: z.number()
      .min(0, "La réputation doit être non négative")
      .max(100, "La réputation ne peut pas dépasser 100")
      .finite("La réputation doit être un nombre valide"),
  }),
  photos: z.array(z.object({ 
    url: z.string()
      .url("L'URL de la photo doit être valide")
      .max(500, "L'URL de la photo ne peut pas dépasser 500 caractères")
  }))
    .max(20, "Pas plus de 20 photos autorisées"),
  created_at: z.string()
    .min(1, "La date de création est requise")
    .datetime("La date de création doit être au format ISO 8601"),
  sold_at: z.string()
    .min(1, "La date de vente est requise")
    .datetime("La date de vente doit être au format ISO 8601"),
})

export const CreateMarketAnalysisSchema = z.array(SimilarSaleInputSchema)
  .min(1, "Au moins une vente similaire est requise pour l'analyse")
  .max(1000, "Pas plus de 1000 ventes similaires autorisées")

export const PaginationSchema = z.object({
  page: z.number()
    .int("Le numéro de page doit être un entier")
    .min(1, "Le numéro de page doit être au moins 1")
    .max(10000, "Le numéro de page ne peut pas dépasser 10000")
    .default(1),
  limit: z.number()
    .int("La limite doit être un entier")
    .min(1, "La limite doit être au moins 1")
    .max(50, "La limite ne peut pas dépasser 50")
    .default(10),
})

export const TaskIdSchema = z.object({
  id: z.string()
    .uuid("L'ID de la tâche doit être un UUID valide")
    .min(1, "L'ID de la tâche est requis"),
})

// Response validation schemas
export const MarketAnalysisTaskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productName: z.string(),
  status: z.enum(["pending", "completed", "failed"]),
  input: z.array(SimilarSaleInputSchema).optional(),
  result: z.object({
    productName: z.string(),
    priceMetrics: z.object({
      minPrice: z.number(),
      maxPrice: z.number(),
      avgPrice: z.number(),
      medianPrice: z.number(),
    }),
    volumeMetrics: z.object({
      salesVolume: z.number().int(),
      competitorCount: z.number().int(),
    }),
    distributions: z.object({
      sizeDistribution: z.record(z.number().int()),
      statusDistribution: z.record(z.number().int()),
    }),
    sampleItems: z.array(SimilarSaleInputSchema),
  }).optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
})

export const PaginatedResponseSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  tasks: z.array(MarketAnalysisTaskSchema),
})

// Enhanced validation helper functions with better error handling
export function validateCreateMarketAnalysis(data: unknown) {
  try {
    return CreateMarketAnalysisSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: ValidationErrorDetail[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      throw new ValidationError("Données d'analyse de marché invalides", validationErrors)
    }
    throw new ValidationError("Erreur de validation inconnue", [])
  }
}

export function validatePagination(searchParams: URLSearchParams) {
  try {
    const pageParam = searchParams.get("page") || "1"
    const limitParam = searchParams.get("limit") || "10"
    
    const page = parseInt(pageParam, 10)
    const limit = parseInt(limitParam, 10)
    
    // Handle NaN values by using defaults
    const validPage = isNaN(page) ? 1 : page
    const validLimit = isNaN(limit) ? 10 : limit
    
    return PaginationSchema.parse({ page: validPage, limit: validLimit })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: ValidationErrorDetail[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      throw new ValidationError("Paramètres de pagination invalides", validationErrors)
    }
    throw new ValidationError("Erreur de validation de pagination inconnue", [])
  }
}

export function validateTaskId(id: string) {
  try {
    return TaskIdSchema.parse({ id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: ValidationErrorDetail[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
      throw new ValidationError("ID de tâche invalide", validationErrors)
    }
    throw new ValidationError("Erreur de validation d'ID inconnue", [])
  }
}

// Custom error classes for better error handling
export class ValidationError extends Error {
  public errors: ValidationErrorDetail[]
  public code: string

  constructor(message: string, errors: ValidationErrorDetail[] = [], code: string = "VALIDATION_ERROR") {
    super(message)
    this.name = "ValidationError"
    this.errors = errors
    this.code = code
  }
}

export class ApiError extends Error {
  public statusCode: number
  public code: string
  public errors?: ValidationErrorDetail[]

  constructor(message: string, statusCode: number = 500, code: string = "API_ERROR", errors?: ValidationErrorDetail[]) {
    super(message)
    this.name = "ApiError"
    this.statusCode = statusCode
    this.code = code
    this.errors = errors
  }
}

// Error formatting utilities
export function formatValidationErrors(errors: ValidationErrorDetail[]): string {
  if (errors.length === 0) return "Erreur de validation"
  if (errors.length === 1) return errors[0].message
  return `${errors.length} erreurs de validation: ${errors.map(e => e.message).join(', ')}`
}

export function createApiErrorResponse(error: unknown): { message: string; errors?: ValidationErrorDetail[]; code?: string } {
  if (error instanceof ValidationError) {
    return {
      message: error.message,
      errors: error.errors,
      code: error.code
    }
  }
  
  if (error instanceof ApiError) {
    return {
      message: error.message,
      errors: error.errors,
      code: error.code
    }
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      code: "UNKNOWN_ERROR"
    }
  }
  
  return {
    message: "Une erreur inconnue s'est produite",
    code: "UNKNOWN_ERROR"
  }
}