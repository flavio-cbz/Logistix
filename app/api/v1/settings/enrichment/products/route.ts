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
