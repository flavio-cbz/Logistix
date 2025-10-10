import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { parcellesStatsQuerySchema } from "@/lib/schemas";
import { validateQuery } from "@/lib/middleware/validation-middleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    const validationResult = validateQuery(request, parcellesStatsQuerySchema);
    if (!validationResult.success) {
      return validationResult.response;
    }

    return createSuccessResponse({ 
      message: "Statistiques parcelles endpoint secured",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error("Erreur interne"));
  }
}
