import type { Page } from 'playwright';
import { PNG } from 'pngjs';
import { loadCaptchaConfig } from './config';
import { waitForCaptchaContext, capturePuzzle } from './capture';
import { analyzePuzzle } from './analysis';
import { performSliderDrag, waitForCaptchaSolved, refreshCaptcha } from './slider';
import type { CaptchaSolverOptions, FrameLike, CapturedPuzzle, AnalysisResult } from './types';
import {
  CaptchaDatasetService,
  type CaptchaDatasetSampleRef,
  type CaptchaOutcomePayload,
  type BoundingBoxPx,
} from '../../../lib/services/captcha/captcha-dataset-service';
import { YoloCaptchaService } from '../../../lib/services/captcha/yolo-captcha-service';

export type CaptchaSolveResult = 'no-captcha' | 'solved' | 'failed';

export async function solveTencentCaptcha(
  page: Page,
  options?: CaptchaSolverOptions
): Promise<CaptchaSolveResult> {
  const config = loadCaptchaConfig();
  const attemptBase = options?.sessionId ?? buildSessionId();
  const datasetService = config.datasetEnabled ? CaptchaDatasetService.getInstance() : null;
  const yoloService = config.yolo.enabled ? YoloCaptchaService.getInstance() : null;

  let context = await waitForCaptchaContext(page, config.waitForContextMs);
  if (!context) {
    console.log('[Captcha Solver] No captcha context detected');
    return 'no-captcha';
  }

  for (let attemptIndex = 1; attemptIndex <= config.maxAttempts; attemptIndex += 1) {
    if (!context || isContextDetached(context)) {
      context = await waitForCaptchaContext(page, config.waitForContextMs / 2);
      if (!context) {
        console.log('[Captcha Solver] Context lost, aborting attempts');
        return 'failed';
      }
    }

    await page.waitForTimeout(config.captureDelayMs);

    const puzzle = await capturePuzzle(context, attemptBase, attemptIndex, config.debugDir);
    if (!puzzle) {
      await refreshCaptcha(context, config.refreshCooldownMs);
      context = await waitForCaptchaContext(page, config.waitForContextMs / 2) ?? context;
      continue;
    }

    const datasetSample = datasetService
      ? recordDatasetSample(datasetService, attemptBase, attemptIndex, puzzle)
      : undefined;

    const analysisOptions: any = {
      attemptId: attemptBase,
      attemptIndex,
      debugDir: config.debugDir,
      minConfidence: config.yolo.minConfidence,
      datasetService,
      yoloService,
    };
    if (datasetSample !== undefined) {
      analysisOptions.datasetSample = datasetSample;
    }

    const analysis = await analyzePuzzle(puzzle, analysisOptions).catch((error) => {
      console.log('[Captcha Solver] Analysis error:', error instanceof Error ? error.message : String(error));
      return null;
    });

    if (!analysis) {
      attachOutcome(datasetService, datasetSample, 'failure', { notes: 'analysis_failed' });
      await refreshCaptcha(context, config.refreshCooldownMs);
      context = await waitForCaptchaContext(page, config.waitForContextMs / 2) ?? context;
      continue;
    }

    const candidates = analysis.candidateDistances.length > 0
      ? analysis.candidateDistances
      : [Math.round(analysis.rawDistance)];

    console.log('[Captcha Solver] Attempt stats', {
      attempt: attemptIndex,
      method: analysis.method,
      candidateDistances: candidates,
      pixelRatio: Number(analysis.pixelRatio.toFixed(3)),
      confidences: analysis.confidences,
      annotations: analysis.annotations,
    });

    console.log('[Captcha Solver] Geometry snapshot', {
      sliderBox: puzzle.sliderBox,
      trackBox: puzzle.trackBox,
      targetBox: puzzle.targetBox,
      pixelRatio: Number(analysis.pixelRatio.toFixed(4)),
      trackScale: Number(analysis.trackScale.toFixed(4)),
      gapPx: analysis.gapPx,
      dragRect: analysis.pieceRect,
      sliderInitialCenterCss: analysis.pieceCenterCss,
      rawDistancePx: Math.round(analysis.rawDistance),
    });

    let moved = false;
    let appliedDistancePx = 0;
    for (const candidate of candidates) {
      const normalized = Math.max(4, Math.round(candidate));
      const movedNow = await performSliderDrag(
        page,
        context,
        normalized,
        puzzle,
        `${attemptBase}-a${String(attemptIndex).padStart(2, '0')}`,
        config
      );
      if (movedNow) {
        moved = true;
        appliedDistancePx = normalized;
        break;
      }
      await page.waitForTimeout(240);
    }

    if (!moved) {
      console.log('[Captcha Solver] Slider did not move, refreshing captcha');
      attachOutcome(datasetService, datasetSample, 'failure', {
        appliedDistancePx,
        notes: 'slider_not_moved',
        analysis,
      });
      await refreshCaptcha(context, config.refreshCooldownMs);
      context = await waitForCaptchaContext(page, config.waitForContextMs / 2) ?? context;
      continue;
    }

    const solved = await waitForCaptchaSolved(page, context, config.successTimeoutMs);
    if (solved) {
      attachOutcome(datasetService, datasetSample, 'success', {
        appliedDistancePx,
        analysis,
      });
      console.log('[Captcha Solver] Captcha solved successfully');
      return 'solved';
    }

    console.log('[Captcha Solver] Drag applied but verification failed, triggering refresh');
    attachOutcome(datasetService, datasetSample, 'failure', {
      appliedDistancePx,
      notes: 'validation_failed',
      analysis,
    });
    await refreshCaptcha(context, config.refreshCooldownMs);
    context = await waitForCaptchaContext(page, config.waitForContextMs / 2) ?? context;
  }

  console.log('[Captcha Solver] Attempts exhausted without success');
  return 'failed';
}

function isContextDetached(target: FrameLike): boolean {
  if ('isDetached' in target && typeof target.isDetached === 'function') {
    return target.isDetached();
  }
  if ('isClosed' in target && typeof target.isClosed === 'function') {
    return target.isClosed();
  }
  return false;
}

function buildSessionId(): string {
  return `tcaptcha-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function recordDatasetSample(
  service: CaptchaDatasetService,
  attemptId: string,
  attemptIndex: number,
  puzzle: CapturedPuzzle
): CaptchaDatasetSampleRef | undefined {
  try {
    const png = PNG.sync.read(puzzle.buffer);
    return service.recordSample({
      attemptId,
      attemptIndex,
      buffer: puzzle.buffer,
      source: puzzle.source === 'image' ? 'background' : 'container',
      imageWidthPx: png.width,
      imageHeightPx: png.height,
    });
  } catch (error) {
    console.log('[Captcha Solver] Dataset sample recording failed:', error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

function attachOutcome(
  service: CaptchaDatasetService | null,
  sample: CaptchaDatasetSampleRef | undefined,
  status: CaptchaOutcomePayload['status'],
  context: { appliedDistancePx?: number; notes?: string; analysis?: AnalysisResult }
): void {
  if (!service || !sample) {
    return;
  }
  const analysis = context.analysis;
  const trackScale = analysis?.trackScale || 1;
  const appliedPx = context.appliedDistancePx ?? analysis?.rawDistance;
  const appliedCss = appliedPx && trackScale ? appliedPx / trackScale : undefined;
  const notes = ['vision_solver_v1', context.notes].filter(Boolean).join('|');
  
  const labelBoxes: { gap?: BoundingBoxPx; piece?: BoundingBoxPx } | undefined = analysis ? {} : undefined;
  if (labelBoxes && analysis) {
    const gapBox = rectToBoundingBox(analysis.gapRect);
    const pieceBox = rectToBoundingBox(analysis.pieceRect);
    if (gapBox !== undefined) labelBoxes.gap = gapBox;
    if (pieceBox !== undefined) labelBoxes.piece = pieceBox;
  }
  
  const payload: any = { status };
  if (appliedPx !== undefined) payload.appliedDistancePx = appliedPx;
  if (appliedCss !== undefined) payload.appliedDistanceCss = appliedCss;
  if (notes) payload.notes = notes;
  if (labelBoxes !== undefined) payload.labelBoxes = labelBoxes;
  if (analysis) {
    payload.extra = {
      method: analysis.method,
      gapWidthPx: analysis.gapPx.width,
      candidateCount: analysis.candidateDistances.length,
    };
  }
  
  service.attachOutcome(sample, payload);
}

function rectToBoundingBox(rect?: { x: number; y: number; width: number; height: number }): BoundingBoxPx | undefined {
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
