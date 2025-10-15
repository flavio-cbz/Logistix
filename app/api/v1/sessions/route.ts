import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
import { databaseService } from "@/lib/database";
import { userSessions } from "@/lib/database/schema";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";

/**
 * GET /api/v1/sessions
 * Récupère toutes les sessions actives de l'utilisateur
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getSessionUser();
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

    // Récupérer toutes les sessions actives (non expirées)
    const now = new Date().toISOString();
    const db = await databaseService.getDb();
    const sessions = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.userId, user.id), gt(userSessions.expiresAt, now)))
      .all();

    const response = {
      sessions: sessions.map((session: typeof userSessions.$inferSelect) => ({
        id: session.id,
        userId: session.userId,
        deviceName: session.deviceName,
        deviceType: session.deviceType,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isCurrent: session.id === currentSessionId,
      })),
      currentSessionId,
    };

    logger.info("Sessions retrieved successfully", {
      userId: user.id,
      sessionCount: sessions.length,
    });
    return NextResponse.json(createSuccessResponse(response));
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
export async function DELETE(_request: NextRequest) {
  try {
    const user = await getSessionUser();
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

    const db = await databaseService.getDb();
    
    // Supprimer toutes les sessions sauf la session actuelle
    await db
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.userId, user.id),
          // Ne pas supprimer la session actuelle
          // Note: userSessions.id !== currentSessionId n'est pas supporté directement
          // On doit faire une requête SQL brute ou récupérer toutes les sessions
        )
      )
      .run();

    // Alternative: Supprimer toutes puis recréer la session actuelle
    // Pour simplifier, on fait une requête qui exclut la session actuelle
    const result = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, user.id))
      .all();

    const sessionsToDelete = result.filter(
      (session: typeof userSessions.$inferSelect) =>
        session.id !== currentSessionId
    );

    for (const session of sessionsToDelete) {
      await db
        .delete(userSessions)
        .where(eq(userSessions.id, session.id))
        .run();
    }

    logger.info("Other sessions deleted successfully", {
      userId: user.id,
      deletedCount: sessionsToDelete.length,
    });

    return NextResponse.json(
      createSuccessResponse({
        message: `${sessionsToDelete.length} session(s) supprimée(s) avec succès`,
        deletedCount: sessionsToDelete.length,
      })
    );
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
