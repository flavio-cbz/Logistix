<<<<<<< HEAD
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import { logger } from "@/lib/utils/logging/logger";
import {
    EnrichmentResult,
    SuperbuyMetadata,
    RETRY_CONFIG,
    DEFAULT_MODELS,
    MAX_IMAGES,
    GoogleModel
} from "./enrichment/types";

export type { EnrichmentResult, SuperbuyMetadata };
import {
    extractJsonFromText,
    extractRetryDelay,
    getBackoffDelay,
    delay,
    fetchImageAsBase64
} from "./enrichment/utils";
import { buildPrompt } from "./enrichment/prompt-builder";

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
                const errorMessage = lastError.message;

                // Check if it's a retryable error (429, 503, 500)
                const isRetryable =
                    errorMessage.includes("429") ||
                    errorMessage.includes("503") ||
                    errorMessage.includes("500") ||
                    errorMessage.includes("quota") ||
                    errorMessage.includes("Too Many Requests");

                if (!isRetryable || attempt === RETRY_CONFIG.maxRetries - 1) {
                    break;
                }

                // Check for explicit retry delay in error message
                const explicitDelay = extractRetryDelay(errorMessage);
                let delayMs = 0;

                if (explicitDelay) {
                    // Add a small buffer (e.g. 1s) to be safe
                    delayMs = explicitDelay + 1000;
                    logger.info(`[ProductEnrichment] Rate limit hit. Waiting ${delayMs}ms as requested by API.`);
                } else {
                    delayMs = getBackoffDelay(attempt);
                }

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
            const imageData = await fetchImageAsBase64(url);
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
        parts.push({ text: buildPrompt(fallbackName, successfulImages, superbuyMetadata) });

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

    /**
     * Generates a seller-friendly description for platforms like Vinted
     * @param product - Product data with name, brand, category, size, color, condition info
     * @param imageUrl - Optional image URL for visual context
     */
    async generateDescription(
        product: {
            name: string;
            brand?: string | null;
            category?: string | null;
            subcategory?: string | null;
            size?: string | null;
            color?: string | null;
            description?: string | null;
        },
        imageUrl?: string | null
    ): Promise<{ description: string; hashtags: string[] }> {
        if (!this.genAI) {
            throw new Error("Gemini API Key not configured");
        }

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
            },
        });

        // Build prompt for description generation
        const productInfo = [
            product.name,
            product.brand && `Marque: ${product.brand}`,
            product.category && `Catégorie: ${product.category}`,
            product.subcategory && `Sous-catégorie: ${product.subcategory}`,
            product.size && `Taille: ${product.size}`,
            product.color && `Couleur: ${product.color}`,
        ].filter(Boolean).join("\n");

        const prompt = `Tu es un expert en rédaction d'annonces pour Vinted et Le Bon Coin.
Génère une description de vente courte et attractive (2-3 phrases maximum) pour ce produit.

Informations produit:
${productInfo}

Instructions:
- Écris en français, ton décontracté mais professionnel
- Mets en avant les points forts (marque, état, qualité)
- Sois concis - max 200 caractères pour la description
- Ajoute 3-5 hashtags pertinents (sans le #)

Réponds UNIQUEMENT au format JSON:
{
  "description": "La description courte et attractive",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}`;

        const parts: Part[] = [{ text: prompt }];

        // Optionally add image for context
        if (imageUrl) {
            try {
                const imageData = await fetchImageAsBase64(imageUrl);
                if (imageData) {
                    parts.unshift({
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageData.data,
                        },
                    });
                }
            } catch (error) {
                logger.debug("[ProductEnrichment] Could not fetch image for description:", { error });
            }
        }

        try {
            const contents: Content[] = [{ role: "user", parts }];
            const result = await model.generateContent({ contents });
            const text = result.response.text();

            logger.debug("[ProductEnrichment] Description response:", { text: text.substring(0, 200) });

            const json = extractJsonFromText(text);
            if (json && json.description) {
                return {
                    description: json.description,
                    hashtags: Array.isArray(json.hashtags) ? json.hashtags : [],
                };
            }

            // Fallback: use the raw text as description
            return {
                description: text.trim().substring(0, 200),
                hashtags: [],
            };
        } catch (error) {
            logger.error("[ProductEnrichment] Failed to generate description:", { error });
            throw new Error("Échec de la génération de description");
        }
    }
}
=======
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import { logger } from "@/lib/utils/logging/logger";
import {
    EnrichmentResult,
    SuperbuyMetadata,
    RETRY_CONFIG,
    DEFAULT_MODELS,
    MAX_IMAGES,
    GoogleModel
} from "./enrichment/types";

export type { EnrichmentResult, SuperbuyMetadata };
import {
    extractJsonFromText,
    extractRetryDelay,
    getBackoffDelay,
    delay,
    fetchImageAsBase64
} from "./enrichment/utils";
import { buildPrompt } from "./enrichment/prompt-builder";

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
                const errorMessage = lastError.message;

                // Check if it's a retryable error (429, 503, 500)
                const isRetryable =
                    errorMessage.includes("429") ||
                    errorMessage.includes("503") ||
                    errorMessage.includes("500") ||
                    errorMessage.includes("quota") ||
                    errorMessage.includes("Too Many Requests");

                if (!isRetryable || attempt === RETRY_CONFIG.maxRetries - 1) {
                    break;
                }

                // Check for explicit retry delay in error message
                const explicitDelay = extractRetryDelay(errorMessage);
                let delayMs = 0;

                if (explicitDelay) {
                    // Add a small buffer (e.g. 1s) to be safe
                    delayMs = explicitDelay + 1000;
                    logger.info(`[ProductEnrichment] Rate limit hit. Waiting ${delayMs}ms as requested by API.`);
                } else {
                    delayMs = getBackoffDelay(attempt);
                }

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
            const imageData = await fetchImageAsBase64(url);
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
        parts.push({ text: buildPrompt(fallbackName, successfulImages, superbuyMetadata) });

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

    /**
     * Generates a seller-friendly description for platforms like Vinted
     * @param product - Product data with name, brand, category, size, color, condition info
     * @param imageUrl - Optional image URL for visual context
     */
    async generateDescription(
        product: {
            name: string;
            brand?: string | null;
            category?: string | null;
            subcategory?: string | null;
            size?: string | null;
            color?: string | null;
            description?: string | null;
        },
        imageUrl?: string | null
    ): Promise<{ description: string; hashtags: string[] }> {
        if (!this.genAI) {
            throw new Error("Gemini API Key not configured");
        }

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
            },
        });

        // Build prompt for description generation
        const productInfo = [
            product.name,
            product.brand && `Marque: ${product.brand}`,
            product.category && `Catégorie: ${product.category}`,
            product.subcategory && `Sous-catégorie: ${product.subcategory}`,
            product.size && `Taille: ${product.size}`,
            product.color && `Couleur: ${product.color}`,
        ].filter(Boolean).join("\n");

        const prompt = `Tu es un expert en rédaction d'annonces pour Vinted et Le Bon Coin.
Génère une description de vente courte et attractive (2-3 phrases maximum) pour ce produit.

Informations produit:
${productInfo}

Instructions:
- Écris en français, ton décontracté mais professionnel
- Mets en avant les points forts (marque, état, qualité)
- Sois concis - max 200 caractères pour la description
- Ajoute 3-5 hashtags pertinents (sans le #)

Réponds UNIQUEMENT au format JSON:
{
  "description": "La description courte et attractive",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}`;

        const parts: Part[] = [{ text: prompt }];

        // Optionally add image for context
        if (imageUrl) {
            try {
                const imageData = await fetchImageAsBase64(imageUrl);
                if (imageData) {
                    parts.unshift({
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageData.data,
                        },
                    });
                }
            } catch (error) {
                logger.debug("[ProductEnrichment] Could not fetch image for description:", { error });
            }
        }

        try {
            const contents: Content[] = [{ role: "user", parts }];
            const result = await model.generateContent({ contents });
            const text = result.response.text();

            logger.debug("[ProductEnrichment] Description response:", { text: text.substring(0, 200) });

            const json = extractJsonFromText(text);
            if (json && json.description) {
                return {
                    description: json.description,
                    hashtags: Array.isArray(json.hashtags) ? json.hashtags : [],
                };
            }

            // Fallback: use the raw text as description
            return {
                description: text.trim().substring(0, 200),
                hashtags: [],
            };
        } catch (error) {
            logger.error("[ProductEnrichment] Failed to generate description:", { error });
            throw new Error("Échec de la génération de description");
        }
    }
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
