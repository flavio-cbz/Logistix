/**
 * Constants for Superbuy integration
 * Extracted from multiple files to avoid magic numbers
 */

// Status codes used by Superbuy API/Frontend
// Based on reverse engineering of parcels/route.ts
export enum SuperbuyPackageStatus {
    // 2 seems to be the default/pending status
    PENDING = 2,

    // 57 seems to correspond to 'Shipped'
    SHIPPED = 57,

    // 100 seems to correspond to 'Received'
    RECEIVED = 100,
}

// Internal LogistiX Status mapping
// Used when exact Superbuy status is unknown
export const LOGISTIX_STATUS = {
    PENDING: 'En attente',
    UNKNOWN: 'Unknown',
} as const;

// API Error codes
export const SUPERBUY_API_CODES = {
    SESSION_EXPIRED: 10008,
    SUCCESS: 0,
} as const;

// Timeouts in milliseconds
export const SUPERBUY_TIMEOUTS = {
    NAVIGATION: 60000,
    ELEMENT_WAIT_LONG: 15000,
    ELEMENT_WAIT_SHORT: 10000,
    WARMUP: 45000,
    REFRESH_DELAY: 100,
} as const;

// Pagination defaults
export const SUPERBUY_PAGINATION = {
    DEFAULT_PAGE_SIZE: 100,
} as const;
