import type { Frame, Page } from 'playwright';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FrameLike = Page | Frame;

export interface CaptchaConfig {
  waitForContextMs: number;
  maxAttempts: number;
  captureDelayMs: number;
  debugDir: string;
  annotateMoves: boolean;
  postDragSettleMs: number;
  postSuccessCheckMs: number;
  slider: {
    prePressRangeMs: [number, number];
    microNudges: number;
    overshootPx: number;
    segmentedTrace: boolean;
  };
  refreshCooldownMs: number;
  successTimeoutMs: number;
  datasetEnabled: boolean;
  yolo: {
    enabled: boolean;
    minConfidence: number;
  };
}

export interface CapturedPuzzle {
  buffer: Buffer;
  targetBox: Rect;
  containerBox: Rect;
  sliderBox?: Rect;
  trackBox?: Rect;
  pixelRatio: number;
  source: 'image' | 'container';
  debugPath?: string;
}

export interface DetectionBoxes {
  gap?: Rect & { confidence?: number };
  piece?: Rect & { confidence?: number };
}

export interface AnalysisResult {
  method: 'yolo' | 'heuristic';
  gapPx: { left: number; right: number; center: number; width: number };
  pieceCenterCss: number;
  pixelRatio: number;
  trackScale: number;
  candidateDistances: number[];
  rawDistance: number;
  targetBox: Rect;
  sliderBox?: Rect;
  trackBox?: Rect;
  annotations?: string[];
  puzzleSize: { width: number; height: number };
  gapRect: Rect;
  pieceRect?: Rect;
  confidences?: { gap?: number; piece?: number };
}

export interface SliderAttemptResult {
  appliedDistance: number;
  moved: boolean;
  success: boolean;
}

export interface CaptchaSolverOptions {
  sessionId?: string;
}

/**
 * Types alignés avec la sortie JSON de scripts/captcha/yolo_inference.py.
 * 
 * SÉMANTIQUE DES CLASSES YOLO (conforme au guide de résolution) :
 * - "tc-piece" : Emplacement cible (forme claire/vide, l'encoche) - généralement à GAUCHE
 * - "tc-drag"  : Pièce mobile (forme sombre) qui doit glisser vers la DROITE pour s'aligner
 * 
 * Le JSON a la forme :
 * {
 *   "image": { "path": "...", "width": 1234, "height": 567 },
 *   "detections": [
 *     {
 *       "class": "tc-piece" | "tc-drag" | ...,
 *       "confidence": 0.92,
 *       "bbox": { "x": 10, "y": 20, "width": 100, "height": 50 },
 *       "bbox_norm": {
 *         "x_center": 0.42,
 *         "y_center": 0.51,
 *         "width": 0.17,
 *         "height": 0.09
 *       }
 *     }
 *   ]
 * }
 */

export type YoloCaptchaClass = 'tc-piece' | 'tc-drag' | string;

export interface YoloBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface YoloBboxNorm {
  x_center: number;
  y_center: number;
  width: number;
  height: number;
}

export interface YoloDetection {
  class: YoloCaptchaClass;
  confidence: number;
  bbox: YoloBbox;
  bbox_norm: YoloBboxNorm;
}

export interface YoloImageInfo {
  path: string;
  width: number;
  height: number;
}

export interface YoloCaptchaResult {
  image: YoloImageInfo;
  detections: YoloDetection[];
}

/**
 * Plan de mouvement du slider dans le DOM à partir des détections YOLO.
 *
 * deltaXImagePx : distance entre les centres (tc-piece - tc-drag) dans l'image (px)
 * deltaXRatio   : deltaXImagePx normalisé par la largeur de l'image ([-1, 1] typiquement)
 * deltaXDomPx   : distance à appliquer dans le DOM (en pixels CSS, basé sur sliderWidthPx)
 */
export interface SliderMovementPlan {
  imagePath: string;
  imageWidthPx: number;
  imageHeightPx: number;

  pieceDetection?: YoloDetection;
  dragDetection?: YoloDetection;

  deltaXImagePx: number;
  deltaXRatio: number;
  deltaXDomPx: number;

  sliderWidthPx: number;

  // Indicateur pratique si le plan est utilisable tel quel
  valid: boolean;
  reason?: string;
}