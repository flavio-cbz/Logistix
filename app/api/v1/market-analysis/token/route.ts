import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { ApiError, createApiErrorResponse } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logging/logger";

/**
 * GET /api/v1/market-analysis/token
 * Retourne un access_token_web Vinted valide pour l'utilisateur courant.
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

    // Appel interne à la nouvelle API d'authentification Vinted
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/v1/vinted/auth`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // On peut ajouter ici un header d'authentification si nécessaire
        // "Cookie": req.headers.get("cookie") ?? ""
      },
      cache: "no-store",
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok || !data?.tokens?.accessToken) {
      return NextResponse.json(
        createApiErrorResponse(
          new ApiError(
            data?.error || "Impossible d'obtenir un access_token_web valide. Le cookie/token est peut-être expiré.",
            res.status || 401,
            "INVALID_SESSION_TOKEN"
          )
        ),
        { status: res.status || 401 }
      );
    }

    return NextResponse.json({
      access_token_web: data.tokens.accessToken,
      success: true,
    }, { status: 200 });

  } catch (error: any) {
    logger.error(`[TokenAPI] Erreur lors de la récupération de l'access_token_web:`, error);

    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur interne lors de la récupération de l'access_token_web", 500, "INTERNAL_ERROR")),
      { status: 500 }
    );
  }
}