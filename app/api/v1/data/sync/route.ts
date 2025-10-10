import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { logger } from "@/lib/utils/logging/logger";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";
import { getParcelleRepository } from "@/lib/infrastructure/repositories/parcelle-repository.factory";
import { ListParcellesUseCase } from "@/lib/application/use-cases/list-parcelles.use-case";

export async function GET(_request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    logger.info("Début de la synchronisation des données", { userId: user.id });

    // Récupération des parcelles via le repository
    const parcelleRepo = getParcelleRepository();
    const listParcellesUseCase = new ListParcellesUseCase(parcelleRepo);
    const { parcelles } = await listParcellesUseCase.execute({ userId: String(user.id) });

    // Pour l'instant, on retourne des tableaux vides pour produits et ventes
    // TODO: Implémenter les repositories pour produits et ventes
    const produits: any[] = [];
    const ventes: any[] = [];

    // Calcul des statistiques simples
    const stats = {
      totalProduits: produits.length,
      totalParcelles: parcelles.length,
      totalVentes: ventes.length,
      beneficesTotal: 0,
      moyennePrixVente: 0,
    };

    const responseData = {
      parcelles,
      produits,
      ventes,
      stats,
      timestamp: new Date().toISOString(),
    };

    logger.info("Synchronisation des données terminée", {
      userId: user.id,
      parcellesCount: parcelles.length,
      produitsCount: produits.length,
      ventesCount: ventes.length
    });

    return createSuccessResponse(responseData);
  } catch (error) {
    logger.error("Erreur lors de la synchronisation des données", { error });
    return createErrorResponse(error as Error);
  }
}
