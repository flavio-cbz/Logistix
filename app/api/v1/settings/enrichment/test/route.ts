import { NextRequest, NextResponse } from "next/server";
import { ProductEnrichmentService } from "@/lib/services/product-enrichment-service";
import { databaseService } from "@/lib/database/database-service";
import { products } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/utils/crypto";
import { getSessionUser } from "@/lib/services/auth/auth";
import { logger } from "@/lib/utils/logging/logger";

interface GeminiCredentials {
    apiKey: string;
    model?: string;
    enabled?: boolean;
    confidenceThreshold?: number;
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { productId, config } = await req.json();

        if (!productId) {
            return NextResponse.json({ error: "ProductId is required" }, { status: 400 });
        }

        // Resolve API Key
        let apiKey = config?.apiKey;

        // If key is masked or missing, try to fetch from DB
        if (!apiKey || apiKey.includes("...")) {
            const db = await databaseService.getDb() as import("drizzle-orm/better-sqlite3").BetterSQLite3Database<typeof import("@/lib/database/schema") >;
            const cred = await db.query.integrationCredentials.findFirst({
                where: (t, { eq, and }) => and(
                    eq(t.userId, user.id),
                    eq(t.provider, "gemini")
                )
            });

            if (cred && cred.credentials) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const encryptedKey = ((cred as any).credentials as GeminiCredentials).apiKey;
                if (encryptedKey) {
                    try {
                        apiKey = await decryptSecret(encryptedKey, user.id);
                    } catch { /* ignore */ }
                }
            }
        }

        if (!apiKey || apiKey.includes("...")) {
            return NextResponse.json({ error: "Invalid or missing API Key" }, { status: 400 });
        }

        // Fetch product to get name
        const db = await databaseService.getDb();
        const dbQuery = db as unknown as import("drizzle-orm/better-sqlite3").BetterSQLite3Database<typeof import("@/lib/database/schema") >;
        const product = await dbQuery.query.products.findFirst({
            where: eq(products.id, productId)
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const service = new ProductEnrichmentService(apiKey, config?.model);

        // Run enrichment with all available photos (not just the first one)
        const photoUrls = (product.photoUrls as string[]) ||
            (product.photoUrl ? [product.photoUrl] : []);
        const result = await service.enrichProduct(product.name, photoUrls);

        return NextResponse.json({
            result: {
                ...result,
                originalName: product.name
            }
        });

    } catch (error) {
        logger.error("Test enrichment failed", { error });
        return NextResponse.json({ error: error instanceof Error ? error.message : "Test failed" }, { status: 500 });
    }
}
