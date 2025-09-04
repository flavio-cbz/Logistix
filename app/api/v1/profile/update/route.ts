import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { db } from "@/lib/services/database/drizzle-client";
import { users } from "@/lib/services/database/drizzle-schema";
import { eq } from "drizzle-orm";
import { ApiError, createApiErrorResponse } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logging/logger";
import { profileFormSchema } from "@/lib/validations/profile-form-schema";
import bcrypt from "bcrypt"; // Changed from bcryptjs

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      );
    }

    const requestBody = await request.json();
    
    // Validate password length if provided
    if (requestBody.password && requestBody.password.length > 0 && requestBody.password.length < 4) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Le mot de passe doit contenir au moins 4 caractères.", 400, "PASSWORD_TOO_SHORT")),
        { status: 400 }
      );
    }

    const validation = profileFormSchema.safeParse(requestBody);

    if (!validation.success) {
      const errors = Object.entries(validation.error.flatten().fieldErrors).flatMap(([field, messages]) =>
        (messages || []).map((message: string) => ({ field, message, code: 'INVALID_INPUT' })) // Added type annotation for message
      );
      logger.error("Validation failed for profile update:", { errors, requestBody });
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Données d'entrée invalides", 400, "VALIDATION_ERROR", errors)),
        { status: 400 }
      );
    }

    const { username, password } = validation.data;
    const updateData: { username?: string; hashedPassword?: string } = {};

    if (username) {
      updateData.username = username;
    }

    if (password) {
      updateData.hashedPassword = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Aucune donnée à mettre à jour", 400, "NO_DATA_TO_UPDATE")),
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    logger.info(`Profil utilisateur ${user.id} mis à jour avec succès.`);

    return NextResponse.json({ success: true, message: "Profil mis à jour avec succès" }, { status: 200 });

  } catch (error: any) {
    logger.error("Erreur lors de la mise à jour du profil:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(createApiErrorResponse(error), { status: error.statusCode ?? 500 });
    }

    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne du serveur", 500, "INTERNAL_SERVER_ERROR")),
      { status: 500 }
    );
  }
}