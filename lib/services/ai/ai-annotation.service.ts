import { z } from "zod";
// import { AIAnnotation } from "../../types/ai-annotation";

// Temporary type definition
interface AIAnnotation {
  id: string;
  type: string;
  data: any;
  confidence?: number;
  timestamp: string;
  metadata?: Record<string, any>;
  priority?: string;
  actionable?: boolean;
  interactiveElements?: any[];
  title?: string;
  description?: string;
  relatedData?: any;
  position?: { x: number; y: number };
}

/**
 * Service centralisé pour la création, validation et transformation des annotations IA.
 * Fournit une interface cohérente utilisée par les moteurs de génération de graphiques et
 * d'analyse.
 *
 * Note: plusieurs méthodes sont `static` afin d'être appelables sans instancier le service,
 * suivant l'usage observé dans le code existant (ex: ChartGenerationService).
 */

/* Helpers */
const DEFAULT_CONFIDENCE = 0.75;

function clamp01(v: number) {
  if (Number.isNaN(v) || v === Infinity || v === -Infinity)
    return DEFAULT_CONFIDENCE;
  return Math.max(0, Math.min(1, v));
}

function generateId(prefix = "ann") {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
}

/* Zod schema dérivé du type AIAnnotation centralisé */
const InteractiveElementSchema = z.object({
  id: z.string(),
  type: z.string(),
  props: z.record(z.unknown()).optional(),
});

const RelatedDataSchema = z
  .object({
    dataPointIndex: z.number().optional(),
    value: z.number().optional(),
    trend: z.enum(["up", "down", "stable"]).optional(),
  })
  .optional();

const AIAnnotationSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    "insight",
    "trend",
    "anomaly",
    "recommendation",
    "warning",
    "opportunity",
  ]),
  position: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  confidence: z.number().min(0).max(1).optional().default(DEFAULT_CONFIDENCE),
  metadata: z.record(z.unknown()).optional(),
  interactiveElements: z.array(InteractiveElementSchema).optional(),
  priority: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .default("medium"),
  actionable: z.boolean().optional().default(false),
  relatedData: RelatedDataSchema,
});

export default class AIAnnotationService {
  /**
   * Crée une annotation IA en appliquant des valeurs par défaut et validation.
   * @param data Partial<AIAnnotation>
   * @returns AIAnnotation validée et normalisée
   */
  public static createAnnotation(data: Partial<AIAnnotation>): AIAnnotation {
    const payload: any = {
      ...data,
      id: data.id ?? generateId("ann"),
      confidence:
        typeof data.confidence === "number"
          ? clamp01(data.confidence)
          : DEFAULT_CONFIDENCE,
      priority: data.priority ?? "medium",
      actionable:
        typeof data.actionable === "boolean" ? data.actionable : false,
      interactiveElements: data.interactiveElements ?? [],
      metadata: data.metadata ?? {},
    };

    // Ensure position exists and is normalized 0..100
    if (
      !payload.position ||
      typeof payload.position.x !== "number" ||
      typeof payload.position.y !== "number"
    ) {
      payload.position = { x: 50, y: 50 };
    } else {
      payload.position.x = Math.max(0, Math.min(100, payload.position.x));
      payload.position.y = Math.max(0, Math.min(100, payload.position.y));
    }

    return this.validateAnnotation(payload);
  }

  /**
   * Valide et normalise une annotation inconnue.
   * Utilise Zod pour garantir la forme et les valeurs.
   * @param annotation unknown
   * @throws ZodError si invalide
   * @returns AIAnnotation
   */
  public static validateAnnotation(annotation: unknown): AIAnnotation {
    const parsed = AIAnnotationSchema.parse(annotation);
    // clamp safety
    parsed.confidence = clamp01(parsed.confidence ?? DEFAULT_CONFIDENCE);
    parsed.position.x = Math.max(0, Math.min(100, parsed.position.x));
    parsed.position.y = Math.max(0, Math.min(100, parsed.position.y));
    return parsed as unknown as AIAnnotation;
  }

  /**
   * Transforme une annotation en version interactive (UI-friendly).
   * Ajoute au besoin des interactiveElements et marque actionable.
   * @param annotation AIAnnotation
   * @returns AIAnnotation (objet nouveau / immuable)
   */
  public static transformToInteractive(annotation: AIAnnotation): AIAnnotation {
    const copy: AIAnnotation = {
      ...annotation,
      interactiveElements: [...(annotation.interactiveElements ?? [])],
    };

    // Ajoute un élément interactif si absent
    if ((copy.interactiveElements ?? []).length === 0) {
      copy.interactiveElements = [
        {
          id: `ie-${copy.id ?? generateId("ie")}`,
          type: "popover",
          props: {
            title: copy.title,
            description: copy.description,
          },
        } as any,
      ];
    }

    // Si l'annotation a une forte confiance, la rendre actionable par défaut
    if ((copy.confidence ?? 0) >= 0.8) {
      copy.actionable = true;
    }

    return this.validateAnnotation(copy);
  }

  /**
   * Calcule une mesure de confiance pour une annotation.
   * Applique quelques règles heuristiques (priorité, présence de relatedData, etc).
   * @param annotation AIAnnotation
   * @returns number (0..1)
   */
  public static calculateConfidence(annotation: AIAnnotation): number {
    let base = clamp01(annotation.confidence ?? DEFAULT_CONFIDENCE);

    // Ajustement selon la priorité
    switch (annotation.priority) {
      case "critical":
        base += 0.12;
        break;
      case "high":
        base += 0.06;
        break;
      case "low":
        base -= 0.05;
        break;
      // medium => pas d'ajustement
    }

    // Si l'annotation contient des données reliées, augmenter légèrement
    if (
      annotation.relatedData &&
      (annotation.relatedData.dataPointIndex != null ||
        annotation.relatedData.value != null)
    ) {
      base += 0.04;
    }

    // Si l'annotation est actionable, légère hausse
    if (annotation.actionable) base += 0.03;

    return clamp01(base);
  }

  /**
   * Détecte des anomalies de prix simples dans un jeu de données.
   * Méthode légère : retourne une liste d'objets minimalistes utilisables comme base pour créer des annotations.
   * @param priceData Array<number | { value:number }>
   * @param _analysisResult any (contexte optionnel)
   * @returns Array<{ position:{x:number,y:number}, description:string, confidence:number, relatedData?:any }>
   */
  public static detectPriceAnomalies(priceData: any[], _analysisResult?: any) {
    const anomalies: any[] = [];

    if (!Array.isArray(priceData) || priceData.length === 0) return anomalies;

    // Convert to numeric values
    const vals = priceData
      .map((p) =>
        typeof p === "number"
          ? p
          : p && typeof p.value === "number"
            ? p.value
            : NaN,
      )
      .filter(Number.isFinite);

    if (vals.length === 0) return anomalies;

    // Simple heuristic: mean and std
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance =
      vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
    const std = Math.sqrt(variance);

    vals.forEach((v, i) => {
      if (std === 0) return;
      const zscore = Math.abs((v - mean) / std);
      if (zscore > 3) {
        anomalies.push({
          position: {
            x: Math.round((i / (vals.length - 1 || 1)) * 100),
            y: 50,
          },
          description: `Valeur anormale détectée (${v.toFixed(2)}) — z=${zscore.toFixed(1)}`,
          confidence: clamp01(0.6 + Math.min(0.4, (zscore - 3) / 5)),
          relatedData: { value: v, dataPointIndex: i },
        });
      }
    });

    return anomalies;
  }

  /**
   * Génère des annotations à partir d'un résultat d'analyse "competitivePosition".
   * Implémentation proche des snippets existants dans le codebase.
   * @param analysisResult any
   * @returns { annotations: any[], interactiveElements: any[] }
   */
  public static generateCompetitivePositionAnnotations(analysisResult: any) {
    const annotations: any[] = [];
    const interactiveElements: any[] = [];

    const competitivePosition =
      analysisResult?.['marketInsights']?.competitivePosition;
    if (!competitivePosition) {
      return { annotations, interactiveElements };
    }

    annotations.push(
      this.createAnnotation({
        id: "current-position",
        position: { x: 50, y: 50 },
        type: "insight",
        title: `Position: ${competitivePosition.position}`,
        description: `Part de marché estimée: ${(competitivePosition.marketShare?.estimated ?? 0 * 100).toFixed(1)}%`,
        confidence: clamp01(
          Number(
            competitivePosition.marketShare?.confidence ?? DEFAULT_CONFIDENCE,
          ),
        ),
        priority: "high",
        actionable: true,
      }),
    );

    (competitivePosition.strengths ?? []).forEach(
      (strength: string, _index: number) => {
        annotations.push(
          this.createAnnotation({
            id: `strength-${_index}`,
            position: { x: Math.min(95, 70 + _index * 10), y: 30 },
            type: "insight",
            title: "Force identifiée",
            description: String(strength),
            confidence: 0.8,
            priority: "medium",
            actionable: false,
          }),
        );
      },
    );

    return { annotations, interactiveElements };
  }

  /**
   * Génère des annotations de distribution de prix (placeholder léger).
   * @param analysisResult any
   * @param priceData any
   * @returns { annotations: any[], interactiveElements: any[] }
   */
  public static generatePriceDistributionAnnotations(
    analysisResult: any,
    priceData: any[],
  ) {
    const annotations: any[] = [];
    const interactiveElements: any[] = [];

    // Basic examples: mean and median if present in analysisResult
    const mean = analysisResult?.advancedMetrics?.descriptiveStats?.mean;
    const median = analysisResult?.advancedMetrics?.descriptiveStats?.median;

    if (typeof mean === "number") {
      annotations.push(
        this.createAnnotation({
          id: "mean-price",
          position: { x: Math.max(0, Math.min(100, mean)), y: 50 },
          type: "insight",
          title: "Prix moyen",
          description: `Prix moyen: ${mean.toFixed(2)}€`,
          confidence: 0.9,
          priority: "high",
        }),
      );
    }

    if (typeof median === "number") {
      annotations.push(
        this.createAnnotation({
          id: "median-price",
          position: { x: Math.max(0, Math.min(100, median)), y: 30 },
          type: "insight",
          title: "Prix médian",
          description: `Prix médian: ${median.toFixed(2)}€`,
          confidence: 0.9,
          priority: "high",
        }),
      );
    }

    // Detect anomalies from priceData and convert to annotations
    const anomalies = this.detectPriceAnomalies(priceData, analysisResult);
    anomalies.forEach((anomaly, _index) => {
      annotations.push(
        this.createAnnotation({
          id: `anomaly-${_index}`,
          position: anomaly.position,
          type: "warning",
          title: "Anomalie détectée",
          description: anomaly.description,
          confidence: clamp01(anomaly.confidence ?? 0.6),
          priority: "medium",
          actionable: true,
          relatedData: anomaly.relatedData,
        }),
      );
    });

    return { annotations, interactiveElements };
  }

  /**
   * Génère des annotations de type "trend" (stub).
   * Accepte optionally des données pré-transformées (trendData) pour éviter double extraction.
   * @param analysisResult any
   * @param trendData any (optionnel) données déjà extraites par DataTransformationService
   */
  public static generateTrendAnnotations(analysisResult: any, trendData?: any) {
    const annotations: any[] = [];
    const interactiveElements: any[] = [];

    const trends =
      trendData?.trends ?? analysisResult?.['marketInsights']?.trends ?? [];
    trends.forEach((t: any, i: number) => {
      const posX = Math.max(0, Math.min(100, t.position ?? t.x ?? 50));
      const posY = Math.max(0, Math.min(100, t.y ?? t.positionY ?? 50));
      annotations.push(
        this.createAnnotation({
          id: `trend-${i}`,
          position: { x: posX, y: posY },
          type: "trend",
          title: t.title ?? "Trend",
          description: t.description ?? "",
          confidence: clamp01(
            typeof t.confidence === "number" ? t.confidence : 0.75,
          ),
          priority: t.priority ?? "medium",
          actionable: !!t.actionable,
          relatedData: t.relatedData ?? undefined,
        }),
      );
    });

    return { annotations, interactiveElements };
  }

  /**
   * Génère des annotations d'opportunité (stub).
   * @param analysisResult any
   */
  public static generateOpportunityAnnotations(analysisResult: any) {
    const annotations: any[] = [];
    const interactiveElements: any[] = [];

    const opportunities =
      analysisResult?.['marketInsights']?.marketOpportunities ?? [];
    opportunities.forEach((op: any, i: number) => {
      annotations.push(
        this.createAnnotation({
          id: `opportunity-${i}`,
          position: {
            x: Math.max(0, Math.min(100, op.position ?? 60)),
            y: Math.max(0, Math.min(100, op.y ?? 40)),
          },
          type: "opportunity",
          title: op.title ?? "Opportunity",
          description: op.description ?? "",
          confidence: clamp01(
            typeof op.confidence === "number" ? op.confidence : 0.7,
          ),
          priority: op.priority ?? "medium",
          actionable: !!op.actionable,
        }),
      );
    });

    return { annotations, interactiveElements };
  }
}
