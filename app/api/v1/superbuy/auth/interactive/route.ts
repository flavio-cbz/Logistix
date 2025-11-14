import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import type { Browser, BrowserContext, Frame, Locator, Page } from 'playwright';
import { PNG } from 'pngjs';

type CaptchaSolveResult = 'no-captcha' | 'solved' | 'failed';

type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FrameLike = Page | Frame;

interface CredentialsPayload {
  username: string;
  password: string;
}

// Tencent Captcha (TCaptcha) selectors - Superbuy uses TCaptcha, not Geetest
const TCAPTCHA_IFRAME_SELECTORS = ['iframe[src*="turing.captcha"]', 'iframe[src*="tcaptcha"]'];
const TCAPTCHA_CANVAS_SELECTORS = ['canvas', '.tc-bg canvas', '.tc-opera canvas'];
const TCAPTCHA_SLIDER_BUTTON_SELECTORS = ['.tc-slider-normal', '.tc-slider-ie', '.tcaptcha-drag-el'];
const TCAPTCHA_TRACK_SELECTORS = ['.tcaptcha-drag-wrap', '.tc-drag', '.tc-opera'];
const TCAPTCHA_REFRESH_SELECTORS = ['.tc-action--refresh', '.tc-action.tc-icon'];
const TCAPTCHA_CONTAINER_SELECTORS = ['.tc-captcha', '#tcWrap', '.tc-drag', '.tc-opera'];

function isCredentialsPayload(payload: unknown): payload is CredentialsPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate['username'] === 'string' &&
    candidate['username'].length > 0 &&
    typeof candidate['password'] === 'string' &&
    candidate['password'].length > 0
  );
}

async function closeResources(resources: { page?: Page | null; context?: BrowserContext | null; browser?: Browser | null }): Promise<void> {
  const { page, context, browser } = resources;
  if (page) {
    try {
      await page.close();
    } catch {}
  }
  if (context) {
    try {
      await context.close();
    } catch {}
  }
  if (browser) {
    try {
      await browser.close();
    } catch {}
  }
}

function isFrameLikeDetached(target: FrameLike): boolean {
  if ('isClosed' in target && typeof target.isClosed === 'function') {
    return target.isClosed();
  }
  if ('isDetached' in target && typeof target.isDetached === 'function') {
    return target.isDetached();
  }
  return false;
}

async function resolveCaptchaContext(page: Page): Promise<FrameLike | null> {
  const seen = new Set<FrameLike>();
  
  // Priority 1: Check for Tencent Captcha iframe
  console.log('[Auth Interactive] Searching for Tencent Captcha iframe...');
  for (const selector of TCAPTCHA_IFRAME_SELECTORS) {
    try {
      const iframeElement = await page.$(selector);
      if (iframeElement) {
        const frame = await iframeElement.contentFrame();
        if (frame && !frame.isDetached()) {
          console.log(`[Auth Interactive] Found Tencent Captcha iframe via selector: ${selector}`);
          
          // CRITIQUE : Attendre que l'iframe charge son contenu
          try {
            console.log('[Auth Interactive] Waiting for iframe to load content...');
            await frame.waitForLoadState('domcontentloaded', { timeout: 10000 });
            console.log('[Auth Interactive] Iframe DOM content loaded');
            
            // Attendre que le script du captcha s'initialise
            await page.waitForTimeout(2000);
            
            // Vérifier si le contenu du captcha est présent
            const hasContent = await frame.locator('.tc-captcha, #tcWrap, canvas').count();
            console.log(`[Auth Interactive] Iframe has ${hasContent} captcha elements`);
            
            if (hasContent > 0) {
              return frame;
            } else {
              console.log('[Auth Interactive] Iframe found but no captcha content yet, waiting more...');
              await page.waitForTimeout(3000);
              const recheckContent = await frame.locator('.tc-captcha, #tcWrap, canvas').count();
              console.log(`[Auth Interactive] After additional wait: ${recheckContent} captcha elements`);
              if (recheckContent > 0) {
                return frame;
              }
            }
          } catch (loadError) {
            console.log('[Auth Interactive] Iframe load error:', loadError instanceof Error ? loadError.message : String(loadError));
          }
          
          return frame;
        }
      }
    } catch (error) {
      console.log(`[Auth Interactive] Error checking iframe ${selector}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  // Priority 2: Check all frames for Tencent Captcha elements
  const allFrames = page.frames().filter((frame) => !frame.isDetached());
  const contexts: FrameLike[] = [page, ...allFrames];
  
  console.log(`[Auth Interactive] Checking ${contexts.length} contexts (1 page + ${allFrames.length} frames)`);
  
  // Look for Tencent Captcha container classes
  for (let i = 0; i < contexts.length; i += 1) {
    const context = contexts[i];
    if (!context || seen.has(context)) {
      continue;
    }
    seen.add(context);
    
    const contextType = i === 0 ? 'page' : `frame-${i}`;
    
    for (const selector of TCAPTCHA_CONTAINER_SELECTORS) {
      const locator = context.locator(selector).first();
      try {
        const count = await locator.count();
        if (count > 0) {
          const isVisible = await locator.isVisible().catch(() => false);
          if (isVisible) {
            console.log(`[Auth Interactive] Found Tencent Captcha container in ${contextType} via selector: ${selector}`);
            return context;
          }
        }
      } catch {}
    }
  }
  
  // Priority 3: Look for canvas elements (Tencent uses canvas for puzzle)
  const canvasSelectors = TCAPTCHA_CANVAS_SELECTORS;
  
  seen.clear();
  for (let i = 0; i < contexts.length; i += 1) {
    const context = contexts[i];
    if (!context || seen.has(context)) {
      continue;
    }
    seen.add(context);
    
    const contextType = i === 0 ? 'page' : `frame-${i}`;
    
    for (const selector of canvasSelectors) {
      const locator = context.locator(selector).first();
      try {
        const count = await locator.count();
        if (count > 0) {
          const isVisible = await locator.isVisible().catch(() => false);
          if (isVisible || count >= 1) {
            console.log(`[Auth Interactive] Found captcha canvases in ${contextType} via selector: ${selector} (count: ${count})`);
            return context;
          }
        }
      } catch {}
    }
  }
  
  // Priority 4: Fallback to slider/drag elements
  const fallbackSelectors = [
    ...TCAPTCHA_SLIDER_BUTTON_SELECTORS,
    ...TCAPTCHA_TRACK_SELECTORS,
  ];
  
  seen.clear();
  for (let i = 0; i < contexts.length; i += 1) {
    const context = contexts[i];
    if (!context || seen.has(context)) {
      continue;
    }
    seen.add(context);
    
    const contextType = i === 0 ? 'page' : `frame-${i}`;
    
    for (const selector of fallbackSelectors) {
      const locator = context.locator(selector).first();
      try {
        const count = await locator.count();
        if (count > 0 && (await locator.isVisible())) {
          console.log(`[Auth Interactive] Found captcha UI in ${contextType} via selector: ${selector}`);
          return context;
        }
      } catch {}
    }
  }

  console.log('[Auth Interactive] No Tencent Captcha context found in any frame');
  return null;
}

async function waitForCaptchaContext(page: Page, timeoutMs = 10000): Promise<FrameLike | null> {
  if (timeoutMs === 0) {
    return resolveCaptchaContext(page);
  }
  
  const deadline = Date.now() + timeoutMs;
  let lastAttempt = 0;
  
  while (Date.now() < deadline) {
    const context = await resolveCaptchaContext(page);
    if (context) {
      return context;
    }
    
    const elapsed = Date.now() - lastAttempt;
    if (elapsed > 2000) {
      console.log(`[Auth Interactive] Still waiting for captcha context... ${Math.round((deadline - Date.now()) / 1000)}s remaining`);
      lastAttempt = Date.now();
    }
    
    await page.waitForTimeout(300);
  }
  
  return null;
}

async function isCaptchaActive(context: FrameLike): Promise<boolean> {
  try {
    const candidates = [
      ...TCAPTCHA_SLIDER_BUTTON_SELECTORS,
      ...TCAPTCHA_CONTAINER_SELECTORS,
      'text=Slide to complete',
      'text=验证',
    ];
    for (const selector of candidates) {
      const locator = context.locator(selector).first();
      if ((await locator.count()) > 0 && (await locator.isVisible())) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

async function solveGeetestCaptcha(page: Page): Promise<CaptchaSolveResult> {
  console.log('[Auth Interactive] Starting Tencent Captcha solver - waiting for context...');
  
  // Give Tencent Captcha more time to appear (it loads in an iframe)
  let context = await waitForCaptchaContext(page, 20000);
  if (!context) {
    console.log('[Auth Interactive] No Tencent Captcha context detected after 20s wait');
    return 'no-captcha';
  }

  console.log('[Auth Interactive] Tencent Captcha context found, beginning solve attempts');

  // Attendre que le captcha soit visible et interactif
  console.log('[Auth Interactive] Waiting for captcha to become interactive...');
  try {
    // Attendre les éléments visuels du captcha
    await Promise.race([
      context.waitForSelector('.tc-captcha.tc-drag', { state: 'visible', timeout: 15000 }),
      context.waitForSelector('#tcWrap', { state: 'visible', timeout: 15000 }),
      context.waitForSelector('.tc-opera', { state: 'visible', timeout: 15000 }),
    ]);
    console.log('[Auth Interactive] Captcha container is visible');
    
    // Attendre un peu pour que tout soit chargé
    await page.waitForTimeout(2000);
  } catch (error) {
    console.log('[Auth Interactive] Captcha visibility timeout:', error instanceof Error ? error.message : String(error));
  }

  // Save debug screenshot of captcha
  try {
    const captchaScreenshot = path.resolve(process.cwd(), 'debug_captcha.png');
    await page.screenshot({ path: captchaScreenshot, fullPage: false });
    console.log('[Auth Interactive] Captcha screenshot saved to:', captchaScreenshot);
  } catch (error) {
    console.log('[Auth Interactive] Failed to save captcha screenshot:', error instanceof Error ? error.message : String(error));
  }

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    // Refresh context in case Geetest replaced its iframe.
    const freshContext = await waitForCaptchaContext(page, attempt === 1 ? 0 : 4000);
    if (freshContext) {
      context = freshContext;
    } else if (!context || isFrameLikeDetached(context)) {
      console.log(`[Auth Interactive] Context lost, searching again...`);
      context = await waitForCaptchaContext(page, 4000);
    }

    if (!context) {
      console.log(`[Auth Interactive] Captcha context lost before attempt ${attempt}`);
      return 'failed';
    }

    console.log(`[Auth Interactive] Captcha attempt ${attempt}`);

    const images = await captureGeetestImages(context);
    if (!images) {
      console.log('[Auth Interactive] Unable to capture captcha images, searching all frames...');
      // If selected context doesn't have canvases, try page directly to trigger fallback
      const fallbackImages = await captureGeetestImages(page);
      if (!fallbackImages) {
        console.log('[Auth Interactive] Fallback frame search also failed');
        await refreshGeetest(page, context);
        await page.waitForTimeout(800);
        context = null;
        continue;
      }
      // Use fallback images but keep context for UI interactions
      const { full, background } = fallbackImages;
      console.log(`[Auth Interactive] Computing gap offset for ${full.width}x${full.height} images (from fallback)`);
      const gapOffset = findGapOffset(full, background);
      if (gapOffset < 0) {
        console.log('[Auth Interactive] Gap offset not detected');
        await refreshGeetest(page, context);
        await page.waitForTimeout(800);
        context = null;
        continue;
      }

      console.log(`[Auth Interactive] Gap detected at x=${gapOffset}, dragging slider...`);
      const dragged = await dragGeetestSlider(page, context, gapOffset, full.width);
      if (!dragged) {
        console.log('[Auth Interactive] Slider drag failed');
        await refreshGeetest(page, context);
        await page.waitForTimeout(800);
        context = null;
        continue;
      }

      console.log('[Auth Interactive] Drag complete, checking solution...');
      const solved = await waitForCaptchaSolved(page, context);
      if (solved) {
        console.log('[Auth Interactive] Captcha solved automatically');
        return 'solved';
      }

      console.log('[Auth Interactive] Solution check failed, refreshing...');
      await refreshGeetest(page, context);
      await page.waitForTimeout(1000);
      context = null;
      continue;
    }

    const { full, background } = images;
    console.log(`[Auth Interactive] Computing gap offset for ${full.width}x${full.height} images`);
    const gapOffset = findGapOffset(full, background);
    if (gapOffset < 0) {
      console.log('[Auth Interactive] Gap offset not detected');
      await refreshGeetest(page, context);
      await page.waitForTimeout(800);
      context = null;
      continue;
    }

    console.log(`[Auth Interactive] Gap detected at x=${gapOffset}, dragging slider...`);
    const dragged = await dragGeetestSlider(page, context, gapOffset, full.width);
    if (!dragged) {
      console.log('[Auth Interactive] Slider drag failed');
      await refreshGeetest(page, context);
      await page.waitForTimeout(800);
      context = null;
      continue;
    }

    console.log('[Auth Interactive] Drag complete, checking solution...');
    const solved = await waitForCaptchaSolved(page, context);
    if (solved) {
      console.log('[Auth Interactive] Captcha solved automatically');
      return 'solved';
    }

    console.log('[Auth Interactive] Solution check failed, refreshing...');
    await refreshGeetest(page, context);
    await page.waitForTimeout(1000);
    context = null;
  }

  console.log('[Auth Interactive] All solve attempts exhausted');
  return 'failed';
}

async function captureGeetestImages(context: FrameLike): Promise<{ background: PNG; full: PNG } | null> {
  // Pour Tencent Captcha, il faut attendre que le contenu de l'iframe soit chargé
  console.log('[Auth Interactive] Waiting for captcha content to load in iframe...');
  
  // Attendre que le captcha soit complètement initialisé
  try {
    await context.waitForLoadState('domcontentloaded', { timeout: 10000 });
    console.log('[Auth Interactive] Iframe DOM loaded');
  } catch (error) {
    console.log('[Auth Interactive] Iframe load state timeout:', error instanceof Error ? error.message : String(error));
  }
  
  // Attendre explicitement les éléments du captcha Tencent
  let canvasFound = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const canvasCount = await context.locator('canvas').count();
    if (canvasCount > 0) {
      console.log(`[Auth Interactive] Found ${canvasCount} canvas elements after ${attempt * 500}ms`);
      canvasFound = true;
      break;
    }
    await context.waitForTimeout(500);
  }
  
  if (!canvasFound) {
    console.log('[Auth Interactive] No canvas found after waiting 5 seconds');
    // Essayer de voir si d'autres éléments du captcha sont présents
    try {
      const sliderCount = await context.locator('.tc-slider-normal, .tc-slider-ie, .tcaptcha-drag-el').count();
      const containerCount = await context.locator('.tc-captcha, #tcWrap, .tc-drag').count();
      console.log(`[Auth Interactive] Debug - sliders: ${sliderCount}, containers: ${containerCount}`);
      
      // Dump du HTML de l'iframe pour debug
      const iframeHTML = await context.content().catch(() => '');
      if (iframeHTML) {
        const iframeHtmlPath = path.resolve(process.cwd(), 'debug_captcha_iframe.html');
        fs.writeFileSync(iframeHtmlPath, iframeHTML);
        console.log('[Auth Interactive] Iframe HTML saved to:', iframeHtmlPath);
      }
    } catch {}
  }
  
  try {
    await context.waitForSelector('canvas', { timeout: 5000 });
  } catch (error) {
    console.log('[Auth Interactive] Canvas wait timeout in selected context:', error instanceof Error ? error.message : String(error));
    
    // Try to find canvases in a different frame if this is a Page
    if ('frames' in context && typeof context.frames === 'function') {
      console.log('[Auth Interactive] Searching for canvases in all frames...');
      const allFrames = (context as Page).frames().filter((f) => !f.isDetached());
      
      for (let i = 0; i < allFrames.length; i += 1) {
        const frame = allFrames[i];
        if (!frame) {
          continue;
        }
        try {
          const canvasCount = await frame.locator('canvas').count();
          if (canvasCount >= 2) {
            console.log(`[Auth Interactive] Found ${canvasCount} canvases in frame-${i}, using that instead`);
            context = frame;
            break;
          }
        } catch {}
      }
    }
  }

  const canvases = context.locator('canvas');
  const count = await canvases.count();
  console.log(`[Auth Interactive] Found ${count} canvas elements`);
  
  if (count < 1) {
    return null;
  }

  const decoded: Array<{ className: string; png: PNG; width: number; height: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const locator = canvases.nth(index);
    try {
      await locator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => undefined);
      
      let className = '';
      let width = 0;
      let height = 0;
      try {
        const attrs = await locator.evaluate((node) => {
          const canvas = node as HTMLCanvasElement;
          return {
            className: canvas.className ?? '',
            width: canvas.width,
            height: canvas.height,
          };
        });
        className = attrs.className;
        width = attrs.width;
        height = attrs.height;
      } catch {}

      const buffer = await locator.screenshot({ type: 'png' });
      if (buffer.length === 0) {
        console.log(`[Auth Interactive] Canvas ${index} screenshot empty`);
        continue;
      }
      
      const png = PNG.sync.read(buffer);
      console.log(`[Auth Interactive] Canvas ${index}: class="${className}", size=${png.width}x${png.height}, original=${width}x${height}`);
      decoded.push({ className, png, width: png.width, height: png.height });
    } catch (error) {
      console.log(`[Auth Interactive] Canvas ${index} screenshot error:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log(`[Auth Interactive] Decoded ${decoded.length} canvas images`);
  
  if (decoded.length < 2) {
    return null;
  }

  // Tencent Captcha typically has 2 canvas: background (with gap) and full image
  // Try to identify them - usually first is background, second is the piece/overlay
  const backgroundEntry = decoded[0];
  const fullEntry = decoded.length > 1 ? decoded[1] : decoded[0];

  if (!backgroundEntry || !fullEntry) {
    console.log('[Auth Interactive] Could not identify background/full canvas pair');
    return null;
  }

  console.log(`[Auth Interactive] Using background: ${backgroundEntry.width}x${backgroundEntry.height}, full: ${fullEntry.width}x${fullEntry.height}`);

  const { background, full } = alignPngDimensions(fullEntry.png, backgroundEntry.png);
  if (background.width === 0 || background.height === 0) {
    console.log('[Auth Interactive] Aligned dimensions are zero');
    return null;
  }

  return { background, full };
}

function alignPngDimensions(full: PNG, background: PNG): { full: PNG; background: PNG } {
  if (full.width === background.width && full.height === background.height) {
    return { full, background };
  }

  const width = Math.min(full.width, background.width);
  const height = Math.min(full.height, background.height);

  return {
    full: cropPng(full, width, height),
    background: cropPng(background, width, height),
  };
}

function cropPng(source: PNG, width: number, height: number): PNG {
  if (source.width === width && source.height === height) {
    return source;
  }

  const cropped = new PNG({ width, height });
  const rowSize = width * 4;

  for (let y = 0; y < height; y += 1) {
    const sourceStart = y * source.width * 4;
    source.data.copy(cropped.data, y * rowSize, sourceStart, sourceStart + rowSize);
  }

  return cropped;
}

// Heuristically score each column to locate the missing puzzle gap.
function findGapOffset(full: PNG, background: PNG): number {
  const { width, height } = full;
  const startX = Math.floor(width * 0.15);
  const endX = width - Math.floor(width * 0.15);
  let bestX = -1;
  let bestScore = 0;

  for (let x = startX; x < endX; x += 1) {
    let columnScore = 0;
    for (let y = Math.floor(height * 0.25); y < Math.floor(height * 0.75); y += 1) {
      const idx = (y * width + x) * 4;
      if (idx + 2 >= full.data.length || idx + 2 >= background.data.length) {
        continue;
      }
      const fullR = full.data[idx] ?? 0;
      const fullG = full.data[idx + 1] ?? 0;
      const fullB = full.data[idx + 2] ?? 0;
      const backgroundR = background.data[idx] ?? 0;
      const backgroundG = background.data[idx + 1] ?? 0;
      const backgroundB = background.data[idx + 2] ?? 0;
      const diff = Math.abs(fullR - backgroundR) + Math.abs(fullG - backgroundG) + Math.abs(fullB - backgroundB);
      if (diff > 150) {
        columnScore += 1;
      }
    }
    if (columnScore > bestScore) {
      bestScore = columnScore;
      bestX = x;
    }
  }

  if (bestScore < height * 0.1) {
    return -1;
  }

  return bestX;
}

async function dragGeetestSlider(page: Page, context: FrameLike, gapOffset: number, imageWidth: number): Promise<boolean> {
  const sliderButton = await locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
  const track = await locateFirstVisible(context, TCAPTCHA_TRACK_SELECTORS);

  if (!sliderButton || !track) {
    console.log('[Auth Interactive] Slider button or track not found');
    return false;
  }

  const [sliderBox, trackBox] = await Promise.all([sliderButton.boundingBox(), track.boundingBox()]);
  if (!sliderBox || !trackBox || trackBox.width <= 0) {
    return false;
  }

  const scale = trackBox.width / imageWidth;
  let distance = gapOffset * scale - 6;
  if (!Number.isFinite(distance) || distance <= 0) {
    distance = gapOffset * scale * 0.95;
  }

  const maxDistance = trackBox.width - sliderBox.width - 2;
  if (distance > maxDistance) {
    distance = maxDistance;
  }

  await performHumanLikeDrag(page, sliderBox, distance);
  return true;
}

async function locateFirstVisible(target: FrameLike, selectors: readonly string[]): Promise<Locator | null> {
  for (const selector of selectors) {
    const locator = target.locator(selector).first();
    try {
      if ((await locator.count()) > 0 && (await locator.isVisible())) {
        return locator;
      }
    } catch {}
  }
  return null;
}

async function performHumanLikeDrag(page: Page, sliderBox: BoundingBox, distance: number): Promise<void> {
  const startX = sliderBox.x + sliderBox.width / 2;
  const startY = sliderBox.y + sliderBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  const trace = buildMoveTrace(distance);
  let current = 0;
  for (const move of trace) {
    current += move;
    const targetX = startX + current;
    const targetY = startY + randomBetween(-0.6, 0.6);
    await page.mouse.move(targetX, targetY, { steps: 2 });
    await page.waitForTimeout(randomBetween(12, 28));
  }

  await page.waitForTimeout(randomBetween(80, 140));
  await page.mouse.up();
}

// Generate a semi-random drag trace that mimics human acceleration.
function buildMoveTrace(distance: number): number[] {
  const trace: number[] = [];
  const totalSteps = Math.max(18, Math.round(distance / 4));
  let covered = 0;

  for (let i = 0; i < totalSteps; i += 1) {
    const remaining = distance - covered;
    const accelerationPhase = i < totalSteps * 0.6;
    let step = remaining / (totalSteps - i);
    if (accelerationPhase) {
      step += Math.random() * 1.5;
    } else {
      step -= Math.random() * 1.2;
    }
    if (step < 0.4) {
      step = 0.4 + Math.random() * 0.2;
    }
    if (covered + step > distance) {
      step = distance - covered;
    }
    trace.push(step);
    covered += step;
  }

  return trace;
}

async function waitForCaptchaSolved(page: Page, context: FrameLike): Promise<boolean> {
  try {
    // Tencent Captcha success indicators
    await context.waitForSelector('.tc-success, .tc-success-icon, .tc-success-text', { timeout: 4000 });
    console.log('[Auth Interactive] Captcha success indicator found');
    return true;
  } catch (error) {
    console.log('[Auth Interactive] No success indicator found:', error instanceof Error ? error.message : String(error));
    if (isFrameLikeDetached(context)) {
      console.log('[Auth Interactive] Context detached, assuming solved');
      return true;
    }
    try {
      const stillActive = await isCaptchaActive(context);
      if (!stillActive) {
        console.log('[Auth Interactive] Captcha no longer active, checking if new one appeared');
        const newContext = await resolveCaptchaContext(page);
        return !newContext;
      }
    } catch {}
  }

  return false;
}

async function refreshGeetest(page: Page, context: FrameLike): Promise<void> {
  try {
    const refreshButton = await locateFirstVisible(context, TCAPTCHA_REFRESH_SELECTORS);
    if (refreshButton) {
      console.log('[Auth Interactive] Clicking refresh button');
      await refreshButton.click({ delay: 100 });
    } else {
      console.log('[Auth Interactive] Refresh button not found');
    }
  } catch (error) {
    console.log('[Auth Interactive] Error clicking refresh:', error instanceof Error ? error.message : String(error));
  }

  await page.waitForTimeout(1200);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function handleHeadlessLogin(payload: CredentialsPayload): Promise<NextResponse> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const shutdown = async () => closeResources({ page, context, browser });

  try {
  const loginUrl = 'https://www.superbuy.com/en/page/login/';
  console.log('[Auth Interactive] Navigating to:', loginUrl);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="text"], input[type="email"]', payload.username);
    await page.fill('input[type="password"]', payload.password);

    const screenshotPath = path.resolve(process.cwd(), 'debug_login.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    console.log('[Auth Interactive] Screenshot saved to:', screenshotPath);

    // Also save page HTML for debugging
    const htmlPath = path.resolve(process.cwd(), 'debug_login.html');
    const htmlContent = await page.content().catch(() => '');
    if (htmlContent) {
      fs.writeFileSync(htmlPath, htmlContent);
      console.log('[Auth Interactive] HTML saved to:', htmlPath);
    }

    await page.waitForTimeout(1000);
    const signInButton = page.locator('button:has-text("Sign In")').first();
    const buttonVisible = await signInButton.isVisible().catch(() => false);
    if (buttonVisible) {
      console.log('[Auth Interactive] Clicking Sign In button');
      await signInButton.click();
    } else {
      console.log('[Auth Interactive] Sign In button not visible, pressing Enter');
      await page.keyboard.press('Enter');
    }

    // CRITIQUE : Le captcha Tencent n'apparaît QU'APRÈS le clic sur Sign In
    // Il faut attendre plus longtemps pour que le captcha se charge
    console.log('[Auth Interactive] Waiting for captcha to load after login attempt (10s)...');
    await page.waitForTimeout(10000);
    console.log('[Auth Interactive] URL after attempt:', page.url());

    let redirected = false;
    let errorText: string | null = null;

    const errorMsgLocator = await page.$('.error-message, .alert-error, [class*="error"]');
    if (errorMsgLocator) {
      errorText = (await errorMsgLocator.textContent())?.trim() ?? null;
      if (errorText) {
        console.log('[Auth Interactive] Login error message:', errorText);
      }
    }

    try {
      await Promise.race([
        page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30000 }),
        page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: 30000 }),
      ]);
      redirected = true;
    } catch (initialWaitError) {
      console.log('[Auth Interactive] Initial redirect not detected', initialWaitError);
    }

    let captchaResult: CaptchaSolveResult = 'no-captcha';
    if (!redirected) {
      // Le captcha Tencent se charge APRÈS le clic sur Sign In, pas besoin d'attendre ici
      console.log('[Auth Interactive] Checking for Tencent Captcha...');
      
      captchaResult = await solveGeetestCaptcha(page);
      console.log('[Auth Interactive] Captcha result:', captchaResult);
      if (captchaResult === 'solved') {
        try {
          await Promise.race([
            page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 20000 }),
            page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: 20000 }),
          ]);
          redirected = true;
        } catch (afterCaptchaError) {
          console.log('[Auth Interactive] Still no redirect after captcha', afterCaptchaError);
        }
      }
    }

    if (!redirected && (captchaResult === 'failed' || (captchaResult === 'no-captcha' && !errorText))) {
      await shutdown();
      return NextResponse.json(
        {
          started: false,
          error: captchaResult === 'failed' ? 'Captcha resolution failed' : 'Captcha not detected and login incomplete',
          reason: captchaResult === 'failed' ? 'captchaFailed' : 'captchaNotDetected',
        },
        { status: 500 },
      );
    }

    if (!redirected) {
      await shutdown();
      return NextResponse.json(
        {
          started: false,
          error: errorText ?? 'Login did not complete automatically',
          reason: errorText ? 'credentialsRejected' : 'unknownFailure',
        },
        { status: errorText ? 401 : 500 },
      );
    }

    const rootPath = path.resolve(process.cwd(), 'auth_state.json');
    const scriptsPath = path.resolve(process.cwd(), 'scripts', 'superbuy', 'auth_state.json');
    const targetDir = path.dirname(scriptsPath);
    const targetPath = fs.existsSync(targetDir) ? scriptsPath : rootPath;

    await context.storageState({ path: targetPath });
    try {
      const raw = fs.readFileSync(targetPath, 'utf-8');
      const json = JSON.parse(raw);
      json.timestamp = new Date().toISOString();
      fs.writeFileSync(targetPath, JSON.stringify(json, null, 2));
    } catch (timestampError) {
      console.log('[Auth Interactive] Timestamp write error:', timestampError);
    }

    await shutdown();
    return NextResponse.json({ started: true, mode: 'headless', captcha: captchaResult === 'solved' ? 'solved' : 'not-required' });
  } catch (error) {
  await shutdown();
  console.error('[Auth Interactive] Headless login failed:', error);
    return NextResponse.json(
      {
        started: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Starts an interactive Playwright login.
 * POST /api/v1/superbuy/auth/interactive
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown = null;
    try {
      payload = await req.json().catch(() => null);
    } catch {}

  console.log('[Auth Interactive] Payload received:', payload ? 'present' : 'empty');

    const isProd = process.env['NODE_ENV'] === 'production';
    const allowHeadful = process.env['ALLOW_HEADFUL'] === 'true' || !isProd;

    if (!isCredentialsPayload(payload) && !allowHeadful) {
      return NextResponse.json(
        {
          started: false,
          needsCredentials: true,
          reason: 'Manual interactive login is not available on this environment. Provide username/password to authenticate headless.',
        },
        { status: 400 },
      );
    }

    if (isCredentialsPayload(payload)) {
      return handleHeadlessLogin(payload);
    }

    return NextResponse.json(
      {
        started: false,
        error: 'Credentials required for automatic login',
        reason: 'credentialsRequired',
      },
      { status: 400 },
    );
  } catch (error) {
  console.error('[Auth Interactive] Unexpected error:', error);
    return NextResponse.json({ started: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

