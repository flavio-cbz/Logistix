import { NextRequest } from "next/server";
import { z } from "zod";
import { serviceContainer } from "@/lib/services/container";
import {
    createErrorResponse,
    createSuccessResponse,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
import { ProductStatus } from "@/lib/types/entities";
import { EnrichmentData } from "@/lib/shared/types/entities";

// Schema for batch operations
const batchActionSchema = z.object({
    action: z.enum([
        "delete",
        "archive",
        "update_status",
        "assign_parcel",
        "enrich",
        "duplicate"
    ]),
    productIds: z.array(z.string()).min(1),
    data: z.object({
        status: z.nativeEnum(ProductStatus).optional(),
        parcelId: z.string().optional(),
        // Add other data fields as needed
    }).optional(),
});

/**
 * POST /api/v1/produits/batch
 * Execute batch operations on products
 */
export async function POST(request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const body = await request.json();
        const validated = batchActionSchema.parse(body);

        const productService = serviceContainer.getProductService();
        const { action, productIds, data } = validated;

        logger.info(`[BatchAction] executing ${action} on ${productIds.length} products`, {
            userId: user.id,
            action,
            count: productIds.length
        });

        const results = {
            success: [] as string[],
            failed: [] as { id: string; error: string }[],
        };

        // Process actions
        // optimize this loop later with actual batch methods in repository if available
        // for now, concurrent promises are fine for small batches (<50)

        switch (action) {
            case "delete":
                await Promise.all(
                    productIds.map(async (id) => {
                        try {
                            const deleted = await productService.deleteProduct(id, user.id);
                            if (deleted) results.success.push(id);
                            else results.failed.push({ id, error: "Not found or not authorized" });
                        } catch (e) {
                            results.failed.push({ id, error: e instanceof Error ? e.message : "Unknown error" });
                        }
                    })
                );
                break;

            case "update_status":
                if (!data?.status) return createErrorResponse(new Error("Status required for update_status action"));
                await Promise.all(
                    productIds.map(async (id) => {
                        try {
                            await productService.updateProduct(id, user.id, { status: data.status });
                            results.success.push(id);
                        } catch (e) {
                            results.failed.push({ id, error: e instanceof Error ? e.message : "Unknown error" });
                        }
                    })
                );
                break;

            case "archive":
                await Promise.all(
                    productIds.map(async (id) => {
                        try {
                            await productService.updateProduct(id, user.id, { status: ProductStatus.ARCHIVED });
                            results.success.push(id);
                        } catch (e) {
                            results.failed.push({ id, error: e instanceof Error ? e.message : "Unknown error" });
                        }
                    })
                );
                break;

            case "assign_parcel":
                // parcelId can be null/undefined to unassign
                await Promise.all(
                    productIds.map(async (id) => {
                        try {
                            await productService.updateProduct(id, user.id, { parcelId: data?.parcelId ?? null });
                            results.success.push(id);
                        } catch (e) {
                            results.failed.push({ id, error: e instanceof Error ? e.message : "Unknown error" });
                        }
                    })
                );
                break;

            case "enrich":
                // First, mark all products as pending and validate they have photos
                await Promise.all(
                    productIds.map(async (id) => {
                        try {
                            const product = await productService.getProduct(id, user.id);
                            if (!product) {
                                results.failed.push({ id, error: "Produit non trouvé" });
                                return;
                            }

                            const photoUrls = (product.photoUrls as string[]) ||
                                (product.photoUrl ? [product.photoUrl] : []);

                            if (photoUrls.length === 0) {
                                results.failed.push({ id, error: "Aucune photo disponible" });
                                return;
                            }

                            // Mark as pending
                            await productService.updateProduct(id, user.id, {
                                enrichmentData: {
                                    confidence: product.enrichmentData?.confidence ?? 0,
                                    ...(product.enrichmentData || {}),
                                    enrichmentStatus: 'pending',
                                    enrichedAt: new Date().toISOString(),
                                },
                            });

                            results.success.push(id);
                        } catch (e) {
                            results.failed.push({ id, error: e instanceof Error ? e.message : "Erreur" });
                        }
                    })
                );

                // Process enrichment in background (fire and forget) - sequential to avoid API rate limits
                if (results.success.length > 0) {
                    const userId = user.id;
                    const productIdsToEnrich = [...results.success];

                    // Run in background without blocking the response
                    setImmediate(async () => {
                        try {
                            // Dynamically import container to avoid initialization issues in background context
                            const { serviceContainer } = await import("@/lib/services/container");
                            const { decryptSecret } = await import("@/lib/utils/crypto");
                            const { ProductEnrichmentService } = await import("@/lib/services/product-enrichment-service");

                            const integrationRepo = serviceContainer.getIntegrationRepository();
                            const productService = serviceContainer.getProductService();

                            const cred = await integrationRepo.findByProvider(userId, "gemini");

                            const credentials = cred?.credentials as {
                                apiKey?: string;
                                model?: string;
                                enabled?: boolean;
                                confidenceThreshold?: number
                            } | undefined;

                            if (!credentials || !credentials.enabled || !credentials.apiKey) {
                                logger.error("[BatchEnrich] Gemini not configured", { userId });
                                return;
                            }

                            const apiKey = await decryptSecret(credentials.apiKey, userId);
                            const model = credentials.model || "gemini-2.5-flash";
                            const enrichmentService = new ProductEnrichmentService(apiKey, model);
                            const confidenceThreshold = credentials.confidenceThreshold ?? 0.9;

                            // Process sequentially to avoid rate limits
                            for (const productId of productIdsToEnrich) {
                                try {
                                    const product = await productService.getProduct(productId, userId);
                                    if (!product) continue;

                                    const photoUrls = (product.photoUrls as string[]) ||
                                        (product.photoUrl ? [product.photoUrl] : []);

                                    const result = await enrichmentService.enrichProduct(product.name, photoUrls);

                                    const isLowConfidence = result.confidence < confidenceThreshold;
                                    const newName = isLowConfidence ? `"${result.name}"` : result.name;

                                    await productService.updateProduct(productId, userId, {
                                        name: newName,
                                        brand: result.brand || product.brand,
                                        category: result.category || product.category,
                                        subcategory: result.subcategory || product.subcategory,
                                        url: result.url || product.url,
                                        description: result.description || product.description,
                                        enrichmentData: {
                                            confidence: result.confidence,
                                            originalUrl: result.url,
                                            source: result.source,
                                            modelUsed: model,
                                            enrichedAt: new Date().toISOString(),
                                            enrichmentStatus: 'done',
                                            vintedBrandId: result.vintedBrandId,
                                            vintedCatalogId: result.vintedCatalogId,
                                        } as EnrichmentData,
                                    });

                                    logger.info(`[BatchEnrich] Enriched product ${productId}`);
                                } catch (e) {
                                    // Mark as failed
                                    await productService.updateProduct(productId, userId, {
                                        enrichmentData: {
                                            confidence: 0,
                                            enrichmentStatus: 'failed',
                                            enrichedAt: new Date().toISOString(),
                                            error: e instanceof Error ? e.message : 'Erreur',
                                        } as EnrichmentData,
                                    }).catch(() => { });
                                    logger.error(`[BatchEnrich] Failed for ${productId}`, { error: e });
                                }
                            }
                        } catch (e) {
                            logger.error("[BatchEnrich] Background processing failed", { error: e });
                        }
                    });
                }

                break;

            case "duplicate":
                await Promise.all(
                    productIds.map(async (id) => {
                        try {
                            const original = await productService.getProduct(id, user.id);
                            if (!original) throw new Error("Product not found");

                            await productService.createProduct(user.id, {
                                ...original,
                                name: `${original.name} (copie)`,
                                status: ProductStatus.DRAFT,
                                parcelId: original.parcelId, // Keep parcel assignment? maybe configurable
                            });
                            results.success.push(id);
                        } catch (e) {
                            results.failed.push({ id, error: e instanceof Error ? e.message : "Unknown error" });
                        }
                    })
                );
                break;

            default:
                return createErrorResponse(new Error(`Action ${action} not implemented`));
        }

        return createSuccessResponse({
            processed: productIds.length,
            results
        });

    } catch (error: unknown) {
        logger.error("[BatchAction] Error", { error });
        return createErrorResponse(error);
    }
}
