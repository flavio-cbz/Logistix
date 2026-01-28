// Load onnxruntime-node only at runtime on the server to avoid Next.js trying to
// bundle native .node binaries into the client build. When running in the
// browser (or during client compilation) we keep `ort` null to prevent webpack
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '@/lib/utils/logging/logger';

// Types inlined from deleted scripts/superbuy/captcha/types.ts
interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoundingBoxNorm {
  x_center: number;
  y_center: number;
  width: number;
  height: number;
}

interface YoloDetection {
  class: string;
  confidence: number;
  bbox: BoundingBox;
  bbox_norm: BoundingBoxNorm;
}

interface YoloCaptchaResult {
  image: {
    path: string;
    width: number;
    height: number;
  };
  detections: YoloDetection[];
}

interface SliderMovementPlan {
  imagePath: string;
  imageWidthPx: number;
  imageHeightPx: number;
  pieceDetection?: YoloDetection;
  dragDetection?: YoloDetection;
  deltaXImagePx: number;
  deltaXRatio: number;
  deltaXDomPx: number;
  sliderWidthPx: number;
  valid: boolean;
  reason?: string;
}

interface OrtSession {
  inputNames: string[];
  outputNames: string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, { data: Float32Array; dims: number[] }>>;
}

interface OrtModule {
  InferenceSession: {
    create(path: string): Promise<OrtSession>;
  };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
}

// ort will be stored in static property


export class YoloCaptchaService {
  private static instance: YoloCaptchaService;
  // `ort` is loaded at runtime on the server.
  public static ortModule: OrtModule | null = null;
  private session: OrtSession | null = null;
  private readonly modelPath: string;
  private readonly minConf: number;

  public static getInstance(): YoloCaptchaService {
    if (!YoloCaptchaService.instance) {
      YoloCaptchaService.instance = new YoloCaptchaService();
    }
    return YoloCaptchaService.instance;
  }

  private constructor() {
    this.modelPath = path.resolve(
      process.cwd(),
      process.env['SUPERBUY_CAPTCHA_ONNX_MODEL_PATH'] ?? 'models/captcha/best.onnx'
    );
    this.minConf = Number(process.env['SUPERBUY_CAPTCHA_YOLO_MIN_CONF'] ?? 0.4);
  }

  private async ensureSession(): Promise<OrtSession> {
    if (!this.session) {
      if (!YoloCaptchaService.ortModule) {
        // Try to load it if not loaded (e.g. first run)
        try {
          YoloCaptchaService.ortModule = require('onnxruntime-node') as OrtModule;
        } catch {
          // ignore
        }
      }

      if (!YoloCaptchaService.ortModule) {
        throw new Error('onnxruntime-node failed to load. Check server logs for details.');
      }
      if (!fs.existsSync(this.modelPath)) {
        throw new Error(`[YoloCaptchaService] Model not found at ${this.modelPath}`);
      }
      this.session = await YoloCaptchaService.ortModule.InferenceSession.create(this.modelPath);
    }
    return this.session;
  }

  /**
   * Preprocess image: Resize to 640x640 with letterboxing, normalize to 0-1, CHW layout.
   */
  private async preprocess(imagePath: string): Promise<{ tensor: unknown; scale: number; padX: number; padY: number; origWidth: number; origHeight: number }> {
    const metadata = await sharp(imagePath).metadata();
    const origWidth = metadata.width ?? 0;
    const origHeight = metadata.height ?? 0;

    if (origWidth === 0 || origHeight === 0) {
      throw new Error(`[YoloCaptchaService] Invalid image dimensions for ${imagePath}`);
    }

    const targetSize = 640;
    const scale = Math.min(targetSize / origWidth, targetSize / origHeight);
    const newWidth = Math.round(origWidth * scale);
    const newHeight = Math.round(origHeight * scale);

    const padX = (targetSize - newWidth) / 2;
    const padY = (targetSize - newHeight) / 2;

    // Resize and pad with gray (114) or black
    const buffer = await sharp(imagePath)
      .resize(newWidth, newHeight)
      .extend({
        top: Math.floor(padY),
        bottom: Math.ceil(padY),
        left: Math.floor(padX),
        right: Math.ceil(padX),
        background: { r: 114, g: 114, b: 114 }
      })
      .raw()
      .toBuffer();

    const float32Data = new Float32Array(3 * targetSize * targetSize);

    // HWC to CHW and normalize 0-255 -> 0.0-1.0
    for (let i = 0; i < targetSize * targetSize; i++) {
      const r = buffer[i * 3] ?? 0;
      const g = buffer[i * 3 + 1] ?? 0;
      const b = buffer[i * 3 + 2] ?? 0;

      float32Data[i] = r / 255.0; // R
      float32Data[targetSize * targetSize + i] = g / 255.0; // G
      float32Data[2 * targetSize * targetSize + i] = b / 255.0; // B
    }

    const tensor = new (YoloCaptchaService.ortModule as OrtModule).Tensor('float32', float32Data, [1, 3, targetSize, targetSize]);
    return { tensor, scale, padX, padY, origWidth, origHeight };
  }

  public async detect(imagePath: string): Promise<YoloCaptchaResult> {
    const session = await this.ensureSession();
    const { tensor, scale, padX, padY, origWidth, origHeight } = await this.preprocess(imagePath);

    const inputName = session.inputNames[0];
    if (!inputName) throw new Error('Model has no input names');

    const feeds: Record<string, unknown> = {};
    feeds[inputName || ''] = tensor;

    const results = await (session as OrtSession).run(feeds);
    const outputName = (session as OrtSession).outputNames[0];
    if (!outputName) throw new Error('Model has no output names');

    const output = results[outputName]; // Shape: [1, 4+num_classes, 8400] or similar
    if (!output || !output.dims || output.dims.length < 3) {
      throw new Error('Invalid model output dimensions');
    }

    const [, channels, anchors] = output.dims;
    if (!channels || !anchors) {
      throw new Error('Invalid model output dimensions (channels/anchors missing)');
    }

    const data = output.data as Float32Array;

    const detections: YoloDetection[] = [];
    // Dynamically determine number of classes
    const numClasses = channels - 4;

    const maxConfPerClass = new Array(numClasses).fill(0);

    // Iterate over anchors
    for (let i = 0; i < anchors; i++) {
      // Find max confidence class
      let maxConf = -Infinity;
      let maxClassIdx = -1;

      const classStartIdx = 4;

      for (let c = 0; c < numClasses; c++) {
        const rawScore = data[(classStartIdx + c) * anchors + i] ?? -Infinity;
        if (rawScore > maxConf) {
          maxConf = rawScore;
          maxClassIdx = c;
        }
        // Track max conf per class (sigmoid applied)
        const scoreSig = 1 / (1 + Math.exp(-rawScore));
        if (scoreSig > maxConfPerClass[c]) {
          maxConfPerClass[c] = scoreSig;
        }
      }

      // Apply sigmoid to get probability
      const confidence = 1 / (1 + Math.exp(-maxConf));

      if (confidence >= this.minConf) {
        const cx = data[0 * anchors + i] ?? 0;
        const cy = data[1 * anchors + i] ?? 0;
        const w = data[2 * anchors + i] ?? 0;
        const h = data[3 * anchors + i] ?? 0;

        // Convert from letterboxed coordinates to original image coordinates
        const x1 = (cx - w / 2 - padX) / scale;
        const y1 = (cy - h / 2 - padY) / scale;
        const x2 = (cx + w / 2 - padX) / scale;
        const y2 = (cy + h / 2 - padY) / scale;

        const width = x2 - x1;
        const height = y2 - y1;

        // Map class IDs to names based on user provided schema
        // 0: tc-captcha, 1: tc-drag (Target), 2: tc-opera, 3: tc-piece (Moving)
        const classNames = ['tc-captcha', 'tc-drag', 'tc-opera', 'tc-piece'];
        const className = classNames[maxClassIdx] || `class_${maxClassIdx}`;

        detections.push({
          class: className,
          confidence: confidence,
          bbox: { x: x1, y: y1, width, height },
          bbox_norm: {
            x_center: (x1 + width / 2) / origWidth,
            y_center: (y1 + height / 2) / origHeight,
            width: width / origWidth,
            height: height / origHeight
          }
        });
      }
    }

    // Apply NMS (Non-Maximum Suppression)
    const nmsDetections = this.nms(detections);

    logger.debug('[YoloCaptchaService] Max confidence per class', { data: maxConfPerClass.map((c, i) => `Class ${i}: ${(c * 100).toFixed(1)}%`).join(', ') });

    return {
      image: {
        path: imagePath,
        width: origWidth,
        height: origHeight
      },
      detections: nmsDetections
    };
  }

  private nms(detections: YoloDetection[], iouThreshold = 0.45): YoloDetection[] {
    if (detections.length === 0) return [];

    // Sort by confidence desc
    detections.sort((a, b) => b.confidence - a.confidence);

    const result: YoloDetection[] = [];
    const active = new Array(detections.length).fill(true);

    for (let i = 0; i < detections.length; i++) {
      if (!active[i]) continue;
      const current = detections[i];
      if (!current) continue;

      result.push(current);

      for (let j = i + 1; j < detections.length; j++) {
        if (!active[j]) continue;
        const other = detections[j];
        if (!other) continue;

        const iou = this.computeIoU(current.bbox, other.bbox);
        if (iou > iouThreshold) {
          active[j] = false;
        }
      }
    }
    return result;
  }

  private computeIoU(boxA: { x: number; y: number; width: number; height: number }, boxB: { x: number; y: number; width: number; height: number }): number {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA.width * boxA.height;
    const boxBArea = boxB.width * boxB.height;

    return interArea / (boxAArea + boxBArea - interArea);
  }

  /**
   * Plan slider movement (compatible with existing interface)
   */
  public async planSliderMovement(
    imagePath: string,
    sliderWidthPx: number,
    _minConf?: number,
  ): Promise<SliderMovementPlan> {
    const result = await this.detect(imagePath);
    const { image, detections } = result;

    // Strategy: Explicitly find 'tc-piece' (Moving) and 'tc-drag' (Target)
    // Filter by confidence
    const pieces = detections.filter(d => d.class === 'tc-piece' && d.confidence > 0.5);
    const targets = detections.filter(d => d.class === 'tc-drag' && d.confidence > 0.5);

    let movingPiece: YoloDetection | undefined;
    let targetHole: YoloDetection | undefined;

    if (pieces.length > 0 && targets.length > 0) {
      // If multiple, find the best pair with similar Y coordinates
      let bestScore = -Infinity;

      for (const p of pieces) {
        for (const t of targets) {
          // Target must be to the right of the piece
          if (t.bbox.x <= p.bbox.x) continue;

          const yDiff = Math.abs(p.bbox.y - t.bbox.y);
          // Score: minimize yDiff, maximize confidence
          const score = (p.confidence + t.confidence) * 10 - yDiff;

          if (score > bestScore) {
            bestScore = score;
            movingPiece = p;
            targetHole = t;
          }
        }
      }
    }

    // Fallback to heuristics if explicit classes not found (or model version mismatch)
    if (!movingPiece || !targetHole) {
      logger.debug('[YoloCaptchaService] Explicit class matching failed, falling back to spatial heuristics');
      // ... existing heuristic logic ...
      const validDetections = detections.filter(d => {
        const wRatio = d.bbox.width / image.width;
        const hRatio = d.bbox.height / image.height;
        return wRatio < 0.5 && hRatio < 0.5;
      });

      // Sort by X
      validDetections.sort((a, b) => a.bbox.x - b.bbox.x);
      const cleanDetections = validDetections.filter(d => d.bbox.x > 10);

      const candidates = cleanDetections.filter(d => d.bbox.x < 100);

      let bestPair: { moving: YoloDetection, target: YoloDetection, score: number } | null = null;

      for (const moving of candidates) {
        const potentialTargets = cleanDetections.filter(d =>
          d.bbox.x > moving.bbox.x + 40 &&
          Math.abs(d.bbox.y - moving.bbox.y) < 20
        );

        for (const target of potentialTargets) {
          const yDiff = Math.abs(moving.bbox.y - target.bbox.y);
          const score = (moving.confidence + target.confidence) * 10 - yDiff;
          if (!bestPair || score > bestPair.score) {
            bestPair = { moving, target, score };
          }
        }
      }

      if (bestPair) {
        movingPiece = bestPair.moving;
        targetHole = bestPair.target;
      }
    }

    if (!movingPiece || !targetHole) {
      return {
        imagePath: image.path,
        imageWidthPx: image.width,
        imageHeightPx: image.height,
        deltaXImagePx: 0,
        deltaXRatio: 0,
        deltaXDomPx: 0,
        sliderWidthPx,
        valid: false,
        reason: 'Could not find Moving Piece -> Target Hole pair',
      };
    }

    // Calculate distance
    // The piece must slide until its CENTER aligns with the target hole CENTER
    const pieceCenterX = movingPiece.bbox.x + movingPiece.bbox.width / 2;
    const targetCenterX = targetHole.bbox.x + targetHole.bbox.width / 2;

    const deltaXImagePx = targetCenterX - pieceCenterX;

    // Calculate the effective travel range of the slider in the image
    // The piece starts at pieceCenterX and can travel until the right edge
    // Usually the slider covers the full width minus the piece width
    // Range = ImageWidth - PieceWidth
    const travelRangePx = image.width - movingPiece.bbox.width;

    // Ratio of distance to travel vs total possible travel
    // But we need to be careful: does the slider map 0-100% to 0-(ImageWidth-PieceWidth)?
    // Yes, usually.
    // However, if the piece starts at X > 0, the 0% position corresponds to that X.
    // So the travel range is (ImageWidth - PieceWidth) - (StartX - Padding?)
    // Let's stick to a simpler ratio: Distance / (ImageWidth - PieceWidth)
    // And add a small multiplier if it consistently falls short (e.g. 1.05)

    const deltaXRatio = deltaXImagePx / travelRangePx;

    // Apply a small correction factor if needed (user reported "barely half inside")
    // If it stops short, we need to increase the movement.
    // Let's try to be precise first with the new center-to-center logic.

    const deltaXDomPx = deltaXRatio * sliderWidthPx;

    return {
      imagePath: image.path,
      imageWidthPx: image.width,
      imageHeightPx: image.height,
      pieceDetection: targetHole,
      dragDetection: movingPiece,
      deltaXImagePx,
      deltaXRatio,
      deltaXDomPx,
      sliderWidthPx,
      valid: true,
    };
  }
}
