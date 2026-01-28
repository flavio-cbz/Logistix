import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import { serviceContainer } from "@/lib/services/container";
import { logger } from "@/lib/utils/logging/logger";
=======
import { databaseService } from "@/lib/database";
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

/**
 * GET /api/v1/auth/session-check
 * Endpoint de validation de session
 * Utilise AuthService pour garantir une logique cohérente avec le reste de l'app
 */
export async function GET(request: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const cookieName = process.env['COOKIE_NAME'] || 'logistix_session';
    const sessionId = request.cookies.get(cookieName)?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session non trouvée" },
        { status: 401 }
      );
    }

<<<<<<< HEAD
    // Utiliser getSessionUser qui gère déjà la validation, l'expiration et le nettoyage
    const user = await authService.getSessionUser();

    if (!user) {
=======
    // Validation basique du format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
      return NextResponse.json(
        { success: false, error: "Session invalide ou expirée" },
        { status: 401 }
      );
    }

    // Session valide
    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.isAdmin ? 'admin' : 'user'
        },
        session: {
          id: sessionId,
          // Note: l'expiration précise n'est pas exposée par getSessionUser pour l'instant,
          // mais si on a un user, c'est que la session est valide.
          isValid: true
        }
      }
    });

  } catch (error) {
    logger.error("Error in session-check", { error });
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur lors de la vérification de session",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
