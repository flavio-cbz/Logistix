<<<<<<< HEAD
import 'dotenv/config';

/** * Extrait la position du slider Tencent Captcha à partir du HTML.
 * @param html HTML du captcha (string)
 * @returns { left, top, width, height } ou null si non trouvé
 */
export function extractSliderPositionFromHtml(html: string): { left: number; top: number; width: number; height: number } | null {
  const regex = /<div[^>]*class=["']tc-fg-item tc-slider-normal["'][^>]*style=["']([^"']+)["'][^>]*>/i;
  const match = html.match(regex);
  if (!match || !match[1]) return null;
  const style = match[1];
  const styleMap: Record<string, number> = {};
  style.split(';').forEach((kv) => {
    const [key, value] = kv.split(':').map((s) => s.trim());
    if (!key || !value) return;
    if (['left', 'top', 'width', 'height', 'line-height'].includes(key)) {
      const num = parseFloat(value.replace('px', ''));
      if (!isNaN(num)) styleMap[key] = num;
    }
  });
  if (
    typeof styleMap['left'] === 'number' &&
    typeof styleMap['top'] === 'number' &&
    typeof styleMap['width'] === 'number' &&
    typeof styleMap['height'] === 'number'
  ) {
    return {
      left: styleMap['left'],
      top: styleMap['top'],
      width: styleMap['width'],
      height: styleMap['height'],
    };
  }
  return null;
}
import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page, Frame, Locator } from 'playwright';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PNG } from 'pngjs';
import type { CaptchaSolveResult } from './superbuy/captcha/solver';
import { YoloCaptchaService } from '../lib/services/captcha/yolo-captcha-service';
import { generateHorizontalDragTrajectory } from '../lib/utils/trajectory-generator';

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
const TCAPTCHA_TRACK_SELECTORS = ['#tcOperation', '.tcaptcha-drag-wrap', '.tc-drag', '.tc-opera'];
const TCAPTCHA_REFRESH_SELECTORS = ['.tc-action--refresh', '.tc-action.tc-icon'];
const TCAPTCHA_CONTAINER_SELECTORS = ['#tcOperation', '.tc-captcha', '#tcWrap', '.tc-drag', '.tc-opera'];
const TCAPTCHA_BACKGROUND_SELECTORS = [
  '#tcOperation', // Prefer container to capture piece + bg
  '#slideBg',
  '.tc-imgarea .tc-bg-img',
  '.tc-bg-img',
  '.tc-imgarea .tc-bg',
  // Tolérance élargie (sans canvas)
  '.tc-imgarea img',
  '.tc-bg-img img',
  '.tc-canvas-bg',
  '.tcaptcha-panel img',
  '.tcaptcha-bg',
  '.tc-bg'
];
const CAPTCHA_FOREGROUND_SELECTOR = '.tc-fg-item';
const CAPTCHA_DEBUG_DIR = path.resolve(process.cwd(), process.env['SUPERBUY_CAPTCHA_DEBUG_DIR'] ?? 'captcha-debug');
const IS_DEBUG = (process.env['SUPERBUY_CAPTCHA_DEBUG'] === 'true') || (process.env['CAPTCHA_DEBUG'] === 'true');
const POST_CAPTCHA_REDIRECT_TIMEOUT_MS = Number(process.env['SUPERBUY_POST_CAPTCHA_REDIRECT_TIMEOUT_MS'] ?? 120000);
const CAPTCHA_LOAD_DELAY_MS = Number(process.env['SUPERBUY_CAPTCHA_LOAD_DELAY_MS'] ?? 3000);
const QUICK_REDIRECT_TIMEOUT_MS = Number(process.env['SUPERBUY_QUICK_REDIRECT_TIMEOUT_MS'] ?? 5000);
// Paramètres complémentaires (overshoot & micro-nudges)
const CAPTCHA_OVERSHOOT_MAX_PX = Number(process.env['SUPERBUY_CAPTCHA_OVERSHOOT_MAX_PX'] ?? 12);
const CAPTCHA_MICRO_NUDGES = Number(process.env['SUPERBUY_CAPTCHA_MICRO_NUDGES'] ?? 3);

// Paramétrage ENV des nouvelles stratégies
type StrategySet = 'all' | 'basic' | 'touch_only';
const CAPTCHA_STRATEGY_SET: StrategySet = ((process.env['SUPERBUY_CAPTCHA_STRATEGY_SET'] ?? 'all').toLowerCase() as StrategySet);

// === Captcha API Configuration ===
// REMOVED: AI-powered captcha solving functionality
// const USE_CAPTCHA_API = process.env.SUPERBUY_USE_CAPTCHA_API === 'true';
// const CAPTCHA_API_URL = process.env.CAPTCHA_API_URL ?? 'http://localhost:8000';
// const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY;
// const CAPTCHA_API_TIMEOUT = Number(process.env.CAPTCHA_API_TIMEOUT ?? 30000);

// Initialize API client if enabled
// REMOVED: captchaApiClient initialization
// const captchaApiClient = USE_CAPTCHA_API
//  ? new CaptchaApiClient({
//      apiUrl: CAPTCHA_API_URL,
//      apiKey: CAPTCHA_API_KEY,
//      timeout: CAPTCHA_API_TIMEOUT,
//      debug: true,
//    })
//  : null;

// Initialize Captcha Data Collection SDK
// REMOVED: captchaSDK for data collection
// const captchaSDK = new CaptchaSDK({
//  apiUrl: process.env.CAPTCHA_DATA_API_URL ?? 'http://localhost:8000',
//  apiKey: process.env.CAPTCHA_DATA_API_KEY,
//  timeout: 10000,
//  maxRetries: 3,
// });

// Pre-press dwell range parsing (accepts "min..max", "min-max", "min,max", or single number as max)
// Defaults: 180..420ms, with hard floor at 120ms
const CAPTCHA_PREPRESS_DEFAULT_MIN_MS = 180;
const CAPTCHA_PREPRESS_DEFAULT_MAX_MS = 420;
// Will be resolved later via parseRangeEnv(raw, defMin, defMax, minFloor)
const CAPTCHA_PREPRESS_RANGE_MS = (() => {
  const raw = String(process.env['SUPERBUY_CAPTCHA_PREPRESS_MS'] ?? '').trim();
  const floor = 120;
  let min = CAPTCHA_PREPRESS_DEFAULT_MIN_MS;
  let max = CAPTCHA_PREPRESS_DEFAULT_MAX_MS;

  if (raw) {
    try {
      let a = raw.replace(/\s+/g, '');
      const parts = a.split(/\.{2}|-|,/).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0) as number[];
      if (parts.length === 1 && typeof parts[0] === 'number') {
        max = Math.max(floor, Math.round(parts[0]));
        min = Math.min(max, CAPTCHA_PREPRESS_DEFAULT_MIN_MS);
      } else if (parts.length >= 2 && typeof parts[0] === 'number' && typeof parts[1] === 'number') {
        min = Math.max(floor, Math.min(parts[0], parts[1]));
        max = Math.max(floor, Math.max(parts[0], parts[1]));
      }
      if (min > max) {
        const t = min; min = max; max = t;
      }
    } catch {}
  }
  return { min, max };
})();

// @ts-ignore - Legacy function kept for reference
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

function ensureDirExists(targetDir: string): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

// @ts-ignore - Legacy function kept for reference
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

// @ts-ignore - Legacy function kept for reference
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

// Removed unused functions to satisfy TypeScript strict mode:
// - isCredentialsPayload
// - isFrameLikeDetached  
// - isCaptchaActive
// - captureGeetestImages
// - findGapOffset
// - analyzeCaptchaWithScreenshot
// - dragGeetestSlider
// - performHumanLikeDrag
// - refreshGeetest
// - logCaptchaAttempt
// - logCaptchaArtifact
// - These are legacy functions kept in the file for reference but not currently used.

async function solveTencentCaptcha(page: Page, context: FrameLike, sessionId: string): Promise<CaptchaSolveResult> {
  console.log('[Auth Interactive] Starting Tencent YOLO solve loop', { sessionId });

  if (IS_DEBUG) ensureDirExists(CAPTCHA_DEBUG_DIR);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    console.log('[Auth Interactive] Tencent solve attempt', { attempt, sessionId });

    try {
      // a) Localiser et capturer le CAPTCHA
      const container = await locateFirstVisible(context, TCAPTCHA_CONTAINER_SELECTORS);
      if (!container) {
        console.log('[Auth Interactive] No captcha container found');
        return 'no-captcha';
      }

      const imageFilename = `tcaptcha-${sessionId}-a${String(attempt).padStart(2, '0')}.png`;
      let imagePath: string;
      if (IS_DEBUG) {
        imagePath = path.resolve(CAPTCHA_DEBUG_DIR, imageFilename);
      } else {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'captcha-'));
        imagePath = path.join(tmpDir, imageFilename);
      }

      const screenshotBuffer = await container.screenshot({ type: 'png' });
      fs.writeFileSync(imagePath, screenshotBuffer);
      if (!IS_DEBUG) {
        try {
          fs.unlinkSync(imagePath);
          const dir = path.dirname(imagePath);
          if (fs.existsSync(dir)) fs.rmdirSync(dir, { recursive: true });
        } catch (err) {
          console.log('[Auth Interactive] Could not cleanup temp screenshot', err);
        }
      }
      console.log('[Auth Interactive] Captcha screenshot saved', { imagePath });

      // b) Mesurer la piste du slider
      const trackLocator = await locateFirstVisible(context, TCAPTCHA_TRACK_SELECTORS);
      if (!trackLocator) {
        console.log('[Auth Interactive] Track not found, cannot plan movement');
        return 'failed';
      }
      const trackBox = await trackLocator.boundingBox();
      if (!trackBox || trackBox.width <= 0) {
        console.log('[Auth Interactive] Invalid track bounding box', { trackBox });
        return 'failed';
      }

      // Get slider button width to calculate effective travel range
      const sliderLocator = await locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
      if (!sliderLocator) {
        console.log('[Auth Interactive] Slider button not found');
        return 'failed';
      }
      const sliderBox = await sliderLocator.boundingBox();
      if (!sliderBox) {
        console.log('[Auth Interactive] Slider bounding box unavailable');
        return 'failed';
      }

      // Effective width is the track width minus the slider button width
      // This represents the maximum distance the slider can travel
      const effectiveWidth = trackBox.width - sliderBox.width;
      console.log('[Auth Interactive] Effective slider travel width:', effectiveWidth, `(Track: ${trackBox.width}, Button: ${sliderBox.width})`);

      // c) Planifier le mouvement via YOLO
      const yoloService = YoloCaptchaService.getInstance();
      // Pass effectiveWidth instead of trackBox.width
      const plan = await yoloService.planSliderMovement(imagePath, effectiveWidth);

      console.log('[Auth Interactive] YOLO movement plan', {
        valid: plan.valid,
        deltaXDomPx: plan.deltaXDomPx,
        deltaXImagePx: plan.deltaXImagePx,
        sliderWidthPx: plan.sliderWidthPx,
        reason: plan.reason,
      });

      if (!plan.valid || !Number.isFinite(plan.deltaXDomPx) || plan.deltaXDomPx <= 0) {
        console.log('[Auth Interactive] YOLO plan invalid, refreshing captcha if attempts remain', {
          reason: plan.reason,
        });
        if (attempt < 3) {
          await refreshGeetest(page, context);
          continue;
        }
        return 'failed';
      }

      // d) Générer la trajectoire
      // sliderLocator and sliderBox are already retrieved in step b

      // S'assurer que le slider est visible dans le viewport
      try {
        await sliderLocator.scrollIntoViewIfNeeded();
      } catch {}

      const startX = sliderBox.x + sliderBox.width / 2;
      const startY = sliderBox.y + sliderBox.height / 2;

      const trajectory = generateHorizontalDragTrajectory(startX, startY, plan.deltaXDomPx);

      if (!trajectory || trajectory.length === 0) {
        console.log('[Auth Interactive] Empty trajectory generated');
        if (attempt < 3) {
          await refreshGeetest(page, context);
          continue;
        }
        return 'failed';
      }

      console.log('[Auth Interactive] Generated trajectory with points', trajectory.length);

      // e) Exécuter le drag
      await page.mouse.move(startX, startY);
      await page.mouse.down();

      const baseTime = Date.now();
      for (const point of trajectory) {
        const targetTime = baseTime + point.t;
        const now = Date.now();
        const waitMs = targetTime - now;
        if (waitMs > 1) {
          await page.waitForTimeout(waitMs);
        }
        await page.mouse.move(point.x, point.y);
      }

      await page.mouse.up();

      // f) Vérifier le résultat
      const solved = await waitForCaptchaSolved(page, context);
      if (solved) {
        console.log('[Auth Interactive] Tencent captcha solved via YOLO pipeline', {
          sessionId,
          attempt,
        });
        return 'solved';
      }

      console.log('[Auth Interactive] Tencent captcha not solved on attempt', { attempt, sessionId });

      // g) Gérer les tentatives multiples
      if (attempt < 3) {
        await refreshGeetest(page, context);
      }
    } catch (error) {
      console.log(
        '[Auth Interactive] Error during Tencent YOLO solve attempt',
        attempt,
        ':',
        error instanceof Error ? error.message : String(error),
      );
      if (attempt < 3) {
        await refreshGeetest(page, context);
      }
    }
  }

  // h) Retourner le résultat final
  return 'failed';
}

async function solveGeetestCaptcha(page: Page): Promise<CaptchaSolveResult> {
  const sessionId = `tcaptcha-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  console.log('[Auth Interactive] Solving Tencent Captcha via YOLO pipeline', { sessionId });

  try {
    const context = await waitForCaptchaContext(page, 15000);
    if (!context) {
      console.log('[Auth Interactive] No captcha context found — treating as no-captcha');
      return 'no-captcha';
    }

    const result = await solveTencentCaptcha(page, context, sessionId);
    console.log('[Auth Interactive] YOLO captcha solve result:', result);
    return result;
  } catch (error) {
    console.error(
      '[Auth Interactive] YOLO captcha solving failed:',
      error instanceof Error ? error.message : String(error),
    );
    return 'failed';
  }

  /* Legacy heuristic solver retained for reference
  ... (contenu legacy inchangé, tronqué ici pour lisibilité) ...
  */
}

// @ts-ignore - Legacy function kept for reference
async function captureGeetestImages(context: FrameLike): Promise<{ background: PNG; full: PNG } | null> {
  console.log('[Auth Interactive] Capturing captcha via CSS backgrounds (Tencent)');

  const sources = await context.evaluate((backgroundSelectors: string[]) => {
    const extractCssUrl = (node: Element | null): string | null => {
      if (!node) return null;
      const style = window.getComputedStyle(node as HTMLElement);
      const value = style.getPropertyValue('background-image') || '';
      const match = value.match(/url\((['"]?)(.*?)\1\)/i);
      return match && match[2] ? match[2] : null;
    };

    let backgroundUrl: string | null = null;
    let backgroundSelector: string | null = null;

    for (const selector of backgroundSelectors) {
      const node = document.querySelector(selector) as HTMLElement | null;
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) {
        continue;
      }
      const candidate = extractCssUrl(node);
      if (candidate) {
        backgroundUrl = candidate;
        backgroundSelector = selector;
        break;
      }
    }

    const foregroundNodes = Array.from(document.querySelectorAll('.tc-fg-item')) as HTMLElement[];
    let foregroundUrl: string | null = null;
    for (const node of foregroundNodes) {
      const url = extractCssUrl(node);
      if (url) {
        foregroundUrl = url;
        break;
      }
    }

    // Pour l'annotation YOLO, on veut pouvoir labelliser à la fois:
    // - la pièce (tc-piece / tc-fg-item)
    // - le slider / piste de drag (tc-drag / tcaptcha-drag-wrap / tc-opera)
    //
    // On retourne donc aussi les bounding boxes brutes des éléments clés
    // afin que le pipeline de collecte de données puisse générer des labels
    // séparés pour:
    //  - class "piece"
    //  - class "drag"
    const sliderNodes = Array.from(
      document.querySelectorAll('.tc-slider-normal, .tc-slider-ie, .tcaptcha-drag-el')
    ) as HTMLElement[];
    const trackNodes = Array.from(
      document.querySelectorAll('.tcaptcha-drag-wrap, .tc-drag, .tc-opera')
    ) as HTMLElement[];

    const toBox = (el: HTMLElement | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };

    const firstPiece = foregroundNodes[0] ?? null;
    const firstSlider = sliderNodes[0] ?? null;
    const firstTrack = trackNodes[0] ?? null;

    const pieceBox = toBox(firstPiece);
    const sliderBox = toBox(firstSlider);
    const trackBox = toBox(firstTrack);

    return {
      backgroundUrl,
      backgroundSelector,
      foregroundUrl,
      pieceBox,
      sliderBox,
      trackBox,
    };
  }, TCAPTCHA_BACKGROUND_SELECTORS).catch((error: unknown) => {
    console.log('[Auth Interactive] Failed to inspect captcha DOM for backgrounds:', error instanceof Error ? error.message : String(error));
    return null;
  });

  if (!sources || !sources.backgroundUrl) {
    console.log('[Auth Interactive] No background URL discovered via CSS');
  }

  const deriveFullUrl = (baseUrl: string | null, foregroundUrl: string | null): string[] => {
    const candidates: string[] = [];
    if (foregroundUrl) {
      candidates.push(foregroundUrl);
    }
    if (baseUrl) {
      candidates.push(baseUrl);
      try {
        const parsed = new URL(baseUrl);
        if (parsed.searchParams.has('img_index')) {
          parsed.searchParams.set('img_index', '0');
          candidates.push(parsed.toString());
        }
      } catch {}
    }
    return Array.from(new Set(candidates.filter(Boolean)));
  };

  const downloadImage = async (url: string, label: string): Promise<Buffer | null> => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'LogistixCaptchaBot/1.0',
        },
      });
      if (!response.ok) {
        console.log(`[Auth Interactive] ${label} fetch failed (${response.status})`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.log(`[Auth Interactive] ${label} fetch threw:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  };

  let backgroundBuffer: Buffer | null = sources?.backgroundUrl ? await downloadImage(sources.backgroundUrl, 'Background image') : null;

  if (!backgroundBuffer && sources?.backgroundSelector) {
    console.log('[Auth Interactive] Falling back to direct screenshot for background');
    try {
      const locator = await locateFirstVisible(context, [sources.backgroundSelector]);
      if (locator) {
        backgroundBuffer = await locator.screenshot({ type: 'png' });
      }
    } catch (error) {
      console.log('[Auth Interactive] Background screenshot fallback failed:', error instanceof Error ? error.message : String(error));
    }
  }

  if (!backgroundBuffer) {
    console.log('[Auth Interactive] Unable to capture background image buffer');
    return null;
  }

  const fullUrlCandidates = deriveFullUrl(sources?.backgroundUrl ?? null, sources?.foregroundUrl ?? null);
  let fullBuffer: Buffer | null = null;
  for (const candidate of fullUrlCandidates) {
    fullBuffer = await downloadImage(candidate, 'Full image');
    if (fullBuffer) {
      break;
    }
  }

  if (!fullBuffer) {
    console.log('[Auth Interactive] Full image fetch failed, copying background buffer');
    fullBuffer = backgroundBuffer;
  }

  let background: PNG;
  let full: PNG;
  try {
    background = PNG.sync.read(backgroundBuffer);
  } catch (error) {
    console.log('[Auth Interactive] Background PNG decode failed:', error instanceof Error ? error.message : String(error));
    return null;
  }

  try {
    full = PNG.sync.read(fullBuffer);
  } catch (error) {
    console.log('[Auth Interactive] Full PNG decode failed:', error instanceof Error ? error.message : String(error));
    return null;
  }

  const aligned = alignPngDimensions(full, background);
  if (aligned.background.width === 0 || aligned.background.height === 0) {
    console.log('[Auth Interactive] Invalid PNG dimensions after alignment');
    return null;
  }

  console.log('[Auth Interactive] Captured Tencent background/full images via CSS');
  return aligned;
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
// @ts-ignore - Legacy function kept for reference
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

interface GapSegment {
  left: number;
  right: number;
  score: number;
}

interface ScreenshotGapAnalysis {
  attempt: number;
  pixelRatio: number;
  backgroundBox: BoundingBox;
  pieceBox: BoundingBox;
  sliderBox: BoundingBox | null;
  trackBox: BoundingBox | null;
  gapLeftPx: number;
  gapRightPx: number;
  gapCenterPx: number;
  gapWidthPx: number;
  gapLeftCss: number;
  gapCenterCss: number;
  gapRightCss: number;
  pieceRelativeLeft: number;
  pieceCenterCss: number;
  pieceLeftDistance: number;
  pieceCenterDistance: number;
  deltaToAlign: number;
  recommendedDrag: number;
  fallbackDrag: number;
  scale: number;
  debugImagePath?: string;
}

function analyzeBackgroundForGap(png: PNG): GapSegment | null {
  const { width, height, data } = png;
  if (width === 0 || height === 0) {
    return null;
  }

  const top = Math.max(0, Math.floor(height * 0.25));
  const bottom = Math.min(height, Math.floor(height * 0.75));
  if (bottom - top < 10) {
    return null;
  }

  const columnScores: number[] = new Array(width).fill(0);
  for (let x = 1; x < width - 1; x += 1) {
    let score = 0;
    for (let y = top; y < bottom; y += 1) {
      const idx = (y * width + x) * 4;
      const prevIdx = idx - 4;
      const nextIdx = idx + 4;
      if (prevIdx < 0 || nextIdx >= data.length) {
        continue;
      }
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const prevR = data[prevIdx];
      const prevG = data[prevIdx + 1];
      const prevB = data[prevIdx + 2];
      const nextR = data[nextIdx];
      const nextG = data[nextIdx + 1];
      const nextB = data[nextIdx + 2];

      if (
        r === undefined || g === undefined || b === undefined ||
        prevR === undefined || prevG === undefined || prevB === undefined ||
        nextR === undefined || nextG === undefined || nextB === undefined
      ) {
        continue;
      }

      const diffPrev = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
      const diffNext = Math.abs(r - nextR) + Math.abs(g - nextG) + Math.abs(b - nextB);
      score += diffPrev + diffNext;
    }
    columnScores[x] = score;
  }

  const maxScore = columnScores.reduce((acc, value) => (value > acc ? value : acc), 0);
  if (maxScore < (bottom - top) * 40) {
    return null;
  }

  const threshold = maxScore * 0.55;
  const minWidth = Math.max(12, Math.floor(width * 0.04));
  const maxWidth = Math.max(minWidth + 5, Math.floor(width * 0.35));

  let best: GapSegment | null = null;
  let currentStart = -1;
  let currentScore = 0;

  const finalizeSegment = (start: number, end: number, score: number) => {
    const segmentWidth = end - start + 1;
    if (segmentWidth < minWidth || segmentWidth > maxWidth) {
      return;
    }
    if (!best || score > best.score) {
      best = { left: start, right: end, score };
    }
  };

  for (let x = 1; x < width - 1; x += 1) {
    const value = columnScores[x];
    if (value === undefined) {
      continue;
    }
    if (value >= threshold) {
      if (currentStart === -1) {
        currentStart = x;
        currentScore = value;
      } else {
        currentScore += value;
      }
    } else if (currentStart !== -1) {
      finalizeSegment(currentStart, x - 1, currentScore);
      currentStart = -1;
      currentScore = 0;
    }
  }

  if (currentStart !== -1) {
    finalizeSegment(currentStart, width - 2, currentScore);
  }

  return best;
}

async function locatePuzzlePiece(context: FrameLike): Promise<{ locator: Locator; box: BoundingBox } | null> {
  try {
    const items = context.locator(CAPTCHA_FOREGROUND_SELECTOR);
    const count = await items.count();
    for (let i = 0; i < count; i += 1) {
      const candidate = items.nth(i);
      const box = await candidate.boundingBox().catch(() => null);
      if (!box) {
        continue;
      }
      const { width, height } = box;
      if (width >= 40 && width <= 160 && height >= 40 && height <= 140) {
        if (height > 40 && height > width * 0.6) {
          // Likely the vertical puzzle piece overlay
          return { locator: candidate, box };
        }
        if (height > 48 && width > 48 && height >= width * 0.6) {
          return { locator: candidate, box };
        }
      }
    }
  } catch (error) {
    console.log('[Auth Interactive] locatePuzzlePiece error:', error instanceof Error ? error.message : String(error));
  }
  return null;
}

// @ts-ignore - Legacy function kept for reference
async function analyzeCaptchaWithScreenshot(page: Page, context: FrameLike, attempt: number, options: { captureDebug?: boolean } = {}): Promise<ScreenshotGapAnalysis | null> {
  const { captureDebug = IS_DEBUG } = options;

  // 1) Chercher un arrière-plan tolérant (img/div/canvas)
  let targetLocator = await locateFirstVisible(context, TCAPTCHA_BACKGROUND_SELECTORS);
  let targetKind: 'background' | 'container' = 'background';

  if (!targetLocator) {
    // Passe 2 : Capturer le container global si l'arrière-plan est introuvable
    console.log('[Auth Interactive] No explicit background found — trying container screenshot fallback');
    const containerLocator = await locateFirstVisible(context, TCAPTCHA_CONTAINER_SELECTORS);
    if (!containerLocator) {
      return null;
    }
    targetLocator = containerLocator;
    targetKind = 'container';
  }

  // Récupérer sliders/track et la pièce (facultative)
  const pieceInfo = await locatePuzzlePiece(context);
  const sliderLocator = await locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
  const trackLocator = await locateFirstVisible(context, TCAPTCHA_TRACK_SELECTORS);

  const [targetBox, sliderBox, trackBox] = await Promise.all([
    targetLocator.boundingBox().catch(() => null),
    sliderLocator ? sliderLocator.boundingBox().catch(() => null) : Promise.resolve(null),
    trackLocator ? trackLocator.boundingBox().catch(() => null) : Promise.resolve(null),
  ]);

  if (!targetBox) {
    return null;
  }

  // Capturer le screenshot du target (background ou container)
  let buffer: Buffer;
  try {
    buffer = await targetLocator.screenshot({ type: 'png' });
  } catch (error) {
    console.log('[Auth Interactive] Target screenshot failed:', error instanceof Error ? error.message : String(error));
    return null;
  }

  if (!buffer || buffer.length === 0) {
    return null;
  }

  let png: PNG;
  try {
    png = PNG.sync.read(buffer);
  } catch (error) {
    console.log('[Auth Interactive] Target PNG decode failed:', error instanceof Error ? error.message : String(error));
    return null;
  }

  // Détecter le "gap" dans l'image
  const segment = analyzeBackgroundForGap(png);
  if (!segment) {
    return null;
  }

  // pixelRatio basé sur le container capturé
  const pixelRatio = png.width / targetBox.width;
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return null;
  }

  const gapLeftPx = segment.left;
  const gapRightPx = segment.right;
  if (!Number.isFinite(gapLeftPx) || !Number.isFinite(gapRightPx) || gapRightPx <= gapLeftPx) {
    return null;
  }

  const gapCenterPx = (gapLeftPx + gapRightPx) / 2;
  const gapWidthPx = gapRightPx - gapLeftPx;
  const gapLeftCss = gapLeftPx / pixelRatio;
  const gapCenterCss = gapCenterPx / pixelRatio;
  const gapRightCss = gapRightPx / pixelRatio;

  // Position de la pièce : via pieceInfo si dispo, sinon estimation via slider
  let pieceRelativeLeft: number;
  let pieceCenterCss: number;
  let pieceBox: BoundingBox = { x: targetBox.x, y: targetBox.y, width: 0, height: 0 };

  if (pieceInfo) {
    pieceBox = pieceInfo.box;
    pieceRelativeLeft = pieceBox.x - targetBox.x;
    pieceCenterCss = pieceRelativeLeft + pieceBox.width / 2;
  } else {
    const sliderLeft = (sliderBox?.x ?? targetBox.x) - targetBox.x;
    const sliderCenter = sliderLeft + (sliderBox?.width ?? Math.min(targetBox.width, 12)) / 2;
    pieceRelativeLeft = sliderLeft;
    pieceCenterCss = sliderCenter;
  }

  const pieceLeftDistance = gapLeftCss - pieceRelativeLeft;
  const pieceCenterDistance = gapCenterCss - pieceCenterCss;

  const deltaCandidates = [pieceCenterDistance, pieceLeftDistance].filter((value) => Number.isFinite(value)) as number[];
  const primaryDelta = deltaCandidates.find((value) => Math.abs(value) >= 5) ?? Number.NaN;

  if (!Number.isFinite(primaryDelta) || primaryDelta <= 0) {
    return null;
  }

  const deltaToAlign = primaryDelta;
  const sliderWidth = sliderBox?.width ?? 0;
  const trackWidth = trackBox?.width ?? 0;
  const maxDistance = trackWidth > 0 ? Math.max(6, trackWidth - sliderWidth - 4) : null;

  const clampDistance = (value: number): number => {
    if (!Number.isFinite(value)) {
      return value;
    }
    let result = Math.max(value, 6);
    if (maxDistance !== null && Number.isFinite(maxDistance)) {
      result = Math.min(result, maxDistance);
    }
    return result;
  };

  const recommendedDrag = clampDistance(deltaToAlign * 0.88);
  const fallbackDrag = clampDistance(Math.min(recommendedDrag * 0.95, deltaToAlign * 0.82));

  const scale = targetBox.width > 0 && trackWidth > 0 ? trackWidth / targetBox.width : 1;
 
   let debugImagePath: string | undefined;
  if (captureDebug) {
     try {
       ensureDirExists(CAPTCHA_DEBUG_DIR);
       debugImagePath = path.resolve(CAPTCHA_DEBUG_DIR, `attempt-${attempt}-${targetKind}.png`);
       fs.writeFileSync(debugImagePath, buffer);
 
       // Sauvegarder également les bounding boxes associées pour annotation côté Python
       try {
         const debugJsonPath = debugImagePath.replace(/\.png$/i, '.json');
         const bboxPayload = {
           pieceBox: pieceBox ? { x: pieceBox.x, y: pieceBox.y, width: pieceBox.width, height: pieceBox.height } : null,
           sliderBox: sliderBox
             ? { x: sliderBox.x, y: sliderBox.y, width: sliderBox.width, height: sliderBox.height }
             : null,
           trackBox: trackBox
             ? { x: trackBox.x, y: trackBox.y, width: trackBox.width, height: trackBox.height }
             : null,
         };
         fs.writeFileSync(debugJsonPath, JSON.stringify(bboxPayload, null, 2), { encoding: 'utf-8' });
       } catch (bboxError) {
         console.log(
           '[Auth Interactive] Debug bounding box JSON write failed:',
           bboxError instanceof Error ? bboxError.message : String(bboxError)
         );
       }
     } catch (writeError) {
       console.log('[Auth Interactive] Debug target write failed:', writeError instanceof Error ? writeError.message : String(writeError));
     }
   }
 
   const result: ScreenshotGapAnalysis = {
    attempt,
    pixelRatio,
    backgroundBox: targetBox,
    pieceBox,
    sliderBox: sliderBox ?? null,
    trackBox: trackBox ?? null,
    gapLeftPx,
    gapRightPx,
    gapCenterPx,
    gapWidthPx,
    gapLeftCss,
    gapCenterCss,
    gapRightCss,
    pieceRelativeLeft,
    pieceCenterCss,
    pieceLeftDistance,
    pieceCenterDistance,
    deltaToAlign,
    recommendedDrag,
    fallbackDrag,
    scale,
  };
  if (debugImagePath) {
    result.debugImagePath = debugImagePath;
  }
  return result;
}

// @ts-ignore - Legacy function kept for reference
async function dragGeetestSlider(page: Page, context: FrameLike, gapOffset: number, imageWidth: number, explicitDistance?: number): Promise<boolean> {
  const sliderButton = await locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
  const track = await locateFirstVisible(context, TCAPTCHA_TRACK_SELECTORS);

  if (!sliderButton || !track) {
    console.log('[Auth Interactive] Slider button or track not found');
    return false;
  }
  const [sliderBox, trackBox] = await Promise.all([
    sliderButton.boundingBox(),
    track.boundingBox(),
  ]);

  if (!sliderBox || !trackBox || trackBox.width <= 0) {
    console.log('[Auth Interactive] Invalid slider or track bounding boxes');
    return false;
  }

  // Ensure elements are in view
  try {
    await sliderButton.scrollIntoViewIfNeeded();
  } catch {}
  try {
    await track.scrollIntoViewIfNeeded();
  } catch {}

  const scale = imageWidth > 0 ? trackBox.width / imageWidth : 1;
  let distance: number;

  if (explicitDistance !== undefined && Number.isFinite(explicitDistance)) {
    distance = explicitDistance;
  } else {
    distance = gapOffset * scale - 6;
    if (!Number.isFinite(distance) || distance <= 0) {
      distance = Math.max(4, gapOffset * scale * 0.95);
    }
  }

  const maxDistance = Math.max(0, trackBox.width - sliderBox.width - 2);
  if (distance > maxDistance) {
    distance = maxDistance;
  }

  if (distance < 4) {
    distance = Math.max(distance, 4);
  }

  distance = Math.round(distance);

  const startX = sliderBox.x + sliderBox.width / 2;
  const startY = sliderBox.y + sliderBox.height / 2;
  const desiredEndX = startX + distance;
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const endX = clamp(desiredEndX, trackBox.x + 2, trackBox.x + trackBox.width - 2);

  console.log('[Auth Interactive] Slider bounds', { sliderBox, trackBox, imageWidth, scale, distance, startX, startY, desiredEndX, endX, explicitDistance });

  // Strategy 1: Use page.mouse with a human-like trace
  try {
    await page.mouse.move(startX - 8, startY, { steps: 4 });
    await page.waitForTimeout(randomBetween(30, 80));
    await page.mouse.move(startX, startY, { steps: 6 });
    await page.waitForTimeout(randomBetween(30, 80));
    await page.mouse.down();

    // Pre-press dwell before horizontal drag
    const dwellMs = Math.round(randomBetween(CAPTCHA_PREPRESS_RANGE_MS.min, CAPTCHA_PREPRESS_RANGE_MS.max));
    console.log('[Auth Interactive] Pre-press dwell', { dwellMs });
    await page.waitForTimeout(dwellMs);

    // Human-like segmented jitter (zig-zag)
    const trace = buildMoveTrace(endX - startX);
    let covered = 0;
    let zigDir = Math.random() < 0.5 ? -1 : 1;
    let zigLogged = false;
    for (const step of trace) {
      covered += step;
      const x = startX + covered;
      const jitterAmp = Math.min(2.2, Math.max(0.6, randomBetween(0.6, 2.2)));
      const y = startY + zigDir * jitterAmp;
      if (!zigLogged) {
        console.log('[Auth Interactive] ZigZag jitter applied (strategy 1)');
        zigLogged = true;
      }
      await page.mouse.move(x, y, { steps: 3 });
      await page.waitForTimeout(randomBetween(8, 22));
      zigDir *= -1;
    }

    // Pause humaine avant le relâché
    await page.waitForTimeout(Math.round(randomBetween(120, 240)));
    await page.mouse.up();

    // Longer settle wait to let slider stabilize and momentum dissipate
    await page.waitForTimeout(600);
    const newBox = await sliderButton.boundingBox().catch(() => null);
    if (newBox && Math.abs((newBox.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
      console.log('[Auth Interactive] Slider moved (mouse) delta:', (newBox.x ?? 0) - (sliderBox.x ?? 0));
      return true;
    }
    console.log('[Auth Interactive] Mouse drag did not move slider enough, delta:', newBox && sliderBox ? (newBox.x ?? 0) - (sliderBox.x ?? 0) : 'n/a');
  } catch (err) {
    console.log('[Auth Interactive] Mouse drag attempt failed:', err instanceof Error ? err.message : String(err));
  }

  // Strategy 2: Use Locator.dragTo (higher-level API)
  try {
    const sourcePos = { x: Math.round(sliderBox.width / 2), y: Math.round(sliderBox.height / 2) };
    const targetPos = { x: Math.round(clamp(distance + sliderBox.width / 2, 4, trackBox.width - 4)), y: Math.round(trackBox.height / 2) };
    console.log('[Auth Interactive] Trying locator.dragTo with positions', { sourcePos, targetPos });
    await sliderButton.dragTo(track, { sourcePosition: sourcePos, targetPosition: targetPos });
    await page.waitForTimeout(800);
    const newBox2 = await sliderButton.boundingBox().catch(() => null);
    if (newBox2 && Math.abs((newBox2.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
      console.log('[Auth Interactive] Slider moved (dragTo) delta:', (newBox2.x ?? 0) - (sliderBox.x ?? 0));
      return true;
    }
    console.log('[Auth Interactive] locator.dragTo did not move slider enough');
  } catch (err) {
    console.log('[Auth Interactive] locator.dragTo attempt failed:', err instanceof Error ? err.message : String(err));
  }

  // Strategy 3: Dispatch pointer events inside the element's frame
  try {
    await sliderButton.evaluate(async (el: Element, px: number) => {
      const rect = el.getBoundingClientRect();
      const startXLocal = rect.left + rect.width / 2;
      const startYLocal = rect.top + rect.height / 2;
      const steps = Math.max(12, Math.round(px / 6));

      el.dispatchEvent(new PointerEvent('pointerdown', { clientX: startXLocal, clientY: startYLocal, bubbles: true }));
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const x = startXLocal + px * progress;
        const y = startYLocal + (Math.random() - 0.5) * 2;
        el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
      }
      el.dispatchEvent(new PointerEvent('pointerup', { clientX: startXLocal + px, clientY: startYLocal, bubbles: true }));
    }, distance);

    await page.waitForTimeout(800);
    const newBox3 = await sliderButton.boundingBox().catch(() => null);
    if (newBox3 && Math.abs((newBox3.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
      console.log('[Auth Interactive] Slider moved (pointer events) delta:', (newBox3.x ?? 0) - (sliderBox.x ?? 0));
      return true;
    }
    console.log('[Auth Interactive] Pointer-event dispatch did not move slider enough');
  } catch (err) {
    console.log('[Auth Interactive] Pointer-event dispatch attempt failed:', err instanceof Error ? err.message : String(err));
  }

 // Strategy 3b: Segmented path (multi-segments with micro-pause and controlled zig-zag jitter)
  try {
    if (CAPTCHA_STRATEGY_SET !== 'touch_only') {
      const total = endX - startX;
      console.log('[Auth Interactive] Segmented path drag start', { totalDistance: Math.round(total) });

      await page.mouse.move(startX, startY);
      await page.mouse.down();

      const seg = buildSegmentedTrace(total);
      let progressed = 0;
      let zigDir = Math.random() < 0.5 ? -1 : 1;
      let zigLogged = false;
      let pauseLogged = false;

      for (const step of seg) {
        if (step === 0) {
          const pauseMs = Math.round(randomBetween(80, 140));
          if (!pauseLogged) {
            console.log('[Auth Interactive] Segmented path micro-pause', { pauseMs });
            pauseLogged = true;
          }
          await page.waitForTimeout(pauseMs);
          continue;
        }

        progressed += step;
        const tx = clamp(startX + progressed, trackBox.x + 2, trackBox.x + trackBox.width - 2);

        // Controlled zig-zag vertical jitter (±2.2px, alternating)
        const jitterAmp = Math.min(2.2, Math.max(0.6, randomBetween(0.6, 2.2)));
        const ty = startY + zigDir * jitterAmp;
        if (!zigLogged) {
          console.log('[Auth Interactive] ZigZag jitter applied (segmented)');
          zigLogged = true;
        }

        await page.mouse.move(tx, ty, { steps: 2 });
        await page.waitForTimeout(randomBetween(8, 22));
        zigDir *= -1;
      }

      await page.waitForTimeout(Math.round(randomBetween(100, 200)));
      await page.mouse.up();

      await page.waitForTimeout(600);
      const newBoxSeg = await sliderButton.boundingBox().catch(() => null);
      if (newBoxSeg && Math.abs((newBoxSeg.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
        console.log('[Auth Interactive] Segmented path drag end — slider moved', {
          delta: (newBoxSeg?.x ?? 0) - (sliderBox?.x ?? 0),
        });
        return true;
      }
      console.log('[Auth Interactive] Segmented path did not move slider enough');
    } else {
      console.log('[Auth Interactive] Strategy set is touch_only — skipping segmented path');
    }
  } catch (err) {
    console.log('[Auth Interactive] Segmented path attempt failed:', err instanceof Error ? err.message : String(err));
  }
// Strategy 5: Grip re-acquire attempt (release and re-grab with slight offset)
  try {
    if (CAPTCHA_STRATEGY_SET === 'all') {
      const firstMovePx = Math.round(randomBetween(10, 18));
      const regrabOffsetPx = Math.round(randomBetween(1, 3));
      console.log('[Auth Interactive] Grip re-acquire attempt', { firstMovePx, regrabOffsetPx });

      // First light drag and release
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      const firstEndX = clamp(startX + firstMovePx, trackBox.x + 2, trackBox.x + trackBox.width - 2);
      await page.mouse.move(firstEndX, startY + randomBetween(-1.0, 1.0), { steps: 3 });
      await page.waitForTimeout(Math.round(randomBetween(80, 140)));
      await page.mouse.up();

      // Short dwell before re-grab
      const reacquireDelay = Math.round(randomBetween(120, 220));
      await page.waitForTimeout(reacquireDelay);

      // Re-grab slightly offset and finish the drag to endX
      const regrabX = clamp(firstEndX + regrabOffsetPx, trackBox.x + 2, trackBox.x + trackBox.width - 2);
      await page.mouse.move(regrabX, startY);
      await page.mouse.down();

      const finishTrace = buildMoveTrace(endX - regrabX);
      let progressed = 0;
      let zigDirGrip = Math.random() < 0.5 ? -1 : 1;
      let gripZigLogged = false;

      for (const step of finishTrace) {
        progressed += step;
        const tx = clamp(regrabX + progressed, trackBox.x + 2, trackBox.x + trackBox.width - 2);
        const jitterAmp = Math.min(2.2, Math.max(0.6, randomBetween(0.6, 2.2)));
        const ty = startY + zigDirGrip * jitterAmp;
        if (!gripZigLogged) {
          console.log('[Auth Interactive] ZigZag jitter applied (grip)');
          gripZigLogged = true;
        }
        await page.mouse.move(tx, ty, { steps: 2 });
        await page.waitForTimeout(randomBetween(8, 22));
        zigDirGrip *= -1;
      }

      await page.waitForTimeout(Math.round(randomBetween(100, 200)));
      await page.mouse.up();

      await page.waitForTimeout(600);
      const newBoxGrip = await sliderButton.boundingBox().catch(() => null);
      if (newBoxGrip && Math.abs((newBoxGrip.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
        console.log('[Auth Interactive] Grip re-acquire moved slider', {
          delta: (newBoxGrip?.x ?? 0) - (sliderBox?.x ?? 0),
        });
        return true;
      }
      console.log('[Auth Interactive] Grip re-acquire did not move slider enough');
    } else {
      console.log('[Auth Interactive] Strategy set is', CAPTCHA_STRATEGY_SET, '— skipping grip re-acquire');
    }
  } catch (err) {
    console.log('[Auth Interactive] Grip re-acquire attempt failed:', err instanceof Error ? err.message : String(err));
  }

  // Strategy 6: Touch events drag attempt (fallback tactile)
  try {
    if (CAPTCHA_STRATEGY_SET !== 'basic') {
      console.log('[Auth Interactive] Touch events drag attempt', { distance });

      await sliderButton.evaluate(async (el: Element, px: number) => {
        const rect = el.getBoundingClientRect();
        const startXLocal = rect.left + rect.width / 2;
        const startYLocal = rect.top + rect.height / 2;

        const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
        const targetXLocal = clamp(startXLocal + px, rect.left + 2, rect.right - 2);

        const steps = Math.max(12, Math.round(px / 6));
        let zigDir = Math.random() < 0.5 ? -1 : 1;

        function mkTouch(x: number, y: number) {
          try {
            // @ts-ignore
            return new Touch({
              identifier: Date.now(),
              target: el,
              clientX: x, clientY: y,
              pageX: x, pageY: y,
              screenX: x, screenY: y,
              radiusX: 2, radiusY: 2,
              force: 0.5, rotationAngle: 0
            });
          } catch {
            return {
              identifier: Date.now(),
              target: el,
              clientX: x, clientY: y,
              pageX: x, pageY: y,
              screenX: x, screenY: y
            };
          }
        }

        function dispatchTouch(type: 'touchstart' | 'touchmove' | 'touchend', x: number, y: number) {
          try {
            const t = mkTouch(x, y);
            const ev = new TouchEvent(type, {
              touches: type === 'touchend' ? [] : [t as any],
              targetTouches: type === 'touchend' ? [] : [t as any],
              changedTouches: [t as any],
              bubbles: true,
              cancelable: true
            });
            el.dispatchEvent(ev);
          } catch {
            // Fallback: use pointer events with pointerType='touch'
            const peType = type === 'touchstart' ? 'pointerdown' : type === 'touchmove' ? 'pointermove' : 'pointerup';
            el.dispatchEvent(new PointerEvent(peType, {
              clientX: x,
              clientY: y,
              bubbles: true,
              // @ts-ignore
              pointerType: 'touch',
            }));
          }
        }

        dispatchTouch('touchstart', startXLocal, startYLocal);

        for (let i = 1; i <= steps; i += 1) {
          const progress = i / steps;
          const x = startXLocal + (targetXLocal - startXLocal) * progress;
          const jitterAmp = Math.min(2.2, Math.max(0.6, 0.6 + Math.random() * 1.6));
          const y = startYLocal + zigDir * jitterAmp;
          dispatchTouch('touchmove', x, y);
          zigDir *= -1;
          await new Promise((r) => setTimeout(r, Math.round(8 + Math.random() * 14)));
        }

        dispatchTouch('touchend', targetXLocal, startYLocal);
      }, distance);

      await page.waitForTimeout(800);
      const newBoxTouch = await sliderButton.boundingBox().catch(() => null);
      if (newBoxTouch && Math.abs((newBoxTouch.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
        console.log('[Auth Interactive] Slider moved (touch events) delta:', (newBoxTouch?.x ?? 0) - (sliderBox?.x ?? 0));
        return true;
      }
      console.log('[Auth Interactive] Touch events did not move slider enough');
    } else {
      console.log('[Auth Interactive] Strategy set is basic — skipping touch events');
    }
  } catch (err) {
    console.log('[Auth Interactive] Touch events attempt failed:', err instanceof Error ? err.message : String(err));
  }
  // Strategy 4: Overshoot-and-back
  try {
    const over = Math.min(CAPTCHA_OVERSHOOT_MAX_PX, Math.round(trackBox.width * 0.035));
    console.log('[Auth Interactive] Trying overshoot-and-back', { over, baseDistance: distance });

    // Overshoot forward
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const endOvershoot = clamp(startX + distance + over, trackBox.x + 2, trackBox.x + trackBox.width - 2);
    const traceFwd = buildMoveTrace(endOvershoot - startX);
    let progressed = 0;
    for (const step of traceFwd) {
      progressed += step;
      const x = startX + progressed;
      const y = startY + randomBetween(-1.1, 1.1);
      await page.mouse.move(x, y, { steps: 2 });
      await page.waitForTimeout(randomBetween(10, 24));
    }
    // Pause semi-aléatoire avant relâché final
    await page.waitForTimeout(Math.round(randomBetween(120, 240)));
    await page.mouse.up();
    await page.waitForTimeout(320);

    // Back small
    const boxAfter = await sliderButton.boundingBox().catch(() => null);
    if (boxAfter) {
      const backStartX = boxAfter.x + boxAfter.width / 2;
      const backStartY = boxAfter.y + boxAfter.height / 2;
      const back = Math.round(randomBetween(3, 6));
      await page.mouse.move(backStartX, backStartY);
      await page.mouse.down();
      const backTrace = buildMoveTrace(back);
      let backProg = 0;
      for (const step of backTrace) {
        backProg += step;
        const x = backStartX - backProg;
        const y = backStartY + randomBetween(-0.8, 0.8);
        await page.mouse.move(x, y, { steps: 2 });
        await page.waitForTimeout(randomBetween(10, 26));
      }
      await page.waitForTimeout(Math.round(randomBetween(100, 200)));
      await page.mouse.up();

      await page.waitForTimeout(600);
      const afterBack = await sliderButton.boundingBox().catch(() => null);
      if (afterBack && Math.abs((afterBack.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
        console.log('[Auth Interactive] Slider moved (overshoot/back) delta:', (afterBack.x ?? 0) - (sliderBox.x ?? 0));
        const solved = await waitForCaptchaSolved(page, context);
        if (solved) {
          console.log('[Auth Interactive] Captcha solved after overshoot/back');
        } else {
          console.log('[Auth Interactive] Overshoot/back moved slider but did not confirm success');
        }
        return true;
      }
    }
  } catch (err) {
    console.log('[Auth Interactive] Overshoot-and-back attempt failed:', err instanceof Error ? err.message : String(err));
  }

  // Strategy 5: Alternate micro-nudges sequence (+3,-2,+2,-3,+2 px)
  try {
    const baseSeq = [3, -2, 2, -3, 2];
    const count = Math.max(3, Math.min(5, CAPTCHA_MICRO_NUDGES));
    console.log('[Auth Interactive] Alternate micro-nudges sequence', { count, sequence: baseSeq.slice(0, count) });

    const currBox0 = await sliderButton.boundingBox().catch(() => null);
    if (!currBox0) { throw new Error('slider box unavailable'); }

    let cx = currBox0.x + currBox0.width / 2;
    const cy = currBox0.y + currBox0.height / 2;

    for (let i = 0; i < count; i += 1) {
      const amp = baseSeq[i];
      const targetX = clamp(cx + (amp ?? 0), trackBox.x + 2, trackBox.x + trackBox.width - 2);

      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(targetX, cy + randomBetween(-0.8, 0.8), { steps: 2 });
      await page.waitForTimeout(Math.round(randomBetween(60, 120)));
      await page.mouse.up();

      const nudgeSolved = await waitForCaptchaSolved(page, context);
      if (nudgeSolved) {
        console.log('[Auth Interactive] Captcha solved via alternate micro-nudges');
        return true;
      }

      const currBoxNext = await sliderButton.boundingBox().catch(() => null);
      if (!currBoxNext) break;
      cx = currBoxNext.x + currBoxNext.width / 2;
    }
  } catch (err) {
    console.log('[Auth Interactive] Micro-nudges attempt failed:', err instanceof Error ? err.message : String(err));
  }

  console.log('[Auth Interactive] All drag strategies failed');
  return false;
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

// @ts-ignore - Legacy function kept for reference
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
  // Add a small delay to let the captcha process the drag
  await page.waitForTimeout(1000);

  // First, check immediately for success indicators
  try {
    const successLocator = context.locator('.tc-success, .tc-success-icon, .tc-success-text, .tc-cover.tc-success');
    const count = await successLocator.count().catch(() => 0);
    if (count > 0) {
      // Check if element is actually visible or has success styling
      const isSuccess = await successLocator.first().evaluate((el: Element) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const hasSuccessClass = htmlEl.classList.contains('tc-success') ||
                               htmlEl.classList.contains('tc-success-icon') ||
                               htmlEl.classList.contains('tc-success-text') ||
                               (htmlEl.classList.contains('tc-cover') && htmlEl.classList.contains('tc-success'));
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        return hasSuccessClass && isVisible;
      }).catch(() => false);

      if (isSuccess) {
        console.log('[Auth Interactive] Captcha success indicator detected and visible');
        return true;
      }
    }
  } catch (immediateCheckError) {
    console.log('[Auth Interactive] Immediate success check failed:', immediateCheckError instanceof Error ? immediateCheckError.message : String(immediateCheckError));
  }

  // Wait for success indicators to appear/become visible with longer timeout
  try {
    await context.waitForSelector('.tc-success, .tc-success-icon, .tc-success-text, .tc-cover.tc-success', { timeout: 5000 });
    console.log('[Auth Interactive] Captcha success indicator became visible');
    return true;
  } catch (waitError) {
    console.log('[Auth Interactive] Success indicator wait timed out after 5s');
  }

  // Check for success text with more variations
  try {
    const successTexts = ['成功', '验证通过', 'Success', '验证成功', 'Verification Successful', '验证完成', '验证通过', '验证成功', '验证完毕'];
    for (const text of successTexts) {
      const textLocator = context.locator(`text=${text}`);
      if ((await textLocator.count().catch(() => 0)) > 0) {
        const isVisible = await textLocator.first().isVisible().catch(() => false);
        if (isVisible) {
          console.log('[Auth Interactive] Success text detected:', text);
          return true;
        }
      }
    }
  } catch (textError) {
    console.log('[Auth Interactive] Text-based success check failed:', textError instanceof Error ? textError.message : String(textError));
  }

  // Check for continue/next buttons that appear after success
  try {
    const continueSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("确认")',
      'button:has-text("确定")',
      'button:has-text("完成")',
      '.tc-btn-next',
      '.tc-continue',
      '[class*="success"] button',
      '[class*="next"]'
    ];

    for (const selector of continueSelectors) {
      const btnLocator = context.locator(selector);
      if ((await btnLocator.count().catch(() => 0)) > 0) {
        const isVisible = await btnLocator.first().isVisible().catch(() => false);
        if (isVisible) {
          console.log('[Auth Interactive] Continue button visible — captcha solved');
          return true;
        }
      }
    }
  } catch (btnError) {
    console.log('[Auth Interactive] Continue button check failed:', btnError instanceof Error ? btnError.message : String(btnError));
  }

  // Check for success text with more variations
  try {
    const successTexts = ['成功', '验证通过', 'Success', '验证成功', 'Verification Successful', '验证完成', '验证通过', '验证成功', '验证完毕'];
    for (const text of successTexts) {
      const textLocator = context.locator(`text=${text}`);
      if ((await textLocator.count().catch(() => 0)) > 0) {
        const isVisible = await textLocator.first().isVisible().catch(() => false);
        if (isVisible) {
          console.log('[Auth Interactive] Success text detected:', text);
          return true;
        }
      }
    }
  } catch (textError) {
    console.log('[Auth Interactive] Text-based success check failed:', textError instanceof Error ? textError.message : String(textError));
  }

  // Check for continue/next buttons that appear after success
  try {
    const continueSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("确认")',
      'button:has-text("确定")',
      'button:has-text("完成")',
      '.tc-btn-next',
      '.tc-continue',
      '[class*="success"] button',
      '[class*="next"]'
    ];

    for (const selector of continueSelectors) {
      const btnLocator = context.locator(selector);
      if ((await btnLocator.count().catch(() => 0)) > 0) {
        const isVisible = await btnLocator.first().isVisible().catch(() => false);
        if (isVisible) {
          console.log('[Auth Interactive] Continue button visible — captcha solved');
          return true;
        }
      }
    }
  } catch (btnError) {
    console.log('[Auth Interactive] Continue button check failed:', btnError instanceof Error ? btnError.message : String(btnError));
  }

  // Check if captcha iframe is hidden/closed
  try {
    const iframeLocator = page.locator('iframe[src*="turing.captcha"], iframe[src*="geetest"]');
    if ((await iframeLocator.count().catch(() => 0)) > 0) {
      const isHidden = await iframeLocator.first().evaluate((el: HTMLIFrameElement) => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden' || el.style.display === 'none';
      }).catch(() => false);

      if (isHidden) {
        console.log('[Auth Interactive] Captcha iframe hidden — assuming solved');
        return true;
      }
    }
  } catch (iframeError) {
    console.log('[Auth Interactive] Iframe visibility check failed:', iframeError instanceof Error ? iframeError.message : String(iframeError));
  }

  // Check for session cookies that indicate successful login
  try {
    const cookies = await page.context().cookies();
    const superbuyCookies = cookies.filter(c => c.domain.includes('superbuy.com'));
    const hasAuthIndicators = superbuyCookies.some(c =>
      (c.name === 'LOGSTATE' && c.value === 'logged') ||
      (c.name === 'LOGTOKEN' && c.value && c.value.length > 10) ||
      (c.name === 'AUTH_TOKEN' && c.value && c.value.length > 10) ||
      (c.name.includes('session') && c.value && c.value.length > 10)
    );

    if (hasAuthIndicators) {
      console.log('[Auth Interactive] Authentication cookies detected — captcha solved');
      return true;
    }
  } catch (cookieError) {
    console.log('[Auth Interactive] Cookie check failed:', cookieError instanceof Error ? cookieError.message : String(cookieError));
  }

  // Final fallback: check if we're redirected away from login page
  try {
    const currentUrl = page.url();
    if (!currentUrl.includes('/login') && !currentUrl.includes('captcha')) {
      console.log('[Auth Interactive] Redirected away from login/captcha — assuming solved');
      return true;
    }
  } catch (urlError) {
    console.log('[Auth Interactive] URL check failed:', urlError instanceof Error ? urlError.message : String(urlError));
  }

  // Additional check: look for any element that indicates success state
  try {
    const successIndicators = [
      '[class*="success"]',
      '[class*="verified"]',
      '[class*="complete"]',
      '.tc-verified',
      '.tc-complete'
    ];

    for (const selector of successIndicators) {
      const indicator = context.locator(selector);
      if ((await indicator.count().catch(() => 0)) > 0) {
        const isVisible = await indicator.first().isVisible().catch(() => false);
        if (isVisible) {
          console.log('[Auth Interactive] Success state indicator found:', selector);
          return true;
        }
      }
    }
  } catch (indicatorError) {
    console.log('[Auth Interactive] Success indicator check failed:', indicatorError instanceof Error ? indicatorError.message : String(indicatorError));
  }

  return false;
}

// @ts-ignore - Legacy function kept for reference
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

/**
 * Enregistre une tentative de captcha dans le système de collecte de données
 */
export async function logCaptchaAttempt(
  page: Page,
  context: FrameLike | null,
  outcome: 'success' | 'failure' | 'timeout' | 'error',
  solution?: string,
  solutionTimeMs?: number,
  errorDetails?: string,
  modelVersion?: string,
  confidence?: number
): Promise<void> {
  try {
    // Récupérer des informations sur la tentative
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const url = page.url();
    
    // Récupérer l'IP du client (potentiellement via une API externe)
    let clientIP = '';
    try {
      // Cette requête peut échouer en fonction des restrictions CORS
      const response = await fetch('https://httpbin.org/ip');
      const ipData = await response.json();
      clientIP = ipData.origin || '';
    } catch (e) {
      // Si on ne peut pas récupérer l'IP directement, on laisse vide
      clientIP = '';
    }
    
    // @ts-ignore - Legacy variable
    const attemptData = {
      session_id: `sb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      challenge_type: 'tcaptcha_slider',
      challenge_params: {
        url,
        user_agent: userAgent,
      },
      user_agent: userAgent,
      ip: clientIP,
      outcome,
      solution,
      solution_time_ms: solutionTimeMs,
      error_details: errorDetails,
      model_version: modelVersion,
      confidence,
      metadata: {
        timestamp: Date.now(),
        browser_context: !!context,
        page_url: url,
      }
    };
    
    // Envoyer les données via le SDK
    // await captchaSDK.createCaptchaAttempt(attemptData);
    
    console.log(`[Captcha Data Collection] Attempt logged: ${outcome}`);
  } catch (error) {
    console.error('[Captcha Data Collection] Error logging attempt:', error);
  }
}

/**
 * Enregistre un artefact de captcha (image, etc.) dans le système de collecte de données
 */
// @ts-ignore - Legacy function kept for reference
export async function logCaptchaArtifact(
  _attemptId: string,
  artifactType: 'challenge_image' | 'background_image' | 'solution_image' | 'debug_info',
  _fileBuffer: Buffer,
  _metadata?: Record<string, any>
): Promise<void> {
  try {
    // await captchaSDK.uploadCaptchaArtifact(attemptId, artifactType, fileBuffer, metadata);
    console.log(`[Captcha Data Collection] Artifact uploaded: ${artifactType}`);
  } catch (error) {
    console.error(`[Captcha Data Collection] Error uploading ${artifactType}:`, error);
  }
}

async function handleHeadfulLogin(payload: CredentialsPayload): Promise<void> {
  const browser = await chromium.launch({ headless: false }); // Visible browser
  const context = await browser.newContext();
  let page = await context.newPage();

  const shutdown = async () => closeResources({ page, context, browser });

  try {
    const loginUrl = 'https://www.superbuy.com/en/page/login/';
    console.log('[Auth Interactive] Navigating to:', loginUrl);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('input[type="text"], input[type="email"], input[name="email"], #email', { timeout: 10000 });
    await page.fill('input[type="text"], input[type="email"], input[name="email"], #email', payload.username);
    await page.fill('input[type="password"], input[name="password"], #password', payload.password);

    await page.waitForTimeout(1000);
    
    // Try multiple selectors for the sign in button
    const submitSelectors = [
      'button[type="submit"]',
      '.login-btn',
      '.submit-btn',
      'button:has-text("Sign In")',
      'input[type="submit"]'
    ];

    let clicked = false;
    for (const selector of submitSelectors) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible()) {
        console.log(`[Auth Interactive] Clicking Sign In button (selector: ${selector})`);
        await btn.click({ force: true });
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('[Auth Interactive] Sign In button not visible, pressing Enter');
      await page.keyboard.press('Enter');
    }

    // CRITIQUE : Le captcha Tencent n'apparaît QU'APRÈS le clic sur Sign In
    // Il faut attendre plus longtemps pour que le captcha se charge
    console.log(`[Auth Interactive] Waiting for captcha to load after login attempt (${Math.round(CAPTCHA_LOAD_DELAY_MS / 1000)}s)...`);
    await page.waitForTimeout(CAPTCHA_LOAD_DELAY_MS);
    console.log('[Auth Interactive] URL after attempt:', page.url());

    let redirected = false;
    let errorText: string | null = null;

    // Check for login errors (account doesn't exist, incorrect password, etc.)
    const errorBoxLocator = page.locator('.error-box').first();
    if (await errorBoxLocator.isVisible().catch(() => false)) {
      errorText = (await errorBoxLocator.textContent())?.trim() ?? null;
      if (errorText) {
        console.error('[Auth Interactive] ❌ Login error detected:', errorText);
        
        // Check for fatal errors that should abort immediately
        const lowerError = errorText.toLowerCase();
        if (lowerError.includes('account does not exist') || 
            lowerError.includes('incorrect password') ||
            lowerError.includes('account is locked') ||
            lowerError.includes('too many attempts')) {
          console.error('[Auth Interactive] 🛑 Fatal login error - aborting process');
          await shutdown();
          process.exit(1);
        }
      }
    }

    // Legacy flag retained for debugging reference
    // const captchaLikely = false;
    try {
      await Promise.race([
        page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: QUICK_REDIRECT_TIMEOUT_MS }),
        page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: QUICK_REDIRECT_TIMEOUT_MS }),
        (async () => {
          const ctx = await waitForCaptchaContext(page, QUICK_REDIRECT_TIMEOUT_MS);
          if (ctx) {
            throw new Error('__TCAPTCHA_DETECTED__');
          }
        })(),
      ]);
      redirected = true;
    } catch (initialWaitError) {
      const msg = initialWaitError instanceof Error ? initialWaitError.message : String(initialWaitError);
      if (msg === '__TCAPTCHA_DETECTED__') {
        console.log('[Auth Interactive] Captcha detected early — skipping redirect wait');
      } else {
        console.log('[Auth Interactive] Quick redirect not detected', initialWaitError);
      }
    }

    let captchaResult: CaptchaSolveResult = 'no-captcha';
    if (!redirected && !errorText) {
      // Only attempt captcha solving if no error detected
      console.log('[Auth Interactive] Checking for Tencent Captcha...');

      captchaResult = await solveGeetestCaptcha(page);
      console.log('[Auth Interactive] Captcha result:', captchaResult);
      
      // After captcha attempt, check for errors again
      const errorStillVisible = await errorBoxLocator.isVisible().catch(() => false);
      console.log('[Auth Interactive] Error box visible after captcha?', errorStillVisible);
      
      if (errorStillVisible) {
        errorText = (await errorBoxLocator.textContent())?.trim() ?? null;
        if (errorText) {
          console.error('[Auth Interactive] ❌ Error appeared after captcha:', errorText);
          const lowerError = errorText.toLowerCase();
          if (lowerError.includes('account does not exist') || 
              lowerError.includes('incorrect password') ||
              lowerError.includes('account is locked') ||
              lowerError.includes('too many attempts')) {
            console.error('[Auth Interactive] 🛑 Fatal login error - aborting process');
            await shutdown();
            process.exit(1);
          }
        }
      }
      
      if (captchaResult === 'solved' && !errorText) {
        console.log('[Auth Interactive] Captcha solved, waiting for redirect or success indicators...');
        try {
          const redirectResult = await Promise.race([
            page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: POST_CAPTCHA_REDIRECT_TIMEOUT_MS }).then(() => 'url_change'),
            page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: POST_CAPTCHA_REDIRECT_TIMEOUT_MS }).then(() => 'user_menu'),
            // Race against error box appearing (check every second)
            (async () => {
              const checkInterval = 1000;
              const endTime = Date.now() + POST_CAPTCHA_REDIRECT_TIMEOUT_MS;
              while (Date.now() < endTime) {
                if (await errorBoxLocator.isVisible().catch(() => false)) {
                  const err = (await errorBoxLocator.textContent())?.trim() ?? null;
                  if (err) {
                    throw new Error(`LOGIN_ERROR: ${err}`);
                  }
                }
                await page.waitForTimeout(checkInterval);
              }
              throw new Error('TIMEOUT');
            })(),
          ]);
          redirected = true;
          console.log('[Auth Interactive] ✅ Redirect detected after captcha:', redirectResult);
        } catch (afterCaptchaError) {
          const errorMsg = afterCaptchaError instanceof Error ? afterCaptchaError.message : String(afterCaptchaError);
          
          if (errorMsg.startsWith('LOGIN_ERROR:')) {
            errorText = errorMsg.replace('LOGIN_ERROR: ', '');
            console.error('[Auth Interactive] ❌ Login error detected after captcha:', errorText);
            const lowerError = errorText.toLowerCase();
            if (lowerError.includes('account does not exist') || 
                lowerError.includes('incorrect password') ||
                lowerError.includes('account is locked') ||
                lowerError.includes('too many attempts')) {
              console.error('[Auth Interactive] 🛑 Fatal login error - aborting process');
              await shutdown();
              process.exit(1);
            }
          } else {
            console.log('[Auth Interactive] ⏱️  No redirect after captcha, checking current state...');
            console.log('[Auth Interactive] Current URL:', page.url());
            
            // Final check for error
            if (await errorBoxLocator.isVisible().catch(() => false)) {
              errorText = (await errorBoxLocator.textContent())?.trim() ?? null;
              if (errorText) {
                console.error('[Auth Interactive] ❌ Error detected during redirect wait:', errorText);
              }
            }
          }
        }
      }
    }

    if (!redirected && (captchaResult === 'failed' || (captchaResult === 'no-captcha' && !errorText))) {
      console.log('[Auth Interactive] Login did not complete automatically');
      console.log('[Auth Interactive] Browser will remain open for manual intervention');
      console.log('[Auth Interactive] Press Ctrl+C to close when done');

      // Keep browser open for manual interaction
      process.on('SIGINT', async () => {
        console.log('[Auth Interactive] Received SIGINT, saving state...');
        await saveAuthState(context);
        await shutdown();
        process.exit(0);
      });

      // Wait indefinitely
      await new Promise(() => {}); // Never resolves
    }

    if (!redirected) {
      console.log('[Auth Interactive] Login failed:', errorText ?? 'Unknown failure');
      await shutdown();
      return;
    }

    console.log('[Auth Interactive] Login successful!');
    await saveAuthState(context);
    await shutdown();
  } catch (error) {
    console.error('[Auth Interactive] Headful login failed:', error);
    await shutdown();
  }
}

async function saveAuthState(context: BrowserContext): Promise<void> {
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

  console.log('[Auth Interactive] Auth state saved to:', targetPath);
}

// Main execution
async function main() {
  // Credentials resolution priority:
  // 1. Explicit CLI args (npm run superbuy:login email password OR npx tsx ... email password)
  // 2. npm_config_argv (allows passing args without -- separator when using npm run)
  // 3. Environment variables SUPERBUY_USERNAME / SUPERBUY_PASSWORD (preferred for secrets)
  // 4. Fallback error + usage message

  const resolveCliArgs = (): { username?: string; password?: string } => {
    const directArgs = process.argv.slice(2).filter(Boolean);
    let u: string | undefined;
    let p: string | undefined;
    if (directArgs.length >= 2) {
      [u, p] = [directArgs[0], directArgs[1]];
    } else if (process.env.npm_config_argv) {
      try {
        const parsed = JSON.parse(process.env.npm_config_argv);
        if (parsed && Array.isArray(parsed.remain)) {
          // remain array looks like [ 'superbuy:login', 'email', 'password' ]
          const remain: string[] = parsed.remain;
          const idxEmail = remain.findIndex((v: string) => v !== 'superbuy:login');
          if (idxEmail !== -1 && remain.length >= idxEmail + 2) {
            u = remain[idxEmail];
            p = remain[idxEmail + 1];
          }
        }
      } catch { /* ignore */ }
    }
    return { username: u, password: p };
  };

  const { username: cliUser, password: cliPass } = resolveCliArgs();
  const envUser = process.env['SUPERBUY_USERNAME'] ?? process.env['SUPERBUY_USER'];
  const envPass = process.env['SUPERBUY_PASSWORD'] ?? process.env['SUPERBUY_PASS'];

  const username = cliUser || envUser;
  const password = cliPass || envPass;

  if (!username || !password) {
    console.error('[Auth Interactive] Missing Superbuy credentials.');
    console.error('Usage:');
    console.error('  npm run superbuy:login <email> <password>');
    console.error('  npm run superbuy:login -- <email> <password>   # standard npm argument forwarding');
    console.error('  SUPERBUY_USERNAME=you@example.com SUPERBUY_PASSWORD=secret npm run superbuy:login');
    process.exit(1);
  }

  console.log('[Auth Interactive] Starting headful login with credentials source:', {
    source: cliUser && cliPass ? 'cli-args' : 'env',
  });

  await handleHeadfulLogin({ username, password });
}

main().catch(console.error);
// Helper: segmented multi-step trace (S1 accelerate 20–30%, S2 slight back 2–5px, S3 irregular to target)
function buildSegmentedTrace(totalDistance: number): number[] {
  const dist = Math.max(4, Math.round(totalDistance));
  const s1Ratio = randomBetween(0.20, 0.30);
  const s1Target = Math.max(3, Math.round(dist * s1Ratio));
  const backCorrection = Math.max(2, Math.min(5, Math.round(randomBetween(2, 5))));
  const s3Target = Math.max(3, dist - s1Target + backCorrection);
  const steps: number[] = [];

  // S1: small acceleration phase
  let s1Covered = 0;
  const s1Steps = Math.max(6, Math.round(s1Target / 3));
  for (let i = 0; i < s1Steps && s1Covered < s1Target; i += 1) {
    const remaining = s1Target - s1Covered;
    let step = Math.max(0.6, remaining / (s1Steps - i) + Math.random() * 1.2);
    step = Math.min(step, remaining);
    steps.push(step);
    s1Covered += step;
  }

  // Micro-pause sentinel (0 => pause)
  steps.push(0);

  // S2: slight backward correction (2–5px total)
  let backCovered = 0;
  const s2Steps = Math.max(2, Math.min(3, Math.round(backCorrection / 2)));
  for (let i = 0; i < s2Steps && backCovered < backCorrection; i += 1) {
    const remaining = backCorrection - backCovered;
    let step = Math.max(0.8, remaining / (s2Steps - i));
    step = Math.min(step, remaining);
    steps.push(-step);
    backCovered += step;
  }

  // S3: resume forward with slightly irregular speed
  let s3Covered = 0;
  const s3Steps = Math.max(10, Math.round(s3Target / 3));
  for (let i = 0; i < s3Steps && s3Covered < s3Target; i += 1) {
    const remaining = s3Target - s3Covered;
    const jitter = (Math.random() - 0.5) * 1.4; // irregular perturbation
    let step = Math.max(0.5, remaining / (s3Steps - i) + jitter);
    if (i % 5 === 0) step += Math.random() * 0.8; // small boosts
    if (i % 7 === 0) step -= Math.random() * 0.6; // small slows
    step = Math.min(step, remaining);
    steps.push(step);
    s3Covered += step;
  }

  // Fine adjust to reach exact net distance
  const net = steps.reduce((acc, v) => acc + v, 0);
  const diff = dist - net;
  if (Math.abs(diff) >= 0.5) {
    steps.push(diff);
  }

  return steps;
=======
import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page, Frame, Locator } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
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
const TCAPTCHA_BACKGROUND_SELECTORS = [
  '#slideBg',
  '.tc-imgarea .tc-bg-img',
  '.tc-bg-img',
  '.tc-imgarea .tc-bg',
  // Tolérance élargie (sans canvas)
  '.tc-imgarea img',
  '.tc-bg-img img',
  '.tc-canvas-bg',
  '.tcaptcha-panel img',
  '.tcaptcha-bg',
  '.tc-bg'
];
const CAPTCHA_FOREGROUND_SELECTOR = '.tc-fg-item';
const CAPTCHA_DEBUG_DIR = path.resolve(process.cwd(), 'captcha-debug');
const LOGIN_REDIRECT_TIMEOUT_MS = Number(process.env.SUPERBUY_LOGIN_REDIRECT_TIMEOUT_MS ?? 120000);
const POST_CAPTCHA_REDIRECT_TIMEOUT_MS = Number(process.env.SUPERBUY_POST_CAPTCHA_REDIRECT_TIMEOUT_MS ?? 120000);
const CAPTCHA_LOAD_DELAY_MS = Number(process.env.SUPERBUY_CAPTCHA_LOAD_DELAY_MS ?? 6000);
const QUICK_REDIRECT_TIMEOUT_MS = Number(process.env.SUPERBUY_QUICK_REDIRECT_TIMEOUT_MS ?? 5000);
// Paramètres complémentaires (overshoot & micro-nudges)
const CAPTCHA_OVERSHOOT_MAX_PX = Number(process.env.SUPERBUY_CAPTCHA_OVERSHOOT_MAX_PX ?? 12);
const CAPTCHA_MICRO_NUDGES = Number(process.env.SUPERBUY_CAPTCHA_MICRO_NUDGES ?? 3);

// Paramétrage ENV des nouvelles stratégies
type StrategySet = 'all' | 'basic' | 'touch_only';
const CAPTCHA_STRATEGY_SET: StrategySet = ((process.env.SUPERBUY_CAPTCHA_STRATEGY_SET ?? 'all').toLowerCase() as StrategySet);

// === Captcha API Configuration ===
// REMOVED: AI-powered captcha solving functionality
// const USE_CAPTCHA_API = process.env.SUPERBUY_USE_CAPTCHA_API === 'true';
// const CAPTCHA_API_URL = process.env.CAPTCHA_API_URL ?? 'http://localhost:8000';
// const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY;
// const CAPTCHA_API_TIMEOUT = Number(process.env.CAPTCHA_API_TIMEOUT ?? 30000);

// Initialize API client if enabled
// REMOVED: captchaApiClient initialization
// const captchaApiClient = USE_CAPTCHA_API
//  ? new CaptchaApiClient({
//      apiUrl: CAPTCHA_API_URL,
//      apiKey: CAPTCHA_API_KEY,
//      timeout: CAPTCHA_API_TIMEOUT,
//      debug: true,
//    })
//  : null;

// Initialize Captcha Data Collection SDK
// REMOVED: captchaSDK for data collection
// const captchaSDK = new CaptchaSDK({
//  apiUrl: process.env.CAPTCHA_DATA_API_URL ?? 'http://localhost:8000',
//  apiKey: process.env.CAPTCHA_DATA_API_KEY,
//  timeout: 10000,
//  maxRetries: 3,
// });

// Pre-press dwell range parsing (accepts "min..max", "min-max", "min,max", or single number as max)
// Defaults: 180..420ms, with hard floor at 120ms
const CAPTCHA_PREPRESS_DEFAULT_MIN_MS = 180;
const CAPTCHA_PREPRESS_DEFAULT_MAX_MS = 420;
// Will be resolved later via parseRangeEnv(raw, defMin, defMax, minFloor)
const CAPTCHA_PREPRESS_RANGE_MS = (() => {
  const raw = String(process.env.SUPERBUY_CAPTCHA_PREPRESS_MS ?? '').trim();
  const floor = 120;
  let min = CAPTCHA_PREPRESS_DEFAULT_MIN_MS;
  let max = CAPTCHA_PREPRESS_DEFAULT_MAX_MS;

  if (raw) {
    try {
      let a = raw.replace(/\s+/g, '');
      const parts = a.split(/\.{2}|-|,/).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0) as number[];
      if (parts.length === 1) {
        max = Math.max(floor, Math.round(parts[0]));
        min = Math.min(max, CAPTCHA_PREPRESS_DEFAULT_MIN_MS);
      } else if (parts.length >= 2) {
        min = Math.max(floor, Math.min(parts[0], parts[1]));
        max = Math.max(floor, Math.max(parts[0], parts[1]));
      }
      if (min > max) {
        const t = min; min = max; max = t;
      }
    } catch {}
  }
  return { min, max };
})();

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

function ensureDirExists(targetDir: string): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
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
    // Log "no captcha" event
    await logCaptchaAttempt(page, null, 'success', undefined, undefined, 'No captcha detected');
    return 'no-captcha';
  }

 console.log('[Auth Interactive] Tencent Captcha context found, beginning solve attempts');

  // Log the start of the captcha solving attempt
  const startTime = Date.now();
  await logCaptchaAttempt(
    page,
    context,
    'timeout', // We'll update this later based on the outcome
    undefined,
    undefined,
    'Captcha solving started'
  );

  // Attendre que le captcha soit visible et interactif
  console.log('[Auth Interactive] Waiting for captcha to become interactive...');
  try {
    // Attendre les éléments visuels du captcha (sélecteurs étendus)
    const interactiveSelectors = [
      '.tc-captcha.tc-drag',
      '#tcWrap',
      '.tc-opera',
      '.tcaptcha-drag-wrap',
      '.tcaptcha-panel',
      '.tc-bg',
      '.tc-imgarea',
    ];
    await Promise.race(
      interactiveSelectors.map((sel) => context!.waitForSelector(sel, { state: 'visible', timeout: 15000 }))
    );
    console.log('[Auth Interactive] Captcha container appears visible (extended race)');

    // Log the captcha background image if available
    try {
      const backgroundLocator = await locateFirstVisible(context, TCAPTCHA_BACKGROUND_SELECTORS);
      if (backgroundLocator) {
        const screenshot = await backgroundLocator.screenshot();
        await logCaptchaArtifact('captcha_attempt_' + Date.now(), 'background_image', screenshot, {
          attempt: 'initial',
          selector: 'TCAPTCHA_BACKGROUND_SELECTORS'
        });
      }
    } catch (e) {
      console.log('[Captcha Data Collection] Could not capture background image:', e);
    }

    // Log the challenge image
    try {
      const captchaScreenshot = await page.screenshot({ type: 'png' });
      await logCaptchaArtifact('captcha_attempt_' + Date.now(), 'challenge_image', captchaScreenshot, {
        attempt: 'initial',
        stage: 'interactive'
      });
    } catch (e) {
      console.log('[Captcha Data Collection] Could not capture challenge image:', e);
    }

    // Log du premier sélecteur visible pour triage
    const matched = await locateFirstVisible(context, interactiveSelectors);
    if (matched) {
      console.log('[Auth Interactive] Extended selector matched for interactive state');
    }

    // Attendre un peu pour que tout soit chargé
    await page.waitForTimeout(2000);
 } catch (error) {
    console.log('[Auth Interactive] Captcha visibility timeout (extended):', error instanceof Error ? error.message : String(error));
    // Retenter après un court délai
    await page.waitForTimeout(600);
    try {
      const retrySelectors = [
        '.tcaptcha-drag-wrap',
        '.tcaptcha-panel',
        '.tc-bg',
        '.tc-imgarea',
        '.tc-captcha.tc-drag',
        '#tcWrap',
        '.tc-opera',
      ];
      await Promise.race(
        retrySelectors.map((sel) => context!.waitForSelector(sel, { state: 'visible', timeout: 8000 }))
      );
      console.log('[Auth Interactive] Captcha became visible after retry');
    } catch (err2) {
      console.log('[Auth Interactive] Captcha still not confirmed visible after retry:', err2 instanceof Error ? err2.message : String(err2));
    }
 }

  // Save debug screenshot of captcha
  try {
    const captchaScreenshot = path.resolve(process.cwd(), 'debug_captcha.png');
    await page.screenshot({ path: captchaScreenshot, fullPage: false });
    console.log('[Auth Interactive] Captcha screenshot saved to:', captchaScreenshot);
  } catch (error) {
    console.log('[Auth Interactive] Failed to save captcha screenshot:', error instanceof Error ? error.message : String(error));
  }

  // === Manual captcha solving ===
  console.log('[Auth Interactive] Manual captcha solving required. Please solve the captcha in the browser.');
  console.log('[Auth Interactive] Press Enter when the captcha is solved...');

  process.stdin.setEncoding('utf8');
  await new Promise<void>((resolve) => {
    process.stdin.once('data', (data) => {
      console.log('[Auth Interactive] User pressed Enter, checking if captcha is solved...');
      resolve();
    });
  });

  // Check if captcha was solved manually
  const manualSolved = await waitForCaptchaSolved(page, context);
  const manualSolutionTime = Date.now() - startTime;
  if (manualSolved) {
    console.log('[Auth Interactive] ✓ Captcha solved manually!');
    // Log successful attempt
    await logCaptchaAttempt(
      page,
      context,
      'success',
      'manual_solution',
      manualSolutionTime
    );
    return 'solved';
  } else {
    console.log('[Auth Interactive] Captcha not solved, continuing to heuristic solver...');
  }

  // === Fallback to heuristic solver ===
  for (let attempt = 1; attempt <= 6; attempt += 1) {
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
      const solutionTime = Date.now() - startTime;
      // Log failed attempt
      await logCaptchaAttempt(
        page,
        null,
        'error',
        undefined,
        solutionTime,
        `Context lost before attempt ${attempt}`
      );
      return 'failed';
    }

    console.log(`[Auth Interactive] Captcha attempt ${attempt}`);

    let screenshotAnalysis: ScreenshotGapAnalysis | null = null;
    try {
      screenshotAnalysis = await analyzeCaptchaWithScreenshot(page, context, attempt);
      // Log the analysis results
      if (screenshotAnalysis && screenshotAnalysis.debugImagePath) {
        try {
          const analysisImage = fs.readFileSync(screenshotAnalysis.debugImagePath);
          await logCaptchaArtifact('captcha_attempt_' + Date.now(), 'debug_info', analysisImage, {
            attempt: attempt.toString(),
            analysis: 'screenshot_gap_detection'
          });
        } catch (e) {
          console.log('[Captcha Data Collection] Could not read analysis debug image:', e);
        }
      }
    } catch (analysisError) {
      console.log('[Auth Interactive] Screenshot analysis failed:', analysisError instanceof Error ? analysisError.message : String(analysisError));
      screenshotAnalysis = null;
    }

    if (screenshotAnalysis) {
      console.log('[Auth Interactive] Screenshot gap detection', {
        deltaToAlign: screenshotAnalysis.deltaToAlign,
        recommendedDrag: screenshotAnalysis.recommendedDrag,
        fallbackDrag: screenshotAnalysis.fallbackDrag,
        pixelRatio: screenshotAnalysis.pixelRatio,
        gapCenterCss: screenshotAnalysis.gapCenterCss,
        gapWidthPx: screenshotAnalysis.gapWidthPx,
        pieceCenterCss: screenshotAnalysis.pieceCenterCss,
        trackWidth: screenshotAnalysis.trackBox?.width ?? null,
        debugImage: screenshotAnalysis.debugImagePath,
      });

      const candidateDistances = [
        screenshotAnalysis.recommendedDrag,
        screenshotAnalysis.fallbackDrag,
      ].filter((value, index, array) => Number.isFinite(value) && value > 0 && array.indexOf(value) === index);

      let dragged = false;
      for (const candidate of candidateDistances) {
        try {
          dragged = await dragGeetestSlider(
            page,
            context,
            screenshotAnalysis.gapLeftPx,
            screenshotAnalysis.backgroundBox.width,
            candidate,
          );
        } catch (screenshotDragError) {
          console.log('[Auth Interactive] Screenshot-based drag failed:', screenshotDragError instanceof Error ? screenshotDragError.message : String(screenshotDragError));
          dragged = false;
        }

        if (dragged) {
          break;
        }

        await page.waitForTimeout(320);
      }

      if (dragged) {
        const success = await waitForCaptchaSolved(page, context);
        const solutionTime = Date.now() - startTime;
        if (success) {
          console.log('[Auth Interactive] Captcha solved using screenshot analysis');
          // Log successful attempt
          await logCaptchaAttempt(
            page,
            context,
            'success',
            'screenshot_analysis_solution',
            solutionTime,
            undefined,
            'screenshot_analysis_v1'
          );
          return 'solved';
        } else {
          // Log failed attempt
          await logCaptchaAttempt(
            page,
            context,
            'failure',
            'screenshot_analysis_solution',
            solutionTime,
            'Screenshot solution not validated'
          );
        }
      }

      console.log('[Auth Interactive] Screenshot-based strategy did not resolve captcha, refreshing...');
      await refreshGeetest(page, context);
      await page.waitForTimeout(900);
      context = null;
      continue;
    }

    let images: { background: PNG; full: PNG } | null = null;
    try {
      images = await captureGeetestImages(context);
    } catch (imgErr) {
      console.log('[Auth Interactive] captureGeetestImages threw:', imgErr instanceof Error ? imgErr.message : String(imgErr));
      images = null;
    }

    if (!images) {
      console.log('[Auth Interactive] Unable to capture captcha images, attempting slider fallback...');

      // If no canvas images are available, try a blind slider drag when slider+track exist
      try {
        const sliderLocator = await locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
        const trackLocator = await locateFirstVisible(context, TCAPTCHA_TRACK_SELECTORS);
        if (sliderLocator && trackLocator) {
          const sb = await sliderLocator.boundingBox().catch(() => null);
          const tb = await trackLocator.boundingBox().catch(() => null);
          if (sb && tb && tb.width > 20) {
            const baseGap = Math.max(0, tb.width - sb.width - 8);
            const fudge = 0.7 + Math.min(0.5, (attempt - 1) * 0.12); // vary slightly by attempt
            const pixelGap = Math.round(baseGap * fudge);

            // Sweep plusieurs distances + ordre alterné pour éviter les patterns mécaniques
            const candidates = [
              Math.max(4, pixelGap - 10),
              Math.max(4, pixelGap + 6),
              Math.max(4, pixelGap - 6),
              Math.max(4, pixelGap + 10),
              Math.max(4, pixelGap - 16),
              Math.max(4, pixelGap + 16),
              Math.max(4, pixelGap - 24),
              Math.max(4, pixelGap + 24),
              Math.max(4, pixelGap - 32),
              Math.max(4, pixelGap + 32),
            ];

            console.log('[Auth Interactive] Found slider/track - blind sweep candidates =', candidates);

            let solved = false;
            for (const dist of candidates) {
              let dragged = false;
              try {
                dragged = await dragGeetestSlider(page, context, dist, tb.width);
              } catch (dErr) {
                console.log('[Auth Interactive] blind drag candidate failed:', dErr instanceof Error ? dErr.message : String(dErr));
                dragged = false;
              }
              if (dragged) {
                solved = context ? await waitForCaptchaSolved(page, context) : false;
                const solutionTime = Date.now() - startTime;
                if (solved) {
                  console.log('[Auth Interactive] Captcha solved automatically (blind sweep)');
                  // Log successful attempt
                  await logCaptchaAttempt(
                    page,
                    context,
                    'success',
                    'blind_sweep_solution',
                    solutionTime,
                    undefined,
                    'blind_sweep_v1'
                  );
                  return 'solved';
                }

                // Micro-nudges après chaque tentative infructueuse (±2 à ±3 px)
                try {
                  const sliderLocatorNudge = await locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
                  if (sliderLocatorNudge) {
                    const nudgeCount = Math.max(1, Math.min(4, CAPTCHA_MICRO_NUDGES));
                    console.log('[Auth Interactive] Applying micro-nudges around final position', { count: nudgeCount });
                    for (let i = 0; i < nudgeCount; i += 1) {
                      const sbNow = await sliderLocatorNudge.boundingBox().catch(() => null);
                      if (!sbNow) break;
                      const startXn = sbNow.x + sbNow.width / 2;
                      const startYn = sbNow.y + sbNow.height / 2;
                      const amp = Math.round(randomBetween(2, 3)) * (Math.random() < 0.5 ? -1 : 1);

                      await page.mouse.move(startXn, startYn);
                      await page.mouse.down();
                      await page.mouse.move(startXn + amp, startYn + randomBetween(-0.8, 0.8), { steps: 2 });
                      await page.waitForTimeout(Math.round(randomBetween(50, 120)));
                      await page.mouse.up();

                      const nudgeSolved = await waitForCaptchaSolved(page, context);
                      if (nudgeSolved) {
                        console.log('[Auth Interactive] Captcha solved via micro-nudges after blind sweep');
                        const solutionTime = Date.now() - startTime;
                        // Log successful attempt
                        await logCaptchaAttempt(
                          page,
                          context,
                          'success',
                          'micro_nudge_solution',
                          solutionTime,
                          undefined,
                          'micro_nudge_v1'
                        );
                        return 'solved';
                      }
                    }
                  }
                } catch (nErr) {
                  console.log('[Auth Interactive] Micro-nudges failed after blind sweep:', nErr instanceof Error ? nErr.message : String(nErr));
                }

                // petite pause avant prochain candidat
                await page.waitForTimeout(500);
              }
            }

            console.log('[Auth Interactive] Blind sweep did not solve captcha, refreshing...');
            if (context) await refreshGeetest(page, context);
            await page.waitForTimeout(800);
            context = null;
            continue;
          }
        }
      } catch (fallbackErr) {
        console.log('[Auth Interactive] Slider fallback check failed:', fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
      }

      // If slider fallback not possible, attempt canvas fallback across the whole page
      console.log('[Auth Interactive] Slider fallback not possible, trying canvas fallback search across page');
      let fallbackImages: { background: PNG; full: PNG } | null = null;
      try {
        fallbackImages = await captureGeetestImages(page);
      } catch (fbErr) {
        console.log('[Auth Interactive] fallback captureGeetestImages threw:', fbErr instanceof Error ? fbErr.message : String(fbErr));
        fallbackImages = null;
      }

      if (!fallbackImages) {
        console.log('[Auth Interactive] Fallback frame search also failed');
        if (context) await refreshGeetest(page, context);
        await page.waitForTimeout(800);
        context = null;
        continue;
      }
      // Use fallback images but keep context for UI interactions
      const { full, background } = fallbackImages;
      console.log(`[Auth Interactive] Computing gap offset for ${full.width}x${full.height} images (from fallback)`);
      let gapOffset = -1;
      try {
        gapOffset = findGapOffset(full, background);
      } catch (gErr) {
        console.log('[Auth Interactive] findGapOffset threw:', gErr instanceof Error ? gErr.message : String(gErr));
        gapOffset = -1;
      }
      if (gapOffset < 0) {
        console.log('[Auth Interactive] Gap offset not detected');
        if (context) await refreshGeetest(page, context);
        await page.waitForTimeout(800);
        context = null;
        continue;
      }

      console.log(`[Auth Interactive] Gap detected at x=${gapOffset}, dragging slider...`);
      let dragged = false;
      try {
        dragged = context ? await dragGeetestSlider(page, context, gapOffset, full.width) : false;
      } catch (dragErr) {
        console.log('[Auth Interactive] dragGeetestSlider threw:', dragErr instanceof Error ? dragErr.message : String(dragErr));
        dragged = false;
      }
      if (!dragged) {
        console.log('[Auth Interactive] Slider drag failed');
        if (context) await refreshGeetest(page, context);
        await page.waitForTimeout(800);
        context = null;
        continue;
      }

      console.log('[Auth Interactive] Drag complete, checking solution...');
      const solved = context ? await waitForCaptchaSolved(page, context) : false;
      const solutionTime = Date.now() - startTime;
      if (solved) {
        console.log('[Auth Interactive] Captcha solved automatically');
        // Log successful attempt
        await logCaptchaAttempt(
          page,
          context,
          'success',
          'fallback_canvas_solution',
          solutionTime,
          undefined,
          'fallback_canvas_v1'
        );
        return 'solved';
      } else {
        // Log failed attempt
        await logCaptchaAttempt(
          page,
          context,
          'failure',
          'fallback_canvas_solution',
          solutionTime,
          'Fallback canvas solution not validated'
        );
      }

console.log('[Auth Interactive] Solution check failed, refreshing...');
if (context) await refreshGeetest(page, context);
      await page.waitForTimeout(100);
      context = null;
      continue;
    }

    const { full, background } = images;
    console.log(`[Auth Interactive] Computing gap offset for ${full.width}x${full.height} images`);
    let gapOffset = -1;
    try {
      gapOffset = findGapOffset(full, background);
    } catch (gErr) {
      console.log('[Auth Interactive] findGapOffset threw:', gErr instanceof Error ? gErr.message : String(gErr));
      gapOffset = -1;
    }
    if (gapOffset < 0) {
      console.log('[Auth Interactive] Gap offset not detected');
      await refreshGeetest(page, context);
      await page.waitForTimeout(800);
      context = null;
      continue;
    }

    console.log(`[Auth Interactive] Gap detected at x=${gapOffset}, dragging slider...`);
    let dragged = false;
    try {
      dragged = await dragGeetestSlider(page, context, gapOffset, full.width);
    } catch (dragErr) {
      console.log('[Auth Interactive] dragGeetestSlider threw:', dragErr instanceof Error ? dragErr.message : String(dragErr));
      dragged = false;
    }
    if (!dragged) {
      console.log('[Auth Interactive] Slider drag failed');
      await refreshGeetest(page, context);
      await page.waitForTimeout(800);
      context = null;
      continue;
    }

    console.log('[Auth Interactive] Drag complete, checking solution...');
    const solved = await waitForCaptchaSolved(page, context);
    const solutionTime = Date.now() - startTime;
    if (solved) {
      console.log('[Auth Interactive] Captcha solved automatically');
      // Log successful attempt
      await logCaptchaAttempt(
        page,
        context,
        'success',
        'image_analysis_solution',
        solutionTime,
        undefined,
        'image_analysis_v1'
      );
      return 'solved';
    } else {
      // Log failed attempt
      await logCaptchaAttempt(
        page,
        context,
        'failure',
        'image_analysis_solution',
        solutionTime,
        'Image analysis solution not validated'
      );
    }

    console.log('[Auth Interactive] Solution check failed, refreshing...');
    await refreshGeetest(page, context);
    await page.waitForTimeout(1000);
    context = null;
  }

  console.log('[Auth Interactive] All solve attempts exhausted');
  const solutionTime = Date.now() - startTime;
  // Log final failed attempt
 await logCaptchaAttempt(
    page,
    null,
    'failure',
    undefined,
    solutionTime,
    'All solve attempts exhausted'
  );
  return 'failed';
}

async function captureGeetestImages(context: FrameLike): Promise<{ background: PNG; full: PNG } | null> {
  console.log('[Auth Interactive] Capturing captcha via CSS backgrounds (Tencent)');

  const sources = await context.evaluate((backgroundSelectors: string[]) => {
    const extractCssUrl = (node: Element | null): string | null => {
      if (!node) return null;
      const style = window.getComputedStyle(node as HTMLElement);
      const value = style.getPropertyValue('background-image') || '';
      const match = value.match(/url\((['"]?)(.*?)\1\)/i);
      return match && match[2] ? match[2] : null;
    };

    let backgroundUrl: string | null = null;
    let backgroundSelector: string | null = null;

    for (const selector of backgroundSelectors) {
      const node = document.querySelector(selector) as HTMLElement | null;
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) {
        continue;
      }
      const candidate = extractCssUrl(node);
      if (candidate) {
        backgroundUrl = candidate;
        backgroundSelector = selector;
        break;
      }
    }

    const foregroundNodes = Array.from(document.querySelectorAll('.tc-fg-item')) as HTMLElement[];
    let foregroundUrl: string | null = null;
    for (const node of foregroundNodes) {
      const url = extractCssUrl(node);
      if (url) {
        foregroundUrl = url;
        break;
      }
    }

    return {
      backgroundUrl,
      backgroundSelector,
      foregroundUrl,
    };
  }, TCAPTCHA_BACKGROUND_SELECTORS).catch((error: unknown) => {
    console.log('[Auth Interactive] Failed to inspect captcha DOM for backgrounds:', error instanceof Error ? error.message : String(error));
    return null;
  });

  if (!sources || !sources.backgroundUrl) {
    console.log('[Auth Interactive] No background URL discovered via CSS');
  }

  const deriveFullUrl = (baseUrl: string | null, foregroundUrl: string | null): string[] => {
    const candidates: string[] = [];
    if (foregroundUrl) {
      candidates.push(foregroundUrl);
    }
    if (baseUrl) {
      candidates.push(baseUrl);
      try {
        const parsed = new URL(baseUrl);
        if (parsed.searchParams.has('img_index')) {
          parsed.searchParams.set('img_index', '0');
          candidates.push(parsed.toString());
        }
      } catch {}
    }
    return [...new Set(candidates.filter(Boolean))];
  };

  const downloadImage = async (url: string, label: string): Promise<Buffer | null> => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'LogistixCaptchaBot/1.0',
        },
      });
      if (!response.ok) {
        console.log(`[Auth Interactive] ${label} fetch failed (${response.status})`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.log(`[Auth Interactive] ${label} fetch threw:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  };

  let backgroundBuffer: Buffer | null = sources?.backgroundUrl ? await downloadImage(sources.backgroundUrl, 'Background image') : null;

  if (!backgroundBuffer && sources?.backgroundSelector) {
    console.log('[Auth Interactive] Falling back to direct screenshot for background');
    try {
      const locator = await locateFirstVisible(context, [sources.backgroundSelector]);
      if (locator) {
        backgroundBuffer = await locator.screenshot({ type: 'png' });
      }
    } catch (error) {
      console.log('[Auth Interactive] Background screenshot fallback failed:', error instanceof Error ? error.message : String(error));
    }
  }

  if (!backgroundBuffer) {
    console.log('[Auth Interactive] Unable to capture background image buffer');
    return null;
  }

  const fullUrlCandidates = deriveFullUrl(sources?.backgroundUrl ?? null, sources?.foregroundUrl ?? null);
  let fullBuffer: Buffer | null = null;
  for (const candidate of fullUrlCandidates) {
    fullBuffer = await downloadImage(candidate, 'Full image');
    if (fullBuffer) {
      break;
    }
  }

  if (!fullBuffer) {
    console.log('[Auth Interactive] Full image fetch failed, copying background buffer');
    fullBuffer = backgroundBuffer;
  }

  let background: PNG;
  let full: PNG;
  try {
    background = PNG.sync.read(backgroundBuffer);
  } catch (error) {
    console.log('[Auth Interactive] Background PNG decode failed:', error instanceof Error ? error.message : String(error));
    return null;
  }

  try {
    full = PNG.sync.read(fullBuffer);
  } catch (error) {
    console.log('[Auth Interactive] Full PNG decode failed:', error instanceof Error ? error.message : String(error));
    return null;
  }

  const aligned = alignPngDimensions(full, background);
  if (aligned.background.width === 0 || aligned.background.height === 0) {
    console.log('[Auth Interactive] Invalid PNG dimensions after alignment');
    return null;
  }

  console.log('[Auth Interactive] Captured Tencent background/full images via CSS');
  return aligned;
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

interface GapSegment {
  left: number;
  right: number;
  score: number;
}

interface ScreenshotGapAnalysis {
  attempt: number;
  pixelRatio: number;
  backgroundBox: BoundingBox;
  pieceBox: BoundingBox;
  sliderBox: BoundingBox | null;
  trackBox: BoundingBox | null;
  gapLeftPx: number;
  gapRightPx: number;
  gapCenterPx: number;
  gapWidthPx: number;
  gapLeftCss: number;
  gapCenterCss: number;
  gapRightCss: number;
  pieceRelativeLeft: number;
  pieceCenterCss: number;
  pieceLeftDistance: number;
  pieceCenterDistance: number;
  deltaToAlign: number;
  recommendedDrag: number;
  fallbackDrag: number;
  scale: number;
  debugImagePath?: string;
}

function analyzeBackgroundForGap(png: PNG): GapSegment | null {
  const { width, height, data } = png;
  if (width === 0 || height === 0) {
    return null;
  }

  const top = Math.max(0, Math.floor(height * 0.25));
  const bottom = Math.min(height, Math.floor(height * 0.75));
  if (bottom - top < 10) {
    return null;
  }

  const columnScores: number[] = new Array(width).fill(0);
  for (let x = 1; x < width - 1; x += 1) {
    let score = 0;
    for (let y = top; y < bottom; y += 1) {
      const idx = (y * width + x) * 4;
      const prevIdx = idx - 4;
      const nextIdx = idx + 4;
      if (prevIdx < 0 || nextIdx >= data.length) {
        continue;
      }
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const prevR = data[prevIdx];
      const prevG = data[prevIdx + 1];
      const prevB = data[prevIdx + 2];
      const nextR = data[nextIdx];
      const nextG = data[nextIdx + 1];
      const nextB = data[nextIdx + 2];

      const diffPrev = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
      const diffNext = Math.abs(r - nextR) + Math.abs(g - nextG) + Math.abs(b - nextB);
      score += diffPrev + diffNext;
    }
    columnScores[x] = score;
  }

  const maxScore = columnScores.reduce((acc, value) => (value > acc ? value : acc), 0);
  if (maxScore < (bottom - top) * 40) {
    return null;
  }

  const threshold = maxScore * 0.55;
  const minWidth = Math.max(12, Math.floor(width * 0.04));
  const maxWidth = Math.max(minWidth + 5, Math.floor(width * 0.35));

  let best: GapSegment | null = null;
  let currentStart = -1;
  let currentScore = 0;

  const finalizeSegment = (start: number, end: number, score: number) => {
    const segmentWidth = end - start + 1;
    if (segmentWidth < minWidth || segmentWidth > maxWidth) {
      return;
    }
    if (!best || score > best.score) {
      best = { left: start, right: end, score };
    }
  };

  for (let x = 1; x < width - 1; x += 1) {
    const value = columnScores[x];
    if (value >= threshold) {
      if (currentStart === -1) {
        currentStart = x;
        currentScore = value;
      } else {
        currentScore += value;
      }
    } else if (currentStart !== -1) {
      finalizeSegment(currentStart, x - 1, currentScore);
      currentStart = -1;
      currentScore = 0;
    }
  }

  if (currentStart !== -1) {
    finalizeSegment(currentStart, width - 2, currentScore);
  }

  return best;
}

async function locatePuzzlePiece(context: FrameLike): Promise<{ locator: Locator; box: BoundingBox } | null> {
  try {
    const items = context.locator(CAPTCHA_FOREGROUND_SELECTOR);
    const count = await items.count();
    for (let i = 0; i < count; i += 1) {
      const candidate = items.nth(i);
      const box = await candidate.boundingBox().catch(() => null);
      if (!box) {
        continue;
      }
      const { width, height } = box;
      if (width >= 40 && width <= 160 && height >= 40 && height <= 140) {
        if (height > 40 && height > width * 0.6) {
          // Likely the vertical puzzle piece overlay
          return { locator: candidate, box };
        }
        if (height > 48 && width > 48 && height >= width * 0.6) {
          return { locator: candidate, box };
        }
      }
    }
  } catch (error) {
    console.log('[Auth Interactive] locatePuzzlePiece error:', error instanceof Error ? error.message : String(error));
  }
  return null;
}

async function analyzeCaptchaWithScreenshot(page: Page, context: FrameLike, attempt: number, options: { captureDebug?: boolean } = {}): Promise<ScreenshotGapAnalysis | null> {
  const { captureDebug = true } = options;

  // 1) Chercher un arrière-plan tolérant (img/div/canvas)
  let targetLocator = await locateFirstVisible(context, TCAPTCHA_BACKGROUND_SELECTORS);
  let targetKind: 'background' | 'container' = 'background';

  if (!targetLocator) {
    // Passe 2 : Capturer le container global si l'arrière-plan est introuvable
    console.log('[Auth Interactive] No explicit background found — trying container screenshot fallback');
    const containerLocator = await locateFirstVisible(context, TCAPTCHA_CONTAINER_SELECTORS);
    if (!containerLocator) {
      return null;
    }
    targetLocator = containerLocator;
    targetKind = 'container';
  }

  // Récupérer sliders/track et la pièce (facultative)
  const pieceInfo = await locatePuzzlePiece(context);
  const sliderLocator = await locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
  const trackLocator = await locateFirstVisible(context, TCAPTCHA_TRACK_SELECTORS);

  const [targetBox, sliderBox, trackBox] = await Promise.all([
    targetLocator.boundingBox().catch(() => null),
    sliderLocator ? sliderLocator.boundingBox().catch(() => null) : Promise.resolve(null),
    trackLocator ? trackLocator.boundingBox().catch(() => null) : Promise.resolve(null),
  ]);

  if (!targetBox) {
    return null;
  }

  // Capturer le screenshot du target (background ou container)
  let buffer: Buffer;
  try {
    buffer = await targetLocator.screenshot({ type: 'png' });
  } catch (error) {
    console.log('[Auth Interactive] Target screenshot failed:', error instanceof Error ? error.message : String(error));
    return null;
  }

  if (!buffer || buffer.length === 0) {
    return null;
  }

  let png: PNG;
  try {
    png = PNG.sync.read(buffer);
  } catch (error) {
    console.log('[Auth Interactive] Target PNG decode failed:', error instanceof Error ? error.message : String(error));
    return null;
  }

  // Détecter le "gap" dans l'image
  const segment = analyzeBackgroundForGap(png);
  if (!segment) {
    return null;
  }

  // pixelRatio basé sur le container capturé
  const pixelRatio = png.width / targetBox.width;
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
    return null;
  }

  const gapLeftPx = segment.left;
  const gapRightPx = segment.right;
  if (!Number.isFinite(gapLeftPx) || !Number.isFinite(gapRightPx) || gapRightPx <= gapLeftPx) {
    return null;
  }

  const gapCenterPx = (gapLeftPx + gapRightPx) / 2;
  const gapWidthPx = gapRightPx - gapLeftPx;
  const gapLeftCss = gapLeftPx / pixelRatio;
  const gapCenterCss = gapCenterPx / pixelRatio;
  const gapRightCss = gapRightPx / pixelRatio;

  // Position de la pièce : via pieceInfo si dispo, sinon estimation via slider
  let pieceRelativeLeft: number;
  let pieceCenterCss: number;
  let pieceBox: BoundingBox = { x: targetBox.x, y: targetBox.y, width: 0, height: 0 };

  if (pieceInfo) {
    pieceBox = pieceInfo.box;
    pieceRelativeLeft = pieceBox.x - targetBox.x;
    pieceCenterCss = pieceRelativeLeft + pieceBox.width / 2;
  } else {
    const sliderLeft = (sliderBox?.x ?? targetBox.x) - targetBox.x;
    const sliderCenter = sliderLeft + (sliderBox?.width ?? Math.min(targetBox.width, 12)) / 2;
    pieceRelativeLeft = sliderLeft;
    pieceCenterCss = sliderCenter;
  }

  const pieceLeftDistance = gapLeftCss - pieceRelativeLeft;
  const pieceCenterDistance = gapCenterCss - pieceCenterCss;

  const deltaCandidates = [pieceCenterDistance, pieceLeftDistance].filter((value) => Number.isFinite(value)) as number[];
  const primaryDelta = deltaCandidates.find((value) => Math.abs(value) >= 5) ?? Number.NaN;

  if (!Number.isFinite(primaryDelta) || primaryDelta <= 0) {
    return null;
  }

  const deltaToAlign = primaryDelta;
  const sliderWidth = sliderBox?.width ?? 0;
  const trackWidth = trackBox?.width ?? 0;
  const maxDistance = trackWidth > 0 ? Math.max(6, trackWidth - sliderWidth - 4) : null;

  const clampDistance = (value: number): number => {
    if (!Number.isFinite(value)) {
      return value;
    }
    let result = Math.max(value, 6);
    if (maxDistance !== null && Number.isFinite(maxDistance)) {
      result = Math.min(result, maxDistance);
    }
    return result;
  };

  const recommendedDrag = clampDistance(deltaToAlign * 0.88);
  const fallbackDrag = clampDistance(Math.min(recommendedDrag * 0.95, deltaToAlign * 0.82));

  const scale = targetBox.width > 0 && trackWidth > 0 ? trackWidth / targetBox.width : 1;

  let debugImagePath: string | undefined;
  if (captureDebug) {
    try {
      ensureDirExists(CAPTCHA_DEBUG_DIR);
      debugImagePath = path.resolve(CAPTCHA_DEBUG_DIR, `attempt-${attempt}-${targetKind}.png`);
      fs.writeFileSync(debugImagePath, buffer);
    } catch (writeError) {
      console.log('[Auth Interactive] Debug target write failed:', writeError instanceof Error ? writeError.message : String(writeError));
    }
  }

  return {
    attempt,
    pixelRatio,
    backgroundBox: targetBox,
    pieceBox,
    sliderBox: sliderBox ?? null,
    trackBox: trackBox ?? null,
    gapLeftPx,
    gapRightPx,
    gapCenterPx,
    gapWidthPx,
    gapLeftCss,
    gapCenterCss,
    gapRightCss,
    pieceRelativeLeft,
    pieceCenterCss,
    pieceLeftDistance,
    pieceCenterDistance,
    deltaToAlign,
    recommendedDrag,
    fallbackDrag,
    scale,
    debugImagePath,
  };
}

async function dragGeetestSlider(page: Page, context: FrameLike, gapOffset: number, imageWidth: number, explicitDistance?: number): Promise<boolean> {
  const sliderButton = await locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
  const track = await locateFirstVisible(context, TCAPTCHA_TRACK_SELECTORS);

  if (!sliderButton || !track) {
    console.log('[Auth Interactive] Slider button or track not found');
    return false;
  }
  const [sliderBox, trackBox] = await Promise.all([
    sliderButton.boundingBox(),
    track.boundingBox(),
  ]);

  if (!sliderBox || !trackBox || trackBox.width <= 0) {
    console.log('[Auth Interactive] Invalid slider or track bounding boxes');
    return false;
  }

  // Ensure elements are in view
  try {
    await sliderButton.scrollIntoViewIfNeeded();
  } catch {}
  try {
    await track.scrollIntoViewIfNeeded();
  } catch {}

  const scale = imageWidth > 0 ? trackBox.width / imageWidth : 1;
  let distance: number;

  if (explicitDistance !== undefined && Number.isFinite(explicitDistance)) {
    distance = explicitDistance;
  } else {
    distance = gapOffset * scale - 6;
    if (!Number.isFinite(distance) || distance <= 0) {
      distance = Math.max(4, gapOffset * scale * 0.95);
    }
  }

  const maxDistance = Math.max(0, trackBox.width - sliderBox.width - 2);
  if (distance > maxDistance) {
    distance = maxDistance;
  }

  if (distance < 4) {
    distance = Math.max(distance, 4);
  }

  distance = Math.round(distance);

  const startX = sliderBox.x + sliderBox.width / 2;
  const startY = sliderBox.y + sliderBox.height / 2;
  const desiredEndX = startX + distance;
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const endX = clamp(desiredEndX, trackBox.x + 2, trackBox.x + trackBox.width - 2);

  console.log('[Auth Interactive] Slider bounds', { sliderBox, trackBox, imageWidth, scale, distance, startX, startY, desiredEndX, endX, explicitDistance });

  // Strategy 1: Use page.mouse with a human-like trace
  try {
    await page.mouse.move(startX - 8, startY, { steps: 4 });
    await page.waitForTimeout(randomBetween(30, 80));
    await page.mouse.move(startX, startY, { steps: 6 });
    await page.waitForTimeout(randomBetween(30, 80));
    await page.mouse.down();

    // Pre-press dwell before horizontal drag
    const dwellMs = Math.round(randomBetween(CAPTCHA_PREPRESS_RANGE_MS.min, CAPTCHA_PREPRESS_RANGE_MS.max));
    console.log('[Auth Interactive] Pre-press dwell', { dwellMs });
    await page.waitForTimeout(dwellMs);

    // Human-like segmented jitter (zig-zag)
    const trace = buildMoveTrace(endX - startX);
    let covered = 0;
    let zigDir = Math.random() < 0.5 ? -1 : 1;
    let zigLogged = false;
    for (const step of trace) {
      covered += step;
      const x = startX + covered;
      const jitterAmp = Math.min(2.2, Math.max(0.6, randomBetween(0.6, 2.2)));
      const y = startY + zigDir * jitterAmp;
      if (!zigLogged) {
        console.log('[Auth Interactive] ZigZag jitter applied (strategy 1)');
        zigLogged = true;
      }
      await page.mouse.move(x, y, { steps: 3 });
      await page.waitForTimeout(randomBetween(8, 22));
      zigDir *= -1;
    }

    // Pause humaine avant le relâché
    await page.waitForTimeout(Math.round(randomBetween(120, 240)));
    await page.mouse.up();

    // Longer settle wait to let slider stabilize and momentum dissipate
    await page.waitForTimeout(600);
    const newBox = await sliderButton.boundingBox().catch(() => null);
    if (newBox && Math.abs((newBox.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
      console.log('[Auth Interactive] Slider moved (mouse) delta:', (newBox.x ?? 0) - (sliderBox.x ?? 0));
      return true;
    }
    console.log('[Auth Interactive] Mouse drag did not move slider enough, delta:', newBox && sliderBox ? (newBox.x ?? 0) - (sliderBox.x ?? 0) : 'n/a');
  } catch (err) {
    console.log('[Auth Interactive] Mouse drag attempt failed:', err instanceof Error ? err.message : String(err));
  }

  // Strategy 2: Use Locator.dragTo (higher-level API)
  try {
    const sourcePos = { x: Math.round(sliderBox.width / 2), y: Math.round(sliderBox.height / 2) };
    const targetPos = { x: Math.round(clamp(distance + sliderBox.width / 2, 4, trackBox.width - 4)), y: Math.round(trackBox.height / 2) };
    console.log('[Auth Interactive] Trying locator.dragTo with positions', { sourcePos, targetPos });
    await sliderButton.dragTo(track, { sourcePosition: sourcePos, targetPosition: targetPos });
    await page.waitForTimeout(800);
    const newBox2 = await sliderButton.boundingBox().catch(() => null);
    if (newBox2 && Math.abs((newBox2.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
      console.log('[Auth Interactive] Slider moved (dragTo) delta:', (newBox2.x ?? 0) - (sliderBox.x ?? 0));
      return true;
    }
    console.log('[Auth Interactive] locator.dragTo did not move slider enough');
  } catch (err) {
    console.log('[Auth Interactive] locator.dragTo attempt failed:', err instanceof Error ? err.message : String(err));
  }

  // Strategy 3: Dispatch pointer events inside the element's frame
  try {
    await sliderButton.evaluate(async (el: Element, px: number) => {
      const rect = el.getBoundingClientRect();
      const startXLocal = rect.left + rect.width / 2;
      const startYLocal = rect.top + rect.height / 2;
      const steps = Math.max(12, Math.round(px / 6));

      el.dispatchEvent(new PointerEvent('pointerdown', { clientX: startXLocal, clientY: startYLocal, bubbles: true }));
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const x = startXLocal + px * progress;
        const y = startYLocal + (Math.random() - 0.5) * 2;
        el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
      }
      el.dispatchEvent(new PointerEvent('pointerup', { clientX: startXLocal + px, clientY: startYLocal, bubbles: true }));
    }, distance);

    await page.waitForTimeout(800);
    const newBox3 = await sliderButton.boundingBox().catch(() => null);
    if (newBox3 && Math.abs((newBox3.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
      console.log('[Auth Interactive] Slider moved (pointer events) delta:', (newBox3.x ?? 0) - (sliderBox.x ?? 0));
      return true;
    }
    console.log('[Auth Interactive] Pointer-event dispatch did not move slider enough');
  } catch (err) {
    console.log('[Auth Interactive] Pointer-event dispatch attempt failed:', err instanceof Error ? err.message : String(err));
  }

// Strategy 3b: Segmented path (multi-segments with micro-pause and controlled zig-zag jitter)
  try {
    if (CAPTCHA_STRATEGY_SET !== 'touch_only') {
      const total = endX - startX;
      console.log('[Auth Interactive] Segmented path drag start', { totalDistance: Math.round(total) });

      await page.mouse.move(startX, startY);
      await page.mouse.down();

      const seg = buildSegmentedTrace(total);
      let progressed = 0;
      let zigDir = Math.random() < 0.5 ? -1 : 1;
      let zigLogged = false;
      let pauseLogged = false;

      for (const step of seg) {
        if (step === 0) {
          const pauseMs = Math.round(randomBetween(80, 140));
          if (!pauseLogged) {
            console.log('[Auth Interactive] Segmented path micro-pause', { pauseMs });
            pauseLogged = true;
          }
          await page.waitForTimeout(pauseMs);
          continue;
        }

        progressed += step;
        const tx = clamp(startX + progressed, trackBox.x + 2, trackBox.x + trackBox.width - 2);

        // Controlled zig-zag vertical jitter (±2.2px, alternating)
        const jitterAmp = Math.min(2.2, Math.max(0.6, randomBetween(0.6, 2.2)));
        const ty = startY + zigDir * jitterAmp;
        if (!zigLogged) {
          console.log('[Auth Interactive] ZigZag jitter applied (segmented)');
          zigLogged = true;
        }

        await page.mouse.move(tx, ty, { steps: 2 });
        await page.waitForTimeout(randomBetween(8, 22));
        zigDir *= -1;
      }

      await page.waitForTimeout(Math.round(randomBetween(100, 200)));
      await page.mouse.up();

      await page.waitForTimeout(600);
      const newBoxSeg = await sliderButton.boundingBox().catch(() => null);
      if (newBoxSeg && Math.abs((newBoxSeg.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
        console.log('[Auth Interactive] Segmented path drag end — slider moved', {
          delta: (newBoxSeg?.x ?? 0) - (sliderBox?.x ?? 0),
        });
        return true;
      }
      console.log('[Auth Interactive] Segmented path did not move slider enough');
    } else {
      console.log('[Auth Interactive] Strategy set is touch_only — skipping segmented path');
    }
  } catch (err) {
    console.log('[Auth Interactive] Segmented path attempt failed:', err instanceof Error ? err.message : String(err));
  }
// Strategy 5: Grip re-acquire attempt (release and re-grab with slight offset)
  try {
    if (CAPTCHA_STRATEGY_SET === 'all') {
      const firstMovePx = Math.round(randomBetween(10, 18));
      const regrabOffsetPx = Math.round(randomBetween(1, 3));
      console.log('[Auth Interactive] Grip re-acquire attempt', { firstMovePx, regrabOffsetPx });

      // First light drag and release
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      const firstEndX = clamp(startX + firstMovePx, trackBox.x + 2, trackBox.x + trackBox.width - 2);
      await page.mouse.move(firstEndX, startY + randomBetween(-1.0, 1.0), { steps: 3 });
      await page.waitForTimeout(Math.round(randomBetween(80, 140)));
      await page.mouse.up();

      // Short dwell before re-grab
      const reacquireDelay = Math.round(randomBetween(120, 220));
      await page.waitForTimeout(reacquireDelay);

      // Re-grab slightly offset and finish the drag to endX
      const regrabX = clamp(firstEndX + regrabOffsetPx, trackBox.x + 2, trackBox.x + trackBox.width - 2);
      await page.mouse.move(regrabX, startY);
      await page.mouse.down();

      const finishTrace = buildMoveTrace(endX - regrabX);
      let progressed = 0;
      let zigDirGrip = Math.random() < 0.5 ? -1 : 1;
      let gripZigLogged = false;

      for (const step of finishTrace) {
        progressed += step;
        const tx = clamp(regrabX + progressed, trackBox.x + 2, trackBox.x + trackBox.width - 2);
        const jitterAmp = Math.min(2.2, Math.max(0.6, randomBetween(0.6, 2.2)));
        const ty = startY + zigDirGrip * jitterAmp;
        if (!gripZigLogged) {
          console.log('[Auth Interactive] ZigZag jitter applied (grip)');
          gripZigLogged = true;
        }
        await page.mouse.move(tx, ty, { steps: 2 });
        await page.waitForTimeout(randomBetween(8, 22));
        zigDirGrip *= -1;
      }

      await page.waitForTimeout(Math.round(randomBetween(100, 200)));
      await page.mouse.up();

      await page.waitForTimeout(600);
      const newBoxGrip = await sliderButton.boundingBox().catch(() => null);
      if (newBoxGrip && Math.abs((newBoxGrip.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
        console.log('[Auth Interactive] Grip re-acquire moved slider', {
          delta: (newBoxGrip?.x ?? 0) - (sliderBox?.x ?? 0),
        });
        return true;
      }
      console.log('[Auth Interactive] Grip re-acquire did not move slider enough');
    } else {
      console.log('[Auth Interactive] Strategy set is', CAPTCHA_STRATEGY_SET, '— skipping grip re-acquire');
    }
  } catch (err) {
    console.log('[Auth Interactive] Grip re-acquire attempt failed:', err instanceof Error ? err.message : String(err));
  }

  // Strategy 6: Touch events drag attempt (fallback tactile)
  try {
    if (CAPTCHA_STRATEGY_SET !== 'basic') {
      console.log('[Auth Interactive] Touch events drag attempt', { distance });

      await sliderButton.evaluate(async (el: Element, px: number) => {
        const rect = el.getBoundingClientRect();
        const startXLocal = rect.left + rect.width / 2;
        const startYLocal = rect.top + rect.height / 2;

        const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
        const targetXLocal = clamp(startXLocal + px, rect.left + 2, rect.right - 2);

        const steps = Math.max(12, Math.round(px / 6));
        let zigDir = Math.random() < 0.5 ? -1 : 1;

        function mkTouch(x: number, y: number) {
          try {
            // @ts-ignore
            return new Touch({
              identifier: Date.now(),
              target: el,
              clientX: x, clientY: y,
              pageX: x, pageY: y,
              screenX: x, screenY: y,
              radiusX: 2, radiusY: 2,
              force: 0.5, rotationAngle: 0
            });
          } catch {
            return {
              identifier: Date.now(),
              target: el,
              clientX: x, clientY: y,
              pageX: x, pageY: y,
              screenX: x, screenY: y
            };
          }
        }

        function dispatchTouch(type: 'touchstart' | 'touchmove' | 'touchend', x: number, y: number) {
          try {
            const t = mkTouch(x, y);
            const ev = new TouchEvent(type, {
              touches: type === 'touchend' ? [] : [t as any],
              targetTouches: type === 'touchend' ? [] : [t as any],
              changedTouches: [t as any],
              bubbles: true,
              cancelable: true
            });
            el.dispatchEvent(ev);
          } catch {
            // Fallback: use pointer events with pointerType='touch'
            const peType = type === 'touchstart' ? 'pointerdown' : type === 'touchmove' ? 'pointermove' : 'pointerup';
            el.dispatchEvent(new PointerEvent(peType, {
              clientX: x,
              clientY: y,
              bubbles: true,
              // @ts-ignore
              pointerType: 'touch',
            }));
          }
        }

        dispatchTouch('touchstart', startXLocal, startYLocal);

        for (let i = 1; i <= steps; i += 1) {
          const progress = i / steps;
          const x = startXLocal + (targetXLocal - startXLocal) * progress;
          const jitterAmp = Math.min(2.2, Math.max(0.6, 0.6 + Math.random() * 1.6));
          const y = startYLocal + zigDir * jitterAmp;
          dispatchTouch('touchmove', x, y);
          zigDir *= -1;
          await new Promise((r) => setTimeout(r, Math.round(8 + Math.random() * 14)));
        }

        dispatchTouch('touchend', targetXLocal, startYLocal);
      }, distance);

      await page.waitForTimeout(800);
      const newBoxTouch = await sliderButton.boundingBox().catch(() => null);
      if (newBoxTouch && Math.abs((newBoxTouch.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
        console.log('[Auth Interactive] Slider moved (touch events) delta:', (newBoxTouch?.x ?? 0) - (sliderBox?.x ?? 0));
        return true;
      }
      console.log('[Auth Interactive] Touch events did not move slider enough');
    } else {
      console.log('[Auth Interactive] Strategy set is basic — skipping touch events');
    }
  } catch (err) {
    console.log('[Auth Interactive] Touch events attempt failed:', err instanceof Error ? err.message : String(err));
  }
  // Strategy 4: Overshoot-and-back
  try {
    const over = Math.min(CAPTCHA_OVERSHOOT_MAX_PX, Math.round(trackBox.width * 0.035));
    console.log('[Auth Interactive] Trying overshoot-and-back', { over, baseDistance: distance });

    // Overshoot forward
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const endOvershoot = clamp(startX + distance + over, trackBox.x + 2, trackBox.x + trackBox.width - 2);
    const traceFwd = buildMoveTrace(endOvershoot - startX);
    let progressed = 0;
    for (const step of traceFwd) {
      progressed += step;
      const x = startX + progressed;
      const y = startY + randomBetween(-1.1, 1.1);
      await page.mouse.move(x, y, { steps: 2 });
      await page.waitForTimeout(randomBetween(10, 24));
    }
    // Pause semi-aléatoire avant relâché final
    await page.waitForTimeout(Math.round(randomBetween(120, 240)));
    await page.mouse.up();
    await page.waitForTimeout(320);

    // Back small
    const boxAfter = await sliderButton.boundingBox().catch(() => null);
    if (boxAfter) {
      const backStartX = boxAfter.x + boxAfter.width / 2;
      const backStartY = boxAfter.y + boxAfter.height / 2;
      const back = Math.round(randomBetween(3, 6));
      await page.mouse.move(backStartX, backStartY);
      await page.mouse.down();
      const backTrace = buildMoveTrace(back);
      let backProg = 0;
      for (const step of backTrace) {
        backProg += step;
        const x = backStartX - backProg;
        const y = backStartY + randomBetween(-0.8, 0.8);
        await page.mouse.move(x, y, { steps: 2 });
        await page.waitForTimeout(randomBetween(10, 26));
      }
      await page.waitForTimeout(Math.round(randomBetween(100, 200)));
      await page.mouse.up();

      await page.waitForTimeout(600);
      const afterBack = await sliderButton.boundingBox().catch(() => null);
      if (afterBack && Math.abs((afterBack.x ?? 0) - (sliderBox.x ?? 0)) > Math.max(6, distance * 0.25)) {
        console.log('[Auth Interactive] Slider moved (overshoot/back) delta:', (afterBack.x ?? 0) - (sliderBox.x ?? 0));
        const solved = await waitForCaptchaSolved(page, context);
        if (solved) {
          console.log('[Auth Interactive] Captcha solved after overshoot/back');
        } else {
          console.log('[Auth Interactive] Overshoot/back moved slider but did not confirm success');
        }
        return true;
      }
    }
  } catch (err) {
    console.log('[Auth Interactive] Overshoot-and-back attempt failed:', err instanceof Error ? err.message : String(err));
  }

  // Strategy 5: Alternate micro-nudges sequence (+3,-2,+2,-3,+2 px)
  try {
    const baseSeq = [3, -2, 2, -3, 2];
    const count = Math.max(3, Math.min(5, CAPTCHA_MICRO_NUDGES));
    console.log('[Auth Interactive] Alternate micro-nudges sequence', { count, sequence: baseSeq.slice(0, count) });

    const currBox0 = await sliderButton.boundingBox().catch(() => null);
    if (!currBox0) { throw new Error('slider box unavailable'); }

    let cx = currBox0.x + currBox0.width / 2;
    const cy = currBox0.y + currBox0.height / 2;

    for (let i = 0; i < count; i += 1) {
      const amp = baseSeq[i];
      const targetX = clamp(cx + amp, trackBox.x + 2, trackBox.x + trackBox.width - 2);

      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(targetX, cy + randomBetween(-0.8, 0.8), { steps: 2 });
      await page.waitForTimeout(Math.round(randomBetween(60, 120)));
      await page.mouse.up();

      const nudgeSolved = await waitForCaptchaSolved(page, context);
      if (nudgeSolved) {
        console.log('[Auth Interactive] Captcha solved via alternate micro-nudges');
        return true;
      }

      const currBoxNext = await sliderButton.boundingBox().catch(() => null);
      if (!currBoxNext) break;
      cx = currBoxNext.x + currBoxNext.width / 2;
    }
  } catch (err) {
    console.log('[Auth Interactive] Micro-nudges attempt failed:', err instanceof Error ? err.message : String(err));
  }

  console.log('[Auth Interactive] All drag strategies failed');
  return false;
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
  // Add a small delay to let the captcha process the drag
  await page.waitForTimeout(1000);

  // First, check immediately for success indicators
  try {
    const successLocator = context.locator('.tc-success, .tc-success-icon, .tc-success-text, .tc-cover.tc-success');
    const count = await successLocator.count().catch(() => 0);
    if (count > 0) {
      // Check if element is actually visible or has success styling
      const isSuccess = await successLocator.first().evaluate((el: Element) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        const hasSuccessClass = htmlEl.classList.contains('tc-success') ||
                               htmlEl.classList.contains('tc-success-icon') ||
                               htmlEl.classList.contains('tc-success-text') ||
                               (htmlEl.classList.contains('tc-cover') && htmlEl.classList.contains('tc-success'));
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        return hasSuccessClass && isVisible;
      }).catch(() => false);

      if (isSuccess) {
        console.log('[Auth Interactive] Captcha success indicator detected and visible');
        return true;
      }
    }
  } catch (immediateCheckError) {
    console.log('[Auth Interactive] Immediate success check failed:', immediateCheckError instanceof Error ? immediateCheckError.message : String(immediateCheckError));
  }

  // Wait for success indicators to appear/become visible with longer timeout
  try {
    await context.waitForSelector('.tc-success, .tc-success-icon, .tc-success-text, .tc-cover.tc-success', { timeout: 5000 });
    console.log('[Auth Interactive] Captcha success indicator became visible');
    return true;
  } catch (waitError) {
    console.log('[Auth Interactive] Success indicator wait timed out after 5s');
  }

  // Check for success text with more variations
  try {
    const successTexts = ['成功', '验证通过', 'Success', '验证成功', 'Verification Successful', '验证完成', '验证通过', '验证成功', '验证完毕'];
    for (const text of successTexts) {
      const textLocator = context.locator(`text=${text}`);
      if ((await textLocator.count().catch(() => 0)) > 0) {
        const isVisible = await textLocator.first().isVisible().catch(() => false);
        if (isVisible) {
          console.log('[Auth Interactive] Success text detected:', text);
          return true;
        }
      }
    }
  } catch (textError) {
    console.log('[Auth Interactive] Text-based success check failed:', textError instanceof Error ? textError.message : String(textError));
  }

  // Check for continue/next buttons that appear after success
  try {
    const continueSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("确认")',
      'button:has-text("确定")',
      'button:has-text("完成")',
      '.tc-btn-next',
      '.tc-continue',
      '[class*="success"] button',
      '[class*="next"]'
    ];

    for (const selector of continueSelectors) {
      const btnLocator = context.locator(selector);
      if ((await btnLocator.count().catch(() => 0)) > 0) {
        const isVisible = await btnLocator.first().isVisible().catch(() => false);
        if (isVisible) {
          console.log('[Auth Interactive] Continue button visible — captcha solved');
          return true;
        }
      }
    }
  } catch (btnError) {
    console.log('[Auth Interactive] Continue button check failed:', btnError instanceof Error ? btnError.message : String(btnError));
  }

  // Check if captcha iframe is hidden/closed
  try {
    const iframeLocator = page.locator('iframe[src*="turing.captcha"], iframe[src*="geetest"]');
    if ((await iframeLocator.count().catch(() => 0)) > 0) {
      const isHidden = await iframeLocator.first().evaluate((el: HTMLIFrameElement) => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden' || el.style.display === 'none';
      }).catch(() => false);

      if (isHidden) {
        console.log('[Auth Interactive] Captcha iframe hidden — assuming solved');
        return true;
      }
    }
  } catch (iframeError) {
    console.log('[Auth Interactive] Iframe visibility check failed:', iframeError instanceof Error ? iframeError.message : String(iframeError));
  }

  // Check for session cookies that indicate successful login
  try {
    const cookies = await page.context().cookies();
    const superbuyCookies = cookies.filter(c => c.domain.includes('superbuy.com'));
    const hasAuthIndicators = superbuyCookies.some(c =>
      (c.name === 'LOGSTATE' && c.value === 'logged') ||
      (c.name === 'LOGTOKEN' && c.value && c.value.length > 10) ||
      (c.name === 'AUTH_TOKEN' && c.value && c.value.length > 10) ||
      (c.name.includes('session') && c.value && c.value.length > 10)
    );

    if (hasAuthIndicators) {
      console.log('[Auth Interactive] Authentication cookies detected — captcha solved');
      return true;
    }
  } catch (cookieError) {
    console.log('[Auth Interactive] Cookie check failed:', cookieError instanceof Error ? cookieError.message : String(cookieError));
  }

  // Final fallback: check if we're redirected away from login page
  try {
    const currentUrl = page.url();
    if (!currentUrl.includes('/login') && !currentUrl.includes('captcha')) {
      console.log('[Auth Interactive] Redirected away from login/captcha — assuming solved');
      return true;
    }
  } catch (urlError) {
    console.log('[Auth Interactive] URL check failed:', urlError instanceof Error ? urlError.message : String(urlError));
  }

  // Additional check: look for any element that indicates success state
  try {
    const successIndicators = [
      '[class*="success"]',
      '[class*="verified"]',
      '[class*="complete"]',
      '.tc-verified',
      '.tc-complete'
    ];

    for (const selector of successIndicators) {
      const indicator = context.locator(selector);
      if ((await indicator.count().catch(() => 0)) > 0) {
        const isVisible = await indicator.first().isVisible().catch(() => false);
        if (isVisible) {
          console.log('[Auth Interactive] Success state indicator found:', selector);
          return true;
        }
      }
    }
  } catch (indicatorError) {
    console.log('[Auth Interactive] Success indicator check failed:', indicatorError instanceof Error ? indicatorError.message : String(indicatorError));
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

/**
 * Enregistre une tentative de captcha dans le système de collecte de données
 */
async function logCaptchaAttempt(
  page: Page,
  context: FrameLike | null,
  outcome: 'success' | 'failure' | 'timeout' | 'error',
  solution?: string,
  solutionTimeMs?: number,
  errorDetails?: string,
  modelVersion?: string,
  confidence?: number
): Promise<void> {
  try {
    // Récupérer des informations sur la tentative
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const url = page.url();
    
    // Récupérer l'IP du client (potentiellement via une API externe)
    let clientIP = '';
    try {
      // Cette requête peut échouer en fonction des restrictions CORS
      const response = await fetch('https://httpbin.org/ip');
      const ipData = await response.json();
      clientIP = ipData.origin || '';
    } catch (e) {
      // Si on ne peut pas récupérer l'IP directement, on laisse vide
      clientIP = '';
    }
    
    const attemptData = {
      session_id: `sb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      challenge_type: 'tcaptcha_slider',
      challenge_params: {
        url,
        user_agent: userAgent,
      },
      user_agent: userAgent,
      ip: clientIP,
      outcome,
      solution,
      solution_time_ms: solutionTimeMs,
      error_details: errorDetails,
      model_version: modelVersion,
      confidence,
      metadata: {
        timestamp: Date.now(),
        browser_context: !!context,
        page_url: url,
      }
    };
    
    // Envoyer les données via le SDK
    // await captchaSDK.createCaptchaAttempt(attemptData);
    
    console.log(`[Captcha Data Collection] Attempt logged: ${outcome}`);
  } catch (error) {
    console.error('[Captcha Data Collection] Error logging attempt:', error);
  }
}

/**
 * Enregistre un artefact de captcha (image, etc.) dans le système de collecte de données
 */
async function logCaptchaArtifact(
  attemptId: string,
  artifactType: 'challenge_image' | 'background_image' | 'solution_image' | 'debug_info',
  fileBuffer: Buffer,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // await captchaSDK.uploadCaptchaArtifact(attemptId, artifactType, fileBuffer, metadata);
    console.log(`[Captcha Data Collection] Artifact uploaded: ${artifactType}`);
  } catch (error) {
    console.error(`[Captcha Data Collection] Error uploading ${artifactType}:`, error);
  }
}

async function handleHeadfulLogin(payload: CredentialsPayload): Promise<void> {
  const browser = await chromium.launch({ headless: false }); // Visible browser
  const context = await browser.newContext();
  let page = await context.newPage();

  const shutdown = async () => closeResources({ page, context, browser });

  try {
    const loginUrl = 'https://www.superbuy.com/en/page/login/';
    console.log('[Auth Interactive] Navigating to:', loginUrl);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="text"], input[type="email"]', payload.username);
    await page.fill('input[type="password"]', payload.password);

    const screenshotPath = path.resolve(process.cwd(), 'debug_login_headful.png');
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    console.log('[Auth Interactive] Screenshot saved to:', screenshotPath);

    // Also save page HTML for debugging
    const htmlPath = path.resolve(process.cwd(), 'debug_login_headful.html');
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
    console.log(`[Auth Interactive] Waiting for captcha to load after login attempt (${Math.round(CAPTCHA_LOAD_DELAY_MS / 1000)}s)...`);
    await page.waitForTimeout(CAPTCHA_LOAD_DELAY_MS);
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

    let captchaLikely = false;
    try {
      await Promise.race([
        page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: QUICK_REDIRECT_TIMEOUT_MS }),
        page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: QUICK_REDIRECT_TIMEOUT_MS }),
        (async () => {
          const ctx = await waitForCaptchaContext(page, QUICK_REDIRECT_TIMEOUT_MS);
          if (ctx) {
            captchaLikely = true;
            throw new Error('__TCAPTCHA_DETECTED__');
          }
        })(),
      ]);
      redirected = true;
    } catch (initialWaitError) {
      const msg = initialWaitError instanceof Error ? initialWaitError.message : String(initialWaitError);
      if (msg === '__TCAPTCHA_DETECTED__') {
        console.log('[Auth Interactive] Captcha detected early — skipping redirect wait');
      } else {
        console.log('[Auth Interactive] Quick redirect not detected', initialWaitError);
      }
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
            page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: POST_CAPTCHA_REDIRECT_TIMEOUT_MS }),
            page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: POST_CAPTCHA_REDIRECT_TIMEOUT_MS }),
          ]);
          redirected = true;
        } catch (afterCaptchaError) {
          console.log('[Auth Interactive] Still no redirect after captcha', afterCaptchaError);
        }
      }
    }

    if (!redirected && (captchaResult === 'failed' || (captchaResult === 'no-captcha' && !errorText))) {
      console.log('[Auth Interactive] Login did not complete automatically');
      console.log('[Auth Interactive] Browser will remain open for manual intervention');
      console.log('[Auth Interactive] Press Ctrl+C to close when done');

      // Keep browser open for manual interaction
      process.on('SIGINT', async () => {
        console.log('[Auth Interactive] Received SIGINT, saving state...');
        await saveAuthState(context);
        await shutdown();
        process.exit(0);
      });

      // Wait indefinitely
      await new Promise(() => {}); // Never resolves
    }

    if (!redirected) {
      console.log('[Auth Interactive] Login failed:', errorText ?? 'Unknown failure');
      await shutdown();
      return;
    }

    console.log('[Auth Interactive] Login successful!');
    await saveAuthState(context);
    await shutdown();
  } catch (error) {
    console.error('[Auth Interactive] Headful login failed:', error);
    await shutdown();
  }
}

async function saveAuthState(context: BrowserContext): Promise<void> {
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

  console.log('[Auth Interactive] Auth state saved to:', targetPath);
}

// Main execution
async function main() {
  const payload: CredentialsPayload = {
    username: 'flaviocomblez@gmail.com',
    password: 'fl@vio59'
  };

  console.log('[Auth Interactive] Starting headful login with credentials...');
  await handleHeadfulLogin(payload);
}

main().catch(console.error);
// Helper: segmented multi-step trace (S1 accelerate 20–30%, S2 slight back 2–5px, S3 irregular to target)
function buildSegmentedTrace(totalDistance: number): number[] {
  const dist = Math.max(4, Math.round(totalDistance));
  const s1Ratio = randomBetween(0.20, 0.30);
  const s1Target = Math.max(3, Math.round(dist * s1Ratio));
  const backCorrection = Math.max(2, Math.min(5, Math.round(randomBetween(2, 5))));
  const s3Target = Math.max(3, dist - s1Target + backCorrection);
  const steps: number[] = [];

  // S1: small acceleration phase
  let s1Covered = 0;
  const s1Steps = Math.max(6, Math.round(s1Target / 3));
  for (let i = 0; i < s1Steps && s1Covered < s1Target; i += 1) {
    const remaining = s1Target - s1Covered;
    let step = Math.max(0.6, remaining / (s1Steps - i) + Math.random() * 1.2);
    step = Math.min(step, remaining);
    steps.push(step);
    s1Covered += step;
  }

  // Micro-pause sentinel (0 => pause)
  steps.push(0);

  // S2: slight backward correction (2–5px total)
  let backCovered = 0;
  const s2Steps = Math.max(2, Math.min(3, Math.round(backCorrection / 2)));
  for (let i = 0; i < s2Steps && backCovered < backCorrection; i += 1) {
    const remaining = backCorrection - backCovered;
    let step = Math.max(0.8, remaining / (s2Steps - i));
    step = Math.min(step, remaining);
    steps.push(-step);
    backCovered += step;
  }

  // S3: resume forward with slightly irregular speed
  let s3Covered = 0;
  const s3Steps = Math.max(10, Math.round(s3Target / 3));
  for (let i = 0; i < s3Steps && s3Covered < s3Target; i += 1) {
    const remaining = s3Target - s3Covered;
    const jitter = (Math.random() - 0.5) * 1.4; // irregular perturbation
    let step = Math.max(0.5, remaining / (s3Steps - i) + jitter);
    if (i % 5 === 0) step += Math.random() * 0.8; // small boosts
    if (i % 7 === 0) step -= Math.random() * 0.6; // small slows
    step = Math.min(step, remaining);
    steps.push(step);
    s3Covered += step;
  }

  // Fine adjust to reach exact net distance
  const net = steps.reduce((acc, v) => acc + v, 0);
  const diff = dist - net;
  if (Math.abs(diff) >= 0.5) {
    steps.push(diff);
  }

  return steps;
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
}