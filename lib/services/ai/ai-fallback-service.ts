/**
 * Service de fallback AI pour la génération de rapports
 * @note Currently unused - may be removed if not needed for fallback scenarios
 */

export async function generateReport(data: any): Promise<string> {
  // Génération de rapport simple sans IA externe
  const report = {
    timestamp: new Date().toISOString(),
    summary: "Rapport généré automatiquement",
    data: data,
    recommendations: [
      "Vérifier les configurations système",
      "Surveiller les performances",
      "Maintenir les tokens à jour",
    ],
  };

  return JSON.stringify(report, null, 2);
}

export class AIFallbackService {
  async generateSystemReport(data: any): Promise<string> {
    return generateReport(data);
  }

  async analyzePerformance(metrics: any): Promise<string> {
    return generateReport({ type: "performance", metrics });
  }
}

export const aiFallbackService = new AIFallbackService();
