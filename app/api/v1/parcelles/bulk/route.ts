import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
=======
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { withErrorHandling } from "@/lib/utils/api-response";
import { databaseService } from "@/lib/database";
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
import { z } from "zod";

const bulkActionSchema = z.object({
    action: z.enum(["delete", "duplicate"]),
    ids: z.array(z.string().uuid()).min(1, "Au moins un ID requis"),
});

async function handlePost(req: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

<<<<<<< HEAD
        const body = await req.json();
        const { action, ids } = bulkActionSchema.parse(body);
=======
    // Verify all parcels belong to the user
    const placeholders = ids.map(() => "?").join(",");
    const existing = await databaseService.query(
        `SELECT id FROM parcels WHERE id IN (${placeholders}) AND user_id = ?`,
        [...ids, user.id]
    ) as { id: string }[];
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

        const parcelleService = serviceContainer.getParcelleService();
        let affected = 0;

<<<<<<< HEAD
        if (action === "delete") {
            affected = await parcelleService.bulkDelete(ids, user.id);
        } else if (action === "duplicate") {
            affected = await parcelleService.bulkDuplicate(ids, user.id);
=======
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
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
        }

        return NextResponse.json(
            createSuccessResponse({
                action,
                affected,
                ids
            })
        );
    } catch (error) {
        logger.error("[PARCELLES-BULK] Error processing bulk action", { error });
        return NextResponse.json(
            createErrorResponse(error),
            { status: 500 }
        );
    }
}

<<<<<<< HEAD
export const POST = handlePost;
=======
// Type pour le handler
type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

export const POST = withErrorHandling(handlePost as RouteHandler);

>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
