import { serviceContainer } from "@/lib/services/container";
import { NextRequest } from "next/server";
import { parcellesStatsQuerySchema } from "@/lib/schemas";
import { validateQuery } from "@/lib/middleware/validation-middleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await serviceContainer.getAuthService().getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    validateQuery(parcellesStatsQuerySchema, request);

    return createSuccessResponse({
      message: "Statistiques parcelles endpoint secured",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error("Erreur interne"));
  }
}
