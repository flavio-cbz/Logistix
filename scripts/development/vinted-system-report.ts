// Importation des services nécessaires
import { generateReport } from '@/lib/services/ai/ai-fallback-service';
import { db } from '@/lib/services/database/drizzle-client';
import type { VintedAnalysisResult } from '@/lib/services/vinted-market-analysis';
import { users } from '@/lib/services/database/drizzle-schema';
import { count } from 'drizzle-orm';
// import { logs } from '@/lib/services/database/drizzle-schema'; // logs n'est pas exporté par drizzle-schema
// import { desc } from 'drizzle-orm'; // Inutilisé sans la table logs

// Correction : utiliser import type pour éviter TS2459 si le module n’exporte pas la valeur à l’exécution

// Utilisation du logger natif console pour le développement
const logger = {
  info: (...args: any[]) => console.info('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

async function main() {
  try {
    logger.info('Début de la génération du rapport système Vinted.');

    // Connexion à la base de données et récupération des informations
    const userCountResult = await db.select({ count: count(users.id) }).from(users);
    const userCount = userCountResult[0].count;
    // Supprimé temporairement car 'logs' n'est pas exporté par drizzle-schema.
    // const lastUpdateResult = await db.select().from(logs).orderBy(desc(logs.updatedAt)).limit(1);
    // const lastUpdate = lastUpdateResult[0];

    // Création d'un objet conforme à VintedAnalysisResult (tous champs obligatoires présents)
    const reportData: VintedAnalysisResult = {
      salesVolume: userCount ?? 0,
      avgPrice: 0,
      priceRange: { min: 0, max: 0 },
      brandInfo: null,
      catalogInfo: { id: 0, name: '' },
      rawItems: [],
      enrichedItems: [],
      analysisDate: new Date().toISOString(), // Utilise la date actuelle en l'absence de lastUpdate
      brandDistribution: {},
      modelDistribution: {},
    };

    // Génération du rapport
    generateReport(reportData);

    // Log du succès
    logger.info('Rapport généré avec succès.');
    
  } catch (error) {
    // Gestion des erreurs
    logger.error('Erreur lors de la génération du rapport système :', error);
    console.error('Une erreur est survenue :', error);
  }
}

main();