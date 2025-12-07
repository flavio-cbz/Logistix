/**
 * Endpoint d'extraction et synchronisation directe Superbuy
 * POST /api/v1/sync/superbuy/extract-and-sync
 *
 * Flow complet:
 * 1. Lance extraction Puppeteer depuis Superbuy
 * 2. Normalise les données extraites
 * 3. Synchronise directement en base (pas de fichier JSON)
 * 4. Retourne le résultat avec le stream de progression
 *
 * Avantages:
 * - Pas de fichier intermédiaire
 * - Synchronisation directe en base
 * - Feedback en temps réel via API polling
 * - Contrôle via query params (skipExisting, forceUpdate)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { SuperbuySyncService } from '@/lib/integrations/superbuy';
import { serviceContainer } from '@/lib/services/container';
import { DatabaseService } from '@/lib/database';
import { logger } from '@/lib/utils/logging/logger';

interface ExtractionStep {
  type: 'extraction' | 'normalization' | 'sync' | 'complete';
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  progress?: number;
  data?: any;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  const steps: ExtractionStep[] = [];

  const pushStep = (
    type: ExtractionStep['type'],
    status: ExtractionStep['status'],
    message: string,
    progress?: number,
    data?: any
  ) => {
    const step: ExtractionStep = {
      type,
      status,
      message,
      ...(progress !== undefined && { progress }),
      ...(data && { data }),
      timestamp: new Date().toISOString(),
    };
    steps.push(step);
    logger.info(`[Extract & Sync] ${type}: ${message}`, { status, progress });
  };

  try {
    // 1. Authentification
    pushStep('extraction', 'running', 'Vérification de l\'authentification...');
    const { user } = await requireAuth(req);
    pushStep('extraction', 'success', 'Authentifié ✓');

    // 2. Récupérer les paramètres
    const searchParams = new URL(req.url).searchParams;
    const skipExisting = searchParams.get('skipExisting') !== 'false';
    const forceUpdate = searchParams.get('forceUpdate') === 'true';

    // 3. Lancer l'extraction Puppeteer directe (pas de fichier)
    pushStep('extraction', 'running', 'Connexion à Superbuy et extraction des parcelles...');

    const databaseService = DatabaseService.getInstance();
    const parcelleService = serviceContainer.getParcelleService();

    const syncService = new SuperbuySyncService(
      parcelleService,
      databaseService,
      user.id
    );

    let extractedData: any[] = [];

    try {
      // Extraction Puppeteer directe (sans fichier)
      extractedData = await runSuperbuyExtractionDirect();
      pushStep('extraction', 'success', `${extractedData.length} parcelles extraites ✓`, 33);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      pushStep('extraction', 'error', `Erreur extraction: ${errorMsg}`);
      
      // Détecter les erreurs d'authentification/session
      const isAuthError = 
        errorMsg.includes('authentifié') || 
        errorMsg.includes('login') || 
        errorMsg.includes('Session') ||
        errorMsg.includes('expire') ||
        errorMsg.includes('reconnecter') ||
        errorMsg.includes('invalide');

      if (isAuthError) {
        console.log('[Extract & Sync] 🔒 Erreur d\'authentification détectée:', errorMsg);
        return NextResponse.json({
          success: false,
          message: errorMsg || 'Session Superbuy invalide ou expirée. Veuillez vous reconnecter.',
          needsAuth: true,
          authUrl: '/api/v1/superbuy/auth/init',
          steps,
        }, { status: 401 });
      }
      
      // Autres erreurs d'extraction
      console.log('[Extract & Sync] ❌ Erreur extraction:', errorMsg);
      return NextResponse.json({
        success: false,
        message: `Échec de l\'extraction: ${errorMsg}`,
        steps,
      }, { status: 500 });
    }

    if (extractedData.length === 0) {
      pushStep('extraction', 'error', 'Aucune parcelle trouvée sur Superbuy');
      return NextResponse.json({
        success: false,
        message: 'Aucune parcelle trouvée sur Superbuy',
        steps,
      }, { status: 400 });
    }

    // 4. Normaliser les données
    pushStep('normalization', 'running', `Normalisation de ${extractedData.length} parcelles...`);

    const normalizedData = extractedData.map(parcel => ({
      parcelId: parcel.parcelId, // packageNo
      trackingNumber: parcel.trackingNumber, // expressNo
      carrier: parcel.carrier, // deliveryCompanyName
      status: parcel.status, // packageStatusName (sera normalisé par le mapper)
      weight: parcel.weight, // packageRealWeight (en grammes)
      shippingFee: parcel.shippingFee, // packageTotalAmount
      goodsName: parcel.goodsName || '',
      warehouseName: parcel.warehouseName || '',
    }));

    pushStep('normalization', 'success', `${normalizedData.length} parcelles normalisées ✓`, 66);

    // 4.5 Convertir vers un format proche de SuperbuyParcel (comme l'autre endpoint) pour un mapping robuste
    const superbuyLikeParcels = normalizedData.map((raw: any) => ({
      packageOrderNo: raw.parcelId,
      packageId: parseInt(String(raw.packageId || String(raw.parcelId || '').replace(/\D/g, '') || '0')), 
      trackingNumber: raw.trackingNumber,
      carrier: raw.carrier,
      status: raw.status,
      packageRealWeight: raw.weight,
      packageWeight: raw.weight,
      weight: raw.weight,
      packageTotalAmount: raw.shippingFee,
      shippingFee: raw.shippingFee,
      warehouseName: raw.warehouseName,
      goodsName: raw.goodsName,
      deliveryCompanyName: raw.carrier,
      rawPackageInfo: {
        packageNo: raw.parcelId,
        expressNo: raw.trackingNumber,
        packageRealWeight: raw.weight,
        packagePrice: raw.shippingFee,
        deliveryCompanyName: raw.carrier,
        warehouseName: raw.warehouseName,
        packageStatusName: raw.status,
      },
    }));

    // 5. Synchroniser en base
    pushStep('sync', 'running', `Synchronisation de ${superbuyLikeParcels.length} parcelles en base...`);

    const summary = await syncService.syncParcels(superbuyLikeParcels, {
      skipExisting,
      forceUpdate,
    });

    // Log des erreurs détaillées si nécessaire
    if (summary.failed > 0 && Array.isArray(summary.results)) {
      const failures = summary.results.filter((r: any) => !r.success);
      console.error('[Extract & Sync] Échecs de synchronisation:', failures);
    }

    pushStep(
      'sync',
      'success',
      `Synchronisation complète: ${summary.created} créées, ${summary.updated} mises à jour, ${summary.skipped} ignorées, ${summary.failed} échouées ✓`,
      100,
      {
        totalProcessed: summary.totalProcessed,
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        failed: summary.failed,
        failures: summary.failed > 0 ? summary.results?.filter((r: any) => !r.success) : undefined,
      }
    );
    pushStep('complete', 'success', 'Extraction et synchronisation terminées avec succès', 100, {
      created: summary.created,
      updated: summary.updated,
      skipped: summary.skipped,
      failed: summary.failed,
    });

    return NextResponse.json({
      success: true,
      message: `Synchronisation complète: ${summary.created} créées, ${summary.updated} mises à jour, ${summary.skipped} ignorées, ${summary.failed} échouées`,
      created: summary.created,
      updated: summary.updated,
      skipped: summary.skipped,
      failed: summary.failed,
      totalProcessed: summary.totalProcessed,
      results: summary.results,
      steps,
      dataSource: 'direct-extraction',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    pushStep('complete', 'error', `Erreur: ${errorMessage}`);
    logger.error('Erreur endpoint extract-and-sync:', { error });

    return NextResponse.json({
      success: false,
      message: errorMessage,
      steps,
    }, { status: 500 });
  }
}

// Helper: Extraction Puppeteer directe (SANS fichier)
async function runSuperbuyExtractionDirect(): Promise<any[]> {
  const fs = await import('fs');
  const path = await import('path');

  const { chromium } = await import('playwright');

  let browser;
  let context;

  try {
    // Charger les cookies depuis auth_state.json
    const rootPath = path.resolve(process.cwd(), 'auth_state.json');
    const scriptsPath = path.resolve(process.cwd(), 'scripts', 'superbuy', 'auth_state.json');
    const authStatePath = fs.existsSync(scriptsPath) ? scriptsPath : rootPath;

    if (!fs.existsSync(authStatePath)) {
      throw new Error('Session Superbuy non trouvée. L\'utilisateur doit se connecter d\'abord.');
    }

    // Charger les cookies pour utiliser la session authentifiée
    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));
    authState; // Utilisé dans storageState ci-dessous

    // Lancer Playwright
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      storageState: authStatePath,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    const page = await context.newPage();

    // Naviguer vers Superbuy (domaine www) pour initialiser la session principale
    await page.goto('https://www.superbuy.com/en/page/buy/shipmentlist/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Vérifier authentification: Plusieurs vérifications pour détecter un logout
    const authCheckResult = await page.evaluate(() => {
      const href = window.location.href;
      
      // Indicateur 1: URL contient login/signin
      const urlLooksLikeLogin = /login|signin|account\/login|user\/login/i.test(href);
      
      // Indicateur 2: Champs de mot de passe visibles
      const hasPasswordField = !!document.querySelector('input[type="password"]');
      
      // Indicateur 3: Formulaire de login détecté
      const formLooksLikeLogin = !!document.querySelector('form[action*="login" i]');
      
      // Indicateur 4: Éléments de login spécifiques
      const loginMarkers = !!document.querySelector('#login, .login, [data-login]');
      
      // Indicateur 5: Page de home (redirection de logout)
      const redirectedToHome = /^https:\/\/www\.superbuy\.com\/?$/.test(href);
      
      return {
        isLoggedIn: !urlLooksLikeLogin && !hasPasswordField && !formLooksLikeLogin && !loginMarkers && !redirectedToHome,
        details: {
          urlLooksLikeLogin,
          hasPasswordField,
          formLooksLikeLogin,
          loginMarkers,
          redirectedToHome,
          currentUrl: href
        }
      };
    });

    if (!authCheckResult.isLoggedIn) {
      // Session expirée ou invalide
      console.log('[Extraction] 🔒 Vérification authentification échouée:', authCheckResult.details);
      throw new Error(
        'Session Superbuy invalide ou expirée. Veuillez vous reconnecter. ' +
        `(Détails: ${authCheckResult.details.redirectedToHome ? 'Redirection vers home' : authCheckResult.details.urlLooksLikeLogin ? 'Page de login détectée' : 'Page non reconnue'})`
      );
    }

    console.log('[Extraction] ✅ Authentification vérifiée (domaine www)');

    // Fonction utilitaire: appel de l'API front + parsing JSON
    const callFrontApi = async () => {
      const resp = await page.context().request.get(
        'https://front.superbuy.com/package/package/list',
        {
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
        }
      );
      if (!resp.ok()) {
        throw new Error(`Échec appel API Superbuy: ${resp.status()}`);
      }
      return (await resp.json()) as any;
    };

    // Étape 1: Essai direct
    let json = await callFrontApi();

    // Détection d'une session front expirée: state=10008 ou message "Please login first"
    const looksUnauthenticated = (j: any) =>
      j && ((typeof j.state === 'number' && j.state === 10008) || /login/i.test(j.msg || ''));

    if (looksUnauthenticated(json)) {
      console.log('[Extraction] ℹ️ API front: session non valide (10008). Tentative de warmup SSO sur front.superbuy.com...');

      // 1) Naviguer sur le domaine front pour propager les cookies/CF
      try {
        await page.goto('https://front.superbuy.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1500);
      } catch (e) {
        console.warn('[Extraction] ⚠️ Échec navigation front.superbuy.com (warmup):', e);
      }

      // 2) Réessayer l'appel API
      try {
        json = await callFrontApi();
      } catch {
        // ignore ici, on essayera une duplication de cookies
      }

      // 3) Si toujours non authentifié, dupliquer les cookies *.superbuy.com vers front.superbuy.com
      if (looksUnauthenticated(json)) {
        try {
          const allCookies = await context.cookies();
          const frontCookies = allCookies
            .filter(c => (c.domain || '').includes('superbuy.com'))
            .map(c => ({
              ...c,
              domain: 'front.superbuy.com',
            }));
          if (frontCookies.length > 0) {
            await context.addCookies(frontCookies);
            console.log(`[Extraction] 🔁 ${frontCookies.length} cookies clonés vers front.superbuy.com`);
          }
        } catch (e) {
          console.warn('[Extraction] ⚠️ Impossible de cloner les cookies vers front.superbuy.com:', e);
        }

        // 4) Dernier essai via API context
        try {
          json = await callFrontApi();
        } catch (e) {
          console.warn('[Extraction] ⚠️ Nouvel échec appel API front après clonage cookies:', e);
        }

        // 5) Fallback ultime: naviguer sur front et faire le fetch depuis la page (même origine)
        if (looksUnauthenticated(json)) {
          try {
            await page.goto('https://front.superbuy.com/#/account/myparcel', { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(1000);
            const jsJson = await page.evaluate(async () => {
              const url = 'https://front.superbuy.com/package/package/list?status=all&page=1&pageSize=100&keyword=';
              const resp = await fetch(url, {
                credentials: 'include',
                headers: {
                  Accept: 'application/json, text/plain, */*',
                  Referer: 'https://front.superbuy.com/',
                },
              });
              try { return await resp.json(); } catch { return null; }
            });
            if (jsJson) {
              json = jsJson;
            }
          } catch (e) {
            console.warn('[Extraction] ⚠️ Fallback fetch via page (front) a échoué:', e);
          }
        }
      }

      // 6) Si toujours non authentifié → lever une erreur d'auth pour déclencher le 401 côté endpoint
      if (looksUnauthenticated(json)) {
        console.log('[Extraction] 🔒 Session Superbuy (front) invalide ou expirée — re-login requis.');
        // Log un extrait pour aide au debug
        try {
          console.log('[Extraction] Structure API reçue:', JSON.stringify(json, null, 2).substring(0, 500));
        } catch {}
        throw new Error('Session Superbuy invalide ou expirée. Veuillez vous reconnecter.');
      }
    }

    // Extraire les parcelles de la réponse API
    let parcels: any[] = [];

    // Structure réelle de l'API Superbuy: data.package.listResult
    if (json.data?.package?.listResult && Array.isArray(json.data.package.listResult)) {
      parcels = json.data.package.listResult.map((item: any) => {
        const info = item.packageInfo || item;
        return {
          parcelId: info.packageNo || item.packageNo || '',
          trackingNumber: info.expressNo || item.expressNo || '',
          carrier: info.deliveryCompanyName || item.deliveryCompanyName || 'Unknown',
          status: info.packageStatusName || item.packageStatusName || 'En attente',
          weight: parseInt(String(info.packageRealWeight || item.packageRealWeight || 0)),
          shippingFee: parseFloat(String(info.packagePrice || item.packagePrice || 0)),
          goodsName: item.goodsName || '',
          warehouseName: item.warehouseName || '',
          packageId: item.packageId,
        };
      });
    }

    if (parcels.length === 0) {
      // Log la structure pour debug
      try {
        console.log('[Extraction] Structure API reçue:', JSON.stringify(json, null, 2).substring(0, 500));
      } catch {}
      throw new Error('Aucune parcelle trouvée dans la réponse Superbuy');
    }

    await browser?.close();
    return parcels;
  } catch (error) {
    await browser?.close();
    const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
    throw new Error(errorMsg);
  }
}
