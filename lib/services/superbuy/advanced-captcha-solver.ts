import { type Page, type Frame, type Locator } from 'playwright';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { YoloCaptchaService } from '@/lib/services/captcha/yolo-captcha-service';
import { generateHorizontalDragTrajectory } from '@/lib/utils/trajectory-generator';

// Types
type FrameLike = Page | Frame;
type CaptchaSolveResult = 'solved' | 'failed' | 'no-captcha';

// Constants & Selectors
const TCAPTCHA_IFRAME_SELECTORS = ['iframe[src*="turing.captcha"]', 'iframe[src*="tcaptcha"]'];
const TCAPTCHA_CANVAS_SELECTORS = ['canvas', '.tc-bg canvas', '.tc-opera canvas'];
const TCAPTCHA_SLIDER_BUTTON_SELECTORS = ['.tc-slider-normal', '.tc-slider-ie', '.tcaptcha-drag-el'];
const TCAPTCHA_TRACK_SELECTORS = ['#tcOperation', '.tcaptcha-drag-wrap', '.tc-drag', '.tc-opera'];
const TCAPTCHA_REFRESH_SELECTORS = ['.tc-action--refresh', '.tc-action.tc-icon'];
const TCAPTCHA_CONTAINER_SELECTORS = ['#tcOperation', '.tc-captcha', '#tcWrap', '.tc-drag', '.tc-opera'];

const CAPTCHA_DEBUG_DIR = path.resolve(process.cwd(), process.env['SUPERBUY_CAPTCHA_DEBUG_DIR'] ?? 'captcha-debug');
const IS_DEBUG = (process.env['CAPTCHA_DEBUG'] === 'true') || (process.env['SUPERBUY_CAPTCHA_DEBUG'] === 'true');

export class AdvancedCaptchaSolver {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private ensureDirExists(targetDir: string): void {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  private async locateFirstVisible(target: FrameLike, selectors: readonly string[]): Promise<Locator | null> {
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

  private async resolveCaptchaContext(): Promise<FrameLike | null> {
    const seen = new Set<FrameLike>();

    // Priority 1: Check for Tencent Captcha iframe

    for (const selector of TCAPTCHA_IFRAME_SELECTORS) {
      try {
        const iframeElement = await this.page.$(selector);
        if (iframeElement) {
          const frame = await iframeElement.contentFrame();
          if (frame && !frame.isDetached()) {

            try {
              await frame.waitForLoadState('domcontentloaded', { timeout: 10000 });
              await this.page.waitForTimeout(2000);
              const hasContent = await frame.locator('.tc-captcha, #tcWrap, canvas').count();
              if (hasContent > 0) {
                return frame;
              } else {
                await this.page.waitForTimeout(3000);
                const recheckContent = await frame.locator('.tc-captcha, #tcWrap, canvas').count();
                if (recheckContent > 0) return frame;
              }
            } catch (_e) {

            }
            return frame;
          }
        }
      } catch { }
    }

    // Priority 2: Check all frames for Tencent Captcha elements
    const allFrames = this.page.frames().filter((frame) => !frame.isDetached());
    const contexts: FrameLike[] = [this.page, ...allFrames];

    // Look for Tencent Captcha container classes
    for (const context of contexts) {
      if (seen.has(context)) continue;
      seen.add(context);

      for (const selector of TCAPTCHA_CONTAINER_SELECTORS) {
        const locator = context.locator(selector).first();
        try {
          if ((await locator.count()) > 0 && (await locator.isVisible())) {

            return context;
          }
        } catch { }
      }
    }

    // Priority 3: Look for canvas elements
    seen.clear();
    for (const context of contexts) {
      if (seen.has(context)) continue;
      seen.add(context);

      for (const selector of TCAPTCHA_CANVAS_SELECTORS) {
        const locator = context.locator(selector).first();
        try {
          const count = await locator.count();
          if (count > 0 && (await locator.isVisible())) {

            return context;
          }
        } catch { }
      }
    }

    // Priority 4: Fallback to slider/drag elements
    const fallbackSelectors = [...TCAPTCHA_SLIDER_BUTTON_SELECTORS, ...TCAPTCHA_TRACK_SELECTORS];
    seen.clear();
    for (const context of contexts) {
      if (seen.has(context)) continue;
      seen.add(context);

      for (const selector of fallbackSelectors) {
        const locator = context.locator(selector).first();
        try {
          if ((await locator.count()) > 0 && (await locator.isVisible())) {

            return context;
          }
        } catch { }
      }
    }

    return null;
  }

  private async waitForCaptchaContext(timeoutMs = 10000): Promise<FrameLike | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const context = await this.resolveCaptchaContext();
      if (context) return context;
      await this.page.waitForTimeout(500);
    }
    return null;
  }

  private async refreshCaptcha(context: FrameLike): Promise<void> {
    try {
      const refreshButton = await this.locateFirstVisible(context, TCAPTCHA_REFRESH_SELECTORS);
      if (refreshButton) {
        await refreshButton.click({ delay: 100 });
      }
    } catch { }
    await this.page.waitForTimeout(1200);
  }

  private async waitForSolved(context: FrameLike): Promise<boolean> {
    await this.page.waitForTimeout(1000);

    // 1. Immediate success indicators
    try {
      const successLocator = context.locator('.tc-success, .tc-success-icon, .tc-success-text, .tc-cover.tc-success');
      if ((await successLocator.count()) > 0) {
        const isSuccess = await successLocator.first().evaluate((el) => {
          const htmlEl = el as HTMLElement;
          const style = window.getComputedStyle(htmlEl);
          const hasClass = htmlEl.classList.contains('tc-success') ||
            htmlEl.classList.contains('tc-success-icon') ||
            htmlEl.classList.contains('tc-success-text');
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          return hasClass && isVisible;
        }).catch(() => false);
        if (isSuccess) return true;
      }
    } catch { }

    // 2. Wait for success indicators
    try {
      await context.waitForSelector('.tc-success, .tc-success-icon, .tc-success-text', { timeout: 2000 }).catch(() => { });
      const successLocator = context.locator('.tc-success, .tc-success-icon, .tc-success-text');
      if ((await successLocator.count()) > 0 && (await successLocator.first().isVisible())) return true;
    } catch { }

    // 3. Success text
    try {
      const successTexts = ['成功', '验证通过', 'Success', '验证成功', 'Verification Successful', '验证完成'];
      for (const text of successTexts) {
        const loc = context.locator(`text=${text}`);
        if ((await loc.count()) > 0 && (await loc.first().isVisible())) return true;
      }
    } catch { }

    // 4. Continue buttons
    try {
      const continueSelectors = ['button:has-text("Continue")', 'button:has-text("Next")', '.tc-btn-next'];
      for (const sel of continueSelectors) {
        const loc = context.locator(sel);
        if ((await loc.count()) > 0 && (await loc.first().isVisible())) return true;
      }
    } catch { }

    // 5. Iframe hidden
    try {
      const iframe = this.page.locator('iframe[src*="turing.captcha"]');
      if ((await iframe.count()) > 0) {
        const isHidden = await iframe.first().evaluate((el) => {
          const style = window.getComputedStyle(el);
          return style.display === 'none' || style.visibility === 'hidden';
        });
        if (isHidden) return true;
      }
    } catch { }

    // 6. Cookies
    try {
      const cookies = await this.page.context().cookies();
      const hasAuth = cookies.some(c => c.domain.includes('superbuy.com') && (c.name === 'LOGSTATE' && c.value === 'logged'));
      if (hasAuth) return true;
    } catch { }

    return false;
  }

  public async solve(sessionId: string = `tcaptcha-${Date.now().toString(36)}`): Promise<CaptchaSolveResult> {

    if (IS_DEBUG) this.ensureDirExists(CAPTCHA_DEBUG_DIR);

    const context = await this.waitForCaptchaContext();
    if (!context) {

      return 'no-captcha';
    }

    for (let attempt = 1; attempt <= 3; attempt++) {


      let imagePath: string | null = null;
      let tempDir: string | null = null;

      try {
        // a) Localiser et capturer le CAPTCHA
        const container = await this.locateFirstVisible(context, TCAPTCHA_CONTAINER_SELECTORS);
        if (!container) {

          return 'no-captcha';
        }

        const imageFilename = `tcaptcha-${sessionId}-a${String(attempt).padStart(2, '0')}.png`;

        if (IS_DEBUG) {
          imagePath = path.resolve(CAPTCHA_DEBUG_DIR, imageFilename);
        } else {
          tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'captcha-'));
          imagePath = path.join(tempDir, imageFilename);
        }

        const screenshotBuffer = await container.screenshot({ type: 'png' });
        fs.writeFileSync(imagePath, screenshotBuffer);


        // b) Mesurer la piste du slider
        const trackLocator = await this.locateFirstVisible(context, TCAPTCHA_TRACK_SELECTORS);
        if (!trackLocator) {

          await this.refreshCaptcha(context);
          continue;
        }
        const trackBox = await trackLocator.boundingBox();
        if (!trackBox || trackBox.width <= 0) {
          await this.refreshCaptcha(context);
          continue;
        }

        const sliderLocator = await this.locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
        if (!sliderLocator) {
          await this.refreshCaptcha(context);
          continue;
        }
        const sliderBox = await sliderLocator.boundingBox();
        if (!sliderBox) {
          await this.refreshCaptcha(context);
          continue;
        }

        const effectiveWidth = trackBox.width - sliderBox.width;


        // c) Planifier le mouvement via YOLO
        const yoloService = YoloCaptchaService.getInstance();
        let plan;
        try {
          plan = await yoloService.planSliderMovement(imagePath, effectiveWidth);
        } catch (yoloError: unknown) {
          const errorMsg = yoloError instanceof Error ? yoloError.message : String(yoloError);


          // If it's an onnxruntime issue, don't try to solve. Just return 'no-captcha' 
          // so the login flow can continue and rely on Superbuy's cookie/redirect detection.
          if (errorMsg.includes('InferenceSession') || errorMsg.includes('onnxruntime')) {

            return 'no-captcha';
          }

          // For other errors, try refreshing and retry
          if (attempt < 3) {
            await this.refreshCaptcha(context);
            continue;
          }
          return 'failed';
        }

        if (!plan.valid || !Number.isFinite(plan.deltaXDomPx) || plan.deltaXDomPx <= 0) {

          if (attempt < 3) {
            await this.refreshCaptcha(context);
            continue;
          }
          return 'failed';
        }

        // Cleanup temp file
        if (!IS_DEBUG && tempDir) {
          try {
            fs.unlinkSync(imagePath);
            fs.rmdirSync(tempDir);
          } catch { }
        }
        try {
          await sliderLocator.scrollIntoViewIfNeeded();
        } catch { }

        const startX = sliderBox.x + sliderBox.width / 2;
        const startY = sliderBox.y + sliderBox.height / 2;

        // Add 20px offset to compensate for slider stopping short
        const adjustedDeltaX = plan.deltaXDomPx + 10;
        const trajectory = generateHorizontalDragTrajectory(startX, startY, adjustedDeltaX);

        if (!trajectory || trajectory.length === 0) {
          if (attempt < 3) {
            await this.refreshCaptcha(context);
            continue;
          }
          return 'failed';
        }

        // e) Exécuter le drag
        await this.page.mouse.move(startX, startY);
        await this.page.mouse.down();

        const baseTime = Date.now();
        for (const point of trajectory) {
          const targetTime = baseTime + point.t;
          const now = Date.now();
          const waitMs = targetTime - now;
          if (waitMs > 1) await this.page.waitForTimeout(waitMs);
          await this.page.mouse.move(point.x, point.y);
        }

        await this.page.mouse.up();

        // f) Vérifier le résultat
        const solved = await this.waitForSolved(context);
        if (solved) {

          return 'solved';
        }


        if (attempt < 3) await this.refreshCaptcha(context);

      } catch (_error) {


        // Cleanup temp file on error
        if (!IS_DEBUG && tempDir && imagePath) {
          try {
            fs.unlinkSync(imagePath);
            fs.rmdirSync(tempDir);
          } catch { }
        }

        if (attempt < 3) await this.refreshCaptcha(context);
      }
    }


    return 'failed';
  }
}
