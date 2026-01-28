import { serviceContainer } from "@/lib/services/container";
import { NextResponse, NextRequest } from "next/server";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";

/**
 * DELETE /api/v1/sessions/[id]
 * Supprime une session spécifique
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.getSessionUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new Error("Non authentifié")),
        { status: 401 }
      );
    }

    const { id: sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        createErrorResponse(new Error("ID de session manquant")),
        { status: 400 }
      );
    }

    await authService.revokeUserSession(user.id, sessionId);

    logger.info("Session deleted successfully", {
      userId: user.id,
      sessionId,
    });

    return NextResponse.json(
      createSuccessResponse({
        message: "Session supprimée avec succès",
      })
    );
  } catch (error) {
    logger.error("Error deleting session", { error });
    // Handle NotFoundError specifically if needed, but BaseService throws standard errors
    // which might need mapping to 404 if not handled by a global filter.
    // Here we just return 500 or 404 based on error message or type if we want to be precise,
    // but the generic error response is fine for now as per existing pattern.
    // Actually, let's try to return 404 if it's a NotFoundError.
    if (error instanceof Error && error.message.includes("Session not found")) {
      return NextResponse.json(
        createErrorResponse(new Error("Session non trouvée")),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createErrorResponse(
        error instanceof Error ? error : new Error("Erreur interne")
      ),
      { status: 500 }
    );
  }
}
