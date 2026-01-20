import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { withErrorHandling } from "@/lib/utils/api-response";
import { databaseService } from "@/lib/database";
import { z } from "zod";

const bulkActionSchema = z.object({
    action: z.enum(["delete", "duplicate", "archive", "enrich"]),
    ids: z.array(z.string().uuid()).min(1, "Au moins un ID requis"),
});

async function handlePost(req: NextRequest) {
    const { user } = await requireAuth(req);
    const body = await req.json();
    const { action, ids } = bulkActionSchema.parse(body);

    // Verify all products belong to the user
    const placeholders = ids.map(() => "?").join(",");
    const existing = await databaseService.query(
        `SELECT id FROM products WHERE id IN (${placeholders}) AND user_id = ?`,
        [...ids, user.id]
    ) as { id: string }[];

    if (existing.length !== ids.length) {
        return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "Certains produits n'existent pas ou ne vous appartiennent pas" } },
            { status: 403 }
        );
    }

    let affected = 0;

    if (action === "delete") {
        // Hard delete products
        const result = await databaseService.execute(
            `DELETE FROM products WHERE id IN (${placeholders}) AND user_id = ?`,
            [...ids, user.id]
        );
        affected = result.changes || 0;
    } else if (action === "archive") {
        // Set status to archived
        const result = await databaseService.execute(
            `UPDATE products SET status = 'archived', updated_at = datetime('now') WHERE id IN (${placeholders}) AND user_id = ?`,
            [...ids, user.id]
        );
        affected = result.changes || 0;
    } else if (action === "duplicate") {
        // Duplicate each product
        for (const id of ids) {
            const original = await databaseService.queryOne<{
                id: string;
                parcelle_id: string | null;
                name: string;
                description: string | null;
                brand: string | null;
                category: string | null;
                subcategory: string | null;
                size: string | null;
                color: string | null;
                poids: number | null;
                price: number | null;
                currency: string | null;
                cout_livraison: number | null;
                plateforme: string | null;
                url: string | null;
                photo_url: string | null;
            }>(
                `SELECT * FROM products WHERE id = ? AND user_id = ?`,
                [id, user.id]
            );

            if (original) {
                const newId = crypto.randomUUID();
                const now = new Date().toISOString();
                await databaseService.execute(
                    `INSERT INTO products (id, user_id, parcelle_id, name, description, brand, category, subcategory, size, color, poids, price, currency, cout_livraison, selling_price, plateforme, external_id, url, photo_url, status, vendu, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', '0', ?, ?)`,
                    [
                        newId,
                        user.id,
                        original.parcelle_id,
                        `${original.name} (copie)`,
                        original.description,
                        original.brand,
                        original.category,
                        original.subcategory,
                        original.size,
                        original.color,
                        original.poids,
                        original.price,
                        original.currency || "EUR",
                        original.cout_livraison,
                        null, // Reset selling price for duplicate
                        original.plateforme,
                        null, // Reset external ID
                        original.url,
                        original.photo_url,
                        now,
                        now,
                    ]
                );
                affected++;
            }
        }
    } else if (action === "enrich") {
        // 1. Get Gemini Credentials
        const credResult = await databaseService.queryOne<{ credentials: string }>(
            `SELECT credentials FROM integration_credentials WHERE user_id = ? AND provider = 'gemini'`,
            [user.id]
        );

        // Parse credentials safely
        let credentials: { apiKey: string; model?: string; enabled?: boolean } | null = null;
        if (credResult && credResult.credentials) {
            try {
                const parsed = JSON.parse(credResult.credentials);
                // Handle both direct object or wrapper object structure
                credentials = parsed.credentials || parsed;
            } catch (e) {
                console.error("Failed to parse credentials", e);
            }
        }

        if (!credentials || !credentials.enabled) {
            return NextResponse.json(
                { success: false, error: { code: "CONFIG_ERROR", message: "L'enrichissement Gemini n'est pas activé ou configuré" } },
                { status: 400 }
            );
        }

        // Dynamically import to avoid circular deps or heavy loads
        const { ProductEnrichmentService } = await import("@/lib/services/product-enrichment-service");
        const { parallelWithRateLimit } = await import("@/lib/utils/rate-limiter");
        const { decryptSecret } = await import("@/lib/utils/crypto");

        const apiKey = await decryptSecret(credentials.apiKey, user.id);
        const model = credentials.model || "gemini-2.5-flash";
        const enrichmentService = new ProductEnrichmentService(apiKey, model);

        // 2. Get Products to Enrich
        const productsToEnrich = await databaseService.query<{
            id: string;
            name: string;
            photo_url: string | null;
            photo_urls: string | null;
        }>(
            `SELECT id, name, photo_url, photo_urls FROM products WHERE id IN (${placeholders}) AND user_id = ?`,
            [...ids, user.id]
        ) as { id: string; name: string; photo_url: string | null; photo_urls: string | null }[];

        // 3. Process in Parallel
        const tasks = productsToEnrich.map(product => async () => {
            try {
                // Mark as pending
                await databaseService.execute(
                    `UPDATE products SET enrichment_data = json_set(COALESCE(enrichment_data, '{}'), '$.enrichmentStatus', 'pending', '$.enrichedAt', ?) WHERE id = ?`,
                    [new Date().toISOString(), product.id]
                );

                const photoUrls = product.photo_urls ? JSON.parse(product.photo_urls) : (product.photo_url ? [product.photo_url] : []);
                if (!photoUrls.length) return false;

                const result = await enrichmentService.enrichProduct(product.name, photoUrls);

                // Update with result
                // Note: We update specific fields only if they have values to avoid overwriting with empty
                // Simple approach: Construct dynamic update
                const now = new Date().toISOString();
                const enrichmentData = {
                    confidence: result.confidence,
                    originalUrl: result.url,
                    source: result.source,
                    modelUsed: model,
                    enrichedAt: now,
                    enrichmentStatus: 'done',
                    vintedBrandId: result.vintedBrandId,
                    vintedCatalogId: result.vintedCatalogId,
                };

                // Helper to safely format string for SQL
                await databaseService.execute(
                    `UPDATE products 
                     SET 
                        name = COALESCE(?, name),
                        brand = COALESCE(?, brand),
                        category = COALESCE(?, category),
                        subcategory = COALESCE(?, subcategory),
                        description = COALESCE(?, description),
                        enrichment_data = ?
                     WHERE id = ?`,
                    [
                        result.name || null,
                        result.brand || null,
                        result.category || null,
                        result.subcategory || null,
                        result.description || null,
                        JSON.stringify(enrichmentData),
                        product.id
                    ]
                );

                return true;
            } catch (err) {
                console.error(`Enrichment failed for ${product.id}`, err);
                await databaseService.execute(
                    `UPDATE products SET enrichment_data = json_set(COALESCE(enrichment_data, '{}'), '$.enrichmentStatus', 'failed', '$.error', ?) WHERE id = ?`,
                    [err instanceof Error ? err.message : "Unknown error", product.id]
                );
                return false;
            }
        });

        const { results } = await parallelWithRateLimit(tasks, { maxConcurrent: 3, delayBetweenMs: 500 });
        affected = results.filter(Boolean).length;
    }

    return NextResponse.json({
        success: true,
        data: { action, affected, ids },
    });
}

// Type pour le handler
type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

export const POST = withErrorHandling(handlePost as RouteHandler);
