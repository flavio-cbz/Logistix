import { z } from "zod";
import { runMarketAnalysisInference } from "./inference-client";
import { VintedAnalysisResult } from "../vinted-market-analysis";
import { AdvancedMetrics } from "@/lib/analytics/advanced-analytics-engine";

// Schémas étendus pour les rapports avancés
const InsightSchema = z.object({
  type: z.enum(['opportunity', 'risk', 'trend', 'anomaly']),
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  impact: z.enum(['low', 'medium', 'high']),
  evidence: z.array(z.string()),
  actionable: z.boolean(),
});

const TrendPredictionSchema = z.object({
  timeframe: z.enum(['1week', '1month', '3months']),
  direction: z.enum(['up', 'down', 'stable']),
  magnitude: z.number(),
  confidence: z.number().min(0).max(1),
  factors: z.array(z.string()),
});

const CompetitiveAnalysisSchema = z.object({
  position: z.enum(['leader', 'challenger', 'follower', 'niche']),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  opportunities: z.array(z.string()),
  threats: z.array(z.string()),
});

const EnhancedReportSchema = z.object({
  summary: z.string(),
  keyInsights: z.array(InsightSchema),
  recommendations: z.array(z.string()),
  trendPredictions: z.array(TrendPredictionSchema),
  competitiveAnalysis: CompetitiveAnalysisSchema,
  marketHealth: z.object({
    score: z.number().min(0).max(100),
    factors: z.array(z.string()),
  }),
  riskAssessment: z.object({
    level: z.enum(['low', 'medium', 'high']),
    factors: z.array(z.string()),
  }),
});

export type Insight = z.infer<typeof InsightSchema>;
export type TrendPrediction = z.infer<typeof TrendPredictionSchema>;
export type CompetitiveAnalysis = z.infer<typeof CompetitiveAnalysisSchema>;
export type EnhancedReport = z.infer<typeof EnhancedReportSchema>;

// Maintien de la compatibilité avec l'ancien type
const ReportSchema = z.object({
  summary: z.string(),
  recommendations: z.array(z.string()),
});

type Report = z.infer<typeof ReportSchema>;

const ENHANCED_REPORT_PROMPT_TEMPLATE = `
Tu es un expert en analyse de marché. Génère un rapport complet basé sur les données suivantes.

Données d'analyse:
{analysis_data}

Métriques avancées:
{advanced_metrics}

Réponds uniquement avec un objet JSON valide au format suivant:
{
  "summary": "Résumé exécutif de l'analyse de marché en 2-3 phrases",
  "keyInsights": [
    {
      "type": "opportunity|risk|trend|anomaly",
      "title": "Titre court de l'insight",
      "description": "Description détaillée",
      "confidence": 0.85,
      "impact": "high|medium|low",
      "evidence": ["Preuve 1", "Preuve 2"],
      "actionable": true
    }
  ],
  "recommendations": ["Recommandation actionnable 1", "Recommandation 2"],
  "trendPredictions": [
    {
      "timeframe": "1week|1month|3months",
      "direction": "up|down|stable",
      "magnitude": 0.15,
      "confidence": 0.75,
      "factors": ["Facteur 1", "Facteur 2"]
    }
  ],
  "competitiveAnalysis": {
    "position": "leader|challenger|follower|niche",
    "strengths": ["Force 1", "Force 2"],
    "weaknesses": ["Faiblesse 1"],
    "opportunities": ["Opportunité 1"],
    "threats": ["Menace 1"]
  },
  "marketHealth": {
    "score": 75,
    "factors": ["Facteur positif 1", "Facteur négatif 1"]
  },
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": ["Risque 1", "Risque 2"]
  }
}
`;

const SIMPLE_REPORT_PROMPT_TEMPLATE = `
Génère un rapport d'analyse de marché basé sur les données JSON suivantes.
Le rapport doit être concis, en français, et inclure un résumé et des recommandations exploitables.

Données d'analyse:
{analysis_data}

Réponds uniquement avec un objet JSON valide au format suivant:
{
  "summary": "Résumé de l'analyse de marché...",
  "recommendations": ["Recommandation 1", "Recommandation 2"]
}
`;

// Fonction principale pour générer un rapport avancé
export async function generateEnhancedReport(
  analysisResult: VintedAnalysisResult,
  advancedMetrics?: AdvancedMetrics
): Promise<EnhancedReport> {
  // Préparer les données pour l'IA
  const dataForPrompt = {
    ...analysisResult,
    articlesAnalyses: `${analysisResult.enrichedItems?.length || analysisResult.rawItems?.length || 0} articles analysés`,
    rawItems: undefined, // Ne pas envoyer les données brutes
    enrichedItems: undefined, // Ne pas envoyer les données enrichies
  };

  const prompt = ENHANCED_REPORT_PROMPT_TEMPLATE
    .replace("{analysis_data}", JSON.stringify(dataForPrompt, null, 2))
    .replace("{advanced_metrics}", advancedMetrics ? JSON.stringify(advancedMetrics, null, 2) : "Non disponibles");

  try {
    const response = await runMarketAnalysisInference({
      prompt: prompt,
      analysisType: 'insights',
      temperature: 0.4,
      max_tokens: 1500,
      context: {
        marketData: analysisResult,
        advancedMetrics: advancedMetrics,
      },
    });

    const jsonString = response.choices[0].text.match(/{[\s\S]*}/)?.[0];
    if (!jsonString) {
      throw new Error("La réponse de l'IA ne contient pas de JSON valide.");
    }

    const parsed = JSON.parse(jsonString);
    const validationResult = EnhancedReportSchema.safeParse(parsed);

    if (!validationResult.success) {
      console.warn("Validation du rapport avancé échouée:", validationResult.error.message);
      // Fallback vers un rapport simple
      return generateFallbackReport(analysisResult);
    }

    return validationResult.data;
  } catch (error) {
    console.error("Erreur lors de la génération du rapport avancé:", error);
    return generateFallbackReport(analysisResult);
  }
}

// Fonction de fallback pour générer un rapport simple
async function generateFallbackReport(analysisResult: VintedAnalysisResult): Promise<EnhancedReport> {
  try {
    const simpleReport = await generateReport(analysisResult);
    
    // Convertir le rapport simple en format avancé
    return {
      summary: simpleReport.summary,
      keyInsights: [
        {
          type: 'trend',
          title: 'Analyse de base disponible',
          description: simpleReport.summary,
          confidence: 0.6,
          impact: 'medium',
          evidence: [`${analysisResult.salesVolume} ventes analysées`],
          actionable: true,
        }
      ],
      recommendations: simpleReport.recommendations,
      trendPredictions: [
        {
          timeframe: '1month',
          direction: analysisResult.avgPrice > 50 ? 'stable' : 'up',
          magnitude: 0.1,
          confidence: 0.5,
          factors: ['Données limitées disponibles'],
        }
      ],
      competitiveAnalysis: {
        position: 'follower',
        strengths: ['Données de marché disponibles'],
        weaknesses: ['Analyse limitée'],
        opportunities: ['Améliorer la collecte de données'],
        threats: ['Concurrence non analysée'],
      },
      marketHealth: {
        score: Math.min(100, Math.max(0, analysisResult.salesVolume * 2)),
        factors: [`Volume de ventes: ${analysisResult.salesVolume}`],
      },
      riskAssessment: {
        level: analysisResult.salesVolume < 10 ? 'high' : 'medium',
        factors: analysisResult.salesVolume < 10 ? ['Échantillon trop petit'] : ['Données suffisantes'],
      },
    };
  } catch (error) {
    console.error("Erreur lors de la génération du rapport de fallback:", error);
    return getEmptyReport();
  }
}

// Fonction pour obtenir un rapport vide en cas d'erreur totale
function getEmptyReport(): EnhancedReport {
  return {
    summary: "Impossible de générer le rapport en raison d'une erreur.",
    keyInsights: [],
    recommendations: [],
    trendPredictions: [],
    competitiveAnalysis: {
      position: 'niche',
      strengths: [],
      weaknesses: ['Données insuffisantes'],
      opportunities: [],
      threats: [],
    },
    marketHealth: {
      score: 0,
      factors: ['Erreur de génération'],
    },
    riskAssessment: {
      level: 'high',
      factors: ['Analyse impossible'],
    },
  };
}

// Maintien de la compatibilité avec l'ancienne fonction
export async function generateReport(analysisResult: Partial<VintedAnalysisResult>): Promise<Report> {
  const dataForPrompt = {
    ...analysisResult,
    articlesAnalyses: `${analysisResult.enrichedItems?.length || analysisResult.rawItems?.length || 0} articles analysés`,
    rawItems: undefined,
    enrichedItems: undefined,
  };

  const prompt = SIMPLE_REPORT_PROMPT_TEMPLATE.replace(
    "{analysis_data}",
    JSON.stringify(dataForPrompt, null, 2)
  );

  try {
    const response = await runMarketAnalysisInference({
      prompt: prompt,
      analysisType: 'recommendations',
      temperature: 0.5,
      max_tokens: 500,
    });

    const jsonString = response.choices[0].text.match(/{[\s\S]*}/)?.[0];
    if (!jsonString) {
      throw new Error("La réponse de l'IA ne contient pas de JSON valide.");
    }

    const parsed = JSON.parse(jsonString);
    const validationResult = ReportSchema.safeParse(parsed);

    if (!validationResult.success) {
      throw new Error(`Validation Zod échouée: ${validationResult.error.message}`);
    }

    return validationResult.data;
  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error);
    return {
      summary: "Impossible de générer le rapport en raison d'une erreur.",
      recommendations: [],
    };
  }
}