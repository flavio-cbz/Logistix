import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
import { z } from "zod";

const bulkActionSchema = z.object({
    action: z.enum(["delete", "duplicate", "archive", "enrich"]),
    ids: z.array(z.string().uuid()).min(1, "Au moins un ID requis"),
});

async function handlePost(req: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const body = await req.json();
        const { action, ids } = bulkActionSchema.parse(body);

        const productService = serviceContainer.getProductService();
        let affected = 0;

        if (action === "delete") {
            affected = await productService.bulkDelete(ids, user.id);
        } else if (action === "archive") {
            affected = await productService.bulkArchive(ids, user.id);
        } else if (action === "duplicate") {
            affected = await productService.bulkDuplicate(ids, user.id);
        } else if (action === "enrich") {
            affected = await productService.bulkEnrich(ids, user.id);
        }

        return createSuccessResponse({
            action,
            affected,
            ids
        });
    } catch (error) {
        logger.error("[BULK] Error processing bulk action", { error });
        return createErrorResponse(error);
    }
}

export const POST = handlePost;
