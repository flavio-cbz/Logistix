import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";
import { container } from "@/core/container";
import { CatalogService } from "@/modules/metadata/catalog.service";

// Register the service if it's not already registered
try {
  container.register("catalogService", () => new CatalogService());
} catch (error) {
  // Service already registered, ignore
}

const catalogService = container.get<CatalogService>("catalogService");

// GET /api/v1/metadata/catalogs/tree - Récupère l'arborescence des catalogues
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tree = url.searchParams.get("tree");

  if (tree !== "true") {
    return new NextResponse(
      JSON.stringify({ message: "Paramètre 'tree=true' manquant ou invalide" }),
      { status: 400 }
    );
  }

  try {
    const user = await getSessionUser();
    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: "Non authentifié" }),
        { status: 401 }
      );
    }

    const catalogTree = await catalogService.getCatalogTree();
    return NextResponse.json(catalogTree);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'arborescence:", error);
    return new NextResponse(
      JSON.stringify({ message: "Erreur interne du serveur" }),
      { status: 500 }
    );
  }
}