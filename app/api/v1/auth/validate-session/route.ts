import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

export async function GET(_request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const session = await authService.getSessionUser();

        if (!session) {
            return createSuccessResponse({ valid: false, user: null });
        }

        return createSuccessResponse({ valid: true, user: session });
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}
