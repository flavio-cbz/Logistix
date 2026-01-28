<<<<<<< HEAD
export interface SuperbuyMetadata {
    /** Original product name/description from seller (goodsName) */
    goodsName?: string;
    /** Product specifications/variant selected (itemRemark) - e.g., "size:M color:black" */
    itemRemark?: string;
    /** Any additional notes from the order */
    notes?: string;
}

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

export interface EnrichmentResult {
    name: string;
    url: string;
    source: string;
    confidence: number;
    brand?: string;
    vintedBrandId?: number;
    category?: string;
    subcategory?: string;
    vintedCatalogId?: number;
    productCode?: string;
    retailPrice?: string;
    color?: string;
    size?: string;
    description?: string;
    enrichmentStatus?: 'pending' | 'done' | 'failed' | 'conflict';
    candidates?: EnrichmentCandidate[];
}

export interface GeminiJsonResponse {
    name?: string;
    url?: string;
    source?: string;
    confidence?: number;
    brand?: string;
    vintedBrandId?: number;
    category?: string;
    subcategory?: string;
    vintedCatalogId?: number;
    productCode?: string;
    retailPrice?: string;
    color?: string;
    size?: string;
    description?: string;
    hashtags?: string[];
}

export interface GoogleModel {
    name: string;
    version: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
    temperature?: number;
    topP?: number;
    topK?: number;
}

export const DEFAULT_MODELS = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
];

export const RETRY_CONFIG = {
    maxRetries: 2,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
};

export const MAX_IMAGES = 5;
=======
export interface SuperbuyMetadata {
    /** Original product name/description from seller (goodsName) */
    goodsName?: string;
    /** Product specifications/variant selected (itemRemark) - e.g., "size:M color:black" */
    itemRemark?: string;
    /** Any additional notes from the order */
    notes?: string;
}

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

export interface EnrichmentResult {
    name: string;
    url: string;
    source: string;
    confidence: number;
    brand?: string;
    vintedBrandId?: number;
    category?: string;
    subcategory?: string;
    vintedCatalogId?: number;
    productCode?: string;
    retailPrice?: string;
    color?: string;
    size?: string;
    description?: string;
    enrichmentStatus?: 'pending' | 'done' | 'failed' | 'conflict';
    candidates?: EnrichmentCandidate[];
}

export interface GeminiJsonResponse {
    name?: string;
    url?: string;
    source?: string;
    confidence?: number;
    brand?: string;
    vintedBrandId?: number;
    category?: string;
    subcategory?: string;
    vintedCatalogId?: number;
    productCode?: string;
    retailPrice?: string;
    color?: string;
    size?: string;
    description?: string;
    hashtags?: string[];
}

export interface GoogleModel {
    name: string;
    version: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
    temperature?: number;
    topP?: number;
    topK?: number;
}

export const DEFAULT_MODELS = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
];

export const RETRY_CONFIG = {
    maxRetries: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
};

export const MAX_IMAGES = 4;
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
