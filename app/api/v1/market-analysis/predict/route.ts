import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/services/auth/auth';
import { logger } from '@/lib/utils/logging/logger';

/**
 * Calcule une régression linéaire simple.
 * @param data - Un tableau de paires [timestamp, valeur].
 * @returns Un objet avec la pente (m) et l'ordonnée à l'origine (b).
 */
function calculateLinearRegression(data: [number, number][]): { m: number; b: number } {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (const [x, y] of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  // Garde: si aucun point, retourner valeurs par défaut
  if (n === 0) {
    return { m: 0, b: 0 };
  }

  const denominator = (n * sumXX - sumX * sumX);
  // Si le dénominateur est nul, cela signifie pas de variance en X -> slope indéfinie
  if (denominator === 0) {
    // Retourner slope = 0 et b comme moyenne de Y
    const avgY = sumY / n;
    return { m: 0, b: avgY };
  }

  const m = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - m * sumX) / n;

  return { m, b };
}

// Référence d'utilisation minimale pour éviter l'erreur TS6133 si la fonction n'est pas appelée ailleurs
void calculateLinearRegression([]);

export async function GET(request: Request) {
  try {
    // 1. Authentification
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // 2. Récupération des paramètres
    const { searchParams } = new URL(request.url);
    const trackedProductId = searchParams.get('tracked_product_id');
    if (!trackedProductId) {
      return NextResponse.json({ error: 'Le paramètre "tracked_product_id" est requis' }, { status: 400 });
    }

    logger.info(`[API Predict] Début de la prédiction pour le produit ${trackedProductId} de l'utilisateur ${user.id}.`);

    // Tentative de chargement des tendances (tables non implémentées actuellement)
    // Remplacer par une requête DB réelle lorsque les tables seront disponibles
    const trends: { timestamp: number; price: number }[] = []; // TODO: charger depuis la base de données
    if (trends.length === 0) {
      logger.warn('[API Predict] Aucune donnée de tendances disponible pour la prédiction.');
      return NextResponse.json({
        error: 'Fonctionnalité de prédiction non encore implémentée - tables manquantes'
      }, { status: 501 });
    }

    // Préparer les données pour la régression
    const dataPoints: [number, number][] = trends.map(t => [t.timestamp, t.price]);
    const { m, b } = calculateLinearRegression(dataPoints);

    // Prédire le prix dans 30 jours
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const predictedPriceRaw = m * futureDate.getTime() + b;

    const predictedPrice = Number.isFinite(predictedPriceRaw) ? parseFloat(predictedPriceRaw.toFixed(2)) : null;

    logger.info(`[API Predict] Prédiction réussie pour le produit ${trackedProductId}. Pente: ${m}, Prix prédit: ${predictedPrice}`);

    // 5. Envoi de la réponse
    return NextResponse.json({
      prediction: {
        predictedPrice,
        predictionDate: futureDate.toISOString(),
        trend: m > 0 ? 'up' : m < 0 ? 'down' : 'stable',
      },
      regression: {
        slope: m,
        yIntercept: b,
        equation: Number.isFinite(m) && Number.isFinite(b) ? `y = ${m.toFixed(4)}x + ${b.toFixed(2)}` : 'N/A'
      },
      dataPointsUsed: trends.length,
    });

  } catch (error: any) {
    logger.error('[API Predict] Erreur inattendue dans le handler GET', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}