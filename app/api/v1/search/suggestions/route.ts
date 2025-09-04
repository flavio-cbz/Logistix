import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { vintedSearchService as searchService } from "@/lib/services/search-service"; // Corrected import
import { ApiError, createApiErrorResponse } from "@/lib/utils/validation";
import { logger } from "@/lib/utils/logging/logger";

// GET /api/v1/search/suggestions : Obtenir des suggestions de recherche
export async function GET(req: Request) {
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
    const type = searchParams.get('type') || 'all'; // 'all', 'brands', 'categories', 'products', 'users'

    if (!query) {
      return NextResponse.json(
        createApiErrorResponse(new ApiError("Le paramètre 'query' est requis", 400, "MISSING_QUERY")),
        { status: 400 }
      );
    }

    logger.info(`[API Search Suggestions] Requête pour '${query}' de type '${type}' par l'utilisateur ${user.id}`);

    let suggestions: any[] = [];

    switch (type) {
      case 'brands':
        suggestions = await searchService.getBrandSuggestions(query);
        break;
      case 'categories':
        suggestions = await searchService.getCategorySuggestions(query);
        break;
      case 'products':
        suggestions = await searchService.getProductSuggestions(query);
        break;
      case 'transporteurs':
        suggestions = await searchService.getTransporteurSuggestions(query);
        return NextResponse.json({
          suggestions: suggestions.map((suggestion: any) => ({
            text: suggestion.transporteur,
            count: suggestion.count
          }))
        });
      case 'users':
        suggestions = await searchService.getUserSuggestions(query);
        return NextResponse.json({
          suggestions: suggestions.map((suggestion: any) => ({
            text: suggestion.nom,
            count: suggestion.count
          }))
        });
      case 'all':
      default:
        const [brandSuggestions, categorySuggestions, productSuggestions, transporteurSuggestions, userSuggestions] = await Promise.all([
          searchService.getBrandSuggestions(query),
          searchService.getCategorySuggestions(query),
          searchService.getProductSuggestions(query),
          searchService.getTransporteurSuggestions(query),
          searchService.getUserSuggestions(query),
        ]);

        suggestions = [
          ...brandSuggestions.map((suggestion: any) => ({ type: 'brand', text: suggestion.brand, count: suggestion.count })),
          ...categorySuggestions.map((suggestion: any) => ({ type: 'category', text: suggestion.category, count: suggestion.count })),
          ...productSuggestions.map((suggestion: any) => ({ type: 'product', text: suggestion.product, count: suggestion.count })),
          ...transporteurSuggestions.map((suggestion: any) => ({ type: 'transporteur', text: suggestion.transporteur, count: suggestion.count })),
          ...userSuggestions.map((suggestion: any) => ({ type: 'user', text: suggestion.nom, count: suggestion.count })),
        ];
        break;
    }

    logger.info(`[API Search Suggestions] ${suggestions.length} suggestions trouvées pour '${query}'`);
    return NextResponse.json({ suggestions });

  } catch (error: any) {
    logger.error("[API Search Suggestions] Erreur lors de la récupération des suggestions:", error);
    return NextResponse.json(
      createApiErrorResponse(new ApiError("Erreur lors de la récupération des suggestions", 500, "SUGGESTIONS_ERROR")),
      { status: 500 }
    );
  }
}