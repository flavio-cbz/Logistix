import { serviceContainer } from "@/lib/services/container";
import { NextRequest, NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/middleware/validation-middleware";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";

/**
 * POST /api/v1/profile/change-password
 * Change le mot de passe de l'utilisateur connecté
 */
export async function POST(request: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.getSessionUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new Error("Non authentifié")),
        { status: 401 }
      );
    }

    // Valider le body
    const { data: validatedData } = await validateBody(changePasswordSchema, request);

    await authService.changePassword(user.id, validatedData.currentPassword, validatedData.newPassword);

    logger.info("Password changed successfully", { userId: user.id });
    return NextResponse.json(
      createSuccessResponse({
        message: "Mot de passe changé avec succès",
      })
    );
  } catch (error) {
    logger.error("Error changing password", { error });

    // Map AuthError to 400 or 401 if needed, but standard error response is usually 500 or 400 depending on error type.
    // BaseService errors usually have a code or type.
    if (error instanceof Error && error.message === "Invalid current password") {
      return NextResponse.json(
        createErrorResponse(new Error("Mot de passe actuel incorrect")),
        { status: 400 }
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
