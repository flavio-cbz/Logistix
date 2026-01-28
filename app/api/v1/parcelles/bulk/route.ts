import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
import { z } from "zod";

const bulkActionSchema = z.object({
    action: z.enum(["delete", "duplicate"]),
    ids: z.array(z.string().uuid()).min(1, "Au moins un ID requis"),
});

async function handlePost(req: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const body = await req.json();
        const { action, ids } = bulkActionSchema.parse(body);

        const parcelleService = serviceContainer.getParcelleService();
        let affected = 0;

        if (action === "delete") {
            affected = await parcelleService.bulkDelete(ids, user.id);
        } else if (action === "duplicate") {
            affected = await parcelleService.bulkDuplicate(ids, user.id);
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

export const POST = handlePost;
