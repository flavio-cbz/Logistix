import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { settingsUpdateBodySchema } from "@/lib/schemas";
import { validateBody } from "@/lib/middleware/validation-middleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

export async function GET(_request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    return createSuccessResponse({ 
      message: "Settings GET endpoint secured",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error("Erreur interne"));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    await validateBody(settingsUpdateBodySchema, request);

    return createSuccessResponse({ 
      message: "Settings PUT endpoint secured",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error("Erreur interne"));
  }
}
