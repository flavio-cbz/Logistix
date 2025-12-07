import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { withErrorHandling } from "@/lib/utils/api-response";
import { databaseService } from "@/lib/services/database/db";
import { z } from "zod";

const bulkActionSchema = z.object({
    action: z.enum(["delete", "duplicate"]),
    ids: z.array(z.string().uuid()).min(1, "Au moins un ID requis"),
});

async function handlePost(req: NextRequest) {
    const { user } = await requireAuth(req);
    const body = await req.json();
    const { action, ids } = bulkActionSchema.parse(body);

    // Verify all parcelles belong to the user
    const placeholders = ids.map(() => "?").join(",");
    const existing = await databaseService.query(
        `SELECT id FROM parcelles WHERE id IN (${placeholders}) AND user_id = ?`,
        [...ids, user.id]
    ) as any[];

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
            `UPDATE parcelles SET actif = 0, updated_at = datetime('now') WHERE id IN (${placeholders}) AND user_id = ?`,
            [...ids, user.id]
        );
        affected = result.changes || 0;
    } else if (action === "duplicate") {
        // Duplicate each parcelle
        for (const id of ids) {
            const original = await databaseService.queryOne(
                `SELECT * FROM parcelles WHERE id = ? AND user_id = ?`,
                [id, user.id]
            );

            if (original) {
                const newId = crypto.randomUUID();
                const now = new Date().toISOString();
                await databaseService.execute(
                    `INSERT INTO parcelles (id, user_id, numero, transporteur, nom, statut, actif, poids, prix_achat, prix_total, prix_par_gramme, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        newId,
                        user.id,
                        `${original.numero} (copie)`,
                        original.transporteur,
                        original.nom,
                        original.statut,
                        1,
                        original.poids,
                        original.prix_achat,
                        original.prix_total,
                        original.prix_par_gramme,
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
