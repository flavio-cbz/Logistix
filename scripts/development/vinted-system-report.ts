// Importation des services nécessaires
import { generateReport } from '@/lib/services/ai/ai-fallback-service';
import { db } from '@/lib/services/database/drizzle-client';
import { VintedAnalysisResult } from '@/lib/services/vinted-market-analysis';

// Utilisation du logger natif console pour le développement
const logger = {
  info: (...args: any[]) => console.info('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

async function main() {
  try {
    logger.info('Début de la génération du rapport système Vinted.');

    // Connexion à la base de données et récupération des informations
    const userCount = await db.users.count();
    const lastUpdate = await db.logs.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    // Création d'un objet conforme à VintedAnalysisResult (tous champs obligatoires présents)
    const reportData: VintedAnalysisResult = {
      salesVolume: userCount ?? 0,
      avgPrice: 0,
      priceRange: { min: 0, max: 0 },
      brandInfo: null,
      catalogInfo: { id: 0, name: '' },
      rawItems: [],
      enrichedItems: [],
      analysisDate: lastUpdate?.updatedAt?.toString() ?? new Date().toISOString(),
      brandDistribution: {},
      modelDistribution: {},
    };

    // Génération du rapport
    generateReport(reportData);

    // Log du succès
    logger.info('Rapport généré avec succès.');
    console.log(reportData);
  } catch (error) {
    // Gestion des erreurs
    logger.error('Erreur lors de la génération du rapport système :', error);
    console.error('Une erreur est survenue :', error);
  }
}

main();