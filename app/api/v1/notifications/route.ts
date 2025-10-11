import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { validateQuery, validateBody } from "@/lib/middleware/validation-middleware";
import { notificationsQuerySchema, createNotificationSchema } from "@/lib/schemas";
import { createSuccessResponse, createErrorResponse, createCreatedResponse } from "@/lib/utils/api-response";

// GET /api/v1/notifications - Récupération des notifications avec validation Zod
export async function GET(request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation des paramètres de requête avec Zod
    const queryResult = validateQuery(notificationsQuerySchema as any, request);
    const { unread, limit, offset, type, priority, sortBy, sortOrder } = queryResult.data as any;

    // Construction de la requête avec filtres validés
    let whereClause = "WHERE userId = ?";
    const params = [user.id];

    if (unread) {
      whereClause += " AND read = 0";
    }

    if (type) {
      whereClause += " AND type = ?";
      params.push(type);
    }

    if (priority) {
      whereClause += " AND priority = ?";
      params.push(priority);
    }

    const notifications = await databaseService.query(
      `
      SELECT 
        id, title, message, type, priority, read, data, createdAt
      FROM notifications 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `,
      [...params, limit, offset],
      "get-notifications",
    );

    const totalCount = await databaseService.queryOne(
      `
      SELECT COUNT(*) as count FROM notifications ${whereClause}
    `,
      params,
      "count-notifications",
    );

    const unreadCount = await databaseService.queryOne(
      `
      SELECT COUNT(*) as count FROM notifications 
      WHERE userId = ? AND read = 0
    `,
      [user.id],
      "count-unread-notifications",
    );

    return createSuccessResponse({
      notifications: notifications || [],
      pagination: {
        total: totalCount?.count || 0,
        unread: unreadCount?.count || 0,
        limit,
        offset,
        hasMore: (totalCount?.count || 0) > offset + limit,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// POST /api/v1/notifications - Création d'une notification avec validation Zod
export async function POST(request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Validation du body avec Zod
    const { title, message, type, priority, data } = (await validateBody(createNotificationSchema, request)).data;

    // Génération d'un ID unique pour la notification
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Création sécurisée de la notification
    await databaseService.execute(
      `
      INSERT INTO notifications (
        id, userId, title, message, type, priority, read, data, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        notificationId,
        user.id,
        title,
        message,
        type,
        priority,
        false,
        JSON.stringify(data),
        new Date().toISOString(),
      ],
      "create-notification",
    );

    // Réponse de succès standardisée
    return createCreatedResponse({ 
      notificationId, 
      message: "Notification créée avec succès" 
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
