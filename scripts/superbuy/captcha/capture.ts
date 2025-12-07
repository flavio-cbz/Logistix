import type { Page, Locator } from 'playwright';
// Dynamic import of sharp to avoid TS1259 issues when esModuleInterop isn't honored by certain tooling
import * as path from 'node:path';
import type { CapturedPuzzle, FrameLike, Rect } from './types';
import { ensureDir } from './config';

export const FRAME_SELECTORS = {
  iframe: ['iframe[src*="turing.captcha"]', 'iframe[src*="tcaptcha"]', 'iframe[src*="captcha"]'],
  container: ['.tc-captcha', '#tcWrap', '.tcaptcha-panel', '.tc-panel'],
  puzzle: [
    '.tc-imgarea canvas',
    '.tc-imgarea img',
    '.tc-bg-img img',
    '.tcaptcha-panel canvas',
    '.tcaptcha-panel img',
  ],
  slider: ['.tc-slider-normal', '.tc-slider', '.tcaptcha-drag-button', '.tc-drag-thumb'],
  track: ['.tcaptcha-drag-wrap', '.tc-drag', '.tc-slider-track'],
};

const MIN_PUZZLE_SIZE = 80;
const SLIDER_STYLE_PRIMARY_SELECTOR = '.tc-fg-item.tc-slider-normal';
const SLIDER_CONTAINER_QUERY = [
  '.tc-imgarea',
  '.tcaptcha-panel',
  '.tc-captcha',
  '#tcWrap',
  '.tc-drag',
  '.tc-opera',
  '.tcaptcha-drag-wrap',
];

export async function waitForCaptchaContext(page: Page, timeoutMs: number): Promise<FrameLike | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ctx = await resolveCaptchaContext(page);
    if (ctx) {
      return ctx;
    }
    await page.waitForTimeout(400);
  }
  return null;
}

async function resolveCaptchaContext(page: Page): Promise<FrameLike | null> {
  for (const selector of FRAME_SELECTORS.iframe) {
    const iframe = await page.$(selector).catch(() => null);
    if (iframe) {
      const frame = await iframe.contentFrame();
      if (frame && !frame.isDetached()) {
        return frame;
      }
    }
  }
  const frames = page.frames().filter((frame) => !frame.isDetached());
  for (const frame of [page, ...frames]) {
    for (const selector of FRAME_SELECTORS.container) {
      const locator = frame.locator(selector).first();
      if ((await locator.count().catch(() => 0)) > 0 && (await locator.isVisible().catch(() => false))) {
        return frame;
      }
    }
  }
  return null;
}

export async function locateFirstVisible(context: FrameLike, selectors: readonly string[]): Promise<Locator | null> {
  for (const selector of selectors) {
    const locator = context.locator(selector).first();
    try {
      if ((await locator.count()) > 0 && (await locator.isVisible())) {
        return locator;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function rectFromBox(box?: { x: number; y: number; width: number; height: number } | null): Rect | undefined {
  if (!box || typeof box.width !== 'number') {
    return undefined;
  }
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

export async function capturePuzzle(
  context: FrameLike,
  attemptId: string,
  attemptIndex: number,
  debugDir: string
): Promise<CapturedPuzzle | null> {
  const sharpMod = await import('sharp');
  const sharp: typeof import('sharp') = (sharpMod as any).default ?? (sharpMod as any);
  const puzzleLocator = await locateFirstVisible(context, FRAME_SELECTORS.puzzle);
  let buffer: Buffer | null = null;
  let source: 'image' | 'container' = 'image';
  let targetLocator = puzzleLocator;

  if (puzzleLocator) {
    const box = await puzzleLocator.boundingBox().catch(() => null);
    if (box && box.width >= MIN_PUZZLE_SIZE && box.height >= MIN_PUZZLE_SIZE) {
      buffer = await puzzleLocator.screenshot({ type: 'png' }).catch(() => null);
      if (!buffer) {
        console.log('[Captcha Capture] Puzzle screenshot failed, falling back to container');
      }
    }
  }

  if (!buffer) {
    source = 'container';
    targetLocator = await locateFirstVisible(context, FRAME_SELECTORS.container);
    if (!targetLocator) {
      console.log('[Captcha Capture] No captcha container found');
      return null;
    }
    buffer = await targetLocator.screenshot({ type: 'png' }).catch(() => null);
  }

  if (!buffer) {
    console.log('[Captcha Capture] Could not capture captcha image');
    return null;
  }

  const [targetBoxRaw, containerBoxRaw, sliderBoxRaw, trackBoxRaw] = await Promise.all([
    targetLocator?.boundingBox().catch(() => null) ?? null,
    (await locateFirstVisible(context, FRAME_SELECTORS.container))?.boundingBox().catch(() => null) ?? null,
    (await locateFirstVisible(context, FRAME_SELECTORS.slider))?.boundingBox().catch(() => null) ?? null,
    (await locateFirstVisible(context, FRAME_SELECTORS.track))?.boundingBox().catch(() => null) ?? null,
  ]);

  const targetBox = rectFromBox(targetBoxRaw ?? containerBoxRaw ?? undefined);
  const containerBox = rectFromBox(containerBoxRaw ?? targetBoxRaw ?? undefined);

  if (!targetBox || !containerBox) {
    console.log('[Captcha Capture] Bounding boxes unavailable');
    return null;
  }

  let sliderBox = rectFromBox(sliderBoxRaw ?? undefined);
  if (!sliderBox) {
    sliderBox = await extractSliderBoxFromInlineStyle(context, containerBox);
    if (sliderBox) {
      console.log('[Captcha Capture] Slider box derived from inline style', sliderBox);
    }
  }

  const trackBox = rectFromBox(trackBoxRaw ?? undefined);

  let workingBuffer = buffer;
  let metadata = await sharp(workingBuffer).metadata();
  let imageWidth = metadata.width ?? targetBox.width;
  const pixelRatio = imageWidth / targetBox.width;

  if (source === 'container' && trackBoxRaw && containerBoxRaw) {
    const trackTopCss = trackBoxRaw.y - containerBoxRaw.y;
    const cropHeightPx = Math.max(60, Math.round(Math.max(trackTopCss - 8, 40) * pixelRatio));
    if (cropHeightPx > 60 && metadata.height && cropHeightPx < metadata.height) {
      const cropWidth = metadata.width ?? imageWidth;
      workingBuffer = await sharp(buffer)
        .extract({ left: 0, top: 0, width: cropWidth, height: cropHeightPx })
        .toBuffer();
      metadata = await sharp(workingBuffer).metadata();
      imageWidth = metadata.width ?? imageWidth;
    }
  }

  ensureDir(debugDir);
  const debugPath = path.resolve(debugDir, `${attemptId}-a${String(attemptIndex).padStart(2, '0')}.png`);
  await sharp(workingBuffer).png().toFile(debugPath);

  const result: CapturedPuzzle = {
    buffer: workingBuffer,
    targetBox,
    containerBox,
    pixelRatio,
    source,
    debugPath,
  };
  if (sliderBox !== undefined) result.sliderBox = sliderBox;
  if (trackBox !== undefined) result.trackBox = trackBox;

  return result;
}

async function extractSliderBoxFromInlineStyle(context: FrameLike, containerBox?: Rect): Promise<Rect | undefined> {
  if (!containerBox) {
    return undefined;
  }

  const relativeBox = await context
    .evaluate(
      ({ sliderSelector, containerQuery }: { sliderSelector: string; containerQuery: string }) => {
        const slider = document.querySelector(sliderSelector) as HTMLElement | null;
        if (!slider) {
          return null;
        }
        const container =
          slider.closest(containerQuery) ||
          document.querySelector(containerQuery);
        if (!container) {
          return null;
        }

        const sliderRect = slider.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const parsePx = (prop: string): number | undefined => {
          const style = slider.getAttribute('style') ?? '';
          const match = style.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`));
          if (!match) {
            return undefined;
          }
            const value = parseFloat(match[1]!.replace('px', ''));
          return Number.isFinite(value) ? value : undefined;
        };

        const left = parsePx('left') ?? sliderRect.left - containerRect.left;
        const top = parsePx('top') ?? sliderRect.top - containerRect.top;
        const width = parsePx('width') ?? sliderRect.width;
        const height = parsePx('height') ?? sliderRect.height;

        // Type guard to ensure all values are valid numbers
        const isValidNumber = (v: number | undefined): v is number =>
          typeof v === 'number' && !Number.isNaN(v);

        if (!isValidNumber(left) || !isValidNumber(top) || !isValidNumber(width) || !isValidNumber(height)) {
          return null;
        }

        // TypeScript now knows all values are numbers thanks to the type guard
        return { x: left, y: top, width, height };
      },
      {
        sliderSelector: SLIDER_STYLE_PRIMARY_SELECTOR,
        containerQuery: SLIDER_CONTAINER_QUERY.join(','),
      }
    )
    .catch(() => null);

  if (!relativeBox) {
    return undefined;
  }

  return {
    x: containerBox.x + relativeBox.x,
    y: containerBox.y + relativeBox.y,
    width: relativeBox.width,
    height: relativeBox.height,
  };
}
