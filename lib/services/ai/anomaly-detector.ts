import { z } from "zod";
import { runInference } from "./inference-client";
import type {
  VintedAnalysisResult,
  SoldItem,
} from "../../../types/vinted-market-analysis";

// Legacy schema for backward compatibility
const AnomalyDetectionSchema = z.object({
  is_relevant: z.boolean(),
  reason: z.string(),
});

// Enhanced market anomaly detection schema
const MarketAnomalyDetectionSchema = z.object({
  id: z.string(),
  type: z.enum(["price", "volume", "timing", "quality"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string(),
  affectedItems: z.array(z.string()),
  suggestedAction: z.string(),
  confidence: z.number().min(0).max(1),
  detectedAt: z.string(),
  evidence: z.array(z.string()).optional(),
  impact: z.enum(["low", "medium", "high"]).optional(),
});

const BatchAnomalyDetectionSchema = z.object({
  anomalies: z.array(MarketAnomalyDetectionSchema),
  summary: z.object({
    totalAnomalies: z.number(),
    severityBreakdown: z.record(z.number()),
    typeBreakdown: z.record(z.number()),
    overallRiskLevel: z.enum(["low", "medium", "high", "critical"]),
  }),
});

export type AnomalyDetectionResponse = z.infer<typeof AnomalyDetectionSchema>;
export type MarketAnomalyDetection = z.infer<
  typeof MarketAnomalyDetectionSchema
>;
export type BatchAnomalyDetectionResult = z.infer<
  typeof BatchAnomalyDetectionSchema
>;

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

// Removed unused BATCH_ANOMALY_DETECTION_PROMPT_TEMPLATE

// Legacy function for backward compatibility
export async function isAnomaly(
  analysis_subject: string,
  item_title: string,
): Promise<AnomalyDetectionResponse> {
  const prompt = ANOMALY_DETECTION_PROMPT_TEMPLATE.replace(
    "{analysis_subject}",
    analysis_subject,
  ).replace("{item_title}", item_title);

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
      throw new Error(
        `Validation Zod échouée: ${validationResult.error.message}`,
      );
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
    focusTypes?: Array<"price" | "volume" | "timing" | "quality">;
  } = {},
): Promise<MarketAnomalyDetection[]> {
  const {
    sampleSize = 10,
    focusTypes = ["price", "volume", "timing", "quality"],
  } = options;

  // Calculate statistics for anomaly detection
  const prices = analysisResult.rawItems.map((item: SoldItem) =>
    parseFloat(item.price.amount),
  );
  const avgPrice =
    prices.length > 0
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length
      : 0; // Added check for empty prices

  // Sample items for analysis
  const sampleItems = analysisResult.rawItems
    .slice(0, sampleSize)
    .map((item: SoldItem) => `- ${item.title} (${item.price.amount}€)`)
    .join("\n");

  const prompt = MARKET_ANOMALY_DETECTION_PROMPT_TEMPLATE.replace(
    "{product_name}",
    analysisResult.catalogInfo.name,
  )
    .replace("{sales_volume}", analysisResult.salesVolume.toString())
    .replace("{avg_price}", avgPrice.toFixed(2))
    .replace("{min_price}", String(analysisResult.priceRange?.min ?? ""))
    .replace("{max_price}", String(analysisResult.priceRange?.max ?? ""))
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
        const validationResult =
          MarketAnomalyDetectionSchema.safeParse(anomaly);
        if (validationResult.success) {
          validAnomalies.push(validationResult.data);
        }
      }

      // Filter by focus types if specified
      return validAnomalies.filter((anomaly) =>
        focusTypes.includes(anomaly.type),
      );
    }

    return [];
  } catch (error) {
    console.error("Erreur lors de la détection d'anomalies de marché:", error);
    return [];
  }
}

// Removed unused detectBatchAnomalies function

// Removed unused classifyAnomalySeverity function

// Removed unused generateAnomalyExplanation function
