/**
 * Superbuy Integration Types
 *
 * Type definitions for Superbuy API data structures used in sync operations.
 */

// ============================================================================
// Superbuy Parcel Data (from scraping)
// ============================================================================

/**
 * Parcel data structure as received from Superbuy scraping.
 * These fields may vary based on Superbuy API/page structure.
 */
export interface SuperbuyParcelData {
    /** Index signature for compatibility with Record<string, unknown> */
    [key: string]: unknown;
    /** Superbuy package ID (primary identifier) */
    packageId: string;
    /** Alternative ID field */
    id?: string;
    /** Order number from Superbuy */
    packageOrderNo?: string;
    /** Tracking number from carrier */
    trackingNumber?: string;
    /** Carrier name (e.g., "EMS", "DHL") */
    carrier?: string;
    /** Package weight in kg */
    weight?: number | string;
    /** Package status from Superbuy */
    status?: string;
    /** Shipping cost in CNY */
    shippingCost?: number;
    /** Total cost in CNY */
    totalCost?: number;
    /** Creation date */
    createdAt?: string;
    /** Last update date */
    updatedAt?: string;
    /** Products contained in this parcel */
    products?: SuperbuyProductData[];
}

/**
 * Product data structure as received from Superbuy scraping.
 */
export interface SuperbuyProductData {
    /** Superbuy item ID */
    itemId?: string;
    /** Product name */
    name?: string;
    /** Product image URL */
    imageUrl?: string;
    /** Price in CNY */
    price?: number;
    /** Quantity */
    quantity?: number;
    /** Taobao/1688 link */
    sourceUrl?: string;
    /** Shop name */
    shopName?: string;
}

/**
 * Parsed product data from Superbuy parcels (output of parseProductsFromParcels).
 * This is the fully processed structure ready for sync to LogistiX.
 */
export interface ParsedSuperbuyProduct {
    userId: string;
    name: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    photoUrl?: string;
    photoUrls?: string[];
    price: number;
    priceUSD?: number;
    exchangeRateUsed?: number;
    poids: number;
    parcelleId: string;
    status: "draft" | "available" | "reserved" | "sold" | "removed" | "archived";
    externalId?: string;
    url?: string;
    currency: string;
    plateforme: "leboncoin" | "autre";
    createdAt: string;
    updatedAt: string;
    superbuyMetadata?: {
        goodsName?: string;
        itemRemark?: string;
    };
}

/**
 * Parcel status as used in LogistiX database.
 */
export type ParcelStatus =
    | "pending"
    | "processing"
    | "shipped"
    | "in_transit"
    | "delivered"
    | "completed"
    | "cancelled"
    | "returned";

// ============================================================================
// Sync Operation Types
// ============================================================================

/**
 * Options for parcel sync operation.
 */
export interface ParcelSyncOptions {
    /** Skip parcels that already exist in the system */
    skipExisting?: boolean;
    /** Force update even if parcel exists */
    forceUpdate?: boolean;
}

/**
 * Result of a single parcel sync operation.
 */
export interface ParcelSyncResult {
    success: boolean;
    status?: "created" | "updated" | "skipped";
    id?: string;
    error?: string;
}

/**
 * Summary of a batch sync operation.
 */
export interface ParcelSyncSummary {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    totalProcessed: number;
    results: ParcelSyncResult[];
}

// ============================================================================
// Superbuy Credentials
// ============================================================================

/**
 * Superbuy login credentials (used for automation).
 */
export interface SuperbuyCredentials {
    username: string;
    password: string;
}

/**
 * Result of Superbuy sync operation.
 */
export interface SuperbuySyncResult {
    parcelsCount: number;
    ordersCount: number;
}
