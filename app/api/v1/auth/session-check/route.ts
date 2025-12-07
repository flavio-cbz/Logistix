import { NextRequest, NextResponse } from "next/server";
import { databaseService } from "@/lib/services/database/db";

/**
 * GET /api/v1/auth/session-check
 * Endpoint de validation de session (vérifie réellement en base de données)
 */

export async function GET(request: NextRequest) {
  try {
    // Récupération du cookie de session
    const cookieName = process.env['COOKIE_NAME'] || 'logistix_session';
    const sessionId = request.cookies.get(cookieName)?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Session non trouvée"
        },
        { status: 401 }
      );
    }

    // Validation basique du format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Format de session invalide"
        },
        { status: 401 }
      );
    }

    // Vérifier la session en base de données
    const session = await databaseService.queryOne<{
      session_id: string;
      user_id: string;
      username: string;
      expires_at: string;
    }>(
      `SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.email
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [sessionId],
      "session-check"
    );

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Session invalide ou expirée. Veuillez vous reconnecter."
        },
        { status: 401 }
      );
    }

    // Vérifier l'expiration
    const expiresAt = new Date(session.expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      // Nettoyage de la session expirée (optionnel, peut être fait par un job cron)
      await databaseService.execute(
        "DELETE FROM user_sessions WHERE id = ?",
        [sessionId],
        "cleanup-expired-session"
      );

      return NextResponse.json(
        {
          success: false,
          error: "Session expirée. Veuillez vous reconnecter."
        },
        { status: 401 }
      );
    }

    // Session valide
    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: session.user_id,
          username: session.username,
          // email: session.email, // Si on veut renvoyer l'email
        },
        session: {
          id: sessionId,
          expiresAt: session.expires_at,
        }
      }
    });

  } catch (_error) {
    // console.error("❌ Erreur dans session-check:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de la vérification de session"
      },
      { status: 500 }
    );
  }
}
