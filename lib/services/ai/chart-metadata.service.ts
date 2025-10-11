// import type { AIAnnotation } from "../../types/ai-annotation";

// Temporary type definition
type AIAnnotation = any;

export interface ChartMetadata {
  generatedAt: string;
  confidence: number; // 0..1
  dataQuality: number; // 0..1
  processingTime: number; // ms
}

export const DEFAULT_CONFIDENCE = 0.5;

function clamp01(v: number): number {
  if (!isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

export default class ChartMetadataService {
  public static calculateChartConfidence(
    annotations: AIAnnotation[] = [],
  ): number {
    if (!Array.isArray(annotations) || annotations.length === 0)
      return DEFAULT_CONFIDENCE;

    const valid = annotations.filter(
      (ann): ann is AIAnnotation =>
        ann != null && typeof (ann as AIAnnotation).confidence === "number",
    );

    if (valid.length === 0) return DEFAULT_CONFIDENCE;

    const sum = valid.reduce((s, a) => s + (a.confidence ?? 0), 0);
    const avg = sum / valid.length; // <-- divide by number of valid annotations (fix bug)
    return clamp01(avg);
  }

  public static buildMetadata(
    annotations: AIAnnotation[] = [],
    dataQuality: number = 0,
    processingTime: number = 0,
    generatedAt?: string,
  ): ChartMetadata {
    const generated = generatedAt ?? new Date().toISOString();
    const confidence = this.calculateChartConfidence(annotations);
    const dq = clamp01(Number.isFinite(dataQuality) ? dataQuality : 0);
    const pt = Math.max(
      0,
      Number.isFinite(processingTime) ? processingTime : 0,
    );

    return {
      generatedAt: generated,
      confidence,
      dataQuality: dq,
      processingTime: pt,
    };
  }
}
