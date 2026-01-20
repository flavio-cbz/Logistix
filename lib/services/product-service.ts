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
        options?: { page?: number; limit?: number }
    ): Promise<Product[] | { data: Product[]; total: number; page: number; limit: number }> {
        return this.executeOperation("getUserProducts", async () => {
            if (options?.page || options?.limit) {
                const page = options.page || 1;
                const limit = options.limit || 50;
                const offset = (page - 1) * limit;

                const { eq } = await import("drizzle-orm");
                const { products } = await import("@/lib/database/schema");

                const result = await this.productRepository.findWithPagination({
                    where: eq(products.userId, userId),
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
            return this.productRepository.findByUser(userId);
        }, { userId, ...options });
    }

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
}
