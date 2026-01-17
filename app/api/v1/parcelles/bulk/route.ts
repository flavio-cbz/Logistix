import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { withErrorHandling } from "@/lib/utils/api-response";
import { databaseService } from "@/lib/database";
import { z } from "zod";

const bulkActionSchema = z.object({
    action: z.enum(["delete", "duplicate"]),
    ids: z.array(z.string().uuid()).min(1, "Au moins un ID requis"),
});

async function handlePost(req: NextRequest) {
    const { user } = await requireAuth(req);
    const body = await req.json();
    const { action, ids } = bulkActionSchema.parse(body);

    // Verify all parcels belong to the user
    const placeholders = ids.map(() => "?").join(",");
    const existing = await databaseService.query(
        `SELECT id FROM parcels WHERE id IN (${placeholders}) AND user_id = ?`,
        [...ids, user.id]
    ) as { id: string }[];

    if (existing.length !== ids.length) {
        return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "Certaines parcelles n'existent pas ou ne vous appartiennent pas" } },
            { status: 403 }
        );
    }

    let affected = 0;

    if (action === "delete") {
        // Soft delete
        const result = await databaseService.execute(
            `UPDATE parcels SET is_active = 0, updated_at = datetime('now') WHERE id IN (${placeholders}) AND user_id = ?`,
            [...ids, user.id]
        );
        affected = result.changes || 0;
    } else if (action === "duplicate") {
        // Duplicate each parcel
        for (const id of ids) {
            const original = await databaseService.queryOne<{
                id: string;
                superbuy_id: string;
                carrier: string | null;
                name: string | null;
                status: string;
                weight: number;
                total_price: number;
                price_per_gram: number;
            }>(
                `SELECT * FROM parcels WHERE id = ? AND user_id = ?`,
                [id, user.id]
            );

            if (original) {
                const newId = crypto.randomUUID();
                const now = new Date().toISOString();
                await databaseService.execute(
                    `INSERT INTO parcels (id, user_id, superbuy_id, carrier, name, status, is_active, weight, total_price, price_per_gram, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        newId,
                        user.id,
                        `${original.superbuy_id} (copie)`,
                        original.carrier,
                        original.name,
                        original.status,
                        1,
                        original.weight,
                        original.total_price,
                        original.price_per_gram,
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

// Type pour le handler
type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

export const POST = withErrorHandling(handlePost as RouteHandler);

