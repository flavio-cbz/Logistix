import { serviceContainer } from "@/lib/services/container";
import { NextRequest } from "next/server";
import { updateProfileSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/middleware/validation-middleware";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";

/**
 * GET /api/v1/profile
 * Récupère le profil complet de l'utilisateur connecté
 */
export async function GET() {
  try {
    const user = await serviceContainer.getAuthService().getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    const userService = serviceContainer.getUserService();
    const profile = await userService.getProfile(user.id);

    logger.info("Profile retrieved successfully", { userId: user.id });
    return createSuccessResponse(profile);
  } catch (error) {
    logger.error("Error retrieving profile", { error });
    return createErrorResponse(
      error instanceof Error ? error : new Error("Erreur interne")
    );
  }
}

/**
 * PUT /api/v1/profile
 * Met à jour le profil de l'utilisateur connecté
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await serviceContainer.getAuthService().getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Valider le body
    const { data: validatedData } = await validateBody(updateProfileSchema, request);

    const userService = serviceContainer.getUserService();
    const updatedProfile = await userService.updateProfile(user.id, validatedData);

    logger.info("Profile updated successfully", { userId: user.id });
    return createSuccessResponse({
      message: "Profil mis à jour avec succès",
      profile: updatedProfile,
    });
  } catch (error) {
    logger.error("Error updating profile", { error });
    return createErrorResponse(
      error instanceof Error ? error : new Error("Erreur interne")
    );
  }
}

