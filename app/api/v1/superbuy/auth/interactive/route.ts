import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Browser, BrowserContext, Page } from 'playwright';
import { logger } from '@/lib/utils/logging/logger';
import { GeetestSolver, type CaptchaSolveResult } from '@/lib/services/captcha/geetest-solver';

interface CredentialsPayload {
  username: string;
  password: string;
}

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
    } catch (error) {
      logger.debug('[Cleanup] Failed to close page:', { error });
    }
  }
  if (context) {
    try {
      await context.close();
    } catch (error) {
      logger.debug('[Cleanup] Failed to close context:', { error });
    }
  }
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      logger.debug('[Cleanup] Failed to close browser:', { error });
    }
  }
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
      try { fs.unlinkSync(screenshotPath); } catch (error) { logger.debug('[Cleanup] Failed to delete login screenshot:', { error }); }
      try { if (tmpDirLogin && fs.existsSync(tmpDirLogin)) fs.rmdirSync(tmpDirLogin, { recursive: true }); } catch (error) { logger.debug('[Cleanup] Failed to delete login temp dir:', { error }); }
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
      captchaResult = await GeetestSolver.solve(page);

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
