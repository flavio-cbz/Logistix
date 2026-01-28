import { BaseRepository } from "./base-repository";
import { products, parcels, type Product, type NewProduct } from "@/lib/database/schema";
import { eq, and, like, desc, count, asc, sql, lt, inArray } from "drizzle-orm";
import { DatabaseService } from "@/lib/database";
import { sqlFormulas } from "@/lib/services/statistics/sql-formulas";

export class ProductRepository extends BaseRepository<typeof products, Product, NewProduct> {
    constructor(databaseService: DatabaseService) {
        super(products, databaseService);
    }

    /**
     * Échappe les caractères spéciaux SQL LIKE pour éviter les attaques par wildcard
     * Ex: "test%" devient "test\%" pour une recherche littérale
     */
    private escapeLikePattern(pattern: string): string {
        return pattern.replace(/[%_\\]/g, '\\$&');
    }

    async findByUser(userId: string): Promise<Product[]> {
        return this.findAll({
            where: eq(products.userId, userId),
            limit: 1000, // Ensure all products are returned (up to maxLimit)
            orderBy: "createdAt",
            orderDirection: "desc"
        });
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
            const escapedName = this.escapeLikePattern(criteria.name);
            conditions.push(like(products.name, `%${escapedName}%`));
        }
        if (criteria.category) {
            const escapedCategory = this.escapeLikePattern(criteria.category);
            conditions.push(like(products.category, `%${escapedCategory}%`));
        }
        if (criteria.brand) {
            const escapedBrand = this.escapeLikePattern(criteria.brand);
            conditions.push(like(products.brand, `%${escapedBrand}%`));
        }
        if (criteria.status) {
            if (['draft', 'available', 'reserved', 'sold', 'removed', 'archived', 'online'].includes(criteria.status as string)) {
                conditions.push(eq(products.status, criteria.status as import("@/lib/database/schema").ProductStatus));
            }
        }

        return this.executeCustomQuery(async (db) => {
            return db
                .select()
                .from(products)
                .where(and(...conditions))
                .orderBy(desc(products.createdAt))
                .limit(criteria.limit || 50)
                .offset(criteria.offset || 0);
        });
    }

    // Aggregation methods for SearchService
    async getBrandSuggestions(query: string): Promise<{ brand: string; count: number }[]> {
        return this.executeCustomQuery(async (db) => {
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
        });
    }

    async getRealBrandSuggestions(query: string): Promise<{ brand: string; count: number }[]> {
        return this.executeCustomQuery(async (db) => {
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
        });
    }

    async getCategorySuggestions(query: string): Promise<{ category: string; count: number }[]> {
        return this.executeCustomQuery(async (db) => {
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
        });
    }

    async getProductSuggestions(query: string): Promise<{ product: string; count: number }[]> {
        return this.executeCustomQuery(async (db) => {
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

            return results.map((r: { product: string | null; count: number }) => ({ product: r.product || "", count: r.count }));
        });
    }

    // ==================================================================    }
}
