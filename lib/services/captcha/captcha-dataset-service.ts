import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export type CaptchaDatasetSource = 'background' | 'container';

export interface BoundingBoxPx {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CaptchaDetectionSnapshot {
  method: 'yolo' | 'heuristic' | 'hybrid';
  pixelRatio: number;
  gapBoxPx?: BoundingBoxPx;
  pieceBoxPx?: BoundingBoxPx;
  confidence?: {
    gap?: number;
    piece?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface CaptchaDatasetSampleRef {
  attemptId: string;
  frameId: string;
  imagePath: string;
  metadataPath: string;
  imageWidthPx: number;
  imageHeightPx: number;
  source: CaptchaDatasetSource;
}

export interface CaptchaOutcomePayload {
  status: 'success' | 'failure' | 'timeout' | 'error';
  appliedDistanceCss?: number | null;
  appliedDistancePx?: number | null;
  notes?: string;
  labelBoxes?: {
    gap?: BoundingBoxPx;
    piece?: BoundingBoxPx;
  };
  extra?: Record<string, unknown>;
}

export interface CaptchaMetadataFile {
  attemptId: string;
  frameId: string;
  createdAt: string;
  source: CaptchaDatasetSource;
  imagePath: string;
  imageWidthPx: number;
  imageHeightPx: number;
  detection?: CaptchaDetectionSnapshot;
  outcome?: CaptchaOutcomePayload & { updatedAt: string };
}

const CLASS_MAP: Record<string, number> = {
  gap: 0,
  slider_piece: 1,
};

export class CaptchaDatasetService {
  private static instance: CaptchaDatasetService;

  public static getInstance(): CaptchaDatasetService {
    if (!CaptchaDatasetService.instance) {
      CaptchaDatasetService.instance = new CaptchaDatasetService();
    }
    return CaptchaDatasetService.instance;
  }

  private readonly baseDir: string;
  private readonly framesDir: string;
  private readonly metadataDir: string;
  private readonly labelsDir: string;

  private constructor() {
    const defaultDir = path.resolve(process.cwd(), 'data', 'captcha-dataset');
    const envDir = process.env['SUPERBUY_CAPTCHA_DATASET_DIR'];
    this.baseDir = envDir
      ? path.resolve(process.cwd(), envDir)
      : defaultDir;
    this.framesDir = path.join(this.baseDir, 'frames');
    this.metadataDir = path.join(this.baseDir, 'metadata');
    this.labelsDir = path.join(this.baseDir, 'labels');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    [this.baseDir, this.framesDir, this.metadataDir, this.labelsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  public recordSample(params: {
    attemptId: string;
    attemptIndex: number;
    buffer: Buffer;
    source: CaptchaDatasetSource;
    imageWidthPx: number;
    imageHeightPx: number;
    detection?: CaptchaDetectionSnapshot;
  }): CaptchaDatasetSampleRef {
    const frameId = this.buildFrameId(params.attemptId, params.attemptIndex);
    const imagePath = path.join(this.framesDir, `${frameId}.png`);
    fs.writeFileSync(imagePath, params.buffer);
    const metadataPath = path.join(this.metadataDir, `${frameId}.json`);
    const metadata: CaptchaMetadataFile = {
      attemptId: params.attemptId,
      frameId,
      createdAt: new Date().toISOString(),
      source: params.source,
      imagePath,
      imageWidthPx: params.imageWidthPx,
      imageHeightPx: params.imageHeightPx,
    };
    if (params.detection) {
      metadata.detection = params.detection;
    }
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    return {
      attemptId: params.attemptId,
      frameId,
      imagePath,
      metadataPath,
      imageWidthPx: metadata.imageWidthPx,
      imageHeightPx: metadata.imageHeightPx,
      source: params.source,
    };
  }

  public updateDetection(ref: CaptchaDatasetSampleRef, detection: CaptchaDetectionSnapshot): void {
    const metadata = this.readMetadata(ref.metadataPath);
    metadata.detection = detection;
    this.writeMetadata(ref.metadataPath, metadata);
  }

  public attachOutcome(ref: CaptchaDatasetSampleRef, outcome: CaptchaOutcomePayload): void {
    const metadata = this.readMetadata(ref.metadataPath);
    metadata.outcome = {
      ...outcome,
      updatedAt: new Date().toISOString(),
    };
    this.writeMetadata(ref.metadataPath, metadata);
    if (outcome.labelBoxes?.gap || outcome.labelBoxes?.piece) {
      this.writeLabel(ref.frameId, outcome.labelBoxes, {
        width: metadata.imageWidthPx,
        height: metadata.imageHeightPx,
      });
    }
  }

  public listLabelledSamples(): CaptchaMetadataFile[] {
    if (!fs.existsSync(this.metadataDir)) {
      return [];
    }
    const files = fs.readdirSync(this.metadataDir).filter((name) => name.endsWith('.json'));
    return files
      .map((file) => this.readMetadata(path.join(this.metadataDir, file)))
      .filter((meta) => fs.existsSync(this.labelPath(meta.frameId)));
  }

  public listAllMetadata(): CaptchaMetadataFile[] {
    if (!fs.existsSync(this.metadataDir)) {
      return [];
    }
    return fs
      .readdirSync(this.metadataDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => this.readMetadata(path.join(this.metadataDir, file)));
  }

  public getDirectories(): { base: string; frames: string; labels: string; metadata: string } {
    return {
      base: this.baseDir,
      frames: this.framesDir,
      labels: this.labelsDir,
      metadata: this.metadataDir,
    };
  }

  public labelPath(frameId: string): string {
    return path.join(this.labelsDir, `${frameId}.txt`);
  }

  private writeLabel(
    frameId: string,
    boxes: { gap?: BoundingBoxPx; piece?: BoundingBoxPx },
    dims: { width: number; height: number }
  ): void {
    const lines: string[] = [];
    if (boxes.gap) {
      const line = this.formatYoloLine('gap', boxes.gap, dims);
      if (line) {
        lines.push(line);
      }
    }
    if (boxes.piece) {
      const line = this.formatYoloLine('slider_piece', boxes.piece, dims);
      if (line) {
        lines.push(line);
      }
    }
    if (lines.length === 0) {
      return;
    }
    fs.writeFileSync(this.labelPath(frameId), `${lines.join(os.EOL)}${os.EOL}`);
  }

  private formatYoloLine(
    label: keyof typeof CLASS_MAP,
    box: BoundingBoxPx,
    dims: { width: number; height: number }
  ): string {
    if (dims.width <= 1 || dims.height <= 1) {
      return '';
    }
    const classId = CLASS_MAP[label];
    const width = box.x2 - box.x1;
    const height = box.y2 - box.y1;
    const xCenter = box.x1 + width / 2;
    const yCenter = box.y1 + height / 2;
    const denominatorX = Math.max(1, dims.width);
    const denominatorY = Math.max(1, dims.height);
    return [
      classId,
      xCenter / denominatorX,
      yCenter / denominatorY,
      width / denominatorX,
      height / denominatorY,
    ]
      .map((value) => (typeof value === 'number' ? value.toFixed(6) : value))
      .join(' ');
  }

  private readMetadata(metadataPath: string): CaptchaMetadataFile {
    const raw = fs.readFileSync(metadataPath, 'utf-8');
    return JSON.parse(raw) as CaptchaMetadataFile;
  }

  private writeMetadata(metadataPath: string, payload: CaptchaMetadataFile): void {
    fs.writeFileSync(metadataPath, JSON.stringify(payload, null, 2));
  }

  private buildFrameId(attemptId: string, attemptIndex: number): string {
    const safeAttempt = attemptId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
    return `${safeAttempt || 'attempt'}-${String(attemptIndex).padStart(2, '0')}-${Date.now().toString(36)}`;
  }
}
