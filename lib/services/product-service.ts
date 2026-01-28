import { BaseService } from "./base-service";
import { ProductRepository } from "@/lib/repositories/product-repository";
import { type Product, type NewProduct } from "@/lib/database/schema";
import { ValidationError } from "@/lib/errors/custom-error";

export type CreateProductParams = Omit<NewProduct, "id" | "userId" | "createdAt" | "updatedAt">;

export class ProductService extends BaseService {
    constructor(private readonly productRepository: ProductRepository) {
        super("ProductService");
    }

    async createProduct(userId: string, data: CreateProductParams): Promise<Product> {
        return this.executeOperation("createProduct", async () => {
            // Basic validation
            if (!data.name) {
                throw new ValidationError("Le nom du produit est requis", "name");
            }
            if (data.price === undefined || data.price < 0) {
                throw new ValidationError("Le prix doit être positif", "price");
            }

            return this.productRepository.create({
                ...data,
                userId,
            });
        }, { userId, productName: data.name });
    }

    async updateProduct(id: string, userId: string, data: Partial<NewProduct>): Promise<Product | null> {
        return this.executeOperation("updateProduct", async () => {
            const existing = await this.productRepository.findById(id);
            if (!existing) {
                throw this.createNotFoundError("Product", id);
            }
            if (existing.userId !== userId) {
                throw this.createAuthorizationError("Not authorized to update this product");
            }

            return this.productRepository.update(id, data);
        }, { id, userId });
    }

    async deleteProduct(id: string, userId: string): Promise<boolean> {
        return this.executeOperation("deleteProduct", async () => {
            const existing = await this.productRepository.findById(id);
            if (!existing) {
                throw this.createNotFoundError("Product", id);
            }
            if (existing.userId !== userId) {
                throw this.createAuthorizationError("Not authorized to delete this product");
            }

            return this.productRepository.delete(id);
        }, { id, userId });
    }

    async getProduct(id: string, userId: string): Promise<Product | null> {
        return this.executeOperation("getProduct", async () => {
            const product = await this.productRepository.findById(id);
            if (product && product.userId !== userId) {
                throw this.createAuthorizationError("Not authorized to view this product");
            }
            return product;
        }, { id, userId });
    }

    async getUserProducts(
        userId: string,
<<<<<<< HEAD
        options?: {
            page?: number;
            limit?: number;
            search?: string;
            status?: string;
            enrichmentStatus?: string;
            parcelId?: string;
            brand?: string;
            category?: string;
        }
    ): Promise<Product[] | { data: Product[]; total: number; page: number; limit: number }> {
        return this.executeOperation("getUserProducts", async () => {
            // If any filtering or pagination is requested, use findWithPagination
            const hasFilters = options?.search || options?.status || options?.enrichmentStatus ||
                options?.parcelId || options?.brand || options?.category;

            if (options?.page || options?.limit || hasFilters) {
=======
        options?: { page?: number; limit?: number }
    ): Promise<Product[] | { data: Product[]; total: number; page: number; limit: number }> {
        return this.executeOperation("getUserProducts", async () => {
            if (options?.page || options?.limit) {
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
                const page = options.page || 1;
                const limit = options.limit || 50;
                const offset = (page - 1) * limit;

<<<<<<< HEAD
                const { eq, and, like, sql } = await import("drizzle-orm");
                const { products } = await import("@/lib/database/schema");

                // Build WHERE conditions
                const conditions = [eq(products.userId, userId)];

                if (options.search) {
                    // Search in name, description, brand
                    conditions.push(
                        sql`(
                            ${products.name} LIKE ${`%${options.search}%`} OR
                            ${products.description} LIKE ${`%${options.search}%`} OR
                            ${products.brand} LIKE ${`%${options.search}%`}
                        )`
                    );
                }

                if (options.status) {
                    conditions.push(eq(products.status, options.status as import("@/lib/database/schema").ProductStatus));
                }

                if (options.enrichmentStatus) {
                    // Filter by enrichmentData.enrichmentStatus using JSON extraction
                    conditions.push(
                        sql`json_extract(${products.enrichmentData}, '$.enrichmentStatus') = ${options.enrichmentStatus}`
                    );
                }

                if (options.parcelId) {
                    conditions.push(eq(products.parcelId, options.parcelId));
                }

                if (options.brand) {
                    conditions.push(like(products.brand, `%${options.brand}%`));
                }

                if (options.category) {
                    conditions.push(like(products.category, `%${options.category}%`));
                }

                const where = and(...conditions);

                const result = await this.productRepository.findWithPagination({
                    where,
=======
                const { eq } = await import("drizzle-orm");
                const { products } = await import("@/lib/database/schema");

                const result = await this.productRepository.findWithPagination({
                    where: eq(products.userId, userId),
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
                    limit,
                    offset,
                    orderBy: "createdAt",
                    orderDirection: "desc"
                });

                return {
                    data: result.data,
                    total: result.total,
                    limit: result.limit,
                    page: Math.floor(result.offset / result.limit) + 1
                };
            }
<<<<<<< HEAD

            // No filters or pagination - return all user products
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
            return this.productRepository.findByUser(userId);
        }, { userId, ...options });
    }

<<<<<<< HEAD
    /**
     * Get recent products for a user (for enrichment testing, etc.)
     */
    async getRecentProducts(userId: string, limit: number = 20): Promise<Product[]> {
        return this.executeOperation("getRecentProducts", async () => {
            const result = await this.getUserProducts(userId, { limit, page: 1 });

            // getUserProducts returns paginated result when limit is specified
            if (Array.isArray(result)) {
                return result.slice(0, limit);
            }

            return result.data;
        }, { userId, limit });
    }

=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    async searchProducts(
        userId: string,
        criteria: { name?: string; category?: string; brand?: string; status?: string; page?: number; limit?: number }
    ): Promise<Product[] | { data: Product[]; total: number; page: number; limit: number }> {
        return this.executeOperation("searchProducts", async () => {
            // If pagination requested, use findWithPagination logic.
            // But repository.search() implementation is custom.
            // I should probably enhance repository.search to return { data, total } or use findWithPagination with constructed where.

            if (criteria.page || criteria.limit) {
                const page = criteria.page || 1;
                const limit = criteria.limit || 50;
                const offset = (page - 1) * limit;

                const { eq, and, like } = await import("drizzle-orm");
                const { products } = await import("@/lib/database/schema");

                const conditions = [eq(products.userId, userId)];
                if (criteria.name) conditions.push(like(products.name, `%${criteria.name}%`));
                if (criteria.category) conditions.push(like(products.category, `%${criteria.category}%`));
                if (criteria.brand) conditions.push(like(products.brand, `%${criteria.brand}%`));
                // Safe cast assuming the criteria validation layer (if any) or shared type ensures compatibility
                if (criteria.status) conditions.push(eq(products.status, criteria.status as import("@/lib/database/schema").ProductStatus));

                const where = and(...conditions);

                const result = await this.productRepository.findWithPagination({
                    where,
                    limit,
                    offset,
                    orderBy: "createdAt",
                    orderDirection: "desc"
                });

                return {
                    data: result.data,
                    total: result.total,
                    limit: result.limit,
                    page: Math.floor(result.offset / result.limit) + 1
                };
            }

            return this.productRepository.search({ userId, ...criteria });
        }, { userId, ...criteria });
    }

    /**
     * Get all products associated with a specific parcel
     */
    async getProductsByParcelId(parcelId: string, userId: string): Promise<Product[]> {
        return this.executeOperation("getProductsByParcelId", async () => {
            const { eq, and } = await import("drizzle-orm");
            const { products } = await import("@/lib/database/schema");

            const result = await this.productRepository.findWithPagination({
                where: and(
                    eq(products.userId, userId),
                    eq(products.parcelId, parcelId)
                ),
                limit: 1000, // Get all products for the parcel
                offset: 0,
                orderBy: "createdAt",
                orderDirection: "desc"
            });

            return result.data;
        }, { parcelId, userId });
    }
<<<<<<< HEAD

    /**
     * Link a product to a Vinted listing
     */
    async linkVinted(
        productId: string,
        userId: string,
        data: {
            vintedId: string;
            price?: number;
            url?: string;
            photoUrl?: string;
        }
    ): Promise<Product> {
        return this.executeOperation("linkVinted", async () => {
            // Check authorization
            const existing = await this.productRepository.findById(productId);
            if (!existing) {
                throw this.createNotFoundError("Product", productId);
            }
            if (existing.userId !== userId) {
                throw this.createAuthorizationError("Not authorized to modify this product");
            }

            // Validate Vinted ID format
            if (!data.vintedId || !/^\d+$/.test(data.vintedId)) {
                throw new ValidationError("Invalid Vinted ID format", "vintedId");
            }

            // Prepare update data
            const updateData: Partial<NewProduct> = {
                externalId: data.vintedId,
                plateforme: "autre", // Vinted is not in enum, using "autre"
                status: "online",
                updatedAt: new Date().toISOString()
            };

            // Update price if provided
            if (data.price !== undefined) {
                if (data.price < 0) {
                    throw new ValidationError("Price must be positive", "price");
                }
                updateData.price = data.price;
            }

            // Update URL and photo if provided
            if (data.url) {
                updateData.url = data.url;
            }
            if (data.photoUrl) {
                updateData.photoUrl = data.photoUrl;
            }

            const updated = await this.productRepository.update(productId, updateData);
            if (!updated) {
                throw this.createNotFoundError("Product", productId);
            }

            return updated;
        }, { productId, userId, vintedId: data.vintedId });
    }

    /**
     * Unlink a product from Vinted
     */
    async unlinkVinted(productId: string, userId: string): Promise<Product> {
        return this.executeOperation("unlinkVinted", async () => {
            // Check authorization
            const existing = await this.productRepository.findById(productId);
            if (!existing) {
                throw this.createNotFoundError("Product", productId);
            }
            if (existing.userId !== userId) {
                throw this.createAuthorizationError("Not authorized to modify this product");
            }

            // Clear Vinted association
            const updateData: Partial<NewProduct> = {
                externalId: null,
                vintedStats: null,
                url: null,
                status: "draft",
                plateforme: null,
                updatedAt: new Date().toISOString()
            };

            const updated = await this.productRepository.update(productId, updateData);
            if (!updated) {
                throw this.createNotFoundError("Product", productId);
            }

            return updated;
        }, { productId, userId });
    }

    /**
     * Bulk delete products (optimized batch operation)
     */
    async bulkDelete(productIds: string[], userId: string): Promise<number> {
        return this.executeOperation("bulkDelete", async () => {
            // Verify ownership in one batch query
            const ownedProducts = await this.productRepository.findByIdsAndUser(productIds, userId);

            if (ownedProducts.length === 0) {
                return 0; // No products found or owned
            }

            // Check if all requested products are owned
            const ownedIds = new Set(ownedProducts.map(p => p.id));
            const unauthorizedIds = productIds.filter(id => !ownedIds.has(id));

            if (unauthorizedIds.length > 0) {
                throw this.createAuthorizationError(
                    `Not authorized to delete ${unauthorizedIds.length} product(s)`
                );
            }

            // Delete all in one batch query
            const affected = await this.productRepository.deleteMany(productIds);

            return affected;
        }, { productIds, userId, count: productIds.length });
    }

    /**
     * Bulk archive products (optimized batch operation)
     */
    async bulkArchive(productIds: string[], userId: string): Promise<number> {
        return this.executeOperation("bulkArchive", async () => {
            // Verify ownership in one batch query
            const ownedProducts = await this.productRepository.findByIdsAndUser(productIds, userId);

            if (ownedProducts.length === 0) {
                return 0;
            }

            // Check if all requested products are owned
            const ownedIds = new Set(ownedProducts.map(p => p.id));
            const unauthorizedIds = productIds.filter(id => !ownedIds.has(id));

            if (unauthorizedIds.length > 0) {
                throw this.createAuthorizationError(
                    `Not authorized to archive ${unauthorizedIds.length} product(s)`
                );
            }

            // Update all in one batch query
            const affected = await this.productRepository.updateMany(productIds, {
                status: "archived"
            });

            return affected;
        }, { productIds, userId, count: productIds.length });
    }

    /**
     * Bulk duplicate products (optimized batch operation)
     */
    async bulkDuplicate(productIds: string[], userId: string): Promise<number> {
        return this.executeOperation("bulkDuplicate", async () => {
            // Fetch all products in one query
            const originals = await this.productRepository.findByIdsAndUser(productIds, userId);

            if (originals.length === 0) {
                return 0;
            }

            // Check if all requested products are owned
            const ownedIds = new Set(originals.map(p => p.id));
            const unauthorizedIds = productIds.filter(id => !ownedIds.has(id));

            if (unauthorizedIds.length > 0) {
                throw this.createAuthorizationError(
                    `Not authorized to duplicate ${unauthorizedIds.length} product(s)`
                );
            }

            // Prepare all duplicates in memory
            const duplicatesData = originals.map(original => ({
                userId,
                parcelId: original.parcelId,
                name: `${original.name} (copie)`,
                description: original.description,
                brand: original.brand,
                category: original.category,
                subcategory: original.subcategory,
                size: original.size,
                color: original.color,
                poids: original.poids,
                price: original.price,
                currency: original.currency || "EUR",
                coutLivraison: original.coutLivraison,
                sellingPrice: null, // Reset selling price
                plateforme: original.plateforme,
                externalId: null, // Reset external ID
                url: original.url,
                photoUrl: original.photoUrl,
                status: "draft" as const,
                vendu: "0",
                photoUrls: original.photoUrls,
                enrichmentData: null, // Reset enrichment
                vintedId: null, // Reset vinted ID
            }));

            // Batch insert all duplicates
            const created = await this.productRepository.createMany(duplicatesData as NewProduct[]);

            return created.length;
        }, { productIds, userId, count: productIds.length });
    }

    /**
     * Bulk enrich products with AI (optimized batch operation)
     */
    async bulkEnrich(productIds: string[], userId: string): Promise<number> {
        return this.executeOperation("bulkEnrich", async () => {
            // Get Gemini credentials via IntegrationService
            const { serviceContainer } = await import("./container");
            const integrationService = serviceContainer.getIntegrationService();
            const credentials = await integrationService.getCredentials(userId, "gemini");

            if (!credentials || !credentials["enabled"]) {
                throw this.createBusinessError(
                    "L'enrichissement Gemini n'est pas activé ou configuré"
                );
            }

            // Fetch products to enrich
            const productsToEnrich = await this.productRepository.findByIdsAndUser(productIds, userId);

            if (productsToEnrich.length === 0) {
                return 0;
            }

            // Get API key and model
            const apiKey = String(credentials["apiKey"] || "");
            const model = String(credentials["model"] || "gemini-2.5-flash");

            // Import enrichment service and rate limiter
            const { ProductEnrichmentService } = await import("./product-enrichment-service");
            const { parallelWithRateLimit } = await import("@/lib/utils/rate-limiter");

            const enrichmentService = new ProductEnrichmentService(apiKey, model);

            // Create tasks for parallel enrichment
            const tasks = productsToEnrich.map(product => async () => {
                try {
                    // Mark as pending
                    await this.updateProduct(product.id, userId, {
                        enrichmentData: {
                            enrichmentStatus: 'pending' as const,
                            enrichedAt: new Date().toISOString()
                        }
                    });

                    // Parse photo URLs
                    const photoUrlsList: string[] = product.photoUrls
                        ? (Array.isArray(product.photoUrls) ? product.photoUrls : [])
                        : (product.photoUrl ? [product.photoUrl] : []);

                    if (!photoUrlsList.length) {
                        return false;
                    }

                    // Enrich product
                    const result = await enrichmentService.enrichProduct(
                        product.name,
                        photoUrlsList
                    );

                    // Update product with enriched data
                    const enrichmentData = {
                        confidence: result.confidence,
                        originalUrl: result.url,
                        source: result.source,
                        modelUsed: model,
                        enrichedAt: new Date().toISOString(),
                        enrichmentStatus: 'done' as const,
                        vintedBrandId: result.vintedBrandId,
                        vintedCatalogId: result.vintedCatalogId,
                    };

                    await this.updateProduct(product.id, userId, {
                        name: result.name || undefined,
                        brand: result.brand || undefined,
                        category: result.category || undefined,
                        subcategory: result.subcategory || undefined,
                        description: result.description || undefined,
                        enrichmentData
                    });

                    return true;
                } catch (err) {
                    this.logger.error(`Enrichment failed for product ${product.id}`, { error: err });

                    // Mark as failed
                    await this.updateProduct(product.id, userId, {
                        enrichmentData: {
                            enrichmentStatus: 'failed' as const,
                            error: err instanceof Error ? err.message : "Unknown error"
                        }
                    });

                    return false;
                }
            });

            // Execute with rate limiting (max 3 concurrent, 500ms delay)
            const { results } = await parallelWithRateLimit(tasks, {
                maxConcurrent: 3,
                delayBetweenMs: 500
            });

            const successCount = results.filter(Boolean).length;

            return successCount;
        }, { productIds, userId, count: productIds.length });
    }
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
}
