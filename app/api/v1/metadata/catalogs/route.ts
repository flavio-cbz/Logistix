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

// GET /api/v1/metadata/catalogs - Récupère tous les catalogues
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: "Non authentifié" }),
        { status: 401 }
      );
    }

    const catalogs = await catalogService.getAllCatalogs();
    return NextResponse.json(catalogs);
  } catch (error) {
    console.error("Erreur lors de la récupération des catalogues:", error);
    return new NextResponse(
      JSON.stringify({ message: "Erreur interne du serveur" }),
      { status: 500 }
    );
  }
}