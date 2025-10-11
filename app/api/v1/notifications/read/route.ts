import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { notificationsReadBodySchema } from "@/lib/schemas";
import { validateBody } from "@/lib/middleware/validation-middleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

// POST /api/v1/notifications/read - Marquer les notifications comme lues
export async function POST(request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation du body
    const { notificationIds, markAllRead } = (await validateBody(notificationsReadBodySchema, request)).data;

    if (markAllRead) {
      // Marquer toutes les notifications comme lues
      await databaseService.execute(
        `
        UPDATE notifications SET read = 1, readAt = ? WHERE userId = ? AND read = 0
      `,
        [new Date().toISOString(), user.id],
        "mark-all-notifications-read",
      );

      return createSuccessResponse({ 
        message: "Toutes les notifications marquées comme lues" 
      });
    }

    // Marquer les notifications spécifiées comme lues
    const placeholders = notificationIds.map(() => "?").join(",");
    await databaseService.execute(
      `
      UPDATE notifications SET read = 1, readAt = ? 
      WHERE id IN (${placeholders}) AND userId = ?
    `,
      [new Date().toISOString(), ...notificationIds, user.id],
      "mark-notifications-read",
    );

    return createSuccessResponse({
      message: `${notificationIds.length} notifications marquées comme lues`,
    });
  } catch (error) {
    console.error("Erreur lors du marquage des notifications:", error);
    return createErrorResponse(error);
  }
}
