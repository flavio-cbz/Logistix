import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { ApiError, createApiErrorResponse } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logging/logger";
import { vintedSearchService } from "@/lib/services/search-service"; // Corrected import

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Authentification requise", 401, "AUTH_REQUIRED")),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';

    if (!query) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Le paramètre 'query' est requis", 400, "MISSING_QUERY")),
        { status: 400 }
      );
    }

    logger.info(`[API Brand Suggestions] Requête pour les suggestions de marques pour '${query}' par l'utilisateur ${user.id}`);

    const data = await vintedSearchService.getBrandSuggestions(query);

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error("[API Brand Suggestions] Erreur lors de la récupération des suggestions de marques:", error);
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur lors de la récupération des suggestions de marques", 500, "BRAND_SUGGESTIONS_ERROR")),
      { status: 500 }
    );
  }
}