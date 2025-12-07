<<<<<<< HEAD
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
=======
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { changePasswordSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/middleware/validation-middleware";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { databaseService } from "@/lib/database";
import { users } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logging/logger";
import bcrypt from "bcryptjs";

/**
 * POST /api/v1/profile/change-password
 * Change le mot de passe de l'utilisateur connecté
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new Error("Non authentifié")),
        { status: 401 }
      );
    }

    // Valider le body
    const { data: validatedData } = await validateBody(changePasswordSchema, request);

    // Récupérer l'utilisateur pour vérifier le mot de passe actuel
    const db = await databaseService.getDb();
    const userProfile = await db.select().from(users).where(eq(users.id, user.id)).get();
    
    if (!userProfile) {
      return NextResponse.json(
        createErrorResponse(new Error("Utilisateur non trouvé")),
        { status: 404 }
      );
    }

    // Vérifier le mot de passe actuel
    const isValidPassword = await bcrypt.compare(
      validatedData.currentPassword,
      userProfile.passwordHash
    );

    if (!isValidPassword) {
      logger.warn("Invalid current password attempt", { userId: user.id });
      return NextResponse.json(
        createErrorResponse(new Error("Mot de passe actuel incorrect")),
        { status: 400 }
      );
    }

    // Hasher le nouveau mot de passe
    const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 10);

    // Mettre à jour le mot de passe
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id))
      .run();

    logger.info("Password changed successfully", { userId: user.id });
    return NextResponse.json(
      createSuccessResponse({
        message: "Mot de passe changé avec succès",
      })
    );
  } catch (error) {
    logger.error("Error changing password", { error });
    return createErrorResponse(
      error instanceof Error ? error : new Error("Erreur interne")
    );
  }
}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
