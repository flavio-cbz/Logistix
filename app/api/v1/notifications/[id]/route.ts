import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { notificationParamsSchema, updateNotificationSchema } from "@/lib/schemas";
import { validateParams, validateBody } from "@/lib/middleware/validation-middleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

// PUT /api/v1/notifications/[id] - Mise à jour d'une notification
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation des paramètres
    const { id } = validateParams(notificationParamsSchema, params).data;

    // Validation du body
    const { read, archived } = (await validateBody(updateNotificationSchema, request)).data;

    const updateFields = [];
    const updateValues = [];

    if (typeof read === "boolean") {
      updateFields.push("read = ?");
      updateValues.push(read ? 1 : 0);
      if (read) {
        updateFields.push("readAt = ?");
        updateValues.push(new Date().toISOString());
      }
    }

    if (typeof archived === "boolean") {
      updateFields.push("archived = ?");
      updateValues.push(archived ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Aucun champ à mettre à jour",
          },
        },
        { status: 400 },
      );
    }

    updateFields.push("updatedAt = ?");
    updateValues.push(new Date().toISOString());
    updateValues.push(id, user.id);

    await databaseService.execute(
      `
      UPDATE notifications SET ${updateFields.join(", ")} 
      WHERE id = ? AND userId = ?
    `,
      updateValues,
      "update-notification",
    );

    return createSuccessResponse({ 
      message: "Notification mise à jour avec succès" 
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la notification:", error);
    return createErrorResponse(error);
  }
}

// DELETE /api/v1/notifications/[id] - Suppression d'une notification
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation des paramètres
    const { id } = validateParams(notificationParamsSchema, params).data;

    await databaseService.execute(
      `
      DELETE FROM notifications WHERE id = ? AND userId = ?
    `,
      [id, user.id],
      "delete-notification",
    );

    return createSuccessResponse({ 
      message: "Notification supprimée avec succès" 
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la notification:", error);
    return createErrorResponse(error);
  }
}
