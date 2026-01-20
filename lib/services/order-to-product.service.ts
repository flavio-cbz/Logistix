import { BaseService } from "./base-service";
import { databaseService } from "@/lib/database";
import { products, type OrderItem } from "@/lib/database/schema";
import type { Product, NewProduct } from "@/lib/database/schema";

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

            const db = await databaseService.getDb() as any;

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

                    await db.insert(products).values(productData as NewProduct);
                    result.productsCreated++;

                    // TODO: If autoEnrich is enabled, queue enrichment job
                    // This would typically be done via a job queue system

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    result.errors.push(`Item "${item.name}": ${errorMessage}`);
                    this.logger.warn("Failed to create product from order item", { item, error });
                }
            }

            return result;
        }, { userId, orderId });
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
            const db = await databaseService.getDb() as any;

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
