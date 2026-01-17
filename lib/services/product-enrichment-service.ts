import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import vintedMappings from "@/lib/data/vinted-mappings.json";

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata extracted from Superbuy product page
 * These fields provide additional context for LLM identification
 */
export interface SuperbuyMetadata {
    /** Original product name/description from seller (goodsName) */
    goodsName?: string;
    /** Product specifications/variant selected (itemRemark) - e.g., "size:M color:black" */
    itemRemark?: string;
    /** Any additional notes from the order */
    notes?: string;
}

/**
 * Enrichment candidate for conflict resolution
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

export interface EnrichmentResult {
    name: string;
    url: string;
    source: string;
    confidence: number;
    // Vinted-compatible fields
    brand?: string;
    vintedBrandId?: number;
    category?: string;
    subcategory?: string;
    vintedCatalogId?: number;
    // Extended product details
    productCode?: string;
    retailPrice?: string;
    color?: string;
    size?: string;
    description?: string;
    enrichmentStatus?: 'pending' | 'done' | 'failed' | 'conflict';
    // Multiple candidates for conflict resolution (when confidence is low)
    candidates?: EnrichmentCandidate[];
}

interface GeminiJsonResponse {
    name?: string;
    url?: string;
    source?: string;
    confidence?: number;
    // Vinted-compatible fields
    brand?: string;
    vintedBrandId?: number;
    category?: string;
    subcategory?: string;
    vintedCatalogId?: number;
    // Extended details
    productCode?: string;
    retailPrice?: string;
    color?: string;
    size?: string;
    description?: string;
}


interface GoogleModel {
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

// ============================================================================
// Configuration
// ============================================================================

import { logger } from "@/lib/utils/logging/logger";



const DEFAULT_MODELS = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
];

const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
};

// Maximum images to send to Gemini (to avoid token limits)
const MAX_IMAGES = 4;

// ============================================================================
// Helper Functions
// ============================================================================



/**
 * Extracts JSON from a text response that may contain markdown or other formatting.
 * Tries multiple strategies to find valid JSON.
 */
function extractJsonFromText(text: string): GeminiJsonResponse | null {
    if (!text || text.trim().length === 0) {
        return null;
    }

    const cleanText = text.trim();

    // Strategy 1: Try parsing the whole text as JSON
    try {
        return JSON.parse(cleanText);
    } catch {
        // Continue to other strategies
    }

    // Strategy 2: Extract JSON from markdown code blocks
    const codeBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        try {
            return JSON.parse(codeBlockMatch[1].trim());
        } catch {
            // Continue
        }
    }

    // Strategy 3: Find first { and last } and extract
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
            return JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));
        } catch {
            // Continue
        }
    }

    // Strategy 4: Regex extraction for individual fields
    const nameMatch = text.match(/"name"\s*:\s*"([^"]+)"/);
    const urlMatch = text.match(/"url"\s*:\s*"([^"]+)"/);
    const confidenceMatch = text.match(/"confidence"\s*:\s*([0-9.]+)/);
    const sourceMatch = text.match(/"source"\s*:\s*"([^"]+)"/);

    if (nameMatch) {
        return {
            name: nameMatch[1],
            url: urlMatch?.[1] || "",
            source: sourceMatch?.[1] || "Regex Extraction",
            confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
        };
    }

    return null;
}

/**
 * Delay utility for retry logic
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number): number {
    const exponentialDelay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 500;
    return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelayMs);
}

// ============================================================================
// Main Service
// ============================================================================

export class ProductEnrichmentService {
    private genAI: GoogleGenerativeAI | null = null;
    private modelName: string;
    private apiKey: string = "";

    constructor(apiKey: string, modelName: string = "gemini-2.5-flash") {
        this.apiKey = apiKey;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
        this.modelName = modelName;
    }

    /**
     * Returns the name of the model currently in use.
     */
    public get currentModelName(): string {
        return this.modelName;
    }



    /**
     * Lists available Gemini models from the API
     */
    async listModels(): Promise<string[]> {
        if (!this.apiKey) return DEFAULT_MODELS;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`
            );
            if (!response.ok) return DEFAULT_MODELS;

            const data = await response.json();
            if (data.models && Array.isArray(data.models)) {
                const models = data.models
                    .filter(
                        (m: GoogleModel) =>
                            m.name.includes("gemini") &&
                            m.supportedGenerationMethods?.includes("generateContent")
                    )
                    .map((m: GoogleModel) => m.name.replace("models/", ""));

                return models.length > 0 ? models : DEFAULT_MODELS;
            }
            return DEFAULT_MODELS;
        } catch (error) {
            logger.error("[ProductEnrichment] Failed to list models:", { error });
            return DEFAULT_MODELS;
        }
    }

    /**
     * Builds an optimized prompt for IMAGE-BASED product identification
     * Includes Vinted-specific field requirements for brand_id and catalog_id
     * @param fallbackName - Generic name/code from Superbuy
     * @param imageCount - Number of images being analyzed
     * @param superbuyMetadata - Optional metadata from Superbuy order (description, specs)
     */
    private buildPrompt(fallbackName: string, imageCount: number, superbuyMetadata?: SuperbuyMetadata): string {
        // Build the context section with Superbuy metadata if available
        let contextSection = `CONTEXTE:
- ${imageCount} photo(s) QC (Quality Check) d'un produit acheté via un agent chinois (Superbuy)
- Ces photos montrent le produit réel reçu à l'entrepôt
- Le code barcode/référence Superbuy: "${fallbackName}"`;

        // Add Superbuy metadata as helpful hints (not authoritative, but useful for context)
        if (superbuyMetadata) {
            if (superbuyMetadata.goodsName) {
                contextSection += `\n- Description vendeur (indice): "${superbuyMetadata.goodsName}"`;
            }
            if (superbuyMetadata.itemRemark) {
                contextSection += `\n- Spécifications commandées (indice): "${superbuyMetadata.itemRemark}"`;
            }
            if (superbuyMetadata.notes) {
                contextSection += `\n- Notes additionnelles: "${superbuyMetadata.notes}"`;
            }
        }

        // Generate brand mapping string from JSON
        const brandsList = Object.entries(vintedMappings.brands)
            .map(([name, id]) => `${name}=${id}`)
            .join(', ');

        // Generate category mapping string from JSON
        const categoriesList = Object.entries(vintedMappings.categories)
            .map(([name, id]) => `${name}=${id}`)
            .join(', ');

        return `Tu es un expert en identification de produits de mode et streetwear pour la revente sur VINTED.

${contextSection}

IMPORTANT: Les descriptions vendeur peuvent contenir des indices utiles (marque, modèle, taille) mais peuvent aussi être incorrectes ou génériques. Utilise-les comme INDICE, mais base ton identification principalement sur les images.

MISSION EN 2 ÉTAPES:

1. IDENTIFICATION DU PRODUIT:
   - Analyse les images pour identifier la marque, le modèle et le type de produit
   - Utilise les indices textuels (description vendeur) si disponibles

2. SÉLECTION DES IDS VINTED:
   - Utilise les tables de référence ci-dessous pour trouver le brand_id et catalog_id
   - Si la marque exacte n'est pas dans la table, cherche une variante proche ou mets 0
   - Si la catégorie exacte n'est pas dans la table, choisis la plus proche

TABLE DE RÉFÉRENCE - MARQUES VINTED (brand → vintedBrandId):
${brandsList}

TABLE DE RÉFÉRENCE - CATÉGORIES VINTED (category → vintedCatalogId):
${categoriesList}

RÉPONSE OBLIGATOIRE (JSON strict, sans markdown ni backticks):
{
  "name": "Marque + Modèle + Colorway",
  "brand": "Nom exact de la marque",
  "vintedBrandId": <ID depuis la table ci-dessus, 0 si absent>,
  "category": "Catégorie du produit",
  "subcategory": "Sous-catégorie si applicable",
  "vintedCatalogId": <ID depuis la table ci-dessus, 0 si absent>,
  "url": "URL vers le produit authentique",
  "source": "Comment tu as identifié le produit",
  "confidence": <0.0 à 1.0>,
  "productCode": "SKU ou code produit si trouvé",
  "retailPrice": "Prix retail estimé",
  "color": "Couleur principale",
  "size": "Taille si visible dans les images",
  "description": "Description vendeuse pour Vinted (2-3 phrases)"
}

RÈGLES STRICTES:
- Les IDs DOIVENT provenir des tables de référence ci-dessus
- Si la marque n'est pas dans la table, mets vintedBrandId: 0
- Si la catégorie n'est pas dans la table, mets vintedCatalogId: 0
- Base-toi PRINCIPALEMENT sur ce que tu VOIS dans les images
- Réponds UNIQUEMENT avec le JSON, rien d'autre`;
    }


    /**
     * Fetches an image from URL (or local path) and converts to base64 for Gemini.
     * Supports local paths like /uploads/products/... by reading from public folder.
     */
    private async fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
        try {
            // Handle local paths (e.g., /uploads/products/userId/file.webp)
            if (imageUrl.startsWith('/uploads/')) {
                const fs = await import('fs');
                const path = await import('path');
                const localPath = path.join(process.cwd(), 'public', imageUrl);

                if (!fs.existsSync(localPath)) {
                    logger.warn("[ProductEnrichment] Local file not found:", { localPath });
                    return null;
                }

                const buffer = fs.readFileSync(localPath);
                const base64 = buffer.toString("base64");

                // Detect mime type from extension
                const ext = path.extname(localPath).toLowerCase();
                const mimeTypes: Record<string, string> = {
                    '.webp': 'image/webp',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                };
                const mimeType = mimeTypes[ext] || 'image/webp';

                return { data: base64, mimeType };
            }

            // Handle remote URLs
            const response = await fetch(imageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!response.ok) return null;

            const contentType = response.headers.get("content-type") || "image/jpeg";
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");

            return {
                data: base64,
                mimeType: contentType.split(";")[0], // Remove charset if present
            };
        } catch (error) {
            logger.warn("[ProductEnrichment] Failed to fetch image:", { imageUrl, error });
            return null;
        }
    }

    /**
     * Enriches a product using IMAGE-BASED identification
     * @param fallbackName - The generic name to use if images fail
     * @param imageUrls - Array of QC photo URLs to analyze
     * @param superbuyMetadata - Optional metadata from Superbuy (description, specs) for additional context
     */
    async enrichProduct(
        fallbackName: string,
        imageUrls: string[] | string | null,
        superbuyMetadata?: SuperbuyMetadata
    ): Promise<EnrichmentResult> {
        if (!this.genAI) {
            throw new Error("Gemini API Key not configured");
        }

        // Normalize imageUrls to array
        let urls: string[] = [];
        if (Array.isArray(imageUrls)) {
            urls = imageUrls.filter(Boolean);
        } else if (typeof imageUrls === "string" && imageUrls) {
            urls = [imageUrls];
        }

        // If no images, return low confidence with fallback name
        if (urls.length === 0) {
            logger.info("[ProductEnrichment] No images provided, returning fallback");
            return {
                name: fallbackName,
                url: "",
                source: "No Images",
                confidence: 0,
            };
        }

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
            try {
                return await this.executeEnrichment(fallbackName, urls, superbuyMetadata);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Check if it's a retryable error (429, 503, 500)
                const isRetryable =
                    lastError.message.includes("429") ||
                    lastError.message.includes("503") ||
                    lastError.message.includes("500") ||
                    lastError.message.includes("quota");

                if (!isRetryable || attempt === RETRY_CONFIG.maxRetries - 1) {
                    break;
                }

                const delayMs = getBackoffDelay(attempt);
                logger.info(`[ProductEnrichment] Retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms`);
                await delay(delayMs);
            }
        }

        // All retries failed
        logger.error("[ProductEnrichment] Enrichment failed after retries:", { error: lastError });
        throw lastError || new Error("Enrichment failed");
    }

    /**
     * Internal method that performs a single enrichment attempt with images
     */
    private async executeEnrichment(
        fallbackName: string,
        imageUrls: string[],
        superbuyMetadata?: SuperbuyMetadata
    ): Promise<EnrichmentResult> {
        const model = this.genAI!.getGenerativeModel({
            model: this.modelName,
            tools: [{ googleSearch: {} } as unknown as import("@google/generative-ai").Tool],
        });

        const parts: Part[] = [];

        // Fetch and add images (limit to MAX_IMAGES)
        const urlsToFetch = imageUrls.slice(0, MAX_IMAGES);
        let successfulImages = 0;

        logger.info(`[ProductEnrichment] Fetching ${urlsToFetch.length} images...`);

        for (const url of urlsToFetch) {
            const imageData = await this.fetchImageAsBase64(url);
            if (imageData) {
                parts.push({
                    inlineData: {
                        data: imageData.data,
                        mimeType: imageData.mimeType,
                    },
                });
                successfulImages++;
            }
        }

        logger.info(`[ProductEnrichment] Successfully loaded ${successfulImages}/${urlsToFetch.length} images`);

        // If no images could be loaded, return low confidence
        if (successfulImages === 0) {
            return {
                name: fallbackName,
                url: "",
                source: "Image Load Failed",
                confidence: 0,
            };
        }

        // Add text prompt AFTER images (include Superbuy metadata if available)
        parts.push({ text: this.buildPrompt(fallbackName, successfulImages, superbuyMetadata) });

        const contents: Content[] = [{ role: "user", parts }];

        logger.info("[ProductEnrichment] Sending request to Gemini with", { imageCount: successfulImages });
        const result = await model.generateContent({ contents });
        const response = result.response;
        const text = response.text();

        logger.debug("[ProductEnrichment] Raw response:", { responseSample: text.substring(0, 300) });

        // Parse response
        const json = extractJsonFromText(text);

        if (json && json.name) {
            return {
                name: json.name,
                url: json.url || "",
                source: json.source || "Image Analysis",
                confidence: typeof json.confidence === "number" ? json.confidence : 0.5,
                // Vinted-compatible fields
                brand: json.brand || "",
                vintedBrandId: typeof json.vintedBrandId === "number" ? json.vintedBrandId : 0,
                category: json.category || "",
                subcategory: json.subcategory || "",
                vintedCatalogId: typeof json.vintedCatalogId === "number" ? json.vintedCatalogId : 0,
                // Extended product details
                productCode: json.productCode || "",
                retailPrice: json.retailPrice || "",
                color: json.color || "",
                size: json.size || "",
                description: json.description || "",
                enrichmentStatus: 'done' as const,
            };
        }

        // Fallback if parsing failed completely
        logger.warn("[ProductEnrichment] JSON parsing failed, returning fallback");
        return {
            name: fallbackName,
            url: "",
            source: "Parsing Failed",
            confidence: 0,
        };
    }
}
