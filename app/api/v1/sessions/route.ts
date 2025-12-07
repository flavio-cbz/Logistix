import { serviceContainer } from "@/lib/services/container";
import { NextResponse } from "next/server";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
import { cookies } from "next/headers";

/**
 * GET /api/v1/sessions
 * Récupère toutes les sessions actives de l' utilisateur
 */
export async function GET() {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.getSessionUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new Error("Non authentifié")),
        { status: 401 }
      );
    }

    // Récupérer la session actuelle depuis les cookies
    const cookieStore = await cookies();
    const currentSessionCookie =
      cookieStore.get("logistix_session") ||
      cookieStore.get("logistix_session_dev");
    const currentSessionId = currentSessionCookie?.value || "";

    // Récupérer toutes les sessions actives via le service
    const sessions = await authService.getUserSessions(user.id);

    const response = {
      sessions: sessions.map((session: any) => ({
        ...session,
        isCurrent: session.id === currentSessionId,
      })),
      currentSessionId,
    };

    logger.info("Sessions retrieved successfully", {
      userId: user.id,
      sessionCount: sessions.length,
    });
    return createSuccessResponse(response);
  } catch (error) {
    logger.error("Error retrieving sessions", { error });
    return NextResponse.json(
      createErrorResponse(
        error instanceof Error ? error : new Error("Erreur interne")
      ),
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/sessions
 * Supprime toutes les sessions sauf la session actuelle
 */
export async function DELETE() {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.getSessionUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new Error("Non authentifié")),
        { status: 401 }
      );
    }

    // Récupérer la session actuelle
    const cookieStore = await cookies();
    const currentSessionCookie =
      cookieStore.get("logistix_session") ||
      cookieStore.get("logistix_session_dev");
    const currentSessionId = currentSessionCookie?.value || "";

    if (!currentSessionId) {
      return NextResponse.json(
        createErrorResponse(new Error("Session actuelle introuvable")),
        { status: 400 }
      );
    }

    const deletedCount = await authService.revokeAllSessionsExcept(user.id, currentSessionId);

    logger.info("Other sessions deleted successfully", {
      userId: user.id,
      deletedCount,
    });

    return createSuccessResponse({
      message: `${deletedCount} session(s) supprimée(s) avec succès`,
      deletedCount,
    });
  } catch (error) {
    logger.error("Error deleting sessions", { error });
    return NextResponse.json(
      createErrorResponse(
        error instanceof Error ? error : new Error("Erreur interne")
      ),
      { status: 500 }
    );
  }
}
