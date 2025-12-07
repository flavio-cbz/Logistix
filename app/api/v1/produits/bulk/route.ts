import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { withErrorHandling } from "@/lib/utils/api-response";
import { databaseService } from "@/lib/services/database/db";
import { z } from "zod";

const bulkActionSchema = z.object({
    action: z.enum(["delete", "duplicate", "archive"]),
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
    ) as any[];

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
            const original = await databaseService.queryOne(
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
    }

    return NextResponse.json({
        success: true,
        data: { action, affected, ids },
    });
}

export const POST = withErrorHandling(handlePost);
