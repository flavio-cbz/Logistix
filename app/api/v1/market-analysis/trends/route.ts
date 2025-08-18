import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/services/auth/auth';
import { db } from '@/lib/services/database/drizzle-client';
import { marketAnalyses, users, marketTrends, trackedProducts } from '@/lib/services/database/drizzle-schema';
import { and, eq, or } from 'drizzle-orm';
import { logger } from '@/lib/utils/logging/logger';

export async function GET(request: Request) {
  try {
    // 1. Authentification
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // 2. Récupération des paramètres de l'URL
    const { searchParams } = new URL(request.url);
    const trackedProductId = searchParams.get('tracked_product_id');
    const analysisId = searchParams.get('analysis_id');

    if (!trackedProductId && !analysisId) {
      return NextResponse.json({ error: 'Le paramètre "tracked_product_id" ou "analysis_id" est requis' }, { status: 400 });
    }

    logger.info(`[API Trends] Récupération des tendances pour l'utilisateur ${user.id}`, { trackedProductId, analysisId });

    // 3. Construction de la requête
    // On s'assure que l'utilisateur ne peut accéder qu'à ses propres données de tendances
    // en joignant avec la table tracked_products et en vérifiant le user_id.
    const query = db.select({
        id: marketTrends.id,
        snapshotDate: marketTrends.snapshotDate,
        avgPrice: marketTrends.avgPrice,
        salesVolume: marketTrends.salesVolume
      })
      .from(marketTrends)
      .leftJoin(trackedProducts, eq(marketTrends.trackedProductId, trackedProducts.id))
      .where(
        and(
          // L'utilisateur doit être le propriétaire du produit suivi
          eq(trackedProducts.userId, user.id),
          // Et l'ID doit correspondre
          trackedProductId ? eq(marketTrends.trackedProductId, trackedProductId) : eq(marketTrends.analysisId, analysisId!)
        )
      )
      .orderBy(marketTrends.snapshotDate); // Trier par date
      
    const trends = await query;

    logger.info(`[API Trends] ${trends.length} points de données trouvés pour l'utilisateur ${user.id}.`);

    // 4. Envoi de la réponse
    return NextResponse.json({ trends });

  } catch (error: any) {
    logger.error('[API Trends] Erreur inattendue dans le handler GET', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}