
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '@/lib/database/database-service';
import { integrationCredentials, products, parcels, type NewParcel, type NewProduct } from '@/lib/database/schema';
import { eq, and, getTableColumns } from 'drizzle-orm';
import { encryptSecret, decryptSecret } from '@/lib/utils/crypto';
import { AdvancedCaptchaSolver } from './advanced-captcha-solver';
import { parseParcelsPage, parseProductsFromParcels } from './parsers';

import { ParcelRepository } from '@/lib/repositories/parcel-repository';
import { ProductEnrichmentService, SuperbuyMetadata } from '@/lib/services/product-enrichment-service';
import { ImageProcessor } from '@/lib/services/image-processor';
import { parallelWithRateLimit } from '@/lib/utils/rate-limiter';
import { logger } from '@/lib/utils/logging/logger';
import { ParsedSuperbuyProduct } from "@/lib/shared/types/superbuy";
import { type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/database/schema";


import { z } from "zod";

const SuperbuyCredentialsSchema = z.object({
  email: z.string().email(),
  encryptedPassword: z.string(),
});

const GeminiCredentialsSchema = z.object({
  apiKey: z.string(),
  model: z.string().optional(),
  confidenceThreshold: z.number().optional(),
  enabled: z.boolean().optional(),
});

interface SuperbuyParcel {
  superbuyId: string;
  trackingNumber?: string | null;
  carrier?: string;
  status?: string;
  weight?: number;
  priceEUR?: number;
}


export class SuperbuyAutomationService {
  private parcelsRepo: ParcelRepository;

  public constructor(parcelsRepo: ParcelRepository) {

    this.parcelsRepo = parcelsRepo;
  }

  /**
   * Connects a user to Superbuy: validates credentials, logs in, and stores encrypted session.
   */
  public async connect(userId: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
    let browser: Browser | null = null;
    try {

      const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;

      // 1. Launch Browser
      browser = await chromium.launch({
        headless: false, // Headful for captcha solving
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

      // 4. Store in DB
      const insertQuery = db.insert(integrationCredentials).values({
        userId,
        provider: 'superbuy',
        credentials: { email, encryptedPassword }, // Store minimal info
        cookies: cookies,
        lastUsedAt: new Date().toISOString(),
      });

      const columns = getTableColumns(integrationCredentials);

      await insertQuery.onConflictDoUpdate({
        target: [columns.userId, columns.provider],
        set: {
          credentials: { email, encryptedPassword },
          cookies: cookies,
          lastUsedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
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
    onProgress?: (progress: number, message: string) => Promise<void>
  ): Promise<{ success: boolean; message: string; data?: { parcelsCount: number; ordersCount: number } }> {
    let browser: Browser | null = null;
    try {
      const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;
      if (onProgress) await onProgress(5, "Connecting to database...");

      // 1. Retrieve Superbuy Credentials (filter by provider to avoid getting Gemini credentials)
      const cred = await db.query.integrationCredentials.findFirst({
        where: and(
          eq(integrationCredentials.userId, userId),
          eq(integrationCredentials.provider, "superbuy")
        ),
      });

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
        const newCred = await db.query.integrationCredentials.findFirst({
          where: eq(integrationCredentials.userId, userId),
        });

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
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        });

        await context.addCookies(cred.cookies as Array<{ name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Strict" | "Lax" | "None" }>);
      }
      let page = await context.newPage();

      // 3. Ensure Session (with potential re-login)
      if (onProgress) await onProgress(15, "Verifying session...");
      try {
        const sessionResult = await this.ensureAuthenticatedSession(page);
        if (sessionResult.restarted) {
          // If session restarted (switched to headful and back or just re-logged in), update references
          // Note: ensureAuthenticatedSession might close the old browser if it needs to switch modes.
          // But here we passed 'context' and 'page'.
          // If it needs to switch to headful, it's complicated because 'browser' is local here.
          // Let's refine ensureAuthenticatedSession to handle the browser lifecycle if needed, 
          // OR return a signal to restart here.

          // Actually, simpler: ensureAuthenticatedSession tries to login on the CURRENT page.
          // If it fails because of captcha needing headful, it throws.
          // Then we catch, close browser, open headful, login, close, open headless, continue.
          // OR we just let ensureAuthenticatedSession handle the login on the current page (headless).
          // If headless login fails (captcha), we are stuck.
          // So we need a mechanism to switch to headful.

          // Let's use the logic from the original code: if login needed, switch to headful.
        }

        // We'll use a modified approach: check session. If invalid, try to login.
        // If login fails (e.g. captcha), throw specific error to trigger headful retry.
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

          // Save new cookies
          const newCookies = await context.cookies();
          await db.update(integrationCredentials)
            .set({ cookies: newCookies, lastUsedAt: new Date().toISOString() })
            .where(eq(integrationCredentials.id, cred.id));

          // Continue with this headful browser (or close and reopen headless? better keep it open to save time)
          // We'll continue with the headful browser for scraping.
        } else {
          throw error;
        }
      }

      // 4. Scrape Data
      if (onProgress) await onProgress(20, "Scraping parcels...");
      // const ordersCount = await this.scrapeOrders(page, userId);
      const ordersCount = 0;
      const parcelsCount = await this.scrapeParcels(page, userId, onProgress);

      return {
        success: true,
        message: 'Sync completed',
        data: { parcelsCount, ordersCount }
      };

    } catch (error: unknown) {
      // Re-throw JOB_CANCELLED to allow proper cancellation flow
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
      // Use the AJAX check endpoint provided by user
      const response = await page.goto('https://www.superbuy.com/ajax/check-login');
      const body = await response?.text();
      const json = JSON.parse(body || '{}');

      // Expected: {"code":"sucess","is_opening":false,"msg":{"username":"Flavio_59",...}}
      // Failure: {"code":"fail","is_opening":false,"msg":{"cart_num":0}}

      if (json.code === 'fail' || (json.msg && !json.msg.username)) {

        throw new Error('AUTH_REQUIRED');
      }

      if (json.code === 'sucess' && json.msg?.username) {

        return { restarted: false };
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'AUTH_REQUIRED') throw e;
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
    try {
      const loginUrl = 'https://www.superbuy.com/en/page/login/';

      await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // EXACT LOGIC FROM HEADFUL SCRIPT
      await page.waitForSelector('input[type="text"], input[type="email"], input[name="email"], #email', { timeout: 10000 });
      await page.fill('input[type="text"], input[type="email"], input[name="email"], #email', email);
      await page.fill('input[type="password"], input[name="password"], #password', password);

      await page.waitForTimeout(1000);

      // EXACT SELECTORS FROM HEADFUL SCRIPT
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
        try {
          const isVisible = await btn.isVisible();
          if (isVisible) {

            await btn.click({ force: true });
            clicked = true;
            break;
          }
        } catch (_e) {
          // try next selector
        }
      }

      if (!clicked) {

        await page.keyboard.press('Enter');
      }

      // CRITICAL: Wait for captcha to load after login attempt
      const CAPTCHA_LOAD_DELAY_MS = 3000;

      await page.waitForTimeout(CAPTCHA_LOAD_DELAY_MS);


      // Check for login errors BEFORE attempting captcha solve
      const errorBoxLocator = page.locator('.error-box').first();
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
        await Promise.race([
          page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: 5000 }),
          page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: 5000 }),
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
          if (errorText) {
            return false;
          }
        }

        if (captchaResult === 'solved') {
          try {
            await Promise.race([
              page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: 60000 }),
              page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: 60000 }),
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
            const res = await page.goto('https://www.superbuy.com/ajax/check-login', { waitUntil: 'domcontentloaded' });
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

      // console.error('[Superbuy] Login failed: no success confirmation');
      logger.error('[Superbuy] Login failed: no success confirmation');

      return false;

    } catch (e: unknown) {
      logger.error('[Superbuy] Login exception', { error: e });

      try {
        const debugDir = path.resolve(process.cwd(), 'superbuy-debug');
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        await page.screenshot({ path: path.join(debugDir, `error - ${Date.now()}.png`), fullPage: true });
      } catch { }

      return false;
    }
  }



  private async scrapeParcels(page: Page, userId: string, onProgress?: (p: number, m: string) => Promise<void>): Promise<number> {

    // Use the URL provided by user for parcels JSON
    await page.goto('https://front.superbuy.com/package/package/list');

    const parcels = await parseParcelsPage(page, userId);

    if (parcels.length > 0) {
      if (onProgress) await onProgress(30, `Found ${parcels.length} parcels.Saving...`);
      await this.parcelsRepo.upsertMany(parcels as NewParcel[]);
      await this.syncParcelsToLegacy(userId, parcels, onProgress);

      // IMPORTANT: Sync products AFTER parcels so parcelleId references exist

      const bodyText = await page.innerText('body');
      const json = JSON.parse(bodyText.trim());
      const products = await parseProductsFromParcels(json, userId);

      if (products.length > 0) {
        if (onProgress) await onProgress(40, `Found ${products.length} products.Syncing...`);
        await this.syncProductsFromParcels(userId, products, onProgress);
      }
    }

    return parcels.length;
  }




  private async syncParcelsToLegacy(userId: string, newParcels: SuperbuyParcel[], onProgress?: (p: number, m: string) => Promise<void>) {
    const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;
    const totalParcels = newParcels.length;

    for (let i = 0; i < totalParcels; i++) {
      const parcel = newParcels[i];

      if (onProgress) {
        // Progress from 30% to 40%
        const percent = 30 + Math.floor((i / totalParcels) * 10);
        try {
          await onProgress(percent, `Synchronisation parcelle ${i + 1}/${totalParcels}: ${parcel.trackingNumber || parcel.superbuyId}`);
        } catch (progressError) {
          // Re-throw JOB_CANCELLED to stop the sync
          if (progressError instanceof Error && progressError.message === 'JOB_CANCELLED') {
            throw progressError;
          }
        }
      }

      const existingParcel = await db.query.parcels.findFirst({
        where: and(
          eq(parcels.userId, userId),
          eq(parcels.superbuyId, parcel.superbuyId)
        )
      });

      // Use the priceEUR we attached in the parser if available
      const totalPrice = parcel.priceEUR || 0;
      const weight = parcel.weight || 0;

      // Calculate prix par gramme (price per gram)
      const pricePerGram = weight > 0 && totalPrice > 0 ? totalPrice / weight : 0;

      // Map status if needed (legacy mapping or direct enum)
      // Assuming this.mapStatus returns valid ParcelStatus (English) or we might need to adjust it
      const status = this.mapStatus(parcel.status || '');

      const parcelData = {
        userId,
        superbuyId: parcel.superbuyId,
        trackingNumber: parcel.trackingNumber || null, // Convert undefined to null for SQLite
        carrier: parcel.carrier || 'Unknown',
        name: parcel.trackingNumber || `Colis ${parcel.superbuyId}`,
        weight,
        status, // English status
        totalPrice,
        pricePerGram,
        isActive: 1, // Use integer for SQLite boolean
        updatedAt: new Date().toISOString()
      };

      if (existingParcel) {
        await db.update(parcels)
          .set(parcelData)
          .where(eq(parcels.id, existingParcel.id));
      } else {
        await db.insert(parcels).values({
          ...parcelData,
          createdAt: new Date().toISOString()
        } as NewParcel);
      }
    }
  }

  private async syncProductsFromParcels(userId: string, productsList: ParsedSuperbuyProduct[], onProgress?: (p: number, m: string) => Promise<void>) {
    const db = await databaseService.getDb() as BetterSQLite3Database<typeof schema>;

    // 1. Initialize Enrichment Service if enabled
    let enrichmentService: ProductEnrichmentService | null = null;
    let confidenceThreshold = 0.9;
    try {
      const cred = await db.query.integrationCredentials.findFirst({
        where: (t, { eq, and }) => and(
          eq(t.userId, userId),
          eq(t.provider, "gemini")
        )
      });

      if (cred && cred.credentials) {
        const validation = GeminiCredentialsSchema.safeParse(cred.credentials);

        if (validation.success && validation.data.enabled && validation.data.apiKey) {
          const credentials = validation.data;
          const apiKey = await decryptSecret(credentials.apiKey, userId);
          const model = credentials.model || "gemini-2.0-flash";
          confidenceThreshold = credentials.confidenceThreshold ?? 0.9;
          enrichmentService = new ProductEnrichmentService(apiKey, model);
        }
      }
    } catch (e: unknown) {
      logger.error("Failed to initialize enrichment service", { error: e });
    }

    // Collect products that need enrichment for parallel processing
    interface EnrichmentTask {
      productId: string;
      name: string;
      photoUrls: string[];
      superbuyMetadata?: SuperbuyMetadata;
    }
    const enrichmentTasks: EnrichmentTask[] = [];
    const totalProducts = productsList.length;

    for (let i = 0; i < totalProducts; i++) {
      const product = productsList[i];
      try {
        if (onProgress) {
          // Calculate progress between 40% and 90%
          const percent = 40 + Math.floor((i / totalProducts) * 50);
          await onProgress(percent, `Traitement produit ${i + 1}/${totalProducts}: ${product.name.substring(0, 30)}...`);
        }

        // Find the corresponding parcelle by numero (packageNo)
        const parcel = await db.query.parcels.findFirst({
          where: and(
            eq(parcels.userId, userId),
            eq(parcels.superbuyId, product.parcelleId) // assuming product.parcelleId is the superbuy ID here
          )
        });

        if (!parcel) {
          // console.warn(`[Superbuy][Products] Parcel not found for packageNo: ${product.parcelleId}`);
          logger.warn(`[Superbuy][Products] Parcel not found for packageNo: ${product.parcelleId}`);
          continue;
        }        // Use externalId (itemBarcode) as unique identifier
        const externalId = product.externalId;
        if (!externalId) continue;

        const existingProduct = await db.query.products.findFirst({
          where: and(
            eq(products.userId, userId),
            eq(products.externalId, externalId)
          )
        });

        // Current product info
        let name = product.name;
        let url = product.url;
        let enrichmentData = null;
        let enrichedDescription = ''; // For AI-generated description

        // Perform Enrichment if enabled and (new product OR force update needed)
        // For now, only for new products or if existing product is "Unknown" to save costs/time
        // Or if the name looks like a barcode (common in Superbuy)
        // Adjust logic as needed. User requirement: "occur during the Superbuy synchronization"
        // We do it for every sync if service is active.

        // Track enriched brand/category for use in productData
        let enrichedBrand = product.brand;
        let enrichedCategory = product.category;
        let enrichedSubcategory = product.subcategory;

        if (enrichmentService) {
          // Skip enrichment if already marked as 'done' to avoid redundant API calls
          const existingStatus = existingProduct?.enrichmentData?.enrichmentStatus;
          const needsEnrichment = !existingProduct
            || !existingProduct.enrichmentData
            || existingStatus === 'failed'
            || existingStatus === 'pending';

          if (needsEnrichment) {
            // Mark as pending - enrichment will be done in parallel after all products are synced
            enrichmentData = {
              enrichmentStatus: 'pending',
              enrichedAt: new Date().toISOString(),
            };
            // Task will be collected after we have the product ID
          } else if (existingProduct && existingProduct.enrichmentData) {
            // Preserve existing enrichment data if we are just updating status
            enrichmentData = existingProduct.enrichmentData;
            // Preserve name if we are not re-enriching?
            // If we don't re-enrich, we should probably keep the existing name from DB if it was enriched.
            // But here `name` comes from `product.name` which is from Superbuy parser.
            // If Superbuy parser still returns the generic name, we don't want to overwrite the enriched name.
            name = existingProduct.name;
            url = existingProduct.url || url;
            enrichedDescription = existingProduct.description || '';
            // Preserve enriched brand/category
            enrichedBrand = existingProduct.brand || enrichedBrand;
            enrichedCategory = existingProduct.category || enrichedCategory;
            enrichedSubcategory = existingProduct.subcategory || enrichedSubcategory;
          }
        }

        // Process images with ImageProcessor to fix rotation issues
        let processedPhotoUrls: string[] = [];
        let processedPhotoUrl: string | undefined = undefined;

        try {
          const imageProcessor = ImageProcessor.getInstance();
          // Collect all available URLs
          const rawUrls: string[] = product.photoUrls && product.photoUrls.length > 0
            ? product.photoUrls
            : (product.photoUrl ? [product.photoUrl] : []);

          if (rawUrls.length > 0) {
            // Process in parallel
            const processPromises = rawUrls.map((url, index) =>
              imageProcessor.downloadAndOrientImage(url, userId, externalId, index)
            );

            const results = await Promise.all(processPromises);
            processedPhotoUrls = results.filter(Boolean) as string[];

            if (processedPhotoUrls.length > 0) {
              processedPhotoUrl = processedPhotoUrls[0];
            }
          }
        } catch (e: unknown) {
          logger.error(`[Superbuy] Failed to process images for product ${externalId}`, { error: e });
          // Fallback to original URLs on failure
          processedPhotoUrls = product.photoUrls;
          processedPhotoUrl = product.photoUrl;
        }

        const productData = {
          userId,
          name: name,
          description: enrichedDescription || product.subcategory || '', // Use enriched description
          brand: enrichedBrand || null, // Convert undefined to null for SQLite
          category: enrichedCategory || null,
          subcategory: enrichedSubcategory || null,
          photoUrl: processedPhotoUrl || product.photoUrl || null,
          photoUrls: processedPhotoUrls.length > 0 ? processedPhotoUrls : (product.photoUrls || null), // Use processed or original or null
          price: product.price ?? 0,
          poids: product.poids ?? 0,
          parcelId: parcel.id, // Link to the actual parcelle ID (not packageNo)
          status: product.status || 'pending',
          externalId,
          url: url || null,
          currency: product.currency || null,
          plateforme: product.plateforme || null,
          enrichmentData: enrichmentData || null,
          updatedAt: new Date().toISOString()
        };

        let savedProductId: string | null = null;

        if (existingProduct) {
          await db.update(products)
            .set(productData as Partial<NewProduct>)
            .where(eq(products.id, existingProduct.id));
          savedProductId = existingProduct.id;
        } else {
          const result = await db.insert(products).values({
            ...productData,
            createdAt: new Date().toISOString()
          } as NewProduct).returning({ id: products.id });
          savedProductId = result[0]?.id || null;
        }

        // Collect enrichment task if product needs enrichment
        if (enrichmentService && enrichmentData?.enrichmentStatus === 'pending' && savedProductId) {
          enrichmentTasks.push({
            productId: savedProductId,
            name: product.name,
            // Use locally processed images (accessible) instead of remote Superbuy URLs (may fail)
            photoUrls: processedPhotoUrls.length > 0 ? processedPhotoUrls : (product.photoUrls || [product.photoUrl].filter(Boolean)),
            // Pass Superbuy metadata (goodsName, itemRemark) for LLM context
            superbuyMetadata: product.superbuyMetadata || undefined,
          });
        }
      } catch (_e) {
        // console.error('[Superbuy][Products] Error syncing product:', e);
      }
    }

    // ========================================================================
    // PHASE 2: Execute enrichment in parallel with rate limiting
    // ========================================================================
    if (enrichmentService && enrichmentTasks.length > 0) {
      logger.info(`[Superbuy][Enrichment] Starting parallel enrichment for ${enrichmentTasks.length} products`);
      if (onProgress) await onProgress(60, `Enriching ${enrichmentTasks.length} products...`);

      let completedCount = 0;
      let isCancelled = false;
      const totalEnrichmentTasks = enrichmentTasks.length;

      const tasks = enrichmentTasks.map((task) => async () => {
        // Check if cancelled before starting task
        if (isCancelled) {
          return { success: false, productId: task.productId, skipped: true };
        }

        try {
          // Check if product still exists (it might have been deleted by user during sync)
          const exists = await db.query.products.findFirst({
            where: eq(products.id, task.productId),
            columns: { id: true }
          });

          if (!exists) {
            logger.info(`[Superbuy] Product ${task.productId} deleted, skipping enrichment`);
            return { success: false, productId: task.productId, skipped: true };
          }

          // Pass Superbuy metadata (description/specs) for additional LLM context
          const res = await enrichmentService!.enrichProduct(task.name, task.photoUrls, task.superbuyMetadata);

          // Apply confidence threshold from settings
          const isLowConfidence = res.confidence < confidenceThreshold;

          // If low confidence, mark as conflict so user can resolve
          if (isLowConfidence) {
            // Create a candidate from the enrichment result
            const candidate = {
              id: crypto.randomUUID(),
              name: res.name,
              brand: res.brand,
              category: res.category,
              url: res.url,
              confidence: res.confidence,
              imageUrl: task.photoUrls[0] || undefined,
              description: res.description,
            };

            await db.update(products)
              .set({
                // Keep original name for conflict products
                enrichmentData: {
                  confidence: res.confidence,
                  originalUrl: res.url,
                  source: res.source,
                  modelUsed: enrichmentService.currentModelName || 'unknown',
                  enrichedAt: new Date().toISOString(),
                  enrichmentStatus: 'conflict',
                  vintedBrandId: res.vintedBrandId,
                  vintedCatalogId: res.vintedCatalogId,
                  productCode: res.productCode,
                  retailPrice: res.retailPrice,
                  color: res.color,
                  size: res.size,
                  generatedDescription: res.description,
                  // Store as single candidate for user to validate/reject
                  candidates: [candidate],
                },
                updatedAt: new Date().toISOString()
              })
              .where(eq(products.id, task.productId));

            return { success: true, productId: task.productId, conflict: true };
          }

          // High confidence: apply the enrichment directly
          await db.update(products)
            .set({
              name: res.name,
              brand: res.brand || undefined,
              category: res.category || undefined,
              subcategory: res.subcategory || undefined,
              url: res.url && res.url.startsWith('http') ? res.url : undefined,
              description: res.description || undefined,
              enrichmentData: {
                confidence: res.confidence,
                originalUrl: res.url,
                source: res.source,
                modelUsed: enrichmentService.currentModelName || 'unknown',
                enrichedAt: new Date().toISOString(),
                enrichmentStatus: 'done',
                vintedBrandId: res.vintedBrandId,
                vintedCatalogId: res.vintedCatalogId,
                productCode: res.productCode,
                retailPrice: res.retailPrice,
                color: res.color,
                size: res.size,
                generatedDescription: res.description
              },
              updatedAt: new Date().toISOString()
            })
            .where(eq(products.id, task.productId));

          return { success: true, productId: task.productId };
        } catch (error) {
          // Check if this is a cancellation
          if (error instanceof Error && error.message === 'JOB_CANCELLED') {
            isCancelled = true;
            throw error; // Re-throw to stop processing
          }

          // Mark as failed
          await db.update(products)
            .set({
              enrichmentData: {
                enrichmentStatus: 'failed',
                enrichedAt: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
              },
              updatedAt: new Date().toISOString()
            })
            .where(eq(products.id, task.productId));

          return { success: false, productId: task.productId, error };
        } finally {
          completedCount++;
          if (onProgress && !isCancelled) {
            const percentage = 60 + Math.floor((completedCount / totalEnrichmentTasks) * 30);
            try {
              await onProgress(percentage, `Enriching product ${completedCount}/${totalEnrichmentTasks}...`);
            } catch (progressError) {
              if (progressError instanceof Error && progressError.message === 'JOB_CANCELLED') {
                isCancelled = true;
                throw progressError;
              }
            }
          }
        }
      });

      // Create abort signal object that tasks can check and set
      const abortSignal = { aborted: isCancelled };

      // Execute in parallel with rate limiting (max 3 concurrent, 500ms delay)
      const { aborted, errors } = await parallelWithRateLimit(tasks, {
        maxConcurrent: 3,
        delayBetweenMs: 500,
        continueOnError: true,
        abortSignal,
      });

      // Check if cancellation occurred
      if (aborted || abortSignal.aborted) {
        throw new Error('JOB_CANCELLED');
      }

      const failedCount = errors.filter(e => e !== null).length;
      logger.info(`[Superbuy][Enrichment] Completed: ${enrichmentTasks.length - failedCount} succeeded, ${failedCount} failed`);
    }
  }


  private mapStatus(status: string): string {
    const s = status.toLowerCase().trim();

    // En attente
    if (['payment pending', 'payment verification', 'review pending', 'verified', 'waiting packing'].includes(s)) {
      return 'En attente';
    }

    // En transit
    if (['packing', 'packaging completed', 'shipped'].includes(s)) {
      return 'En transit';
    }

    // Livré
    if (['received'].includes(s)) {
      return 'Livré';
    }

    // Retourné
    if (['returned', 'returned by chinese customs', 'returned by customs'].includes(s)) {
      return 'Retourné';
    }

    // Perdu
    if (['cancelled'].includes(s)) {
      return 'Perdu';
    }

    // Fallback heuristics if exact match fails
    if (s.includes('ship') || s.includes('transit')) return 'En transit';
    if (s.includes('deliver') || s.includes('sign') || s.includes('received')) return 'Livré';
    if (s.includes('return')) return 'Retourné';
    if (s.includes('cancel') || s.includes('lost')) return 'Perdu';

    return 'En attente';
  }
}
