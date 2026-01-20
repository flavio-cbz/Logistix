import { NextRequest, NextResponse } from "next/server";
import { databaseService } from "@/lib/database/database-service";
import { decryptSecret } from "@/lib/utils/crypto";
import { getSessionUser } from "@/lib/services/auth/auth";
import { ProductEnrichmentService } from "@/lib/services/product-enrichment-service";
import { logger } from "@/lib/utils/logging/logger";

interface GeminiCredentials {
    apiKey: string;
    model?: string;
    enabled?: boolean;
}

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await databaseService.getDb() as import("drizzle-orm/better-sqlite3").BetterSQLite3Database<typeof import("@/lib/database/schema") >;
        const cred = await db.query.integrationCredentials.findFirst({
            where: (t, { eq, and }) => and(
                eq(t.userId, user.id),
                eq(t.provider, "gemini")
            )
        });

        // Use stored key or check for one in query params (if we want to support testing a new key before saving)
        // For now, let's rely on stored key + optional query param if needed, or just stored.

        let apiKey = "";

         
        const credentials = (cred?.credentials as unknown) as GeminiCredentials | undefined;

        if (credentials) {
            const encryptedKey = credentials.apiKey;
            if (encryptedKey) {
                try {
                    apiKey = await decryptSecret(encryptedKey, user.id);
                } catch { /* ignore */ }
            }
        }

        // Allow overriding or providing key via header for testing/setup before save
        const headerKey = req.headers.get("x-gemini-api-key");
        if (headerKey && !headerKey.includes("...")) {
            apiKey = headerKey;
        }

        if (!apiKey) {
            return NextResponse.json({ models: [] });
        }

        const service = new ProductEnrichmentService(apiKey);
        const models = await service.listModels();

        return NextResponse.json({ models });

    } catch (error) {
        const safeError: unknown = error;
        logger.error("Error listing models", { error: String(safeError) });
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
