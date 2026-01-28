<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { logger } from "@/lib/utils/logging/logger";

export async function GET() {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrationService = serviceContainer.getIntegrationService();
    const config = await integrationService.getCredentials(user.id, "gemini");

    if (!config) {
      return NextResponse.json({ config: { enabled: false } });
    }

    return NextResponse.json({ config });
  } catch (error) {
    logger.error("Error fetching enrichment settings", { error });
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { enabled, apiKey, model } = body;

    const integrationService = serviceContainer.getIntegrationService();
    await integrationService.updateCredentials(user.id, "gemini", {
      enabled,
      apiKey,
      model,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error saving enrichment settings", { error: String(error) });
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

=======
import { NextRequest, NextResponse } from "next/server";
import { databaseService } from "@/lib/database/database-service";
import { integrationCredentials } from "@/lib/database/schema";
import { decryptSecret, encryptSecret } from "@/lib/utils/crypto";
import { getSessionUser } from "@/lib/services/auth/auth";
import { logger } from "@/lib/utils/logging/logger";

interface GeminiCredentials {
    apiKey: string;
    model?: string;
    enabled?: boolean;
}

export async function GET() {
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

        if (!cred || !cred.credentials) {
            return NextResponse.json({ config: { enabled: false } });
        }

         
        const credentials = (cred.credentials as unknown) as GeminiCredentials;
        const { apiKey, model, enabled } = credentials;
        // Decrypt key
        let decryptedKey = "";
        if (apiKey) {
            try {
                decryptedKey = await decryptSecret(apiKey, user.id);
            } catch { /* ignore */ }
        }

        // Return full key for frontend
        const displayKey = decryptedKey || "";

        return NextResponse.json({
            config: {
                enabled: enabled ?? false,
                apiKey: displayKey, // Send full key
                model: model || "gemini-2.0-flash"
            }
        });

    } catch (error) {
        logger.error("Error fetching enrichment settings", { error });
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { enabled, apiKey, model } = body;

         
        const db = await databaseService.getDb() as import("drizzle-orm/better-sqlite3").BetterSQLite3Database<typeof import("@/lib/database/schema") >;

        // Prepare credentials object
        // If apiKey is masked (contains ...), we need to fetch existing and keep it
        // If it's new/changed, we encrypt it.

        let encryptedKey = "";

        if (apiKey && !apiKey.includes("...")) {
            encryptedKey = await encryptSecret(apiKey, user.id);
        } else {
            // Fetch existing to preserve key
            const dbQuery = db as unknown as import("drizzle-orm/better-sqlite3").BetterSQLite3Database<typeof import("@/lib/database/schema") >;
            const existing = await dbQuery.query.integrationCredentials.findFirst({
                where: (t, { eq, and }) => and(
                    eq(t.userId, user.id),
                    eq(t.provider, "gemini")
                )
            });
            if (existing && existing.credentials) {
                 
                encryptedKey = ((existing.credentials as unknown) as GeminiCredentials).apiKey;
            }
        }

        const credentials = {
            enabled,
            apiKey: encryptedKey,
            model
        };

        await db.insert(integrationCredentials).values({
            userId: user.id,
            provider: "gemini",
            credentials,
            lastUsedAt: new Date().toISOString()
        }).onConflictDoUpdate({
            target: [integrationCredentials.userId, integrationCredentials.provider],
            set: {
                credentials,
                updatedAt: new Date().toISOString()
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        const safeError: unknown = error;
        logger.error("Error saving enrichment settings", { error: String(safeError) });
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
