<<<<<<< HEAD
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
=======
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
import { databaseService } from "@/lib/database";
import { userSessions } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * DELETE /api/v1/sessions/[id]
 * Supprime une session spécifique
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
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

    const db = await databaseService.getDb();

    // Vérifier que la session appartient bien à l'utilisateur
    const session = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, user.id)))
      .get();

    if (!session) {
      return NextResponse.json(
        createErrorResponse(new Error("Session non trouvée")),
        { status: 404 }
      );
    }

    // Supprimer la session
    await db.delete(userSessions).where(eq(userSessions.id, sessionId)).run();

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
    return NextResponse.json(
      createErrorResponse(
        error instanceof Error ? error : new Error("Erreur interne")
      ),
      { status: 500 }
    );
  }
}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
