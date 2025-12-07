import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '@/lib/database/database-service';
import { integrationCredentials, parcels, products, parcelles } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { encryptSecret, decryptSecret } from '@/lib/utils/crypto';
import { AdvancedCaptchaSolver } from './advanced-captcha-solver';
import { parseParcelsPage, parseProductsFromParcels } from './parsers';

import { ParcelsRepository } from '@/lib/repositories/parcels-repository';



export class SuperbuyAutomationService {
  private static instance: SuperbuyAutomationService;
  // private ordersRepo: OrderRepository;
  private parcelsRepo: ParcelsRepository;

  private constructor() {
    // this.ordersRepo = new OrderRepository(databaseService);
    this.parcelsRepo = new ParcelsRepository(parcels, databaseService);
  }

  public static getInstance(): SuperbuyAutomationService {
    if (!SuperbuyAutomationService.instance) {
      SuperbuyAutomationService.instance = new SuperbuyAutomationService();
    }
    return SuperbuyAutomationService.instance;
  }

  /**
   * Connects a user to Superbuy: validates credentials, logs in, and stores encrypted session.
   */
  public async connect(userId: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
    let browser: Browser | null = null;
    try {

      const db = await databaseService.getDb();

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
      await db.insert(integrationCredentials).values({
        userId,
        provider: 'superbuy',
        credentials: { email, encryptedPassword }, // Store minimal info
        cookies: cookies,
        lastUsedAt: new Date().toISOString(),
      }).onConflictDoUpdate({
        target: [integrationCredentials.userId, integrationCredentials.provider],
        set: {
          credentials: { email, encryptedPassword },
          cookies: cookies,
          lastUsedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      return { success: true, message: 'Connected successfully' };

    } catch (error) {
      // console.error('[Superbuy] Connect error:', error);
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
    credentials?: { email?: string; password?: string }
  ): Promise<{ success: boolean; message: string; data?: { parcelsCount: number; ordersCount: number } }> {
    let browser: Browser | null = null;
    try {
      const db = await databaseService.getDb();
      // 1. Retrieve Credentials
      const cred = await db.query.integrationCredentials.findFirst({
        where: eq(integrationCredentials.userId, userId),
      });

      let email: string;
      let password: string;
      let context: BrowserContext;

      if (!cred || !cred.credentials || !cred.cookies) {
        // No stored credentials - check if new ones were provided

        if (!credentials?.email || !credentials?.password) {
          // console.error('[Superbuy] Cannot proceed: no stored session and no credentials provided');
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

        const { email: storedEmail, encryptedPassword } = newCred.credentials as any;
        email = storedEmail;
        password = await decryptSecret(encryptedPassword, userId);

        // Use new cookies from the connect process
        const newCookies = newCred.cookies as any[];

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
        const { email: storedEmail, encryptedPassword } = cred.credentials as any;
        email = storedEmail;
        password = await decryptSecret(encryptedPassword, userId);

        // 2. Launch Browser with Cookies (Headless initially)
        browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
        });

        context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        });

        await context.addCookies(cred.cookies as any[]);
      }
      let page = await context.newPage();

      // 3. Ensure Session (with potential re-login)
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
      } catch (error: any) {
        if (error.message === 'AUTH_REQUIRED' || error.message === 'CAPTCHA_REQUIRED') {

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
      // const ordersCount = await this.scrapeOrders(page, userId);
      const ordersCount = 0;
      const parcelsCount = await this.scrapeParcels(page, userId);

      return {
        success: true,
        message: 'Sync completed',
        data: { parcelsCount, ordersCount }
      };

    } catch (error) {
      // console.error('[Superbuy] Sync error:', error);
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
    } catch (e: any) {
      if (e.message === 'AUTH_REQUIRED') throw e;
      // console.warn('[Superbuy] check-login failed to parse, falling back to URL check.', e);
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
          // console.error('[Superbuy] Login error detected:', errorText);

          // Check for fatal errors
          const lowerError = errorText.toLowerCase();
          if (lowerError.includes('account does not exist') ||
            lowerError.includes('incorrect password') ||
            lowerError.includes('account is locked')) {
            // console.error('[Superbuy] Fatal login error - aborting');
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

        const sessionId = `login-${Date.now().toString(36)}`;
        const solver = new AdvancedCaptchaSolver(page);
        captchaResult = await solver.solve(sessionId);


        // Check for errors again after captcha attempt
        if (await errorBoxLocator.isVisible().catch(() => false)) {
          errorText = (await errorBoxLocator.textContent())?.trim() ?? null;
          if (errorText) {
            // console.error('[Superbuy] Error appeared after captcha:', errorText);
            return false;
          }
        }

        if (captchaResult === 'solved') {

          try {
            await Promise.race([
              page.waitForURL((u: URL) => !u.toString().includes('/login'), { timeout: 60000 }),
              page.waitForSelector('[data-user], .user-menu, .account-menu', { timeout: 60000 }),
              (async () => {
                // Check for error every 1 second
                const endTime = Date.now() + 60000;
                while (Date.now() < endTime) {
                  if (await errorBoxLocator.isVisible().catch(() => false)) {
                    const err = (await errorBoxLocator.textContent())?.trim() ?? null;
                    if (err) throw new Error(`LOGIN_ERROR: ${err}`);
                  }
                  await page.waitForTimeout(1000);
                }
                throw new Error('TIMEOUT');
              })(),
            ]);
            redirected = true;

          } catch (e: any) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.startsWith('LOGIN_ERROR:')) {
              // console.error('[Superbuy] Login error after captcha:', msg.replace('LOGIN_ERROR: ', ''));
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

      // Save debug screenshot
      try {
        const debugDir = path.resolve(process.cwd(), 'superbuy-debug');
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        const filename = `login-fail-${Date.now()}.png`;
        const filepath = path.join(debugDir, filename);
        await page.screenshot({ path: filepath, fullPage: true });

      } catch { }

      return false;

    } catch (_e) {
      // console.error('[Superbuy] Login exception:', e);

      try {
        const debugDir = path.resolve(process.cwd(), 'superbuy-debug');
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        await page.screenshot({ path: path.join(debugDir, `error-${Date.now()}.png`), fullPage: true });
      } catch { }

      return false;
    }
  }

  /*
  private async _scrapeOrders(page: Page, userId: string): Promise<number> {

    // Use the URL that returns JSON (implied by user providing page_order.json)
    // If this is an API endpoint, page.goto will display the JSON
    await page.goto('https://www.superbuy.com/order');

    // Parse current page
    const orders = await parseOrdersPage(page, userId);

    if (orders.length > 0) {
      await this.ordersRepo.upsertMany(orders);
      await this.syncOrdersToProducts(userId, orders);
    }

    // Note: Pagination logic removed as we are likely consuming a JSON API response 
    // that might contain all orders or we don't have the pagination parameters yet.
    // If the JSON contains pagination info (e.g. totalCount), we can add loop later.

    return orders.length;
  }
  */

  private async scrapeParcels(page: Page, userId: string): Promise<number> {

    // Use the URL provided by user for parcels JSON
    await page.goto('https://front.superbuy.com/package/package/list');

    const parcels = await parseParcelsPage(page, userId);

    if (parcels.length > 0) {
      await this.parcelsRepo.upsertMany(parcels);
      await this.syncParcelsToLegacy(userId, parcels);

      // IMPORTANT: Sync products AFTER parcels so parcelleId references exist

      const bodyText = await page.innerText('body');
      const json = JSON.parse(bodyText.trim());
      const products = await parseProductsFromParcels(json, userId);

      if (products.length > 0) {
        await this.syncProductsFromParcels(userId, products);
      }
    }

    return parcels.length;
  }

  /*
  private async syncOrdersToProducts(userId: string, newOrders: any[]) {
    const db = await databaseService.getDb();

    for (const order of newOrders) {
      if (!order.items || !Array.isArray(order.items)) continue;

      for (const item of order.items) {
        // Use goodsCode or itemBarcode or generate a unique ID based on order + index/name
        // Fallback to a composite key string if no unique ID
        const externalId = item.goodsCode || item.itemBarcode || `${order.superbuyId}-${item.sku || item.name}`;

        if (!externalId) continue;

        // Check if product exists
        const existingProduct = await db.query.products.findFirst({
          where: and(
            eq(products.userId, userId),
            eq(products.externalId, externalId)
          )
        });

        const productData = {
          userId,
          name: item.name || 'Unknown Item',
          price: parseFloat(item.price) || 0,
          currency: order.currency || 'CNY',
          photoUrl: item.image,
          url: item.url,
          poids: parseFloat(item.weight) || 0,
          externalId,
          plateforme: 'autre' as const,
          status: 'available' as const,
          brand: 'Superbuy',
          updatedAt: new Date().toISOString()
        };

        if (existingProduct) {
          await db.update(products)
            .set(productData)
            .where(eq(products.id, existingProduct.id));
        } else {
          await db.insert(products).values({
            ...productData,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  }
  */

  private async syncParcelsToLegacy(userId: string, newParcels: any[]) {
    const db = await databaseService.getDb();

    for (const parcel of newParcels) {
      const existingParcelle = await db.query.parcelles.findFirst({
        where: and(
          eq(parcelles.userId, userId),
          eq(parcelles.numero, parcel.superbuyId)
        )
      });

      // Use the priceEUR we attached in the parser if available
      const priceTotal = (parcel as any).priceEUR || 0;
      const weight = parcel.weight || 0;

      // Calculate prix par gramme (price per gram)
      const prixParGramme = weight > 0 && priceTotal > 0 ? priceTotal / weight : null;

      const parcelleData = {
        userId,
        numero: parcel.superbuyId,
        numero_suivi: parcel.trackingNumber,
        transporteur: parcel.carrier || 'Unknown',
        nom: parcel.trackingNumber || `Colis ${parcel.superbuyId}`, // Update name with tracking number
        poids: weight,
        statut: this.mapStatus(parcel.status || ''),
        prixTotal: priceTotal, // Store the converted price
        prixAchat: priceTotal, // Store as purchase price too per user request
        prixParGramme, // Calculate price per gram automatically
        actif: 1, // Ensure the parcel is visible
        updatedAt: new Date().toISOString()
      };

      if (existingParcelle) {
        await db.update(parcelles)
          .set(parcelleData)
          .where(eq(parcelles.id, existingParcelle.id));
      } else {
        await db.insert(parcelles).values({
          ...parcelleData,
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  private async syncProductsFromParcels(userId: string, productsList: any[]) {
    const db = await databaseService.getDb();


    for (const product of productsList) {
      try {
        // Find the corresponding parcelle by numero (packageNo)
        const parcelle = await db.query.parcelles.findFirst({
          where: and(
            eq(parcelles.userId, userId),
            eq(parcelles.numero, product.parcelleId)
          )
        });

        if (!parcelle) {
          // console.warn(`[Superbuy][Products] Parcelle not found for packageNo: ${product.parcelleId}`);
          continue;
        }

        // Use externalId (itemBarcode) as unique identifier
        const externalId = product.externalId;
        if (!externalId) continue;

        const existingProduct = await db.query.products.findFirst({
          where: and(
            eq(products.userId, userId),
            eq(products.externalId, externalId)
          )
        });

        const productData = {
          userId,
          name: product.name,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          photoUrl: product.photoUrl,
          price: product.price,
          poids: product.poids,
          parcelleId: parcelle.id, // Link to the actual parcelle ID (not packageNo)
          status: product.status,
          externalId,
          url: product.url,
          currency: product.currency,
          plateforme: product.plateforme,
          updatedAt: new Date().toISOString()
        };

        if (existingProduct) {
          await db.update(products)
            .set(productData)
            .where(eq(products.id, existingProduct.id));
        } else {
          await db.insert(products).values({
            ...productData,
            createdAt: new Date().toISOString()
          });
        }
      } catch (_e) {
        // console.error('[Superbuy][Products] Error syncing product:', e);
      }
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
