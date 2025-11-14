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
  LEBONCOIN = "leboncoin",
  OTHER = "autre",
}

export enum ParcelleStatut {
  EN_ATTENTE = "En attente",
  EN_TRANSIT = "En transit",
  LIVRE = "Livré",
  RETOURNE = "Retourné",
  PERDU = "Perdu",
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
 * Aligned with database schema (lib/database/schema.ts)
 */
export interface Product {
  id: string;
  userId: string;
  parcelleId?: string | null;

  // Basic information
  name: string;
  description?: string | null;
  poids: number; // Weight in grams

  // Financial information
  price: number; // Purchase price
  currency: string;
  coutLivraison?: number | null; // Shipping cost
  sellingPrice?: number | null; // Actual selling price
  prixVente?: number | null; // Legacy field for compatibility
  benefices?: number | null; // Profit/benefits (calculated)

  // Platform and external information
  plateforme?: Platform | null;
  externalId?: string | null; // Generic external ID
  url?: string | null;
  photoUrl?: string | null;

  // Status and lifecycle
  status: ProductStatus;
  vendu: "0" | "1"; // Legacy compatibility: 0=not sold, 1=sold

  // Additional product details
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  size?: string | null;
  color?: string | null;

  // Timestamps (unified naming)
  createdAt: string;
  updatedAt?: string | null;
  dateMiseEnLigne?: string | null; // Legacy: listing date
  listedAt?: string | null; // Modern: listing date
  dateVente?: string | null; // Legacy: sold date
  soldAt?: string | null; // Modern: sold date
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
  statut: ParcelleStatut | string; // Accepte enum ou string pour compatibilité DB
  actif: boolean;
  prixAchat?: number | null;
  poids: number | null;
  prixTotal: number | null;
  prixParGramme: number | null;
  createdAt: string;
  updatedAt?: string;
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
 * User Preferences entity for AI personalization
 */
export interface UserPreferences {
  id: string;
  userId: string;
  objectives: any;
  riskTolerance: RiskTolerance;
  preferredInsightTypes: any;
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
  vendu?: "0" | "1"; // Simplified: 0=not sold, 1=sold
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
  numero_suivi?: string; // Tracking number from carrier (e.g., CJ140286057DE)
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
  vendu?: "0" | "1"; // Simplified: 0=not sold, 1=sold
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