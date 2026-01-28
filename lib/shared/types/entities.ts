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

export enum ParcelStatus {
  PENDING = "Pending",
  IN_TRANSIT = "In Transit",
  DELIVERED = "Delivered",
  RETURNED = "Returned",
  LOST = "Lost",
  CANCELLED = "Cancelled",
  CANCELLING = "Cancelling",
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
// Enrichment Types
// ============================================================================

/**
 * Enrichment candidate for conflict resolution
 * When AI can't identify a product with high confidence, multiple candidates are stored
 */
export interface EnrichmentCandidate {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  url?: string;
  confidence: number;
  imageUrl?: string;
  description?: string;
}

export interface MarketStats {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  medianPrice?: number;
  currency: string;
  source: string;
  sampleSize: number;
}

export interface EnrichmentData {
  confidence: number;
  originalUrl?: string;
  source?: string;
  modelUsed?: string;
  enrichedAt?: string;
  enrichmentStatus: 'pending' | 'done' | 'failed' | 'conflict';
  vintedBrandId?: number;
  vintedCatalogId?: number;
  productCode?: string;
  retailPrice?: string;
  color?: string;
  size?: string;
  generatedDescription?: string;
  error?: string;
  // Market statistics
  marketStats?: MarketStats;
  // Conflict resolution fields
  resolvedAt?: string;
  resolvedBy?: 'manual' | 'candidate' | 'skipped';
  selectedCandidateId?: string;
  // Multiple candidates for conflict resolution
  candidates?: EnrichmentCandidate[];
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
  aiConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  userId: string;
  parcelId: string | null;

  // Basic information
  name: string;
  description: string | null;
  poids: number; // Weight in grams

  // Financial information
  price: number; // Purchase price
  currency: string;
  coutLivraison: number | null; // Shipping cost
  sellingPrice: number | null; // Actual selling price
  prixVente: number | null; // Legacy field for compatibility
  benefices: number | null; // Profit/benefits (calculated)

  // Platform and external information
  plateforme: Platform | null;
  externalId: string | null; // Generic external ID
  url: string | null;
  photoUrl: string | null;
  photoUrls: string[] | null; // All QC photos from Superbuy

  // Enrichment data (Gemini/Google Search)
  enrichmentData: EnrichmentData | null;

  // Status and lifecycle
  status: ProductStatus;
  vendu: "0" | "1"; // Legacy compatibility: 0=not sold, 1=sold

  // Additional product details
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  size: string | null;
  color: string | null;

  // Timestamps (unified naming)
  createdAt: string;
  updatedAt: string;
  dateMiseEnLigne: string | null; // Legacy: listing date
  listedAt: string | null; // Modern: listing date
  dateVente: string | null; // Legacy: sold date
  soldAt: string | null; // Modern: sold date

  // Vinted statistics
  vintedStats: {
    viewCount: number;
    favouriteCount: number;
    isReserved: boolean;
    isClosed: boolean;
    interestRate: number;
    serviceFee?: number;
    soldPrice?: number;
    lastSyncAt: string;
  } | null;

  // Source tracking
  sourceOrderId: string | null;
  sourceItemId: string | null;
  sourceUrl: string | null;
}

/**
 * Parcel entity for shipping packages
 */
export interface Parcel {
  id: string;
  userId: string;
  superbuyId: string;
  carrier?: string | null;
  name?: string | null;
  status: string;
  isActive: number;
  totalPrice?: number | null;
  weight?: number | null;
  pricePerGram?: number | null;
  trackingNumber?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Order Item entity
 */
export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  currency: string;
  skuId?: string;
  itemId?: string;
  orderId?: string;
  status?: string;
  snapshotUrl?: string; // Image of the item
  remark?: string;
  url?: string;
  weight?: number;
  itemBarcode?: string;
  goodsCode?: string;
}

/**
 * Order entity for Superbuy orders
 */
export interface Order {
  id: string;
  userId: string;
  orderNumber?: string | null; // Deprecated
  superbuyId: string;
  status: string;
  platform?: string | null;
  trackingNumber?: string | null;
  warehouse?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  items?: OrderItem[] | null;
  createdAt: string;
  updatedAt: string;
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
  rawData?: unknown;
  parsedData?: unknown;
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
  objectives: string[];
  riskTolerance: RiskTolerance;
  preferredInsightTypes: string[];
  customFilters: Record<string, unknown>;
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
  actionData: Record<string, unknown>;
  timestamp: string;
  context?: Record<string, unknown>;
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
  aiConfig?: Record<string, unknown>;
}

export interface CreateOrderInput {
  userId: string;
  superbuyId: string;
  status: string;
  platform?: string | null;
  trackingNumber?: string | null;
  warehouse?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  items?: OrderItem[] | null;
}

export interface UpdateOrderInput extends Partial<Omit<CreateOrderInput, 'userId' | 'orderNumber'>> {
  id?: string;
}

export interface CreateProductInput {
  userId: string;
  parcelId?: string | null;
  name: string;
  description?: string | null;
  poids: number;
  price: number;
  currency: string;
  coutLivraison?: number | null;
  sellingPrice?: number | null;
  prixVente?: number | null;
  plateforme?: Platform | null;
  externalId?: string | null;
  url?: string | null;
  photoUrl?: string | null;
  status: ProductStatus;
  vendu: "0" | "1";
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  size?: string | null;
  color?: string | null;
  dateMiseEnLigne?: string | null;
  listedAt?: string | null;
  dateVente?: string | null;
  soldAt?: string | null;
}

export interface UpdateProductInput extends Partial<Omit<CreateProductInput, 'userId'>> {
  id?: string;
}

export interface CreateParcelInput {
  userId: string;
  superbuyId: string;
  carrier?: string;
  trackingNumber?: string;
  name?: string;
  status?: string;
  isActive?: number;
  totalPrice?: number | null;
  weight?: number | null;
  pricePerGram?: number | null;
}

export interface UpdateParcelInput extends Partial<Omit<CreateParcelInput, 'userId'>> {
  id?: string;
}

// ============================================================================
// Legacy Type Aliases for Backward Compatibility
// ============================================================================

/**
 * @deprecated Use Parcel instead
 */
export type Parcelle = Parcel;

/**
 * @deprecated Use CreateParcelInput instead
 */
export interface CreateParcelleData extends CreateParcelInput { }

/**
 * @deprecated Use UpdateParcelInput instead
 */
export interface UpdateParcelleData extends UpdateParcelInput { }