import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { parcelleProductsQuerySchema } from "@/lib/schemas";
import { validateQuery } from "@/lib/middleware/validation-middleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    validateQuery(parcelleProductsQuerySchema, request);

    return createSuccessResponse({ 
      message: "Parcelle products endpoint secured",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error("Erreur interne"));
  }
}