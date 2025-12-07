import { serviceContainer } from "@/lib/services/container";
import { NextRequest, NextResponse } from "next/server";
import { updateSettingsSchema } from "@/lib/schemas";
import { validateBody } from "@/lib/middleware/validation-middleware";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";

/**
 * GET /api/v1/settings
 * Récupère les paramètres de l'utilisateur connecté
 */
export async function GET() {
  try {
    const user = await serviceContainer.getAuthService().getSessionUser();
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new Error("Non authentifié")),
        { status: 401 }
      );
    }

    const userService = serviceContainer.getUserService();
    const settings = await userService.getSettings(user.id);

    logger.info("Settings retrieved successfully", { userId: user.id });
    return createSuccessResponse(settings);
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
    const user = await serviceContainer.getAuthService().getSessionUser();
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

    const userService = serviceContainer.getUserService();
    const result = await userService.updateSettings(user.id, validatedData);

    logger.info("Settings updated successfully", { userId: user.id });
    return createSuccessResponse(result);
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

