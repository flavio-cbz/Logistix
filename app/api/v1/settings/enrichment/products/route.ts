<<<<<<< HEAD
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

/**
 * GET /api/v1/settings/enrichment/products
 * Get recent products for enrichment testing
 */
export async function GET() {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const productService = serviceContainer.getProductService();

        // Fetch recent 20 products with only needed fields
        const recentProducts = await productService.getRecentProducts(user.id, 20);

        // Transform to only return needed fields
        const products = recentProducts.map(p => ({
            id: p.id,
            name: p.name,
            photoUrl: p.photoUrl
        }));

        return createSuccessResponse({ products });

    } catch (error) {
        return createErrorResponse(error);
    }
}
=======
import { NextResponse } from "next/server";
import { databaseService } from "@/lib/database/database-service";
import { products } from "@/lib/database/schema";
import { desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/services/auth/auth";
import { logger } from "@/lib/utils/logging/logger";

export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await databaseService.getDb() as import("drizzle-orm/better-sqlite3").BetterSQLite3Database<typeof import("@/lib/database/schema") >;

        // Fetch recent 20 products
        const recentProducts = await db.query.products.findMany({
            where: eq(products.userId, user.id),
            orderBy: [desc(products.createdAt)],
            limit: 20,
            columns: {
                id: true,
                name: true,
                photoUrl: true
            }
        });

        return NextResponse.json({ products: recentProducts });

    } catch (error) {
        const safeError: unknown = error;
        logger.error("Error fetching products for test", { error: String(safeError) });
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
