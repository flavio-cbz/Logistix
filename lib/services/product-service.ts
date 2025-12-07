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

    async getUserProducts(userId: string): Promise<Product[]> {
        return this.executeOperation("getUserProducts", async () => {
            return this.productRepository.findByUser(userId);
        }, { userId });
    }

    async searchProducts(userId: string, criteria: { name?: string; category?: string; brand?: string; status?: string }): Promise<Product[]> {
        return this.executeOperation("searchProducts", async () => {
            return this.productRepository.search({ userId, ...criteria });
        }, { userId, ...criteria });
    }
}
