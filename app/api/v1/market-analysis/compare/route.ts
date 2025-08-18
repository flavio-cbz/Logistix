import { NextResponse } from 'next/server';
import { vintedMarketAnalysisService, AnalysisRequest, VintedApiError } from '@/lib/services/vinted-market-analysis';
import { getSessionUser } from '@/lib/services/auth/auth';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { logger } from '@/lib/utils/logging/logger';

// Le corps de la requête attend un tableau de demandes d'analyse partielles
interface CompareItemRequest extends Omit<AnalysisRequest, 'token'> {
  // Un identifiant unique côté client pour faire correspondre la requête et la réponse
  requestId: string;
}

export async function POST(request: Request) {
  try {
    // 1. Authentification et récupération du token
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    const vintedCookie = await vintedSessionManager.getSessionCookie(user.id);
    if (!vintedCookie) {
      return NextResponse.json({ error: 'Cookie de session Vinted non configuré ou invalide' }, { status: 403 });
    }

    // 2. Validation du corps de la requête
    const body = await request.json();
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Le corps de la requête doit contenir un tableau "items"' }, { status: 400 });
    }
    const itemsToCompare: CompareItemRequest[] = body.items;

    logger.info(`[API Compare] Début de la comparaison pour ${itemsToCompare.length} articles par l'utilisateur ${user.id}.`);

    // 3. Lancement des analyses en parallèle
    const comparisonPromises = itemsToCompare.map(item => {
      const analysisRequest: AnalysisRequest = {
        ...item,
        token: vintedCookie,
      };
      return vintedMarketAnalysisService.analyzeProduct(analysisRequest)
        .then(result => ({
          requestId: item.requestId,
          status: 'fulfilled',
          data: result
        }))
        .catch(error => ({
          requestId: item.requestId,
          status: 'rejected',
          error: {
            message: error.message,
            isVintedApiError: error instanceof VintedApiError,
            context: error.context
          }
        }));
    });

    const results = await Promise.all(comparisonPromises);

    logger.info(`[API Compare] Comparaison terminée pour l'utilisateur ${user.id}.`);

    // 4. Envoi de la réponse
    return NextResponse.json({ results });

  } catch (error: any) {
    logger.error('[API Compare] Erreur inattendue dans le handler POST', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}