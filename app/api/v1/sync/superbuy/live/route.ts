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
    console.log(`[${status.toUpperCase()}] ${step}: ${message}`);
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

    let extractedData: any[];
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

  } catch (error) {
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
    console.log('[Session Check] Vérification du fichier auth_state.json');

    const rootPath = path.resolve(process.cwd(), 'auth_state.json');
    const scriptsPath = path.resolve(process.cwd(), 'scripts', 'superbuy', 'auth_state.json');
    const authStatePath = fs.existsSync(scriptsPath) ? scriptsPath : rootPath;

    if (!fs.existsSync(authStatePath)) {
      console.log('[Session Check] ❌ Fichier auth_state.json introuvable');
      return false;
    }

    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));
    console.log('[Session Check] État d\'auth chargé:', {
      hasCookies: !!authState.cookies,
      cookieCount: authState.cookies?.length || 0,
      timestamp: authState.timestamp
    });

    if (!authState.cookies || authState.cookies.length === 0) {
      console.log('[Session Check] ❌ Aucun cookie trouvé');
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
      console.log('[Session Check] ❌ Impossible de déterminer l\'âge de la session');
      return false;
    }

    console.log('[Session Check] Âge de la session:', `${hoursSinceAuth.toFixed(2)} heures`);

    if (hoursSinceAuth > 24) {
      console.log('[Session Check] ❌ Session expirée (> 24h)');
      return false;
    }

    console.log('[Session Check] ✅ Session valide');
    return true;

  } catch (error) {
    console.error('[Session Check] ❌ Erreur lors de la vérification:', error);
    return false;
  }
}

/**
 * Lance l'extraction Puppeteer des données Superbuy
 */
async function runSuperbuyExtraction(): Promise<any[]> {
  console.log('[Extraction] 🚀 Lancement de Playwright...');

  const { chromium } = await import('playwright');

  let browser;
  let context;

  try {
    // Charger les cookies
    const rootPath = path.resolve(process.cwd(), 'auth_state.json');
    const scriptsPath = path.resolve(process.cwd(), 'scripts', 'superbuy', 'auth_state.json');
    const authStatePath = fs.existsSync(scriptsPath) ? scriptsPath : rootPath;
    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));

    console.log('[Extraction] 📂 Cookies chargés:', authState.cookies.length);

    // Lancer le navigateur
    browser = await chromium.launch({ headless: true });
    console.log('[Extraction] 🌐 Navigateur lancé (headless)');

    // Utiliser le storageState généré par le login interactif
    context = await browser.newContext({
      storageState: authStatePath,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Aller sur la page des parcelles
    console.log('[Extraction] 🔗 Navigation vers Superbuy parcels...');
    await page.goto('https://www.superbuy.com/en/page/buy/shipmentlist/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
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
      console.log('[Extraction] 🔒 Redirection vers la page de login détectée');
      await browser.close();
      throw new NeedsAuthError('Session Superbuy invalide - redirection vers login');
    }

    console.log('[Extraction] ⏳ Attente du chargement des données...');
    // Attendre que des éléments typiques de la liste apparaissent (best-effort)
    try {
      await page.waitForSelector('[data-parcel-id], .shipment-list, [data-list="shipments"]', { timeout: 15000 });
    } catch {
      // Pas bloquant, on continue en mode best-effort
    }

    // Extraire les données via l'API Superbuy directement
    console.log('[Extraction] 📊 Appel API packages...');

    const parcelsData: any[] = [];

    try {
      // Appeler l'API packages pour récupérer les parcelles
      const response = await page.context().request.get('https://front.superbuy.com/package/package/list', {
        params: {
          status: 'all',
          page: '1',
          pageSize: '100',
          keyword: '',
        },
        headers: {
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://www.superbuy.com/en/page/account/myparcel/',
        },
      });

      if (response.ok()) {
        const json = await response.json();
        console.log('[Extraction] 📦 Réponse API reçue:', {
          state: json.state,
          hasData: !!json.data,
          hasPackages: !!json.data?.package,
        });

        if (json.state === 0 && json.data?.package?.listResult) {
          const packages = json.data.package.listResult;
          console.log('[Extraction] 📦 Packages trouvés:', packages.length);

          for (const pkg of packages) {
            if (!pkg) continue;

            const info = pkg.packageInfo || {};
            const orderItems = pkg.orderItems || [];

            // Extraire les informations importantes
            const parcel = {
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
              items: orderItems.map((item: any) => ({
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
        console.log('[Extraction] ⚠️ API packages a retourné:', response.status());
      }
    } catch (apiError) {
      console.error('[Extraction] ❌ Erreur appel API:', apiError);
      // Continuer avec extraction DOM si API échoue
    }

    console.log('[Extraction] ✅ Extraction terminée:', parcelsData.length, 'parcelles');

    await browser.close();

    return parcelsData;

  } catch (error) {
    console.error('[Extraction] ❌ Erreur fatale:', error);

    if (browser) {
      await browser.close();
    }

    throw error;
  }
}