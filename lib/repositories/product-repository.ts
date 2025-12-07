import { BaseRepository } from "./base-repository";
import { products, type Product, type NewProduct } from "@/lib/database/schema";
import { eq, and, like, desc, count } from "drizzle-orm";
import { DatabaseService } from "@/lib/database";

export class ProductRepository extends BaseRepository<typeof products, Product, NewProduct> {
    constructor(databaseService: DatabaseService) {
        super(products, databaseService);
    }

    async findByUser(userId: string): Promise<Product[]> {
        return this.findAll({ where: eq(products.userId, userId) });
    }

    async search(criteria: {
        userId: string;
        name?: string | undefined;
        category?: string | undefined;
        brand?: string | undefined;
        status?: string | undefined;
        limit?: number | undefined;
        offset?: number | undefined;
    }): Promise<Product[]> {
        const conditions = [eq(products.userId, criteria.userId)];

        if (criteria.name) {
            conditions.push(like(products.name, `%${criteria.name}%`));
        }
        if (criteria.category) {
            conditions.push(like(products.category, `%${criteria.category}%`));
        }
        if (criteria.brand) {
            conditions.push(like(products.brand, `%${criteria.brand}%`));
        }
        if (criteria.status) {
            conditions.push(eq(products.status, criteria.status as any));
        }

        const db = this.db;
        return db
            .select()
            .from(products)
            .where(and(...conditions))
            .orderBy(desc(products.createdAt))
            .limit(criteria.limit || 50)
            .offset(criteria.offset || 0);
    }

    // Aggregation methods for SearchService
    async getBrandSuggestions(query: string): Promise<{ brand: string; count: number }[]> {
        const db = this.db;
        const results = db
            .select({
                brand: products.plateforme,
                count: count(),
            })
            .from(products)
            .where(like(products.plateforme, `%${query}%`))
            .groupBy(products.plateforme)
            .orderBy(desc(count()))
            .limit(5)
            .all();

        return results.map((r: { brand: string | null; count: number }) => ({ brand: r.brand || "", count: r.count }));
    }

    async getRealBrandSuggestions(query: string): Promise<{ brand: string; count: number }[]> {
        const db = this.db;
        const results = db
            .select({
                brand: products.brand,
                count: count(),
            })
            .from(products)
            .where(like(products.brand, `%${query}%`))
            .groupBy(products.brand)
            .orderBy(desc(count()))
            .limit(5)
            .all();

        return results
            .filter((r: { brand: string | null; count: number }) => r.brand !== null)
            .map((r: { brand: string | null; count: number }) => ({ brand: r.brand!, count: r.count }));
    }

    async getCategorySuggestions(query: string): Promise<{ category: string; count: number }[]> {
        const db = this.db;
        const results = db
            .select({
                category: products.category,
                count: count(),
            })
            .from(products)
            .where(like(products.category, `%${query}%`))
            .groupBy(products.category)
            .orderBy(desc(count()))
            .limit(5)
            .all();

        return results
            .filter((r: { category: string | null; count: number }) => r.category !== null)
            .map((r: { category: string | null; count: number }) => ({ category: r.category!, count: r.count }));
    }

    async getProductSuggestions(query: string): Promise<{ product: string; count: number }[]> {
        const db = this.db;
        const results = db
            .select({
                product: products.name,
                count: count(),
            })
            .from(products)
            .where(like(products.name, `%${query}%`))
            .groupBy(products.name)
            .orderBy(desc(count()))
            .limit(5)
            .all();

        return results.map((r: { product: string; count: number }) => ({ product: r.product, count: r.count }));
    }
}
