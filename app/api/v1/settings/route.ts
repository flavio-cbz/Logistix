import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { updateSettingsSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/middleware/validation-middleware";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { databaseService } from "@/lib/database";
import { users } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/utils/logging/logger";

/**
 * GET /api/v1/settings
 * Récupère les paramètres de l'utilisateur connecté
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

    const database = await databaseService.getDb();
    const profile = await database
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .get();

    if (!profile) {
      return NextResponse.json(
        createErrorResponse(new Error("Utilisateur non trouvé")),
        { status: 404 }
      );
    }

    // Parser les préférences JSON
    const preferences =
      typeof profile.preferences === "string"
        ? JSON.parse(profile.preferences || "{}")
        : profile.preferences || {};

    const response = {
      theme: profile.theme || "system",
      language: profile.language || "fr",
      animations: preferences.animations ?? true, // Par défaut activé
      preferences: {
        currency: preferences.currency || "EUR",
        weightUnit: preferences.weightUnit || "g",
        dateFormat: preferences.dateFormat || "DD/MM/YYYY",
        autoExchangeRate: preferences.autoExchangeRate ?? true,
      },
    };

    logger.info("Settings retrieved successfully", { userId: user.id });
    return NextResponse.json(createSuccessResponse(response));
  } catch (error) {
    logger.error("Error retrieving settings", { error });
    return NextResponse.json(
      createErrorResponse(
        error instanceof Error ? error : new Error("Erreur interne")
      ),
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/settings
 * Met à jour les paramètres de l'utilisateur connecté
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new Error("Non authentifié")),
        { status: 401 }
      );
    }

    const { data: validatedData } = await validateBody(
      updateSettingsSchema,
      request
    );

    // Récupérer les préférences actuelles
    const database = await databaseService.getDb();
    const currentProfile = await database
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .get();

    if (!currentProfile) {
      return NextResponse.json(
        createErrorResponse(new Error("Utilisateur non trouvé")),
        { status: 404 }
      );
    }

    const currentPreferences =
      typeof currentProfile.preferences === "string"
        ? JSON.parse(currentProfile.preferences || "{}")
        : currentProfile.preferences || {};

    // Fusionner les nouvelles préférences avec les anciennes
    const updatedPreferences = {
      ...currentPreferences,
      ...(validatedData.preferences || {}),
    };

    // Si animations est fourni directement (pas dans preferences), l'ajouter
    if (validatedData.animations !== undefined) {
      updatedPreferences.animations = validatedData.animations;
    }

    // Mettre à jour le profil
    const updateData: any = {};

    if (validatedData.theme !== undefined) {
      updateData.theme = validatedData.theme;
    }

    if (validatedData.language !== undefined) {
      updateData.language = validatedData.language;
    }

    // Mettre à jour les préférences si présentes ou si animations a changé
    if (validatedData.preferences || validatedData.animations !== undefined) {
      await database
        .update(users)
        .set({
          ...updateData,
          preferences: JSON.stringify(updatedPreferences),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id))
        .run();
    } else if (Object.keys(updateData).length > 0) {
      // Sinon, juste updater theme/language
      await database
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id))
        .run();
    }

    logger.info("Settings updated successfully", { userId: user.id });
    return NextResponse.json(
      createSuccessResponse({
        message: "Paramètres mis à jour avec succès",
      })
    );
  } catch (error) {
    logger.error("Error updating settings", { error });
    return NextResponse.json(
      createErrorResponse(
        error instanceof Error ? error : new Error("Erreur interne")
      ),
      { status: 500 }
    );
  }
}
