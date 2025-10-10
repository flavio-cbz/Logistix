/**
 * Shared entity type definitions for database entities
 * This file provides consistent TypeScript interfaces for all database entities
 * used across frontend and backend components.
 */

// ============================================================================
// Base Types and Enums
// ============================================================================

export enum ProductStatus {
  DRAFT = "draft",
  AVAILABLE = "available",
  ONLINE = "online",
  RESERVED = "reserved",
  SOLD = "sold",
  REMOVED = "removed",
  ARCHIVED = "archived",
}

export enum Platform {
  VINTED = "Vinted",
  LEBONCOIN = "leboncoin",
  OTHER = "autre",
}

export enum VintedSessionStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  ERROR = "error",
  REQUIRES_CONFIGURATION = "requires_configuration",
}

export enum MarketAnalysisStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum RiskTolerance {
  CONSERVATIVE = "conservative",
  MODERATE = "moderate",
  AGGRESSIVE = "aggressive",
}

export enum UserActionType {
  VIEW_INSIGHT = "view_insight",
  FOLLOW_RECOMMENDATION = "follow_recommendation",
  IGNORE_RECOMMENDATION = "ignore_recommendation",
  EXPORT_ANALYSIS = "export_analysis",
  SAVE_ANALYSIS = "save_analysis",
  SHARE_ANALYSIS = "share_analysis",
  FEEDBACK = "feedback",
}

// ============================================================================
// Core Entity Interfaces
// ============================================================================

/**
 * User entity representing system users
 */
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  encryptionSecret?: string;
  email?: string;
  bio?: string;
  avatar?: string;
  language?: string;
  theme?: string;
  aiConfig?: any;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Product entity with comprehensive product information
 * Unified interface combining both schema definitions
 */
export interface Product {
  id: string;
  userId: string;
  parcelleId?: string | null;

  // Basic information
  name: string;
  poids: number; // Weight in grams

  // Financial information
  price: number;
  currency: string;
  coutLivraison?: number | null; // Shipping cost
  benefices?: number | null; // Profit/benefits

  // Vinted/Order information
  vintedItemId?: string | null;

  // Sale status (legacy compatibility)
  vendu: "0" | "1" | "2" | "3"; // 0=not sold, 1=sold, 2=reserved, 3=removed
  dateMiseEnLigne?: string | null;
  dateVente?: string | null;
  prixVente?: number | null;
  plateforme?: Platform | null;

  // Modern status system
  status: ProductStatus;

  // Additional product details
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  size?: string | null;
  color?: string | null;
  url?: string | null;
  photoUrl?: string | null;

  // Timestamps
  createdAt: string;
  updatedAt?: string | null;
  soldAt?: string | null;
}

/**
 * Parcelle (Parcel) entity for shipping packages
 */
export interface Parcelle {
  id: string;
  userId: string;
  numero: string;
  transporteur: string;
  nom: string;
  statut: string;
  actif: boolean;
  prixAchat?: number | null;
  poids: number | null;
  prixTotal: number | null;
  prixParGramme: number | null;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Market Analysis entity for Vinted market analysis
 */
export interface MarketAnalysis {
  id: string;
  userId: string;
  productName: string;
  catalogId?: number;
  categoryName?: string;
  brandId?: number;
  status: MarketAnalysisStatus;
  input?: any;
  result?: any;
  rawData?: any;
  error?: string;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
}

/**
 * Historical Price entity for price tracking
 */
export interface HistoricalPrice {
  id: string;
  productName: string;
  date: string;
  price: number;
  salesVolume: number;
  createdAt: string;
}

/**
 * Similar Sales entity for caching similar sales data
 */
export interface SimilarSales {
  id: string;
  queryHash: string;
  rawData?: any;
  parsedData?: any;
  expiresAt: string;
  createdAt: string;
}

/**
 * User Query History entity
 */
export interface UserQueryHistory {
  id: string;
  userId: string;
  query: string;
  parsedBrandId?: string;
  parsedCatalogId?: string;
  parsedColorId?: string;
  parsedSizeId?: string;
  parsedMaterialId?: string;
  parsedStatusId?: string;
  createdAt: string;
}

/**
 * Vinted Session entity for managing Vinted authentication
 */
export interface VintedSession {
  id: string;
  userId: string;
  sessionCookie?: string;
  encryptedDek?: string;
  encryptionMetadata?: any;
  sessionExpiresAt?: string;
  tokenExpiresAt?: string;
  status: VintedSessionStatus;
  lastValidatedAt?: string;
  lastRefreshedAt?: string;
  lastRefreshAttemptAt?: string;
  refreshAttemptCount?: number;
  refreshErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Preferences entity for AI personalization
 */
export interface UserPreferences {
  id: string;
  userId: string;
  objectives: any;
  riskTolerance: RiskTolerance;
  preferredInsightTypes: any;
  notificationSettings: any;
  customFilters: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * User Actions entity for AI learning
 */
export interface UserAction {
  id: string;
  userId: string;
  actionType: UserActionType;
  actionData: any;
  timestamp: string;
  context?: any;
  createdAt: string;
}

/**
 * Tracked Products entity for product monitoring
 */
export interface TrackedProduct {
  id: string;
  userId: string;
  productName: string;
  externalProductId?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Market Trends entity for trend snapshots
 */
export interface MarketTrend {
  id: string;
  trackedProductId: string;
  analysisId?: string;
  snapshotDate: string;
  avgPrice?: number;
  salesVolume?: number;
  createdAt: string;
}

/**
 * App Secrets entity for key management
 */
export interface AppSecret {
  id: string;
  name: string;
  value: string;
  isActive: number;
  createdAt: string;
  updatedAt?: string;
  revokedAt?: string;
}

// ============================================================================
// Input/Output Types for CRUD Operations
// ============================================================================

/**
 * Input types for creating new entities
 */
export interface CreateUserInput {
  username: string;
  passwordHash: string;
  encryptionSecret?: string;
  email?: string;
  bio?: string;
  avatar?: string;
  language?: string;
  theme?: string;
  aiConfig?: any;
}

export interface CreateProductInput {
  userId: string;
  parcelleId?: string;
  name: string;
  poids: number;
  price: number;
  currency?: string;
  coutLivraison?: number;
  vintedItemId?: string;
  vendu?: "0" | "1" | "2" | "3";
  dateMiseEnLigne?: string;
  dateVente?: string;
  prixVente?: number;
  plateforme?: Platform;
  status?: ProductStatus;
  brand?: string;
  category?: string;
  subcategory?: string;
  size?: string;
  color?: string;
  url?: string;
  photoUrl?: string;
}

export interface CreateParcelleInput {
  userId: string;
  numero: string;
  transporteur: string;
  nom: string;
  statut: string;
  prixAchat?: number;
  poids: number;
  prixTotal: number;
  prixParGramme: number;
}

/**
 * Input types for updating existing entities
 */
export interface UpdateUserInput {
  username?: string;
  passwordHash?: string;
  encryptionSecret?: string;
  email?: string;
  bio?: string;
  avatar?: string;
  language?: string;
  theme?: string;
  aiConfig?: any;
}

export interface UpdateProductInput {
  parcelleId?: string;
  name?: string;
  poids?: number;
  price?: number;
  currency?: string;
  coutLivraison?: number;
  vintedItemId?: string;
  vendu?: "0" | "1" | "2" | "3";
  dateMiseEnLigne?: string;
  dateVente?: string;
  prixVente?: number;
  plateforme?: Platform;
  status?: ProductStatus;
  brand?: string;
  category?: string;
  subcategory?: string;
  size?: string;
  color?: string;
  url?: string;
  photoUrl?: string;
}

export interface UpdateParcelleInput {
  numero?: string;
  transporteur?: string;
  nom?: string;
  statut?: string;
  prixAchat?: number;
  poids?: number;
  prixTotal?: number;
  prixParGramme?: number;
}

// ============================================================================
// Legacy Type Aliases for Backward Compatibility
// ============================================================================

/**
 * @deprecated Use Product instead
 */
export type Produit = Product;

/**
 * @deprecated Use CreateProductInput instead
 */
export interface CreateParcelleData extends CreateParcelleInput {}

/**
 * @deprecated Use UpdateProductInput instead
 */
export interface UpdateParcelleData extends UpdateParcelleInput {}