import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Frame, Locator, Page } from 'playwright';
import { PNG } from 'pngjs';
import { logger } from '@/lib/utils/logging/logger';

export type CaptchaSolveResult = 'no-captcha' | 'solved' | 'failed';

type BoundingBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type FrameLike = Page | Frame;

// Tencent Captcha (TCaptcha) selectors - Superbuy uses TCaptcha, not Geetest
const TCAPTCHA_IFRAME_SELECTORS = ['iframe[src*="turing.captcha"]', 'iframe[src*="tcaptcha"]'];
const TCAPTCHA_CANVAS_SELECTORS = ['canvas', '.tc-bg canvas', '.tc-opera canvas'];
const TCAPTCHA_SLIDER_BUTTON_SELECTORS = ['.tc-slider-normal', '.tc-slider-ie', '.tcaptcha-drag-el'];
const TCAPTCHA_TRACK_SELECTORS = ['.tcaptcha-drag-wrap', '.tc-drag', '.tc-opera'];
const TCAPTCHA_REFRESH_SELECTORS = ['.tc-action--refresh', '.tc-action.tc-icon'];
const TCAPTCHA_CONTAINER_SELECTORS = ['.tc-captcha', '#tcWrap', '.tc-drag', '.tc-opera'];
const IS_DEBUG = (process.env['CAPTCHA_DEBUG'] === 'true') || (process.env['SUPERBUY_CAPTCHA_DEBUG'] === 'true');

export class GeetestSolver {

    static async solve(page: Page): Promise<CaptchaSolveResult> {
        // Give Tencent Captcha more time to appear (it loads in an iframe)
        let context = await this.waitForCaptchaContext(page, 20000);
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
        } catch (error) {
            logger.debug('[Captcha] Captcha visibility timeout:', { error });
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
                try { fs.unlinkSync(captchaScreenshot); } catch (error) { logger.debug('[Cleanup] Failed to delete temp screenshot:', { error }); }
                try { if (tmpDir && fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir, { recursive: true }); } catch (error) { logger.debug('[Cleanup] Failed to delete temp dir:', { error }); }
            }
        } catch (error) {
            logger.debug('[Captcha] Failed to save debug screenshot:', { error });
        }

        for (let attempt = 1; attempt <= 4; attempt += 1) {
            // Refresh context in case Geetest replaced its iframe.
            const freshContext = await this.waitForCaptchaContext(page, attempt === 1 ? 0 : 4000);
            if (freshContext) {
                context = freshContext;
            } else if (!context || this.isFrameLikeDetached(context)) {
                context = await this.waitForCaptchaContext(page, 4000);
            }

            if (!context) {
                return 'failed';
            }

            const images = await this.captureGeetestImages(context);
            if (!images) {
                // If selected context doesn't have canvases, try page directly to trigger fallback
                const fallbackImages = await this.captureGeetestImages(page);
                if (!fallbackImages) {
                    await this.refreshGeetest(page, context);
                    await page.waitForTimeout(800);
                    context = null;
                    continue;
                }
                // Use fallback images but keep context for UI interactions
                const { full, background } = fallbackImages;

                const gapOffset = this.findGapOffset(full, background);
                if (gapOffset < 0) {
                    await this.refreshGeetest(page, context);
                    await page.waitForTimeout(800);
                    context = null;
                    continue;
                }

                const dragged = await this.dragGeetestSlider(page, context, gapOffset, full.width);
                if (!dragged) {
                    await this.refreshGeetest(page, context);
                    await page.waitForTimeout(800);
                    context = null;
                    continue;
                }

                const solved = await this.waitForCaptchaSolved(page, context);
                if (solved) {
                    return 'solved';
                }

                await this.refreshGeetest(page, context);
                await page.waitForTimeout(1000);
                context = null;
                continue;
            }

            const { full, background } = images;

            const gapOffset = this.findGapOffset(full, background);
            if (gapOffset < 0) {
                await this.refreshGeetest(page, context);
                await page.waitForTimeout(800);
                context = null;
                continue;
            }

            const dragged = await this.dragGeetestSlider(page, context, gapOffset, full.width);
            if (!dragged) {
                await this.refreshGeetest(page, context);
                await page.waitForTimeout(800);
                context = null;
                continue;
            }

            const solved = await this.waitForCaptchaSolved(page, context);
            if (solved) {
                return 'solved';
            }

            await this.refreshGeetest(page, context);
            await page.waitForTimeout(1000);
            context = null;
        }

        return 'failed';
    }

    private static async resolveCaptchaContext(page: Page): Promise<FrameLike | null> {
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
                        } catch (error) {
                            logger.debug('[Captcha] Iframe load timeout, continuing anyway:', { error });
                        }
                        return frame;
                    }
                }
            } catch (error) {
                logger.debug('[Captcha] Error checking iframe selector:', { error });
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
                } catch (error) {
                    logger.debug('[Captcha] Error checking container selector:', { selector, error });
                }
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
                } catch (error) {
                    logger.debug('[Captcha] Error checking canvas selector:', { selector, error });
                }
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
                } catch (error) {
                    logger.debug('[Captcha] Error checking fallback selector:', { selector, error });
                }
            }
        }

        return null;
    }

    private static async waitForCaptchaContext(page: Page, timeoutMs = 10000): Promise<FrameLike | null> {
        if (timeoutMs === 0) {
            return this.resolveCaptchaContext(page);
        }

        const deadline = Date.now() + timeoutMs;
        let lastAttempt = 0;

        while (Date.now() < deadline) {
            const context = await this.resolveCaptchaContext(page);
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

    private static isFrameLikeDetached(target: FrameLike): boolean {
        if ('isClosed' in target && typeof target.isClosed === 'function') {
            return target.isClosed();
        }
        if ('isDetached' in target && typeof target.isDetached === 'function') {
            return target.isDetached();
        }
        return false;
    }

    private static async captureGeetestImages(context: FrameLike): Promise<{ background: PNG; full: PNG } | null> {
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
            } catch (error) {
                logger.debug('[Captcha] Failed to debug captcha elements:', { error });
            }
        }

        try {
            await context.waitForSelector('canvas', { timeout: 5000 });
        } catch (error) {
            logger.debug('[Captcha] Canvas wait timeout in selected context:', { error });
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
                    } catch (error) {
                        logger.debug('[Captcha] Error counting canvases in frame:', { error });
                    }
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
                } catch (error) {
                    logger.debug('[Captcha] Failed to get canvas className:', { error });
                }

                const buffer = await locator.screenshot({ type: 'png' });
                if (buffer.length === 0) {
                    continue;
                }

                const png = PNG.sync.read(buffer);
                decoded.push({ className, png, width: png.width, height: png.height });
            } catch (error) {
                logger.debug('[Captcha] Canvas screenshot error:', { error });
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

        const { background, full } = this.alignPngDimensions(fullEntry.png, backgroundEntry.png);
        if (background.width === 0 || background.height === 0) {
            return null;
        }

        return { background, full };
    }

    private static alignPngDimensions(full: PNG, background: PNG): { full: PNG; background: PNG } {
        if (full.width === background.width && full.height === background.height) {
            return { full, background };
        }
        const width = Math.min(full.width, background.width);
        const height = Math.min(full.height, background.height);
        return {
            full: this.cropPng(full, width, height),
            background: this.cropPng(background, width, height),
        };
    }

    private static cropPng(source: PNG, width: number, height: number): PNG {
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

    private static findGapOffset(full: PNG, background: PNG): number {
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

    private static async dragGeetestSlider(page: Page, context: FrameLike, gapOffset: number, imageWidth: number): Promise<boolean> {
        const sliderButton = await this.locateFirstVisible(context, TCAPTCHA_SLIDER_BUTTON_SELECTORS);
        const track = await this.locateFirstVisible(context, TCAPTCHA_TRACK_SELECTORS);

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

        await this.performHumanLikeDrag(page, sliderBox, distance);
        return true;
    }

    private static async locateFirstVisible(target: FrameLike, selectors: readonly string[]): Promise<Locator | null> {
        for (const selector of selectors) {
            const locator = target.locator(selector).first();
            try {
                if ((await locator.count()) > 0 && (await locator.isVisible())) {
                    return locator;
                }
            } catch (error) {
                logger.debug('[Captcha] Error checking selector visibility:', { selector, error });
            }
        }
        return null;
    }

    private static async performHumanLikeDrag(page: Page, sliderBox: BoundingBox, distance: number): Promise<void> {
        const startX = sliderBox.x + sliderBox.width / 2;
        const startY = sliderBox.y + sliderBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();

        const trace = this.buildMoveTrace(distance);
        let current = 0;
        for (const move of trace) {
            current += move;
            const targetX = startX + current;
            const targetY = startY + this.randomBetween(-0.6, 0.6);
            await page.mouse.move(targetX, targetY, { steps: 2 });
            await page.waitForTimeout(this.randomBetween(12, 28));
        }

        await page.waitForTimeout(this.randomBetween(80, 140));
        await page.mouse.up();
    }

    private static buildMoveTrace(distance: number): number[] {
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

    private static async waitForCaptchaSolved(page: Page, context: FrameLike): Promise<boolean> {
        try {
            // Tencent Captcha success indicators
            await context.waitForSelector('.tc-success, .tc-success-icon, .tc-success-text', { timeout: 4000 });
            return true;
        } catch {
            // No success indicator found
            if (this.isFrameLikeDetached(context)) {
                return true;
            }
            try {
                const stillActive = await this.isCaptchaActive(context);
                if (!stillActive) {
                    const newContext = await this.resolveCaptchaContext(page);
                    return !newContext;
                }
            } catch (error) {
                logger.debug('[Captcha] Error checking if captcha still active:', { error });
            }
        }
        return false;
    }

    private static async isCaptchaActive(context: FrameLike): Promise<boolean> {
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

    private static async refreshGeetest(page: Page, context: FrameLike): Promise<void> {
        try {
            const refreshButton = await this.locateFirstVisible(context, TCAPTCHA_REFRESH_SELECTORS);
            if (refreshButton) {
                await refreshButton.click({ delay: 100 });
            }
        } catch {
            // Error clicking refresh
        }
        await page.waitForTimeout(1200);
    }

    private static randomBetween(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }
}
