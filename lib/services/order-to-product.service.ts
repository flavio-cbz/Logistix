import { BaseService } from "./base-service";
import { databaseService } from "@/lib/database";
import { products, type OrderItem } from "@/lib/database/schema";
import type { Product, NewProduct } from "@/lib/database/schema";
import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/database/schema";
import { serviceContainer } from "@/lib/services/container";
import { logger } from "@/lib/utils/logging/logger";

interface OrderMatchResult {
    orderId: string;
    orderNumber: string;
    itemsProcessed: number;
    productsCreated: number;
    errors: string[];
}

interface MatchingOptions {
    autoEnrich?: boolean;
    defaultParcelId?: string;
    skipExisting?: boolean;
}

export class OrderToProductService extends BaseService {
    constructor() {
        super("OrderToProductService");
    }

    /**
     * Create products from a single order's items
     */
    async createProductsFromOrder(
        userId: string,
        orderId: string,
        options: MatchingOptions = {}
    ): Promise<OrderMatchResult> {
        return this.executeOperation("createProductsFromOrder", async () => {
            // Get the order
            const order = await databaseService.queryOne<{
                id: string;
                superbuyId: string;
                items: string | null;
                orderNumber: string | null;
            }>(
                `SELECT id, superbuy_id as superbuyId, items, order_number as orderNumber
         FROM orders
         WHERE id = ? AND user_id = ?`,
                [orderId, userId],
                "get-order"
            );

            if (!order) {
                throw this.createNotFoundError("Order", orderId);
            }

            const items: OrderItem[] = order.items ? JSON.parse(order.items) : [];
            const result: OrderMatchResult = {
                orderId: order.id,
                orderNumber: order.orderNumber || order.superbuyId,
                itemsProcessed: 0,
                productsCreated: 0,
                errors: [],
            };

            const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;
            const productsToEnrich: string[] = [];

            for (const item of items) {
                result.itemsProcessed++;

                try {
                    // Check if product already exists for this order item
                    if (options.skipExisting) {
                        const existing = await databaseService.queryOne<{ id: string }>(
                            `SELECT id FROM products
               WHERE user_id = ? AND source_order_id = ? AND source_item_id = ?`,
                            [userId, orderId, item.itemId || item.skuId || ""],
                            "check-existing-product"
                        );
                        if (existing) {
                            continue;
                        }
                    }

                    // Create product from order item
                    const productData: Partial<NewProduct> = {
                        userId,
                        name: item.name || "Produit sans nom",
                        price: item.price || 0,
                        poids: item.weight || 0,
                        photoUrl: item.snapshotUrl || null,
                        description: item.remark || null,
                        sourceUrl: item.url || null,
                        parcelId: options.defaultParcelId || null,
                        status: "draft",
                        vendu: "0",
                        sourceOrderId: orderId,
                        sourceItemId: item.itemId || item.skuId || null,
                    };

                    const insertResult = await db.insert(products).values(productData as NewProduct).returning({ id: products.id });
                    result.productsCreated++;

                    if (options.autoEnrich && insertResult[0]?.id) {
                        productsToEnrich.push(insertResult[0].id);
                    }

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    result.errors.push(`Item "${item.name}": ${errorMessage}`);
                    this.logger.warn("Failed to create product from order item", { item, error });
                }
            }

            // Queue enrichment job if needed
            if (productsToEnrich.length > 0) {
                this.queueEnrichment(userId, productsToEnrich);
            }

            return result;
        }, { userId, orderId });
    }

    /**
     * Queue background enrichment job
     */
    private async queueEnrichment(userId: string, productIds: string[]) {
        try {
            const jobService = serviceContainer.getJobService();
            const job = await jobService.createJob("batch_enrichment", userId, {
                productIds,
                source: "order_matching"
            });

            // Trigger background processing (fire and forget)
            setImmediate(() => this.processEnrichmentJob(job.id, userId, productIds));

            logger.info(`Queued enrichment job ${job.id} for ${productIds.length} products`);
        } catch (error) {
            logger.error("Failed to queue enrichment job", { error });
        }
    }

    /**
     * Process enrichment job in background
     */
    private async processEnrichmentJob(jobId: string, userId: string, productIds: string[]) {
        try {
            // Re-import services to ensure fresh context in background
            const { serviceContainer } = await import("@/lib/services/container");
            const { decryptSecret } = await import("@/lib/utils/crypto");
            const { ProductEnrichmentService } = await import("@/lib/services/product-enrichment-service");

            const jobService = serviceContainer.getJobService();
            const productService = serviceContainer.getProductService();
            const integrationRepo = serviceContainer.getIntegrationRepository();

            await jobService.updateProgress(jobId, 0, "processing");

            // Get credentials
            const cred = await integrationRepo.findByProvider(userId, "gemini");
            const credentials = cred?.credentials as { apiKey?: string; model?: string; enabled?: boolean; confidenceThreshold?: number } | undefined;

            if (!credentials || !credentials.enabled || !credentials.apiKey) {
                await jobService.failJob(jobId, "Gemini enrichment not configured");
                return;
            }

            const apiKey = await decryptSecret(credentials.apiKey, userId);
            const model = credentials.model || "gemini-2.5-flash";
            const enrichmentService = new ProductEnrichmentService(apiKey, model);
            const confidenceThreshold = credentials.confidenceThreshold ?? 0.9;

            let processed = 0;
            const errors: string[] = [];

            for (const productId of productIds) {
                try {
                    const product = await productService.getProduct(productId, userId);
                    if (!product) continue;

                    // Update status to pending
                    await productService.updateProduct(productId, userId, {
                        enrichmentData: {
                            ...(product.enrichmentData || {}),
                            enrichmentStatus: 'pending',
                            enrichedAt: new Date().toISOString()
                        } as NewProduct['enrichmentData']
                    });

                    const photoUrls = (product.photoUrls as string[]) || (product.photoUrl ? [product.photoUrl] : []);

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
                        } as NewProduct['enrichmentData'],
                    });

                } catch (e) {
                    const msg = e instanceof Error ? e.message : "Unknown error";
                    errors.push(`Product ${productId}: ${msg}`);
                    // Mark product as failed
                    await productService.updateProduct(productId, userId, {
                        enrichmentData: {
                            enrichmentStatus: 'failed',
                            error: msg,
                            enrichedAt: new Date().toISOString()
                        } as NewProduct['enrichmentData']
                    }).catch(() => { });
                }

                processed++;
                const progress = Math.round((processed / productIds.length) * 100);
                await jobService.updateProgress(jobId, progress);
            }

            if (errors.length === productIds.length) {
                await jobService.failJob(jobId, "All enrichments failed");
            } else {
                await jobService.completeJob(jobId, { processed, errors });
            }

        } catch (error) {
            logger.error(`Job ${jobId} failed`, { error });
            try {
                const jobService = serviceContainer.getJobService();
                await jobService.failJob(jobId, error instanceof Error ? error.message : "Fatal job error");
            } catch (jobError) {
                // Last resort logging
                logger.error("Failed to update job status", { error: jobError });
            }
        }
    }

    /**
     * Create products from all unprocessed orders
     */
    async createProductsFromAllOrders(
        userId: string,
        options: MatchingOptions = {}
    ): Promise<{
        ordersProcessed: number;
        totalProductsCreated: number;
        results: OrderMatchResult[];
    }> {
        return this.executeOperation("createProductsFromAllOrders", async () => {
            // Get all orders that haven't been fully processed
            const unprocessedOrders = await databaseService.query<{ id: string }>(
                `SELECT o.id
         FROM orders o
         WHERE o.user_id = ?
           AND o.items IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM products p 
             WHERE p.source_order_id = o.id
           )
         ORDER BY o.created_at DESC
         LIMIT 50`,
                [userId],
                "get-unprocessed-orders"
            );

            const results: OrderMatchResult[] = [];
            let totalProductsCreated = 0;

            for (const order of unprocessedOrders) {
                try {
                    const result = await this.createProductsFromOrder(userId, order.id, options);
                    results.push(result);
                    totalProductsCreated += result.productsCreated;
                } catch (error) {
                    this.logger.error("Failed to process order", { orderId: order.id, error });
                }
            }

            return {
                ordersProcessed: unprocessedOrders.length,
                totalProductsCreated,
                results,
            };
        }, { userId });
    }

    /**
     * Get orders that have unmatched items (items not yet converted to products)
     */
    async getUnmatchedOrders(userId: string): Promise<Array<{
        id: string;
        orderNumber: string;
        superbuyId: string;
        totalItems: number;
        matchedItems: number;
        createdAt: string;
    }>> {
        return this.executeOperation("getUnmatchedOrders", async () => {
            return databaseService.query<{
                id: string;
                orderNumber: string;
                superbuyId: string;
                totalItems: number;
                matchedItems: number;
                createdAt: string;
            }>(
                `SELECT 
          o.id,
          COALESCE(o.order_number, '') as orderNumber,
          o.superbuy_id as superbuyId,
          json_array_length(o.items) as totalItems,
          (SELECT COUNT(*) FROM products p WHERE p.source_order_id = o.id) as matchedItems,
          o.created_at as createdAt
         FROM orders o
         WHERE o.user_id = ?
           AND o.items IS NOT NULL
         ORDER BY o.created_at DESC
         LIMIT 50`,
                [userId],
                "get-unmatched-orders"
            );
        }, { userId });
    }

    /**
     * Link an existing product to an order item
     */
    async linkProductToOrderItem(
        userId: string,
        productId: string,
        orderId: string,
        itemId: string
    ): Promise<Product | null> {
        return this.executeOperation("linkProductToOrderItem", async () => {
            const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;

            // Verify product belongs to user
            const product = await databaseService.queryOne<{ id: string; userId: string }>(
                `SELECT id, user_id as userId FROM products WHERE id = ?`,
                [productId],
                "get-product"
            );

            if (!product || product.userId !== userId) {
                throw this.createNotFoundError("Product", productId);
            }

            // Verify order belongs to user
            const order = await databaseService.queryOne<{ id: string }>(
                `SELECT id FROM orders WHERE id = ? AND user_id = ?`,
                [orderId, userId],
                "get-order-for-link"
            );

            if (!order) {
                throw this.createNotFoundError("Order", orderId);
            }

            // Update product with order reference
            const { eq } = await import("drizzle-orm");
            const result = await db
                .update(products)
                .set({
                    sourceOrderId: orderId,
                    sourceItemId: itemId,
                })
                .where(eq(products.id, productId))
                .returning();

            return result[0] || null;
        }, { userId, productId, orderId, itemId });
    }
}

// Export singleton instance
export const orderToProductService = new OrderToProductService();
