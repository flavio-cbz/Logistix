/**
 * Service complet de synchronisation Superbuy avec extraction en temps réel
 * POST /api/v1/sync/superbuy/live
 * 
 * Flow:
 * 1. Vérifie session Superbuy
 * 2. Si invalide, demande reconnexion
 * 3. Lance extraction Puppeteer
 * 4. Synchronise les données
 * 5. Retourne résultats
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { serviceContainer } from '@/lib/services/container';
// import { SuperbuySyncService } from '@/lib/integrations/superbuy/sync-service';
// import { DatabaseService } from '@/lib/database';
// import { ParcelleService } from '@/lib/services/parcelle-service';
// import { ParcelleRepository } from '@/lib/repositories/parcelle-repository';
import { logger } from '@/lib/utils/logging/logger';
import * as fs from 'fs';
import * as path from 'path';
import { SUPERBUY_TIMEOUTS, SUPERBUY_PAGINATION } from '@/lib/services/superbuy/constants';
import { type Browser, type BrowserContext } from 'playwright';

interface SyncStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  timestamp: string;
}

class NeedsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NeedsAuthError';
  }
}

import { type SuperbuyParcelData } from '@/lib/shared/types/superbuy';

export async function POST(req: NextRequest) {
  const steps: SyncStep[] = [];
  const logStep = (step: string, status: SyncStep['status'], message: string) => {
    const stepLog: SyncStep = {
      step,
      status,
      message,
      timestamp: new Date().toISOString(),
    };
    steps.push(stepLog);
    logger.info(`[Superbuy Live Sync] ${step}: ${message}`, { status });

  };

  try {
    logStep('auth', 'running', 'Vérification de l\'authentification LogistiX');

    // 1. Authentification LogistiX
    const { user } = await requireAuth(req);
    logStep('auth', 'success', `Utilisateur authentifié: ${user.id}`);

    // 2. Vérifier si session Superbuy existe et est valide
    logStep('superbuy-session', 'running', 'Vérification de la session Superbuy');

    const sessionValid = await checkSuperbuySession();


    if (!sessionValid) {
      logStep('superbuy-session', 'error', 'Session Superbuy invalide ou expirée');

      return NextResponse.json({
        success: false,
        needsAuth: true,
        message: 'Connexion à Superbuy requise',
        steps,
        authUrl: '/api/v1/superbuy/auth/init', // URL pour initialiser OAuth
      }, { status: 401 });
    }

    logStep('superbuy-session', 'success', 'Session Superbuy valide');

    // 3. Lancer l'extraction Puppeteer
    logStep('extraction', 'running', 'Lancement de l\'extraction des données Superbuy');

    let extractedData: SuperbuyParcelData[];
    try {
      extractedData = await runSuperbuyExtraction();
      logStep('extraction', 'success', `${extractedData.length} parcelles extraites`);
    } catch (extractError) {
      if (extractError instanceof NeedsAuthError) {
        logStep('extraction', 'error', extractError.message);
        return NextResponse.json({
          success: false,
          needsAuth: true,
          message: 'Connexion à Superbuy requise (session invalide pendant l\'extraction)',
          steps,
          authUrl: '/api/v1/superbuy/auth/init',
        }, { status: 401 });
      }
      logStep('extraction', 'error', `Échec extraction: ${extractError instanceof Error ? extractError.message : 'Erreur inconnue'}`);
      throw new Error('Échec de l\'extraction des données Superbuy');
    }

    if (extractedData.length === 0) {
      logStep('extraction', 'error', 'Aucune parcelle trouvée sur Superbuy');
      return NextResponse.json({
        success: false,
        message: 'Aucune parcelle trouvée sur votre compte Superbuy',
        steps,
      }, { status: 404 });
    }

    // 4. Sauvegarder dans extracted_data (backup)
    logStep('save', 'running', 'Sauvegarde des données extraites');

    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `parcels_${timestamp}.json`;
      const extractedDataDir = path.resolve(process.cwd(), 'extracted_data');

      if (!fs.existsSync(extractedDataDir)) {
        fs.mkdirSync(extractedDataDir, { recursive: true });
      }

      const filePath = path.join(extractedDataDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(extractedData, null, 2));

      logStep('save', 'success', `Données sauvegardées: ${filename}`);
    } catch (saveError) {
      logStep('save', 'error', `Échec sauvegarde: ${saveError instanceof Error ? saveError.message : 'Erreur inconnue'}`);
      // Non bloquant, on continue
    }

    // 5. Synchroniser avec la base de données
    logStep('sync', 'running', 'Synchronisation avec la base de données');

    // Utilisation du conteneur de services
    const syncService = serviceContainer.getSuperbuySyncService();

    // syncParcels attend (userId, parcels, options)
    const result = await syncService.syncParcels(user.id, extractedData, {
      skipExisting: true,
      forceUpdate: false,
    });

    logStep('sync', 'success', `Sync terminée: ${result.created} créées, ${result.updated} mises à jour, ${result.skipped} ignorées, ${result.failed} échecs`);

    // 6. Retourner les résultats
    return NextResponse.json({
      success: true,
      message: 'Synchronisation complète réussie',
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      totalExtracted: extractedData.length,
      steps,
    });

  } catch (error: unknown) {
    logStep('error', 'error', error instanceof Error ? error.message : 'Erreur inconnue');

    logger.error('[Superbuy Live Sync] Fatal error', { error, steps });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
      steps,
    }, { status: 500 });
  }
}

/**
 * Vérifie si la session Superbuy est valide
 */
async function checkSuperbuySession(): Promise<boolean> {
  try {
    logger.info('[Session Check] Vérification du fichier auth_state.json');

    const rootPath = path.resolve(process.cwd(), 'auth_state.json');
    const scriptsPath = path.resolve(process.cwd(), 'scripts', 'superbuy', 'auth_state.json');
    const authStatePath = fs.existsSync(scriptsPath) ? scriptsPath : rootPath;

    if (!fs.existsSync(authStatePath)) {
      logger.warn('[Session Check] ❌ Fichier auth_state.json introuvable');
      return false;
    }

    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));
    logger.info('[Session Check] État d\'auth chargé:', {
      hasCookies: !!authState.cookies,
      cookieCount: authState.cookies?.length || 0,
      timestamp: authState.timestamp
    });

    if (!authState.cookies || authState.cookies.length === 0) {
      logger.warn('[Session Check] ❌ Aucun cookie trouvé');
      return false;
    }

    // Vérifier si les cookies ont expiré (> 24h) via timestamp ou mtime
    const now = new Date();
    let hoursSinceAuth: number;
    if (authState.timestamp) {
      const timestamp = new Date(authState.timestamp);
      const diffMs = now.getTime() - timestamp.getTime();
      hoursSinceAuth = diffMs / (1000 * 60 * 60);
    } else {
      const stats = fs.statSync(authStatePath);
      const diffMs = now.getTime() - stats.mtime.getTime();
      hoursSinceAuth = diffMs / (1000 * 60 * 60);
    }
    if (Number.isNaN(hoursSinceAuth)) {
      logger.error('[Session Check] ❌ Impossible de déterminer l\'âge de la session');
      return false;
    }

    logger.info('[Session Check] Âge de la session:', { hoursSinceAuth });

    if (hoursSinceAuth > 24) {
      logger.warn('[Session Check] ❌ Session expirée (> 24h)');
      return false;
    }

    logger.info('[Session Check] ✅ Session valide');
    return true;

  } catch (error: unknown) {
    logger.error('[Session Check] ❌ Erreur lors de la vérification:', { error });
    return false;
  }
}

/**
 * Lance l'extraction Puppeteer des données Superbuy
 */
async function runSuperbuyExtraction(): Promise<SuperbuyParcelData[]> {
  logger.info('[Extraction] 🚀 Lancement de Playwright...');

  const { chromium } = await import('playwright');

  let browser: Browser | undefined;
  let context: BrowserContext | undefined;

  try {
    // Charger les cookies
    const rootPath = path.resolve(process.cwd(), 'auth_state.json');
    const scriptsPath = path.resolve(process.cwd(), 'scripts', 'superbuy', 'auth_state.json');
    const authStatePath = fs.existsSync(scriptsPath) ? scriptsPath : rootPath;
    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));

    logger.info('[Extraction] 📂 Cookies chargés:', { count: authState.cookies.length });

    // Lancer le navigateur
    browser = await chromium.launch({ headless: true });
    logger.info('[Extraction] 🌐 Navigateur lancé (headless)');

    // Utiliser le storageState généré par le login interactif
    context = await browser.newContext({
      storageState: authStatePath,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Aller sur la page des parcelles
    logger.info('[Extraction] 🔗 Navigation vers Superbuy parcels...');
    await page.goto('https://www.superbuy.com/en/page/buy/shipmentlist/', {
      waitUntil: 'domcontentloaded',
      timeout: SUPERBUY_TIMEOUTS.NAVIGATION,
    });

    // Vérifier si on a été redirigé vers une page de login
    const loginDetected = await page.evaluate(() => {
      const href = location.href;
      const urlLooksLikeLogin = /login|signin|account\/login|user\/login/i.test(href);
      const hasPasswordField = !!document.querySelector('input[type="password"]');
      const formLooksLikeLogin = !!document.querySelector('form[action*="login" i]');
      const markers = !!document.querySelector('#login, .login, [data-login]');
      return urlLooksLikeLogin || hasPasswordField || formLooksLikeLogin || markers;
    });

    if (loginDetected) {
      logger.warn('[Extraction] 🔒 Redirection vers la page de login détectée');
      await browser.close();
      throw new NeedsAuthError('Session Superbuy invalide - redirection vers login');
    }

    logger.info('[Extraction] ⏳ Attente du chargement des données...');
    // Attendre que des éléments typiques de la liste apparaissent (best-effort)
    try {
      await page.waitForSelector('[data-parcel-id], .shipment-list, [data-list="shipments"]', { timeout: SUPERBUY_TIMEOUTS.ELEMENT_WAIT_LONG });
    } catch {
      // Pas bloquant, on continue en mode best-effort
    }

    // Extraire les données via l'API Superbuy directement
    logger.info('[Extraction] 📊 Appel API packages...');

    const parcelsData: SuperbuyParcelData[] = [];

    try {
      // Appeler l'API packages pour récupérer les parcelles
      const response = await page.context().request.get('https://front.superbuy.com/package/package/list', {
        params: {
          status: 'all',
          page: '1',
          pageSize: String(SUPERBUY_PAGINATION.DEFAULT_PAGE_SIZE),
          keyword: '',
        },
        headers: {
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://www.superbuy.com/en/page/account/myparcel/',
        },
      });

      if (response.ok()) {
        const json = await response.json();
        logger.debug('[Extraction] 📦 Réponse API reçue:', {
          state: json.state,
          hasData: !!json.data,
          hasPackages: !!json.data?.package,
        });

        if (json.state === 0 && json.data?.package?.listResult) {
          const packages = json.data.package.listResult;
          logger.info('[Extraction] 📦 Packages trouvés:', { count: packages.length });

          for (const pkg of packages) {
            if (!pkg) continue;

            const info = pkg.packageInfo || {};
            const orderItems = pkg.orderItems || [];

            // Extraire les informations importantes
            const parcel = {
              packageId: (info.packageNo || pkg.packageNo || crypto.randomUUID()), // Ensure packageId exists
              packageOrderNo: info.packageNo || pkg.packageNo || '',
              trackingNumber: info.expressNo || info.packageNo || '',
              carrier: info.deliveryCompanyName || info.deliveryName || 'Unknown',
              status: info.packageStatusName || 'Unknown',
              weight: info.packageRealWeight || info.packageWeight || null,
              shippingFee: info.realFreight || info.freight || null,
              createdAt: info.packageTime || info.payTime || null,
              updatedAt: info.deliveryTime || info.weightTime || info.payTime || null,
              warehouseName: info.warehouseName || null,
              currency: info.currency || 'CNY',
              destination: [info.areaName, info.state, info.city, info.address]
                .filter(Boolean)
                .join(', ') || null,

              // Items de la parcelle
              items: (orderItems as Array<{
                itemId: string;
                itemBarcode: string;
                goodsName: string;
                count: number;
                unitPrice: number;
                weight: number;
                itemStatus: string;
                originArrivedTime: string;
                arrivalPicList: string[];
                goodsLink: string;
                itemRemark: string;
              }>).map((item) => ({
                itemId: item.itemId,
                barcode: item.itemBarcode,
                name: item.goodsName,
                quantity: item.count,
                unitPrice: item.unitPrice,
                weight: item.weight,
                status: item.itemStatus,
                arrivalAt: item.originArrivedTime,
                images: item.arrivalPicList || [],
                goodsLink: item.goodsLink,
                remark: item.itemRemark,
              })),

              // Données brutes pour référence
              rawPackageInfo: info,
              rawOrderItems: orderItems,
            };

            parcelsData.push(parcel);
          }
        }
      } else {
        logger.warn('[Extraction] ⚠️ API packages a retourné:', { status: response.status() });
      }
    } catch (apiError) {
      logger.error('[Extraction] ❌ Erreur appel API:', { error: apiError });
      // Continuer avec extraction DOM si API échoue
    }

    logger.info('[Extraction] ✅ Extraction terminée:', { count: parcelsData.length });

    await browser.close();

    return parcelsData;

  } catch (error: unknown) {
    logger.error('[Extraction] ❌ Erreur fatale:', { error });

    if (browser) {
      await browser.close();
    }

    throw error;
  }
}