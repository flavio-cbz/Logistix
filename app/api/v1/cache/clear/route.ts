import { serviceContainer } from "@/lib/services/container";
import { NextRequest, NextResponse } from "next/server";
import { databaseService } from "@/lib/database";


// POST /api/v1/cache/clear - Vidage du cache
export async function POST(request: NextRequest) {
  try {
    const user = await serviceContainer.getAuthService().getSessionUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Non authentifié" },
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { cacheTypes = ["all"], force = false } = body;

    const clearResults = {
      cleared: [] as string[],
      errors: [] as string[],
      timestamp: new Date().toISOString(),
    };

    // Différents types de cache à vider
    for (const cacheType of cacheTypes) {
      try {
        switch (cacheType) {
          case "user_sessions":
          case "all":
            if (force) {
              await databaseService.execute(
                "DELETE FROM cache_entries WHERE type = ? AND userId = ?",
                ["session", user.id],
                "clear-session-cache",
              );
            }
            clearResults.cleared.push("user_sessions");
            break;

          case "statistics":
          case "all":
            await databaseService.execute(
              "DELETE FROM cache_entries WHERE type = ? AND userId = ?",
              ["statistics", user.id],
              "clear-stats-cache",
            );
            clearResults.cleared.push("statistics");
            break;

          case "exports":
          case "all":
            await databaseService.execute(
              "DELETE FROM cache_entries WHERE type = ? AND userId = ? AND createdAt < ?",
              [
                "export",
                user.id,
                new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              ],
              "clear-export-cache",
            );
            clearResults.cleared.push("exports");
            break;
        }
      } catch (error) {
        clearResults.errors.push(`Erreur vidage ${cacheType}: ${error}`);
      }
    }

    // Enregistrement de l'opération
    const operationId = `cache_clear_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await databaseService.execute(
      `
      INSERT INTO system_operations (
        id, userId, operation, details, createdAt
      ) VALUES (?, ?, ?, ?, ?)
    `,
      [
        operationId,
        user.id,
        "cache_clear",
        JSON.stringify(clearResults),
        new Date().toISOString(),
      ],
      "log-cache-clear-operation",
    );

    return NextResponse.json({
      success: true,
      data: {
        ...clearResults,
        message: `Cache vidé pour ${clearResults.cleared.length} types`,
      },
    });
  } catch (_error) {
    // console.error("Erreur vidage cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur interne du serveur",
        },
      },
      { status: 500 },
    );
  }
}
