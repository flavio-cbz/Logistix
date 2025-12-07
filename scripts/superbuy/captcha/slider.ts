import type { Page, Locator } from 'playwright';
import type { FrameLike, CapturedPuzzle } from './types';
import { FRAME_SELECTORS, locateFirstVisible } from './capture';
import type { CaptchaConfig } from './types';

export async function performSliderDrag(
  page: Page,
  context: FrameLike,
  distancePx: number,
  _puzzle: CapturedPuzzle,
  _attemptTag: string,
  config: CaptchaConfig
): Promise<boolean> {
  const sliderLocator = await locateFirstVisible(context, FRAME_SELECTORS.slider);
  const trackLocator = await locateFirstVisible(context, FRAME_SELECTORS.track);
  if (!sliderLocator || !trackLocator) {
    console.log('[Captcha Slider] Slider or track not found');
    return false;
  }
  const [sliderBox, trackBox] = await Promise.all([
    sliderLocator.boundingBox(),
    trackLocator.boundingBox(),
  ]);
  if (!sliderBox || !trackBox) {
    return false;
  }

  const startX = sliderBox.x + sliderBox.width / 2;
  const startY = sliderBox.y + sliderBox.height / 2;
  const clampedDistance = Math.max(6, Math.min(distancePx, trackBox.width - sliderBox.width - 4));
  const baseTargetX = Math.min(trackBox.x + trackBox.width - 6, startX + clampedDistance);

  const useSmoothMode = config.slider.overshootPx <= 0 || !config.slider.segmentedTrace;
  if (useSmoothMode) {
    // Mode lent & fluide : pas d'overshoot, pas de micro corrections, trajectoire ease-in-out
    console.log('[Captcha Slider] Using smooth drag mode', {
      requestedDistance: distancePx,
      appliedDistance: clampedDistance,
      steps: undefined,
    });
    const prePress = randomBetween(...config.slider.prePressRangeMs);
    await page.mouse.move(startX - randomBetween(2, 4), startY + randomBetween(-1, 1));
    await page.waitForTimeout(randomBetween(25, 55));
    await page.mouse.move(startX, startY);
    await page.waitForTimeout(prePress);
    await page.mouse.down();
    await page.waitForTimeout(randomBetween(35, 70));

    const totalDistance = baseTargetX - startX;
    const steps = Math.max(32, Math.round(Math.abs(totalDistance) / 3));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps; // 0..1
      // Ease in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const current = startX + totalDistance * eased;
      const yJitter = (Math.random() - 0.5) * 1.8; // petit bruit vertical
      await page.mouse.move(current, startY + yJitter, { steps: 1 });
      await page.waitForTimeout(randomBetween(14, 26));
    }
    // Petite stabilisation finale
    await page.waitForTimeout(randomBetween(90, 170));
    await page.mouse.up();
    await page.waitForTimeout(config.postDragSettleMs);
    const moved = await hasSliderMoved(sliderLocator, sliderBox);
    return moved;
  }
  
  // Add overshoot for human-like behavior (classic mode)
  const overshoot = config.slider.overshootPx > 0 
    ? randomBetween(config.slider.overshootPx * 0.35, config.slider.overshootPx * 0.85)
    : 0;
  const overshootX = Math.min(trackBox.x + trackBox.width - 4, baseTargetX + overshoot);

  const prePress = randomBetween(...config.slider.prePressRangeMs);
  
  // Initial hover with slight variation
  await page.mouse.move(startX - randomBetween(4, 8), startY + randomBetween(-2, 2));
  await page.waitForTimeout(randomBetween(25, 60));
  await page.mouse.move(startX, startY);
  await page.waitForTimeout(prePress);
  await page.mouse.down();
  await page.waitForTimeout(randomBetween(40, 90));

  // Phase 1: Acceleration to ~70% with Bezier-like curve
  const distance = overshootX - startX;
  const accelPhase = Math.floor(distance * 0.7);
  const accelSteps = Math.max(14, Math.round(accelPhase / 4));
  
  for (let i = 1; i <= accelSteps; i += 1) {
    const t = i / accelSteps;
    // Ease-out cubic for acceleration
    const eased = 1 - Math.pow(1 - t, 3);
    const current = startX + accelPhase * eased;
    const yJitter = (Math.random() - 0.5) * 3;
    await page.mouse.move(current, startY + yJitter, { steps: 1 });
    await page.waitForTimeout(randomBetween(12, 24));
  }

  // Mid-drag pause (human hesitation)
  await page.waitForTimeout(randomBetween(80, 160));

  // Phase 2: Deceleration to overshoot target with micro-corrections
  const decelStart = startX + accelPhase;
  const decelDistance = overshootX - decelStart;
  const decelSteps = Math.max(14, Math.round(decelDistance / 3.5));
  
  for (let i = 1; i <= decelSteps; i += 1) {
    const t = i / decelSteps;
    // Ease-in quad for deceleration
    const eased = t * t;
    const current = decelStart + decelDistance * eased;
    const yJitter = (Math.random() - 0.5) * 2.5;
    await page.mouse.move(current, startY + yJitter, { steps: 1 });
    await page.waitForTimeout(randomBetween(16, 32));
  }

  // Phase 3: Correction back from overshoot to actual target (if overshoot applied)
  if (overshoot > 2) {
    await page.waitForTimeout(randomBetween(40, 100));
    const correctionSteps = Math.max(3, config.slider.microNudges);
    const correctionDelta = (overshootX - baseTargetX) / correctionSteps;
    
    for (let i = 1; i <= correctionSteps; i += 1) {
      const current = overshootX - correctionDelta * i;
      const yJitter = (Math.random() - 0.5) * 1.5;
      await page.mouse.move(current, startY + yJitter, { steps: 1 });
      await page.waitForTimeout(randomBetween(18, 38));
    }
  }

  // Final micro-adjustments
  for (let i = 0; i < Math.min(config.slider.microNudges, 4); i += 1) {
    const nudge = (Math.random() - 0.5) * 2;
    await page.mouse.move(baseTargetX + nudge, startY + (Math.random() - 0.5) * 1, { steps: 1 });
    await page.waitForTimeout(randomBetween(28, 60));
  }

  await page.waitForTimeout(randomBetween(80, 160));
  await page.mouse.up();
  await page.waitForTimeout(config.postDragSettleMs);

  const moved = await hasSliderMoved(sliderLocator, sliderBox);
  return moved;
}

async function hasSliderMoved(locator: Locator, originalBox: { x: number }): Promise<boolean> {
  try {
    const newBox = await locator.boundingBox();
    if (!newBox) return false;
    return Math.abs((newBox.x ?? 0) - (originalBox.x ?? 0)) > 6;
  } catch {
    return false;
  }
}

export async function waitForCaptchaSolved(page: Page, context: FrameLike, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const success = await context.locator('.tc-success, .tc-success-text, .tc-cover.tc-success').first().isVisible().catch(() => false);
    if (success) {
      return true;
    }
    await page.waitForTimeout(500);
  }
  return false;
}

export async function refreshCaptcha(context: FrameLike, cooldownMs: number): Promise<void> {
  const refresh = await locateFirstVisible(context, ['.tc-action--refresh', '.tc-action.tc-icon', '.tc-refresh', '.tc-btn-refresh']);
  if (refresh) {
    await refresh.click({ delay: 60 }).catch(() => undefined);
  }
  const pageHandle: Page = 'page' in context ? context.page() : context;
  await pageHandle.waitForTimeout(cooldownMs);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
