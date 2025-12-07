import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as os from 'os';
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
const IS_DEBUG = (process.env['CAPTCHA_DEBUG'] === 'true') || (process.env['SUPERBUY_CAPTCHA_DEBUG'] === 'true');

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
    } catch { }
  }
  if (context) {
    try {
      await context.close();
    } catch { }
  }
  if (browser) {
    try {
      await browser.close();
    } catch { }
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

  for (const selector of TCAPTCHA_IFRAME_SELECTORS) {
    try {
      const iframeElement = await page.$(selector);
      if (iframeElement) {
        const frame = await iframeElement.contentFrame();
        if (frame && !frame.isDetached()) {


          // CRITIQUE : Attendre que l'iframe charge son contenu
          try {

            await frame.waitForLoadState('domcontentloaded', { timeout: 10000 });


            // Attendre que le script du captcha s'initialise
            await page.waitForTimeout(2000);

            // Vérifier si le contenu du captcha est présent
            const hasContent = await frame.locator('.tc-captcha, #tcWrap, canvas').count();


            if (hasContent > 0) {
              return frame;
            } else {

              await page.waitForTimeout(3000);
              const recheckContent = await frame.locator('.tc-captcha, #tcWrap, canvas').count();

              if (recheckContent > 0) {
                return frame;
              }
            }
          } catch {
            // Ignore initial wait error
          }

          return frame;
        }
      }
    } catch {
      // Ignore error checking iframe
    }
  }

  // Priority 2: Check all frames for Tencent Captcha elements
  const allFrames = page.frames().filter((frame) => !frame.isDetached());
  const contexts: FrameLike[] = [page, ...allFrames];



  // Look for Tencent Captcha container classes
  for (let i = 0; i < contexts.length; i += 1) {
    const context = contexts[i];
    if (!context || seen.has(context)) {
      continue;
    }
    seen.add(context);



    for (const selector of TCAPTCHA_CONTAINER_SELECTORS) {
      const locator = context.locator(selector).first();
      try {
        const count = await locator.count();
        if (count > 0) {
          const isVisible = await locator.isVisible().catch(() => false);
          if (isVisible) {

            return context;
          }
        }
      } catch { }
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



    for (const selector of canvasSelectors) {
      const locator = context.locator(selector).first();
      try {
        const count = await locator.count();
        if (count > 0) {
          const isVisible = await locator.isVisible().catch(() => false);
          if (isVisible || count >= 1) {

            return context;
          }
        }
      } catch { }
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



    for (const selector of fallbackSelectors) {
      const locator = context.locator(selector).first();
      try {
        const count = await locator.count();
        if (count > 0 && (await locator.isVisible())) {

          return context;
        }
      } catch { }
    }
  }


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


  // Give Tencent Captcha more time to appear (it loads in an iframe)
  let context = await waitForCaptchaContext(page, 20000);
  if (!context) {

    return 'no-captcha';
  }



  // Attendre que le captcha soit visible et interactif

  try {
    // Attendre les éléments visuels du captcha
    await Promise.race([
      context.waitForSelector('.tc-captcha.tc-drag', { state: 'visible', timeout: 15000 }),
      context.waitForSelector('#tcWrap', { state: 'visible', timeout: 15000 }),
      context.waitForSelector('.tc-opera', { state: 'visible', timeout: 15000 }),
    ]);


    // Attendre un peu pour que tout soit chargé
    await page.waitForTimeout(2000);
  } catch {
    // Captcha visibility timeout
  }

  // Save debug screenshot of captcha
  try {
    let captchaScreenshot: string;
    let tmpDir: string | null = null;
    if (IS_DEBUG) {
      captchaScreenshot = path.resolve(process.cwd(), 'debug_captcha.png');
    } else {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'captcha-'));
      captchaScreenshot = path.join(tmpDir, 'debug_captcha.png');
    }
    await page.screenshot({ path: captchaScreenshot, fullPage: false });

    if (!IS_DEBUG && fs.existsSync(captchaScreenshot)) {
      try { fs.unlinkSync(captchaScreenshot); } catch { }
      try { if (tmpDir && fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true }); } catch { }
    }
  } catch {
    // Failed to save captcha screenshot
  }

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    // Refresh context in case Geetest replaced its iframe.
    const freshContext = await waitForCaptchaContext(page, attempt === 1 ? 0 : 4000);
    if (freshContext) {
      context = freshContext;
    } else if (!context || isFrameLikeDetached(context)) {

      context = await waitForCaptchaContext(page, 4000);
    }

    if (!context) {

      return 'failed';
    }



    const images = await captureGeetestImages(context);
    if (!images) {

      // If selected context doesn't have canvases, try page directly to trigger fallback
      const fallbackImages = await captureGeetestImages(page);
      if (!fallbackImages) {

        await refreshGeetest(page, context);
        await page.waitForTimeout(800);
        context = null;
        continue;
      }
      // Use fallback images but keep context for UI interactions
      const { full, background } = fallbackImages;

      const gapOffset = findGapOffset(full, background);
      if (gapOffset < 0) {

        await refreshGeetest(page, context);
        await page.waitForTimeout(800);
        context = null;
        continue;
      }


      const dragged = await dragGeetestSlider(page, context, gapOffset, full.width);
      if (!dragged) {

        await refreshGeetest(page, context);
        await page.waitForTimeout(800);
        context = null;
        continue;
      }


      const solved = await waitForCaptchaSolved(page, context);
      if (solved) {

        return 'solved';
      }


      await refreshGeetest(page, context);
      await page.waitForTimeout(1000);
      context = null;
      continue;
    }

    const { full, background } = images;

    const gapOffset = findGapOffset(full, background);
    if (gapOffset < 0) {

      await refreshGeetest(page, context);
      await page.waitForTimeout(800);
      context = null;
      continue;
    }


    const dragged = await dragGeetestSlider(page, context, gapOffset, full.width);
    if (!dragged) {

      await refreshGeetest(page, context);
      await page.waitForTimeout(800);
      context = null;
      continue;
    }


    const solved = await waitForCaptchaSolved(page, context);
    if (solved) {

      return 'solved';
    }


    await refreshGeetest(page, context);
    await page.waitForTimeout(1000);
    context = null;
  }


  return 'failed';
}

async function captureGeetestImages(context: FrameLike): Promise<{ background: PNG; full: PNG } | null> {
  // Pour Tencent Captcha, il faut attendre que le contenu de l'iframe soit chargé


  // Attendre que le captcha soit complètement initialisé
  try {
    await context.waitForLoadState('domcontentloaded', { timeout: 10000 });

  } catch {
    // Iframe load state timeout
  }

  // Attendre explicitement les éléments du captcha Tencent
  let canvasFound = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const canvasCount = await context.locator('canvas').count();
    if (canvasCount > 0) {

      canvasFound = true;
      break;
    }
    await context.waitForTimeout(500);
  }

  if (!canvasFound) {

    // Essayer de voir si d'autres éléments du captcha sont présents
    try {
      await context.locator('.tc-slider-normal, .tc-slider-ie, .tcaptcha-drag-el').count();
      await context.locator('.tc-captcha, #tcWrap, .tc-drag').count();


      // Dump du HTML de l'iframe pour debug
      const iframeHTML = await context.content().catch(() => '');
      if (iframeHTML) {
        if (IS_DEBUG) {
          const iframeHtmlPath = path.resolve(process.cwd(), 'debug_captcha_iframe.html');
          fs.writeFileSync(iframeHtmlPath, iframeHTML);

        }
      }
    } catch { }
  }

  try {
    await context.waitForSelector('canvas', { timeout: 5000 });
  } catch {
    // Canvas wait timeout in selected context

    // Try to find canvases in a different frame if this is a Page
    if ('frames' in context && typeof context.frames === 'function') {

      const allFrames = (context as Page).frames().filter((f) => !f.isDetached());

      for (let i = 0; i < allFrames.length; i += 1) {
        const frame = allFrames[i];
        if (!frame) {
          continue;
        }
        try {
          const canvasCount = await frame.locator('canvas').count();
          if (canvasCount >= 2) {

            context = frame;
            break;
          }
        } catch { }
      }
    }
  }

  const canvases = context.locator('canvas');
  const count = await canvases.count();


  if (count < 1) {
    return null;
  }

  const decoded: Array<{ className: string; png: PNG; width: number; height: number }> = [];
  for (let index = 0; index < count; index += 1) {
    const locator = canvases.nth(index);
    try {
      await locator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => undefined);

      let className = '';
      try {
        const attrs = await locator.evaluate((node) => {
          const canvas = node as HTMLCanvasElement;
          return {
            className: canvas.className ?? '',
          };
        });
        className = attrs.className;
      } catch { }

      const buffer = await locator.screenshot({ type: 'png' });
      if (buffer.length === 0) {

        continue;
      }

      const png = PNG.sync.read(buffer);

      decoded.push({ className, png, width: png.width, height: png.height });
    } catch {
      // Canvas screenshot error
    }
  }



  if (decoded.length < 2) {
    return null;
  }

  // Tencent Captcha typically has 2 canvas: background (with gap) and full image
  // Try to identify them - usually first is background, second is the piece/overlay
  const backgroundEntry = decoded[0];
  const fullEntry = decoded.length > 1 ? decoded[1] : decoded[0];

  if (!backgroundEntry || !fullEntry) {

    return null;
  }



  const { background, full } = alignPngDimensions(fullEntry.png, backgroundEntry.png);
  if (background.width === 0 || background.height === 0) {

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
    } catch { }
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

    return true;
  } catch {
    // No success indicator found
    if (isFrameLikeDetached(context)) {

      return true;
    }
    try {
      const stillActive = await isCaptchaActive(context);
      if (!stillActive) {

        const newContext = await resolveCaptchaContext(page);
        return !newContext;
      }
    } catch { }
  }

  return false;
}

async function refreshGeetest(page: Page, context: FrameLike): Promise<void> {
  try {
    const refreshButton = await locateFirstVisible(context, TCAPTCHA_REFRESH_SELECTORS);
    if (refreshButton) {

      await refreshButton.click({ delay: 100 });
    } else {

    }
  } catch {
    // Error clicking refresh
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

    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="text"], input[type="email"]', payload.username);
    await page.fill('input[type="password"]', payload.password);

    let screenshotPath: string;
    let tmpDirLogin: string | null = null;
    if (IS_DEBUG) {
      screenshotPath = path.resolve(process.cwd(), 'debug_login.png');
    } else {
      tmpDirLogin = fs.mkdtempSync(path.join(os.tmpdir(), 'captcha-'));
      screenshotPath = path.join(tmpDirLogin, 'debug_login.png');
    }
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => { });

    if (!IS_DEBUG) {
      try { fs.unlinkSync(screenshotPath); } catch { }
      try { if (tmpDirLogin && fs.existsSync(tmpDirLogin)) fs.rmdirSync(tmpDirLogin, { recursive: true }); } catch { }
    }

    // Also save page HTML for debugging (only in debug mode)
    if (IS_DEBUG) {
      const htmlPath = path.resolve(process.cwd(), 'debug_login.html');
      const htmlContent = await page.content().catch(() => '');
      if (htmlContent) {
        fs.writeFileSync(htmlPath, htmlContent);

      }
    }

    await page.waitForTimeout(1000);
    const signInButton = page.locator('button:has-text("Sign In")').first();
    const buttonVisible = await signInButton.isVisible().catch(() => false);
    if (buttonVisible) {

      await signInButton.click();
    } else {

      await page.keyboard.press('Enter');
    }

    // CRITIQUE : Le captcha Tencent n'apparaît QU'APRÈS le clic sur Sign In
    // Il faut attendre plus longtemps pour que le captcha se charge

    await page.waitForTimeout(10000);


    let redirected = false;
    let errorText: string | null = null;

    const errorMsgLocator = await page.$('.error-message, .alert-error, [class*="error"]');
    if (errorMsgLocator) {
      errorText = (await errorMsgLocator.textContent())?.trim() ?? null;
      if (errorText) {

      }
    }

    try {
      await Promise.race([
        page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30000 }),
        page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: 30000 }),
      ]);
      redirected = true;
    } catch {
      // Initial wait error
    }

    let captchaResult: CaptchaSolveResult = 'no-captcha';
    if (!redirected) {
      // Le captcha Tencent se charge APRÈS le clic sur Sign In, pas besoin d'attendre ici


      captchaResult = await solveGeetestCaptcha(page);

      if (captchaResult === 'solved') {
        try {
          await Promise.race([
            page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 20000 }),
            page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: 20000 }),
          ]);
          redirected = true;
        } catch {
          // After captcha error
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
    } catch {
      // Ignore timestamp write error
    }

    await shutdown();
    return NextResponse.json({ started: true, mode: 'headless', captcha: captchaResult === 'solved' ? 'solved' : 'not-required' });
  } catch (error) {
    await shutdown();
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
    } catch { }



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
    // Unexpected error
    return NextResponse.json({ started: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
