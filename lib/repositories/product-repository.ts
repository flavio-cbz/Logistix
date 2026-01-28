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
<<<<<<< HEAD
    }

    // =========================================================================
    // Dashboard Aggregation Methods
    // =========================================================================

    /**
     * Get sales data aggregation for a user
     */
    async getSalesData(userId: string): Promise<{
        ventesTotales: number;
        beneficesTotaux: number;
        produitsVendus: number;
    } | undefined> {
        return this.executeCustomQuery(async (db) => {
            return db.select({
                ventesTotales: sqlFormulas.sumChiffreAffaires,
                beneficesTotaux: sqlFormulas.sumBenefices,
                produitsVendus: count()
            })
                .from(products)
                .leftJoin(parcels, eq(products.parcelId, parcels.id))
                .where(and(eq(products.userId, userId), eq(products.vendu, '1')))
                .get();
        });
    }

    /**
     * Get daily performance data (last 7 days)
     */
    async getDailyPerformance(userId: string): Promise<Array<{
        date: string;
        ventes: number;
        commandes: number;
        benefices: number;
    }>> {
        return this.executeCustomQuery(async (db) => {
            return db.select({
                date: sql<string>`DATE(${products.soldAt})`,
                ventes: sqlFormulas.sumChiffreAffaires,
                commandes: count(),
                benefices: sqlFormulas.sumBenefices
            })
                .from(products)
                .leftJoin(parcels, eq(products.parcelId, parcels.id))
                .where(and(
                    eq(products.userId, userId),
                    eq(products.vendu, '1'),
                    sql`${products.soldAt} >= DATE('now', '-7 days')`
                ))
                .groupBy(sql`DATE(${products.soldAt})`)
                .orderBy(asc(sql`DATE(${products.soldAt})`))
                .all();
        });
    }

    /**
     * Get top products by revenue
     */
    async getTopProducts(userId: string, limit: number = 5): Promise<Array<{
        nom: string;
        ventesRevenue: number;
        ventesCount: number;
        benefices: number;
        stock: number;
    }>> {
        return this.executeCustomQuery(async (db) => {
            return db.select({
                nom: products.name,
                ventesRevenue: sqlFormulas.sumChiffreAffaires,
                ventesCount: count(),
                benefices: sqlFormulas.sumBenefices,
                stock: sql<number>`COUNT(*)`
            })
                .from(products)
                .leftJoin(parcels, eq(products.parcelId, parcels.id))
                .where(and(eq(products.userId, userId), eq(products.vendu, '1')))
                .groupBy(products.name)
                .orderBy(desc(sqlFormulas.sumChiffreAffaires))
                .limit(limit)
                .all();
        });
    }

    /**
     * Get stock rotation data
     */
    async getStockRotation(userId: string): Promise<{
        stockTotal: number;
        stockEnLigne: number;
        stockBrouillon: number;
        valeurStockTotal: number;
        valeurStockEnLigne: number;
        ageStockMoyen: number;
    } | undefined> {
        return this.executeCustomQuery(async (db) => {
            return db.select({
                stockTotal: count(),
                stockEnLigne: sql<number>`SUM(CASE WHEN ${products.listedAt} IS NOT NULL AND ${products.listedAt} != '' THEN 1 ELSE 0 END)`,
                stockBrouillon: sql<number>`SUM(CASE WHEN ${products.listedAt} IS NULL OR ${products.listedAt} = '' THEN 1 ELSE 0 END)`,
                valeurStockTotal: sql<number>`COALESCE(SUM(${products.price} + COALESCE(${products.coutLivraison}, 0)), 0)`,
                valeurStockEnLigne: sql<number>`COALESCE(SUM(CASE WHEN ${products.listedAt} IS NOT NULL AND ${products.listedAt} != '' THEN ${products.price} + COALESCE(${products.coutLivraison}, 0) ELSE 0 END), 0)`,
                ageStockMoyen: sql<number>`COALESCE(AVG(julianday('now') - julianday(${products.createdAt})), 0)`
            })
                .from(products)
                .where(and(eq(products.userId, userId), eq(products.vendu, '0')))
                .get();
        });
    }

    /**
     * Count products with low stock (by name)
     */
    async countLowStockProducts(userId: string, threshold: number = 5): Promise<number> {
        return this.executeCustomQuery(async (db) => {
            const result = await db.select({
                count: count()
            }).from(
                db.select({ name: products.name })
                    .from(products)
                    .where(and(eq(products.userId, userId), eq(products.vendu, '0')))
                    .groupBy(products.name)
                    .having(lt(count(), threshold))
                    .as('sub')
            ).get();

            return result?.count || 0;
        });
    }

    /**
     * Count products sold at a loss
     */
    async countNegativeProfitProducts(userId: string): Promise<number> {
        return this.executeCustomQuery(async (db) => {
            const result = await db.select({ count: count() })
                .from(products)
                .leftJoin(parcels, eq(products.parcelId, parcels.id))
                .where(and(
                    eq(products.userId, userId),
                    eq(products.vendu, '1'),
                    lt(sqlFormulas.benefice, 0)
                ))
                .get();

            return result?.count || 0;
        });
    }

    /**
     * Find products by IDs and user (batch operation)
     */
    async findByIdsAndUser(productIds: string[], userId: string): Promise<Product[]> {
        return this.executeCustomQuery(async (db) => {
            return db.select()
                .from(products)
                .where(and(
                    inArray(products.id, productIds),
                    eq(products.userId, userId)
                ))
                .all();
        });
    }

    /**
     * Delete multiple products (batch operation)
     */
    async deleteMany(productIds: string[]): Promise<number> {
        return this.executeCustomQuery(async (db) => {
            const result = await db.delete(products)
                .where(inArray(products.id, productIds))
                .returning({ id: products.id });

            return result.length;
        });
    }

    /**
     * Update multiple products (batch operation)
     */
    async updateMany(productIds: string[], data: Partial<NewProduct>): Promise<number> {
        return this.executeCustomQuery(async (db) => {
            const result = await db.update(products)
                .set({
                    ...data,
                    updatedAt: new Date().toISOString()
                })
                .where(inArray(products.id, productIds))
                .returning({ id: products.id });

            return result.length;
        });
    }

    /**
     * Create multiple products (batch operation)
     */
    override async createMany(productsData: NewProduct[]): Promise<Product[]> {
        return this.executeCustomQuery(async (db) => {
            const result = await db.insert(products)
                .values(productsData)
                .returning();

            return result;
        });
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    }
}
