import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { optimizedApiGet } from "@/lib/utils/api-route-optimization";

async function metadataHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: "Non authentifié" }),
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: "Service de métadonnées temporairement désactivé",
      catalogs: [],
      brands: [],
      colors: [],
      materials: [],
      statuses: [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des métadonnées:", error);
    return new NextResponse(
      JSON.stringify({ message: "Service temporairement indisponible" }),
      { status: 503 }
    );
  }
}

// Utiliser le handler optimisé avec vérification conditionnelle de la base de données
export const GET = optimizedApiGet(metadataHandler, {
  requiresDatabase: false, // Service désactivé, pas besoin de DB pour le moment
  skipInitializationCheck: true,
  enableHealthCheck: false,
  cacheHeaders: true
});