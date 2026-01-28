
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { encryptSecret, decryptSecret } from '@/lib/utils/crypto';
import { AdvancedCaptchaSolver } from './advanced-captcha-solver';
import { parseParcelsPage, parseProductsFromParcels } from './parsers';
import { SUPERBUY_URLS, SUPERBUY_SELECTORS, BROWSER_CONFIG } from './constants';
import { ParcelRepository } from '@/lib/repositories/parcel-repository';
import { IntegrationRepository } from '@/lib/repositories/integration-repository';
import { logger } from '@/lib/utils/logging/logger';
import { z } from "zod";
import { SuperbuyDataProcessor } from './data-processor';
import { PlaywrightHelper } from './playwright-helper';

const SuperbuyCredentialsSchema = z.object({
  email: z.string().email(),
  encryptedPassword: z.string(),
});

export class SuperbuyAutomationService {
  private integrationRepo: IntegrationRepository;
  private dataProcessor: SuperbuyDataProcessor;

  public constructor(parcelsRepo: ParcelRepository, integrationRepo: IntegrationRepository) {
    this.integrationRepo = integrationRepo;
    this.dataProcessor = new SuperbuyDataProcessor(parcelsRepo);
  }

  /**
   * Connects a user to Superbuy: validates credentials, logs in, and stores encrypted session.
   */
  public async connect(userId: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
    let browser: Browser | null = null;
    try {
      // 1. Launch Browser
      browser = await chromium.launch({
        headless: false, // Headful for captcha solving
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      });

      const context = await browser.newContext({
        viewport: BROWSER_CONFIG.VIEWPORT,
        userAgent: BROWSER_CONFIG.USER_AGENT,
      });

      const page = await context.newPage();

      // 2. Perform Login
      const loginSuccess = await this.performLogin(page, email, password);
      if (!loginSuccess) {
        return { success: false, message: 'Login failed or captcha could not be solved.' };
      }

      // 3. Extract Cookies
      const cookies = await context.cookies();
      const encryptedPassword = await encryptSecret(password, userId);

      // 4. Store in DB using Repository
      await this.integrationRepo.saveCredentials(userId, 'superbuy', {
        credentials: { email, encryptedPassword },
        cookies: cookies,
      });

      return { success: true, message: 'Connected successfully' };

    } catch (error: unknown) {
      logger.error('[Superbuy] Connect error', { error });
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Syncs data for a user using stored credentials.
   * If no credentials exist and new ones are provided, creates a new session automatically.
   */
  public async sync(
    userId: string,
    credentials?: { email?: string; password?: string },
    onProgress?: (progress: number, message: string) => Promise<void>,
    enrichProducts: boolean = true
  ): Promise<{ success: boolean; message: string; data?: { parcelsCount: number; ordersCount: number } }> {
    let browser: Browser | null = null;
    try {
      if (onProgress) await onProgress(5, "Checking credentials...");

      // 1. Retrieve Superbuy Credentials using Repository
      const cred = await this.integrationRepo.findByProvider(userId, 'superbuy');

      let email: string;
      let password: string;
      let context: BrowserContext;

      if (!cred || !cred.credentials || !cred.cookies) {
        // No stored credentials - check if new ones were provided
        if (!credentials?.email || !credentials?.password) {
          logger.error('[Superbuy] Cannot proceed: no stored session and no credentials provided');
          return { success: false, message: 'No credentials found. Please provide email and password to create a new session.' };
        }

        // Create new session with provided credentials
        const connectResult = await this.connect(userId, credentials.email, credentials.password);
        if (!connectResult.success) {
          return connectResult;
        }

        // Re-fetch credentials after creation
        const newCred = await this.integrationRepo.findByProvider(userId, 'superbuy');

        if (!newCred || !newCred.credentials) {
          return { success: false, message: 'Failed to create session.' };
        }

        const validation = SuperbuyCredentialsSchema.safeParse(newCred.credentials);
        if (!validation.success) {
          logger.error('[Superbuy] Invalid stored credentials schema', { error: validation.error });
          return { success: false, message: 'Invalid stored credentials.' };
        }

        const storedCreds = validation.data;
        const { email: storedEmail, encryptedPassword } = storedCreds;
        email = storedEmail;
        password = await decryptSecret(encryptedPassword, userId);

        // Use new cookies from the connect process
        const newCookies = newCred.cookies as Array<{ name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Strict" | "Lax" | "None" }>;

        // Launch browser with new cookies
        browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
        });

        context = await browser.newContext({
          userAgent: BROWSER_CONFIG.USER_AGENT,
        });

        await context.addCookies(newCookies);
      } else {
        // Use existing credentials
        const validation = SuperbuyCredentialsSchema.safeParse(cred.credentials);
        if (!validation.success) {
          logger.error('[Superbuy] Invalid stored credentials schema', { error: validation.error });
          return { success: false, message: 'Invalid stored credentials.' };
        }
        const storedCreds = validation.data;
        const { email: storedEmail, encryptedPassword } = storedCreds;
        email = storedEmail;
        password = await decryptSecret(encryptedPassword, userId);

        if (onProgress) await onProgress(10, "Launching browser...");

        // 2. Launch Browser with Cookies (Headless initially)
        browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
        });

        context = await browser.newContext({
          userAgent: BROWSER_CONFIG.USER_AGENT,
        });

        await context.addCookies(cred.cookies as Array<{ name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Strict" | "Lax" | "None" }>);
      }
      let page = await context.newPage();

      // 3. Ensure Session (with potential re-login)
      if (onProgress) await onProgress(15, "Verifying session...");
      try {
        const sessionResult = await this.ensureAuthenticatedSession(page);
        if (sessionResult.restarted) {
          // Logic for restarted session handled via exception below
        }
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.message === 'AUTH_REQUIRED' || err.message === 'CAPTCHA_REQUIRED') {

          await browser.close();

          // Launch Headful
          browser = await chromium.launch({ headless: false });
          context = await browser.newContext();
          page = await context.newPage();

          const loginSuccess = await this.performLogin(page, email, password);
          if (!loginSuccess) {
            throw new Error('Re-login failed even in headful mode.');
          }

          // Save new cookies using Repository
          const newCookies = await context.cookies();
          await this.integrationRepo.saveCredentials(userId, 'superbuy', {
            cookies: newCookies,
          });

          // Continue with this headful browser for scraping
        } else {
          throw error;
        }
      }

      // 4. Scrape Data
      if (onProgress) await onProgress(20, "Scraping parcels...");

      // Navigate to parcels list
      await page.goto(SUPERBUY_URLS.PACKAGE_LIST);

      // Parse parcels
      const rawParcels = await parseParcelsPage(page, userId);
      // Clean up parcels data for strict type compliance (null -> undefined)
      const parcels = rawParcels.map(p => ({
        ...p,
        carrier: p.carrier ?? undefined,
        trackingNumber: p.trackingNumber ?? undefined,
        name: p.name ?? undefined,
        weight: p.weight ?? undefined,
        isActive: p.isActive ?? undefined,
        status: p.status ?? undefined
      }));

      const parcelsCount = await this.dataProcessor.processParcels(userId, parcels, onProgress);

      // Parse products (requires reading page body for JSON data)
      if (parcels.length > 0) {
        const bodyText = await page.innerText('body');
        const json = JSON.parse(bodyText.trim());
        const products = await parseProductsFromParcels(json, userId);

        await this.dataProcessor.processProducts(userId, products, onProgress, enrichProducts);
      }

      return {
        success: true,
        message: 'Sync completed',
        data: { parcelsCount, ordersCount: 0 } // Orders scraping temporarily disabled
      };

    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'JOB_CANCELLED') {
        throw error;
      }
      logger.error('[Superbuy] Sync error', { error });
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Ensures the session is authenticated.
   * Throws 'AUTH_REQUIRED' if login page is detected and simple checks fail.
   */
  private async ensureAuthenticatedSession(
    page: Page
  ): Promise<{ restarted: boolean }> {
    try {
      // Use the AJAX check endpoint
      const response = await page.goto(SUPERBUY_URLS.CHECK_LOGIN);
      const body = await response?.text();
      const json = JSON.parse(body || '{}');

      if (json.code === 'fail' || (json.msg && !json.msg.username)) {
        throw new Error('AUTH_REQUIRED');
      }

      if (json.code === 'sucess' && json.msg?.username) {
        return { restarted: false };
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'AUTH_REQUIRED') throw e;
      logger.warn('[Superbuy] check-login failed to parse, falling back to URL check.', { error: e });
    }

    // Fallback: Check if redirected to login page
    if (page.url().includes('login')) {
      throw new Error('AUTH_REQUIRED');
    }

    return { restarted: false };
  }

  private async performLogin(page: Page, email: string, password: string): Promise<boolean> {
    const helper = new PlaywrightHelper(page);
    try {
      await helper.goto(SUPERBUY_URLS.LOGIN, { timeout: BROWSER_CONFIG.LOGIN_TIMEOUT });

      // Fill credentials
      const emailSelector = SUPERBUY_SELECTORS.LOGIN.EMAIL_INPUT.join(',');
      const passwordSelector = SUPERBUY_SELECTORS.LOGIN.PASSWORD_INPUT.join(',');

      await helper.fillWhenVisible(emailSelector, email, { timeout: 10000 });
      await helper.fillWhenVisible(passwordSelector, password);

      await page.waitForTimeout(1000);

      // Submit form
      const submitSelectors = SUPERBUY_SELECTORS.LOGIN.SUBMIT_BUTTON;
      if (!(await helper.clickAny(submitSelectors))) {
        await page.keyboard.press('Enter');
      }

      // Wait for captcha to load after login attempt
      await page.waitForTimeout(BROWSER_CONFIG.CAPTCHA_LOAD_DELAY);

      // Check for login errors
      const errorBoxLocator = page.locator(SUPERBUY_SELECTORS.LOGIN.ERROR_BOX).first();
      let errorText: string | null = null;

      if (await errorBoxLocator.isVisible().catch(() => false)) {
        errorText = (await errorBoxLocator.textContent())?.trim() ?? null;
        if (errorText) {
          const lowerError = errorText.toLowerCase();
          if (lowerError.includes('account does not exist') ||
            lowerError.includes('incorrect password') ||
            lowerError.includes('account is locked')) {
            logger.error('[Superbuy] Fatal login error - aborting');
            return false;
          }
        }
      }

      // Try quick redirect detection first
      let redirected = false;
      try {
        const successSelectors = SUPERBUY_SELECTORS.LOGIN.SUCCESS_INDICATORS.join(',');
        await Promise.race([
          page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: 5000 }),
          page.waitForSelector(successSelectors, { timeout: 5000 }),
        ]);
        redirected = true;
      } catch {
        // No quick redirect
      }

      // Solve captcha if not already redirected
      let captchaResult: 'solved' | 'failed' | 'no-captcha' = 'no-captcha';

      if (!redirected && !errorText) {
        const sessionId = `login - ${Date.now().toString(36)} `;
        const solver = new AdvancedCaptchaSolver(page);
        captchaResult = await solver.solve(sessionId);

        // Check for errors again after captcha attempt
        if (await errorBoxLocator.isVisible().catch(() => false)) {
          errorText = (await errorBoxLocator.textContent())?.trim() ?? null;
          if (errorText) return false;
        }

        if (captchaResult === 'solved') {
          try {
            const successSelectors = SUPERBUY_SELECTORS.LOGIN.SUCCESS_INDICATORS.join(',');
            await Promise.race([
              page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: 60000 }),
              page.waitForSelector(successSelectors, { timeout: 60000 }),
              (async () => {
                const endTime = Date.now() + 60000;
                while (Date.now() < endTime) {
                  if (await errorBoxLocator.isVisible().catch(() => false)) {
                    const err = (await errorBoxLocator.textContent())?.trim() ?? null;
                    if (err) throw new Error(`LOGIN_ERROR: ${err} `);
                  }
                  await page.waitForTimeout(1000);
                }
                throw new Error('TIMEOUT');
              })(),
            ]);
            redirected = true;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.startsWith('LOGIN_ERROR:')) {
              logger.error('[Superbuy] Login error after captcha:', { message: msg.replace('LOGIN_ERROR: ', '') });
              return false;
            }
          }
        }
      }


      // Final check: poll check-login endpoint
      if (!redirected) {
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
          try {
            const res = await page.goto(SUPERBUY_URLS.CHECK_LOGIN, { waitUntil: 'domcontentloaded' });
            const text = await res?.text();
            const json = JSON.parse(text || '{}');
            if (json.code === 'sucess' && json.msg?.username) {
              return true;
            }
          } catch (_e) {
            // ignore
          }
          await page.waitForTimeout(1500);
        }
      }

      if (redirected) {
        return true;
      }

      logger.error('[Superbuy] Login failed: no success confirmation');
      return false;

    } catch (e: unknown) {
      logger.error('[Superbuy] Login exception', { error: e });
      return false;
    }
  }
}
