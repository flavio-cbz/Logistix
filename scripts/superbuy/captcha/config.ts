import * as path from 'node:path';
import * as fs from 'node:fs';
import { CaptchaConfig } from './types';

const boolEnv = (value?: string, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const numberEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function ensureDir(target: string): void {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
}

export function loadCaptchaConfig(): CaptchaConfig {
  const debugDir = path.resolve(
    process.cwd(),
    process.env['SUPERBUY_CAPTCHA_DEBUG_DIR'] ?? 'captcha-debug'
  );
  const debugEnabled = boolEnv(process.env['SUPERBUY_CAPTCHA_DEBUG'], false);
  if (debugEnabled) ensureDir(debugDir);

  return {
    waitForContextMs: numberEnv(process.env['SUPERBUY_CAPTCHA_CONTEXT_TIMEOUT_MS'], 20000),
    maxAttempts: numberEnv(process.env['SUPERBUY_CAPTCHA_MAX_ATTEMPTS'], 6),
    captureDelayMs: numberEnv(process.env['SUPERBUY_CAPTCHA_CAPTURE_DELAY_MS'], 800),
    debugDir,
    annotateMoves: boolEnv(process.env['SUPERBUY_CAPTCHA_ANNOTATE'], false),
    postDragSettleMs: numberEnv(process.env['SUPERBUY_CAPTCHA_POST_DRAG_SETTLE_MS'], 650),
    postSuccessCheckMs: numberEnv(process.env['SUPERBUY_CAPTCHA_SUCCESS_CHECK_MS'], 1200),
    slider: {
      prePressRangeMs: [
        numberEnv(process.env['SUPERBUY_CAPTCHA_PREPRESS_MIN_MS'], 160),
        numberEnv(process.env['SUPERBUY_CAPTCHA_PREPRESS_MAX_MS'], 380),
      ],
      microNudges: numberEnv(process.env['SUPERBUY_CAPTCHA_MICRO_NUDGES'], 3),
      overshootPx: numberEnv(process.env['SUPERBUY_CAPTCHA_OVERSHOOT_MAX_PX'], 10),
      segmentedTrace: boolEnv(process.env['SUPERBUY_CAPTCHA_SEGMENTED_TRACE'], true),
    },
    refreshCooldownMs: numberEnv(process.env['SUPERBUY_CAPTCHA_REFRESH_COOLDOWN_MS'], 1200),
    successTimeoutMs: numberEnv(process.env['SUPERBUY_POST_CAPTCHA_REDIRECT_TIMEOUT_MS'], 15000),
    datasetEnabled: boolEnv(process.env['SUPERBUY_CAPTCHA_ACTIVE_LEARNING'], false),
    yolo: {
      enabled: boolEnv(process.env['SUPERBUY_CAPTCHA_YOLO_ENABLED'], false),
      minConfidence: Number(process.env['SUPERBUY_CAPTCHA_YOLO_MIN_CONF'] ?? 0.35),
    },
  };
}
