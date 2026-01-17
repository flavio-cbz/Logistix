/**
 * API request and response type definitions
 * This file provides consistent TypeScript interfaces for all API contracts
 * used between frontend and backend components.
 */

import {
  Product,
  Parcelle,
  User,
  CreateProductInput,
  CreateParcelInput,
  UpdateProductInput,
  UpdateParcelInput,
  ProductStatus,
  Platform,
} from "./entities";

// ============================================================================
// Base API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

/**
 * API response metadata
 */
export interface ApiMeta {
  timestamp: string;
  requestId: string;
  version?: string;
  path?: string;
  method?: string;
  userId?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// Authentication API Types
// ============================================================================

/**
 * Login request payload
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Login response data
 */
export interface LoginResponse {
  user: Omit<User, "passwordHash" | "encryptionSecret">;
  token?: string;
  expiresAt?: string;
}

/**
 * Signup request payload
 */
export interface SignupRequest {
  username: string;
  password: string;
  email?: string;
  confirmPassword: string;
}

/**
 * Session validation response
 */
export interface SessionResponse {
  valid: boolean;
  user?: Omit<User, "passwordHash" | "encryptionSecret">;
  expiresAt?: string;
}

// ============================================================================
// Product API Types
// ============================================================================

/**
 * Product list request filters
 */
export interface ProductListRequest {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  parcelleId?: string;
  search?: string;
  sortBy?: "name" | "price" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  vendu?: "0" | "1"; // Simplified: 0=not sold, 1=sold
  plateforme?: Platform;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Product creation request
 */
export interface CreateProductRequest extends CreateProductInput { }

/**
 * Product update request
 */
export interface UpdateProductRequest extends UpdateProductInput { }

/**
 * Product response data
 */
export interface ProductResponse extends Product {
  // Additional computed fields that might be added by the API
  benefices?: number;
  pourcentageBenefice?: number;
  tempsEnLigne?: string;
}

/**
 * Product list response
 */
export interface ProductListResponse
  extends PaginatedResponse<ProductResponse> { }

/**
 * Product statistics response
 */
export interface ProductStatsResponse {
  total: number;
  sold: number;
  available: number;
  reserved: number;
  totalRevenue: number;
  averagePrice: number;
  averageSaleTime: number;
  topPlatforms: Array<{
    platform: Platform;
    count: number;
    revenue: number;
  }>;
}

// ============================================================================
// Parcelle API Types
// ============================================================================

/**
 * Parcelle list request filters
 */
export interface ParcelleListRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "numero" | "transporteur" | "prixTotal" | "createdAt";
  sortOrder?: "asc" | "desc";
  transporteur?: string;
  priceMin?: number;
  priceMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Parcelle creation request
 */
export interface CreateParcelOptions extends CreateParcelInput { }

/**
 * Parcelle update request
 */
export interface UpdateParcelOptions extends UpdateParcelInput { }

/**
 * Parcelle response data with computed fields
 */
export interface ParcelleResponse extends Parcelle {
  productCount?: number;
  totalProductValue?: number;
  soldProductCount?: number;
  soldProductValue?: number;
  profitability?: number;
}

/**
 * Parcelle list response
 */
export interface ParcelleListResponse
  extends PaginatedResponse<ParcelleResponse> { }

/**
 * Parcelle statistics response
 */
export interface ParcelleStatsResponse {
  total: number;
  totalValue: number;
  averageWeight: number;
  averagePricePerGram: number;
  topTransporters: Array<{
    transporteur: string;
    count: number;
    totalValue: number;
  }>;
}


// ============================================================================
// User Profile API Types
// ============================================================================

/**
 * User profile update request
 */
export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  bio?: string;
  avatar?: string;
  language?: string;
  theme?: string;
}

/**
 * Password change request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * User profile response
 */
export interface UserProfileResponse
  extends Omit<User, "passwordHash" | "encryptionSecret"> {
  stats?: {
    totalProducts: number;
    totalParcelles: number;
    totalRevenue: number;
    joinedDaysAgo: number;
  };
}

// ============================================================================
// File Upload API Types
// ============================================================================

/**
 * File upload request
 */
export interface FileUploadRequest {
  file: File | Blob;
  type: "avatar" | "product-image" | "document";
  entityId?: string;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

// ============================================================================
// Search and Filter Types
// ============================================================================

/**
 * Generic search request
 */
export interface SearchRequest {
  query: string;
  type?: "products" | "parcelles" | "all";
  filters?: Record<string, unknown>;
  page?: number;
  limit?: number;
}

/**
 * Search result item
 */
export interface SearchResultItem {
  id: string;
  type: "product" | "parcelle";
  title: string;
  description?: string;
  url: string;
  relevance: number;
  highlights?: string[];
}

/**
 * Search response
 */
export interface SearchResponse extends PaginatedResponse<SearchResultItem> {
  query: string;
  executionTime: number;
  suggestions?: string[];
}

// ============================================================================
// Validation and Error Types
// ============================================================================

/**
 * Field validation error
 */
export interface FieldError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse extends ApiResponse {
  success: false;
  error: ApiError & {
    code: "VALIDATION_ERROR";
    fields: FieldError[];
  };
}

/**
 * Common API error codes
 */
export enum ApiErrorCode {
  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  SESSION_EXPIRED = "SESSION_EXPIRED",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  ALREADY_EXISTS = "ALREADY_EXISTS",
  CONFLICT = "CONFLICT",

  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // File upload errors
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  UPLOAD_FAILED = "UPLOAD_FAILED",
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract request type from API endpoint
 */
export type RequestType<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Extract data type from paginated response
 */
export type PaginatedDataType<T> =
  T extends PaginatedResponse<infer U> ? U : never;

/**
 * Make all properties of an API request optional except specified ones
 */
export type PartialRequest<T, K extends keyof T = never> = Partial<T> &
  Pick<T, K>;

/**
 * API endpoint method types
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * API endpoint configuration
 */
export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  requiresAuth?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
}