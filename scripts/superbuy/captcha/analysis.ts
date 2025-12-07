import { PNG } from 'pngjs';
import type { CapturedPuzzle, AnalysisResult, DetectionBoxes, Rect, YoloDetection } from './types';
import { annotatePuzzle } from './debug';
import type {
  CaptchaDatasetService,
  CaptchaDatasetSampleRef,
  BoundingBoxPx,
} from '../../../lib/services/captcha/captcha-dataset-service';
import type { YoloCaptchaService } from '../../../lib/services/captcha/yolo-captcha-service';

interface AnalyzeOptions {
  attemptId: string;
  attemptIndex: number;
  debugDir: string;
  minConfidence: number;
  datasetService?: CaptchaDatasetService | null;
  datasetSample?: CaptchaDatasetSampleRef;
  yoloService?: YoloCaptchaService | null;
}

export async function analyzePuzzle(
  puzzle: CapturedPuzzle,
  options: AnalyzeOptions
): Promise<AnalysisResult | null> {
  const png = PNG.sync.read(puzzle.buffer);
  const puzzleSize = { width: png.width, height: png.height };
  const pixelRatio = puzzle.pixelRatio || (png.width / puzzle.targetBox.width);
  const yoloDetection = await detectWithYolo(puzzle, options).catch(() => null);

  const gapFromYolo = yoloDetection?.gap;
  const pieceFromYolo = yoloDetection?.piece;
    const confidences: { gap?: number; piece?: number } = {};
    if (gapFromYolo?.confidence !== undefined) {
      confidences.gap = gapFromYolo.confidence;
    }
    if (pieceFromYolo?.confidence !== undefined) {
      confidences.piece = pieceFromYolo.confidence;
    }

  let gapLeftPx: number | null = gapFromYolo ? gapFromYolo.x : null;
  let gapRightPx: number | null = gapFromYolo ? gapFromYolo.x + gapFromYolo.width : null;
  let method: AnalysisResult['method'] = gapFromYolo ? 'yolo' : 'heuristic';

  if (!gapFromYolo) {
    const heuristic = analyzeGapByGradient(png);
    if (!heuristic) {
      // Fallback synthétique si la détection par gradient échoue : on suppose une encoche centrée
      console.log('[Captcha Analysis] Gradient heuristic failed – using synthetic center fallback');
      const syntheticWidth = Math.max(30, Math.round(png.width * 0.14));
      const syntheticLeft = Math.round(png.width * 0.5 - syntheticWidth / 2);
      gapLeftPx = syntheticLeft;
      gapRightPx = syntheticLeft + syntheticWidth;
      method = 'heuristic';
    } else {
      gapLeftPx = heuristic.left;
      gapRightPx = heuristic.right;
    }
  }

  if (gapLeftPx === null || gapRightPx === null) {
    return null;
  }

  const gapCenterPx = (gapLeftPx + gapRightPx) / 2;
  const gapWidthPx = gapRightPx - gapLeftPx;

  // Calculate mobile piece center if detected by YOLO
  // pieceFromYolo = tc-piece (the mobile puzzle piece that the user drags)
  const pieceCenterPx = pieceFromYolo 
    ? pieceFromYolo.x + pieceFromYolo.width / 2
    : gapCenterPx * 0.1; // fallback: assume piece is near left edge

  console.log('[Captcha Analysis] Position analysis (image pixels):', {
    gapCenterPx: Math.round(gapCenterPx),
    pieceCenterPx: Math.round(pieceCenterPx),
    gapWidthPx: Math.round(gapWidthPx),
  });

  // Compute positions in consistent coordinate spaces:
  // - image (png) pixels: gapLeftPx, gapCenterPx, pieceCenterPx
  // - CSS/page pixels: puzzle.targetBox / sliderBox / trackBox are in page/CSS coords
  const trackWidthCss = puzzle.trackBox?.width ?? puzzle.targetBox.width;
  const trackScale = trackWidthCss > 0 && puzzle.targetBox.width > 0
    ? trackWidthCss / puzzle.targetBox.width
    : 1;
  const sliderWidthCss = puzzle.sliderBox?.width ?? Math.max(36, (puzzle.targetBox.width ?? 0) * 0.12);
  const maxDistancePx = (trackWidthCss ?? 0) - sliderWidthCss - 6;

  // CORRECTED: The distance the mobile piece needs to travel in the puzzle image (pixels)
  // pieceCenterPx (tc-piece mobile piece) → gapCenterPx (tc-drag target gap/hole)
  const distanceInImagePx = gapCenterPx - pieceCenterPx;
  
  // Convert this image-space distance to page/CSS pixels (what the slider needs to move)
  const rawDistancePagePx = distanceInImagePx / pixelRatio;

  const sliderInitialCenterCss = puzzle.sliderBox && puzzle.targetBox
    ? ((puzzle.sliderBox.x - puzzle.targetBox.x) + puzzle.sliderBox.width / 2)
    : (puzzle.targetBox.width ?? 0) * 0.5;

  const clampDistance = (value: number) => Math.max(6, Math.min(Math.abs(value), Math.max(0, maxDistancePx)));
  const primary = clampDistance(rawDistancePagePx);
  const candidateDistances = buildCandidates(primary);

  console.log('[Captcha Analysis] Distance calculation:', {
    distanceInImagePx: Math.round(distanceInImagePx),
    rawDistancePagePx: Math.round(rawDistancePagePx),
    primaryClamped: Math.round(primary),
    pixelRatio: Number(pixelRatio.toFixed(3)),
    trackScale: Number(trackScale.toFixed(3)),
    maxDistancePx: Math.round(maxDistancePx),
  });

  const annotations: string[] = [];
  const gapRect: Rect = {
    x: gapLeftPx,
    y: 0,
    width: gapWidthPx,
    height: png.height,
  };
  const pieceRect: Rect | undefined = pieceFromYolo
    ? { x: pieceFromYolo.x, y: pieceFromYolo.y, width: pieceFromYolo.width, height: pieceFromYolo.height }
    : undefined;

  const confidenceParts: string[] = [];
  if (typeof confidences.gap === 'number') {
    confidenceParts.push(`gap ${(confidences.gap * 100).toFixed(1)}%`);
  }
  if (typeof confidences.piece === 'number') {
    confidenceParts.push(`piece ${(confidences.piece * 100).toFixed(1)}%`);
  }
  const summaryLine = `${method === 'yolo' ? 'YOLO' : 'Heuristic'} Δ ${Math.round(primary)}px`;
  const extraLines = confidenceParts.length > 0 ? [`Conf: ${confidenceParts.join(' | ')}`] : undefined;

  // Arrow visualization: horizontal movement from mobile piece to target gap
  // Movement is strictly horizontal (Y constant), only X changes
  const arrowFromX = pieceCenterPx; // tc-piece (mobile puzzle piece)
  const arrowToX = gapCenterPx;     // tc-drag (target gap/hole)

  const annotationOptions: Parameters<typeof annotatePuzzle>[1] = {
    tag: `${options.attemptId}-a${String(options.attemptIndex).padStart(2, '0')}-analysis`,
    gap: gapRect,
    arrow: { from: arrowFromX, to: arrowToX },
    text: summaryLine,
    confidences,
  };
  if (extraLines && extraLines.length) {
    (annotationOptions as any).extraLines = extraLines;
  }
  if (pieceRect) {
    annotationOptions.piece = pieceRect;
  }
  const annotationPath = await annotatePuzzle(puzzle, annotationOptions, options.debugDir);
  if (annotationPath) {
    annotations.push(annotationPath);
  }

  if (options.datasetService && options.datasetSample) {
      const snapshot: any = {
        method,
        pixelRatio,
        confidence: buildConfidences(confidences),
        metadata: {
          attempt: options.attemptIndex,
          gapWidthPx,
          captureSource: puzzle.source,
        },
      };
      const gapBox = toBoundingBox(gapRect);
      const pieceBox = toBoundingBox(pieceRect);
      if (gapBox !== undefined) {
        snapshot.gapBoxPx = gapBox;
      }
      if (pieceBox !== undefined) {
        snapshot.pieceBoxPx = pieceBox;
      }
      options.datasetService.updateDetection(options.datasetSample, snapshot);
  }

  const result: AnalysisResult = {
    method,
    gapPx: { left: gapLeftPx, right: gapRightPx, center: gapCenterPx, width: gapWidthPx },
    pieceCenterCss: sliderInitialCenterCss,
    pixelRatio,
    trackScale,
    candidateDistances,
    rawDistance: primary,
    targetBox: puzzle.targetBox,
    puzzleSize,
    gapRect,
  };
  if (puzzle.sliderBox !== undefined) {
    result.sliderBox = puzzle.sliderBox;
  }
  if (puzzle.trackBox !== undefined) {
    result.trackBox = puzzle.trackBox;
  }
  if (annotations.length) {
    result.annotations = annotations;
  }
  if (pieceRect !== undefined) {
    result.pieceRect = pieceRect;
  }
  if (Object.keys(confidences).length) {
    result.confidences = confidences;
  }
  return result;
}

function buildCandidates(primary: number): number[] {
  const deltas = [0, -8, 8, -15, 15, -24, 24];
  const candidates = deltas
    .map((delta) => Math.max(6, primary + delta))
    .filter((value, idx, arr) => arr.findIndex((v) => Math.abs(v - value) < 2) === idx);
  return candidates.slice(0, 8);
}

  function buildConfidences(conf: { gap?: number | undefined; piece?: number | undefined }): { gap?: number; piece?: number } {
    const result: { gap?: number; piece?: number } = {};
    if (conf.gap !== undefined) {
      result.gap = conf.gap;
    }
    if (conf.piece !== undefined) {
      result.piece = conf.piece;
    }
    return result;
  }

function analyzeGapByGradient(png: PNG): { left: number; right: number } | null {
  const { width, height } = png;
  const top = Math.round(height * 0.25);
  const bottom = Math.round(height * 0.75);
  const scores = new Array(width).fill(0);

  for (let x = 1; x < width - 1; x += 1) {
    let columnScore = 0;
    for (let y = top; y < bottom; y += 1) {
      const idx = (y * width + x) * 4;
      const prevIdx = idx - 4;
      const nextIdx = idx + 4;
        const diffPrev = Math.abs(png.data[idx]! - png.data[prevIdx]!) + Math.abs(png.data[idx + 1]! - png.data[prevIdx + 1]!) + Math.abs(png.data[idx + 2]! - png.data[prevIdx + 2]!);
        const diffNext = Math.abs(png.data[idx]! - png.data[nextIdx]!) + Math.abs(png.data[idx + 1]! - png.data[nextIdx + 1]!) + Math.abs(png.data[idx + 2]! - png.data[nextIdx + 2]!);
      columnScore += diffPrev + diffNext;
    }
    scores[x] = columnScore;
  }

  const maxScore = Math.max(...scores);
  if (maxScore < (bottom - top) * 40) {
    return null;
  }
  const threshold = maxScore * 0.55;
  let start = -1;
  let best: { left: number; right: number; score: number } | null = null;
  let current = 0;

  for (let x = 1; x < width - 1; x += 1) {
    if (scores[x] >= threshold) {
      if (start === -1) {
        start = x;
        current = scores[x];
      } else {
        current += scores[x];
      }
    } else if (start !== -1) {
      const right = x - 1;
      const widthCandidate = right - start;
      if (widthCandidate >= 10 && (!best || current > best.score)) {
        best = { left: start, right, score: current };
      }
      start = -1;
      current = 0;
    }
  }
  if (start !== -1) {
    const right = width - 2;
    const widthCandidate = right - start;
    if (widthCandidate >= 10 && (!best || current > best.score)) {
      best = { left: start, right, score: current };
    }
  }
  return best ? { left: best.left, right: best.right } : null;
}

async function detectWithYolo(
  puzzle: CapturedPuzzle,
  options: AnalyzeOptions
): Promise<DetectionBoxes | null> {
  if (!options.yoloService || !puzzle.debugPath) {
    return null;
  }
  try {
    // Use planSliderMovement which requires an image file path
    // puzzle.debugPath should contain the saved image
    const plan = await options.yoloService.planSliderMovement(
      puzzle.debugPath,
      puzzle.trackBox?.width ?? 300, // Default slider width
      options.minConfidence
    );
    
    if (!plan.valid || !plan.pieceDetection || !plan.dragDetection) {
      return null;
    }
    
    // CRITICAL: Correct semantic mapping
    // tc-drag = the GAP/HOLE (target location where piece should go)
    // tc-piece = the PUZZLE PIECE (mobile element that needs to be moved)
    const gap = toDetectionRect(plan.dragDetection);    // tc-drag is the target gap/hole
    const piece = toDetectionRect(plan.pieceDetection); // tc-piece is the mobile puzzle piece
    
    console.log('[Captcha Analysis] YOLO detections:', {
      gap: gap ? { x: gap.x, width: gap.width, conf: gap.confidence } : null,
      piece: piece ? { x: piece.x, width: piece.width, conf: piece.confidence } : null,
    });
    
      const result: DetectionBoxes = {};
      if (gap !== undefined) {
        result.gap = gap;
      }
      if (piece !== undefined) {
        result.piece = piece;
      }
      return result;
  } catch (error) {
    console.log('[Captcha Analysis] YOLO detection failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

function toBoundingBox(rect?: Rect): BoundingBoxPx | undefined {
  if (!rect) {
    return undefined;
  }
  return {
    x1: rect.x,
    y1: rect.y,
    x2: rect.x + rect.width,
    y2: rect.y + rect.height,
  };
}

function toDetectionRect(det?: YoloDetection | null): (Rect & { confidence?: number }) | undefined {
  if (!det) {
    return undefined;
  }
  return {
    x: det.bbox.x,
    y: det.bbox.y,
    width: det.bbox.width,
    height: det.bbox.height,
    confidence: det.confidence,
  };
}
