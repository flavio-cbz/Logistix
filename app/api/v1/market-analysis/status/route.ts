import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { db } from "@/lib/services/database/drizzle-client";
import { marketAnalyses } from "@/lib/services/database/drizzle-schema";
import { eq } from "drizzle-orm";
import { ApiError, createApiErrorResponse } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logging/logger";

/**
 * GET /api/v1/market-analysis/status?id=<jobId>
 * Retourne le statut d'une tâche d'analyse pour l'utilisateur authentifié.
 * Utilisé pour le polling côté client.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Paramètre 'id' manquant", 400, "MISSING_ID")),
        { status: 400 }
      );
    }

    let task;
    try {
      task = await db.query.marketAnalyses.findFirst({
        where: eq(marketAnalyses.id, id),
      });
    } catch (dbError) {
      logger.error("[market-analysis/status] DB query failed", dbError);
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Erreur lors de l'accès aux données", 500, "DATABASE_ERROR")),
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Tâche introuvable", 404, "TASK_NOT_FOUND")),
        { status: 404 }
      );
    }

    // Autorisation : s'assurer que la tâche appartient à l'utilisateur
    if (task.userId !== user.id) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Non autorisé à accéder à cette tâche", 403, "FORBIDDEN")),
        { status: 403 }
      );
    }

    // Préparer la réponse : éviter d'envoyer des payloads trop volumineux
    const base = {
      id: task.id,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      expiresAt: (task as any).expiresAt ?? null,
      error: (task as any).error ?? null,
    };

    // Si completed, inclure un résultat structuré restreint
    if (task.status === "completed") {
      // task.result peut être un JSON stringifié selon le schéma Drizzle; ici on renvoie tel quel
      // Côté client on s'attend à un objet VintedAnalysisResult ou équivalent
      return NextResponse.json({
        ...base,
        result: (task as any).result ?? null,
      }, { status: 200 });
    }

    return NextResponse.json(base, { status: 200 });

  } catch (error: any) {
    logger.error("[market-analysis/status] Unexpected error", error);
    if (error instanceof ApiError) {
      return NextResponse.json(createApiErrorResponse(error), { status: error.statusCode ?? 500 });
    }
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne du serveur", 500, "INTERNAL_ERROR")),
      { status: 500 }
    );
  }
}