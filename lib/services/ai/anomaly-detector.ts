import { z } from "zod";
import { runInference } from "./inference-client";
import { VintedAnalysisResult, VintedSoldItem } from "../../../types/vinted-market-analysis";

// Legacy schema for backward compatibility
const AnomalyDetectionSchema = z.object({
  is_relevant: z.boolean(),
  reason: z.string(),
});

// Enhanced market anomaly detection schema
const MarketAnomalyDetectionSchema = z.object({
  id: z.string(),
  type: z.enum(['price', 'volume', 'timing', 'quality']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  affectedItems: z.array(z.string()),
  suggestedAction: z.string(),
  confidence: z.number().min(0).max(1),
  detectedAt: z.string(),
  evidence: z.array(z.string()).optional(),
  impact: z.enum(['low', 'medium', 'high']).optional(),
});

const BatchAnomalyDetectionSchema = z.object({
  anomalies: z.array(MarketAnomalyDetectionSchema),
  summary: z.object({
    totalAnomalies: z.number(),
    severityBreakdown: z.record(z.number()),
    typeBreakdown: z.record(z.number()),
    overallRiskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  }),
});

type AnomalyDetectionResponse = z.infer<typeof AnomalyDetectionSchema>;
export type MarketAnomalyDetection = z.infer<typeof MarketAnomalyDetectionSchema>;
export type BatchAnomalyDetectionResult = z.infer<typeof BatchAnomalyDetectionSchema>;

const ANOMALY_DETECTION_PROMPT_TEMPLATE = `
Analyse le titre de l'annonce ci-dessous pour déterminer s'il correspond bien à l'objet de l'analyse.
Objet de l'analyse : "{analysis_subject}"
Titre de l'annonce : "{item_title}"

L'annonce est-elle pertinente ? Une annonce est non pertinente si elle concerne un accessoire, une pièce détachée, un produit compatible, ou un lot de produits non identiques.

Réponds uniquement avec un objet JSON valide au format suivant :
{
  "is_relevant": true,
  "reason": "L'annonce concerne bien un {analysis_subject}."
}
// OU
{
  "is_relevant": false,
  "reason": "L'annonce concerne une coque et non le téléphone lui-même."
}
`;

const MARKET_ANOMALY_DETECTION_PROMPT_TEMPLATE = `
Analyse les données de marché suivantes pour détecter des anomalies spécifiques au marché :

Données d'analyse :
- Produit analysé : "{product_name}"
- Volume de ventes : {sales_volume}
- Prix moyen : {avg_price}€
- Fourchette de prix : {min_price}€ - {max_price}€
- Nombre d'articles : {items_count}

Articles suspects (échantillon) :
{sample_items}

Détecte les anomalies de marché selon ces types :
- price: Prix anormalement élevés/bas par rapport à la moyenne
- volume: Volumes de vente inhabituels
- timing: Patterns temporels suspects
- quality: Qualité/description des articles problématique

Pour chaque anomalie détectée, fournis :
- type: un des types ci-dessus
- severity: low/medium/high/critical
- description: explication claire
- affectedItems: titres des articles concernés
- suggestedAction: action recommandée
- confidence: score de 0 à 1

Réponds avec un objet JSON valide contenant un tableau "anomalies" :
{
  "anomalies": [
    {
      "id": "anomaly_1",
      "type": "price",
      "severity": "high",
      "description": "Prix anormalement élevé détecté",
      "affectedItems": ["Titre article 1", "Titre article 2"],
      "suggestedAction": "Vérifier la qualité ou l'authenticité",
      "confidence": 0.85,
      "detectedAt": "{current_date}",
      "evidence": ["Prix 300% au-dessus de la moyenne"],
      "impact": "medium"
    }
  ]
}
`;

const BATCH_ANOMALY_DETECTION_PROMPT_TEMPLATE = `
Analyse complète des données de marché pour détecter toutes les anomalies :

Données globales :
- Produit : "{product_name}"
- Volume total : {total_volume}
- Prix moyen : {avg_price}€
- Écart-type prix : {price_std}€
- Nombre total d'articles : {total_items}

Analyse détaillée des articles :
{detailed_items}

Détecte TOUTES les anomalies selon ces critères :

PRIX (price):
- Prix > moyenne + 2*écart-type (severity: high)
- Prix < moyenne - 2*écart-type (severity: medium)
- Prix > 5x moyenne (severity: critical)

VOLUME (volume):
- Concentration anormale de ventes sur une période
- Absence de ventes sur des périodes normalement actives

TIMING (timing):
- Ventes à des heures inhabituelles
- Patterns de vente suspects

QUALITÉ (quality):
- Descriptions incohérentes
- Titres trompeurs ou non pertinents
- États d'articles suspects

Réponds avec un JSON complet incluant résumé et anomalies :
{
  "anomalies": [...],
  "summary": {
    "totalAnomalies": 5,
    "severityBreakdown": {"low": 2, "medium": 2, "high": 1, "critical": 0},
    "typeBreakdown": {"price": 3, "volume": 1, "timing": 1, "quality": 0},
    "overallRiskLevel": "medium"
  }
}
`;

// Legacy function for backward compatibility
export async function isAnomaly(analysis_subject: string, item_title: string): Promise<AnomalyDetectionResponse> {
  const prompt = ANOMALY_DETECTION_PROMPT_TEMPLATE
    .replace("{analysis_subject}", analysis_subject)
    .replace("{item_title}", item_title);

  try {
    const response = await runInference({
      prompt: prompt,
      temperature: 0.1,
      max_tokens: 100,
    });

    const jsonString = response.choices[0].text.match(/{[\s\S]*}/)?.[0];
    if (!jsonString) {
      throw new Error("La réponse de l'IA ne contient pas de JSON valide.");
    }

    const parsed = JSON.parse(jsonString);
    const validationResult = AnomalyDetectionSchema.safeParse(parsed);

    if (!validationResult.success) {
      throw new Error(`Validation Zod échouée: ${validationResult.error.message}`);
    }

    return validationResult.data;
  } catch (error) {
    console.error("Erreur lors de la détection d'anomalie:", error);
    // En cas d'erreur, on considère l'annonce comme pertinente pour ne pas la filtrer à tort.
    return {
      is_relevant: true,
      reason: "Erreur lors de la détection d'anomalie.",
    };
  }
}

/**
 * Enhanced market anomaly detection for specific market insights
 */
export async function detectMarketAnomalies(
  analysisResult: VintedAnalysisResult,
  options: {
    sampleSize?: number;
    focusTypes?: Array<'price' | 'volume' | 'timing' | 'quality'>;
  } = {}
): Promise<MarketAnomalyDetection[]> {
  const { sampleSize = 10, focusTypes = ['price', 'volume', 'timing', 'quality'] } = options;
  
  // Calculate statistics for anomaly detection
  const prices = analysisResult.rawItems.map(item => parseFloat(item.price.amount));
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const priceStd = Math.sqrt(
    prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length
  );

  // Sample items for analysis
  const sampleItems = analysisResult.rawItems
    .slice(0, sampleSize)
    .map(item => `- ${item.title} (${item.price.amount}€)`)
    .join('\n');

  const prompt = MARKET_ANOMALY_DETECTION_PROMPT_TEMPLATE
    .replace("{product_name}", analysisResult.catalogInfo.name)
    .replace("{sales_volume}", analysisResult.salesVolume.toString())
    .replace("{avg_price}", avgPrice.toFixed(2))
    .replace("{min_price}", analysisResult.priceRange.min.toString())
    .replace("{max_price}", analysisResult.priceRange.max.toString())
    .replace("{items_count}", analysisResult.rawItems.length.toString())
    .replace("{sample_items}", sampleItems)
    .replace("{current_date}", new Date().toISOString());

  try {
    const response = await runInference({
      prompt: prompt,
      temperature: 0.2,
      max_tokens: 1500,
    });

    const jsonString = response.choices[0].text.match(/{[\s\S]*}/)?.[0];
    if (!jsonString) {
      throw new Error("La réponse de l'IA ne contient pas de JSON valide.");
    }

    const parsed = JSON.parse(jsonString);
    
    // Validate and extract anomalies
    if (parsed.anomalies && Array.isArray(parsed.anomalies)) {
      const validAnomalies: MarketAnomalyDetection[] = [];
      
      for (const anomaly of parsed.anomalies) {
        const validationResult = MarketAnomalyDetectionSchema.safeParse(anomaly);
        if (validationResult.success) {
          validAnomalies.push(validationResult.data);
        }
      }
      
      // Filter by focus types if specified
      return validAnomalies.filter(anomaly => focusTypes.includes(anomaly.type));
    }

    return [];
  } catch (error) {
    console.error("Erreur lors de la détection d'anomalies de marché:", error);
    return [];
  }
}

/**
 * Batch anomaly detection for large datasets with comprehensive analysis
 */
export async function detectBatchAnomalies(
  analysisResult: VintedAnalysisResult,
  options: {
    chunkSize?: number;
    includeStatisticalAnalysis?: boolean;
  } = {}
): Promise<BatchAnomalyDetectionResult> {
  const { chunkSize = 50, includeStatisticalAnalysis = true } = options;
  
  try {
    // Calculate comprehensive statistics
    const prices = analysisResult.rawItems.map(item => parseFloat(item.price.amount));
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceStd = Math.sqrt(
      prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length
    );

    // Prepare detailed items analysis
    const detailedItems = analysisResult.rawItems
      .slice(0, chunkSize)
      .map((item, index) => {
        const price = parseFloat(item.price.amount);
        const priceDeviation = Math.abs(price - avgPrice) / priceStd;
        return `${index + 1}. "${item.title}" - ${price}€ (déviation: ${priceDeviation.toFixed(2)}σ) - Créé: ${item.created_at || 'N/A'}`;
      })
      .join('\n');

    const prompt = BATCH_ANOMALY_DETECTION_PROMPT_TEMPLATE
      .replace("{product_name}", analysisResult.catalogInfo.name)
      .replace("{total_volume}", analysisResult.salesVolume.toString())
      .replace("{avg_price}", avgPrice.toFixed(2))
      .replace("{price_std}", priceStd.toFixed(2))
      .replace("{total_items}", analysisResult.rawItems.length.toString())
      .replace("{detailed_items}", detailedItems);

    const response = await runInference({
      prompt: prompt,
      temperature: 0.1,
      max_tokens: 2500,
    });

    const jsonString = response.choices[0].text.match(/{[\s\S]*}/)?.[0];
    if (!jsonString) {
      throw new Error("La réponse de l'IA ne contient pas de JSON valide.");
    }

    const parsed = JSON.parse(jsonString);
    const validationResult = BatchAnomalyDetectionSchema.safeParse(parsed);

    if (!validationResult.success) {
      console.error("Validation échouée pour la détection batch:", validationResult.error);
      // Return empty result with basic summary
      return {
        anomalies: [],
        summary: {
          totalAnomalies: 0,
          severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
          typeBreakdown: { price: 0, volume: 0, timing: 0, quality: 0 },
          overallRiskLevel: 'low',
        },
      };
    }

    return validationResult.data;
  } catch (error) {
    console.error("Erreur lors de la détection batch d'anomalies:", error);
    return {
      anomalies: [],
      summary: {
        totalAnomalies: 0,
        severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
        typeBreakdown: { price: 0, volume: 0, timing: 0, quality: 0 },
        overallRiskLevel: 'low',
      },
    };
  }
}

/**
 * Utility function to classify anomaly severity based on statistical analysis
 */
export function classifyAnomalySeverity(
  value: number,
  mean: number,
  standardDeviation: number,
  type: 'price' | 'volume' | 'timing' | 'quality'
): 'low' | 'medium' | 'high' | 'critical' {
  const deviation = Math.abs(value - mean) / standardDeviation;
  
  switch (type) {
    case 'price':
      if (deviation > 3) return 'critical';
      if (deviation > 2) return 'high';
      if (deviation > 1.5) return 'medium';
      return 'low';
    
    case 'volume':
      if (deviation > 2.5) return 'critical';
      if (deviation > 1.8) return 'high';
      if (deviation > 1.2) return 'medium';
      return 'low';
    
    default:
      if (deviation > 2) return 'high';
      if (deviation > 1.5) return 'medium';
      return 'low';
  }
}

/**
 * Generate detailed explanations for detected anomalies
 */
export function generateAnomalyExplanation(
  anomaly: MarketAnomalyDetection,
  context: {
    avgPrice: number;
    totalItems: number;
    productName: string;
  }
): string {
  const { avgPrice, totalItems, productName } = context;
  
  switch (anomaly.type) {
    case 'price':
      return `Anomalie de prix détectée pour ${productName}. ${anomaly.description} Prix moyen du marché: ${avgPrice.toFixed(2)}€. Confiance: ${(anomaly.confidence * 100).toFixed(1)}%`;
    
    case 'volume':
      return `Anomalie de volume détectée. ${anomaly.description} Volume total analysé: ${totalItems} articles. Confiance: ${(anomaly.confidence * 100).toFixed(1)}%`;
    
    case 'timing':
      return `Anomalie temporelle détectée. ${anomaly.description} Confiance: ${(anomaly.confidence * 100).toFixed(1)}%`;
    
    case 'quality':
      return `Anomalie de qualité détectée. ${anomaly.description} Confiance: ${(anomaly.confidence * 100).toFixed(1)}%`;
    
    default:
      return `Anomalie détectée: ${anomaly.description} Confiance: ${(anomaly.confidence * 100).toFixed(1)}%`;
  }
}