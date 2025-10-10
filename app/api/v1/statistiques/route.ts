import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/v1/statistiques
 * Récupère des statistiques avancées et analyses complètes
 * 
 * Query params:
 * - period: '7d' | '30d' | '90d' | '1y' | 'all' (défaut: '30d')
 * - groupBy: 'day' | 'week' | 'month' (défaut: 'day')
 */
export async function GET(request: NextRequest) {
  try {
    // Validation de l'authentification
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // Récupération des paramètres
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d';
    const groupBy = searchParams.get('groupBy') || 'day';

    // Calcul de la date de début selon la période
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = "DATE('now', '-7 days')";
        break;
      case '30d':
        dateFilter = "DATE('now', '-30 days')";
        break;
      case '90d':
        dateFilter = "DATE('now', '-90 days')";
        break;
      case '1y':
        dateFilter = "DATE('now', '-1 year')";
        break;
      case 'all':
        dateFilter = "DATE('2000-01-01')";
        break;
      default:
        dateFilter = "DATE('now', '-30 days')";
    }

    // === 1. VUE D'ENSEMBLE ===
    const vueEnsemble = await databaseService.queryOne<{
      totalProduits: number;
      produitsVendus: number;
      produitsEnLigne: number;
      produitsStock: number;
      chiffreAffaires: number;
      beneficesTotal: number;
      margeMoyenne: number;
      prixMoyenVente: number;
      prixMoyenAchat: number;
    }>(
      `SELECT 
        COUNT(*) as totalProduits,
        SUM(CASE WHEN vendu = '1' THEN 1 ELSE 0 END) as produitsVendus,
        SUM(CASE WHEN tempsEnLigne IS NOT NULL AND vendu = '0' THEN 1 ELSE 0 END) as produitsEnLigne,
        SUM(CASE WHEN tempsEnLigne IS NULL AND vendu = '0' THEN 1 ELSE 0 END) as produitsStock,
        COALESCE(SUM(CASE WHEN vendu = '1' THEN prixVente ELSE 0 END), 0) as chiffreAffaires,
        COALESCE(SUM(CASE WHEN vendu = '1' THEN (prixVente - prixArticle - COALESCE(prixLivraison, 0)) ELSE 0 END), 0) as beneficesTotal,
        CASE 
          WHEN SUM(CASE WHEN vendu = '1' THEN prixVente ELSE 0 END) > 0
          THEN (SUM(CASE WHEN vendu = '1' THEN (prixVente - prixArticle - COALESCE(prixLivraison, 0)) ELSE 0 END) / SUM(CASE WHEN vendu = '1' THEN prixVente ELSE 0 END)) * 100
          ELSE 0
        END as margeMoyenne,
        COALESCE(AVG(CASE WHEN vendu = '1' THEN prixVente END), 0) as prixMoyenVente,
        COALESCE(AVG(prixArticle), 0) as prixMoyenAchat
      FROM products 
      WHERE user_id = ?
        AND created_at >= ${dateFilter}`,
      [user.id],
      "get-vue-ensemble"
    );

    // === 2. ÉVOLUTION TEMPORELLE ===
    let groupByClause = '';
    let dateFormatClause = '';
    
    switch (groupBy) {
      case 'day':
        groupByClause = "DATE(dateVente)";
        dateFormatClause = "strftime('%Y-%m-%d', dateVente)";
        break;
      case 'week':
        groupByClause = "strftime('%Y-%W', dateVente)";
        dateFormatClause = "strftime('%Y-W%W', dateVente)";
        break;
      case 'month':
        groupByClause = "strftime('%Y-%m', dateVente)";
        dateFormatClause = "strftime('%Y-%m', dateVente)";
        break;
      default:
        groupByClause = "DATE(dateVente)";
        dateFormatClause = "strftime('%Y-%m-%d', dateVente)";
    }

    const evolutionTemporelle = await databaseService.query<{
      periode: string;
      nbVentes: number;
      chiffreAffaires: number;
      benefices: number;
      margeMoyenne: number;
      prixMoyenVente: number;
    }>(
      `SELECT 
        ${dateFormatClause} as periode,
        COUNT(*) as nbVentes,
        COALESCE(SUM(prixVente), 0) as chiffreAffaires,
        COALESCE(SUM(prixVente - prixArticle - COALESCE(prixLivraison, 0)), 0) as benefices,
        CASE 
          WHEN SUM(prixVente) > 0 
          THEN (SUM(prixVente - prixArticle - COALESCE(prixLivraison, 0)) / SUM(prixVente)) * 100
          ELSE 0
        END as margeMoyenne,
        COALESCE(AVG(prixVente), 0) as prixMoyenVente
      FROM products 
      WHERE user_id = ? 
        AND vendu = '1'
        AND dateVente IS NOT NULL
        AND dateVente >= ${dateFilter}
      GROUP BY ${groupByClause}
      ORDER BY periode ASC`,
      [user.id],
      "get-evolution-temporelle"
    );

    // === 3. PERFORMANCE PAR PLATEFORME ===
    const performancePlateforme = await databaseService.query<{
      plateforme: string;
      nbVentes: number;
      chiffreAffaires: number;
      benefices: number;
      margeMoyenne: number;
      prixMoyenVente: number;
      partMarche: number;
    }>(
      `WITH TotalVentes AS (
        SELECT COUNT(*) as total
        FROM products
        WHERE user_id = ? 
          AND vendu = '1'
          AND dateVente >= ${dateFilter}
      )
      SELECT 
        COALESCE(plateforme, 'Non spécifié') as plateforme,
        COUNT(*) as nbVentes,
        COALESCE(SUM(prixVente), 0) as chiffreAffaires,
        COALESCE(SUM(prixVente - prixArticle - COALESCE(prixLivraison, 0)), 0) as benefices,
        CASE 
          WHEN SUM(prixVente) > 0 
          THEN (SUM(prixVente - prixArticle - COALESCE(prixLivraison, 0)) / SUM(prixVente)) * 100
          ELSE 0
        END as margeMoyenne,
        COALESCE(AVG(prixVente), 0) as prixMoyenVente,
        CAST(COUNT(*) * 100.0 / (SELECT total FROM TotalVentes) AS REAL) as partMarche
      FROM products 
      WHERE user_id = ? 
        AND vendu = '1'
        AND dateVente >= ${dateFilter}
      GROUP BY plateforme
      ORDER BY chiffreAffaires DESC`,
      [user.id, user.id],
      "get-performance-plateforme"
    );

    // === 4. PERFORMANCE PAR PARCELLE ===
    const performanceParcelle = await databaseService.query<{
      parcelleId: string;
      parcelleNumero: string;
      parcelleNom: string;
      nbProduitsTotal: number;
      nbProduitsVendus: number;
      tauxVente: number;
      chiffreAffaires: number;
      coutTotal: number;
      beneficesTotal: number;
      ROI: number;
      prixParGramme: number;
      poidsTotal: number;
      coutLivraisonTotal: number;
    }>(
      `SELECT 
        p.parcelleId as parcelleId,
        parc.numero as parcelleNumero,
        parc.nom as parcelleNom,
        COUNT(*) as nbProduitsTotal,
        SUM(CASE WHEN p.vendu = '1' THEN 1 ELSE 0 END) as nbProduitsVendus,
        CAST(SUM(CASE WHEN p.vendu = '1' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as tauxVente,
        COALESCE(SUM(CASE WHEN p.vendu = '1' THEN p.prixVente ELSE 0 END), 0) as chiffreAffaires,
        COALESCE(SUM(p.prixArticle + COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)), 0) as coutTotal,
        COALESCE(SUM(CASE WHEN p.vendu = '1' THEN (p.prixVente - p.prixArticle - COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)) ELSE 0 END), 0) as beneficesTotal,
        CASE 
          WHEN SUM(p.prixArticle + COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)) > 0
          THEN (SUM(CASE WHEN p.vendu = '1' THEN (p.prixVente - p.prixArticle - COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)) ELSE 0 END) / SUM(p.prixArticle + COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0))) * 100
          ELSE 0
        END as ROI,
        COALESCE(parc.prix_par_gramme, 0) as prixParGramme,
        COALESCE(SUM(p.poids), 0) as poidsTotal,
        COALESCE(SUM(COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)), 0) as coutLivraisonTotal
      FROM products p
      LEFT JOIN parcelles parc ON p.parcelleId = parc.id
      WHERE p.user_id = ?
        AND p.created_at >= ${dateFilter}
      GROUP BY p.parcelleId, parc.numero, parc.nom, parc.prix_par_gramme
      ORDER BY beneficesTotal DESC`,
      [user.id],
      "get-performance-parcelle"
    );

    // === 5. TOP ET FLOP PRODUITS ===
    const topProduits = await databaseService.query<{
      id: string;
      nom: string;
      prixAchat: number;
      prixVente: number;
      benefice: number;
      margePercent: number;
      plateforme: string;
      dateVente: string;
      delaiVente: number;
    }>(
      `SELECT 
        id,
        nom as nom,
        prixArticle as prixAchat,
        prixVente as prixVente,
        (prixVente - prixArticle - COALESCE(prixLivraison, 0)) as benefice,
        CASE 
          WHEN prixVente > 0 
          THEN ((prixVente - prixArticle - COALESCE(prixLivraison, 0)) / prixVente) * 100
          ELSE 0
        END as margePercent,
        COALESCE(plateforme, 'Non spécifié') as plateforme,
        dateVente as dateVente,
        CASE 
          WHEN tempsEnLigne IS NOT NULL AND dateVente IS NOT NULL
          THEN julianday(dateVente) - julianday(tempsEnLigne)
          ELSE NULL
        END as delaiVente
      FROM products
      WHERE user_id = ?
        AND vendu = '1'
        AND dateVente >= ${dateFilter}
      ORDER BY benefice DESC
      LIMIT 10`,
      [user.id],
      "get-top-produits"
    );

    const flopProduits = await databaseService.query<{
      id: string;
      nom: string;
      prixAchat: number;
      prixVente: number;
      benefice: number;
      margePercent: number;
      plateforme: string;
      dateVente: string;
    }>(
      `SELECT 
        id,
        nom as nom,
        prixArticle as prixAchat,
        prixVente as prixVente,
        (prixVente - prixArticle - COALESCE(prixLivraison, 0)) as benefice,
        CASE 
          WHEN prixVente > 0 
          THEN ((prixVente - prixArticle - COALESCE(prixLivraison, 0)) / prixVente) * 100
          ELSE 0
        END as margePercent,
        COALESCE(plateforme, 'Non spécifié') as plateforme,
        dateVente as dateVente
      FROM products
      WHERE user_id = ?
        AND vendu = '1'
        AND dateVente >= ${dateFilter}
      ORDER BY benefice ASC
      LIMIT 10`,
      [user.id],
      "get-flop-produits"
    );

    // === 6. STATISTIQUES DE DÉLAI DE VENTE ===
    const delaisVente = await databaseService.queryOne<{
      delaiMoyen: number;
      delaiMedian: number;
      delaiMin: number;
      delaiMax: number;
      nbProduitsAvecDelai: number;
    }>(
      `WITH DelaisCalcules AS (
        SELECT 
          julianday(dateVente) - julianday(tempsEnLigne) as delai
        FROM products
        WHERE user_id = ?
          AND vendu = '1'
          AND tempsEnLigne IS NOT NULL
          AND dateVente IS NOT NULL
          AND dateVente >= ${dateFilter}
      )
      SELECT 
        COALESCE(AVG(delai), 0) as delaiMoyen,
        COALESCE((
          SELECT delai 
          FROM DelaisCalcules 
          ORDER BY delai 
          LIMIT 1 
          OFFSET (SELECT COUNT(*) FROM DelaisCalcules) / 2
        ), 0) as delaiMedian,
        COALESCE(MIN(delai), 0) as delaiMin,
        COALESCE(MAX(delai), 0) as delaiMax,
        COUNT(*) as nbProduitsAvecDelai
      FROM DelaisCalcules`,
      [user.id],
      "get-delais-vente"
    );

    // === 7. PRODUITS NON VENDUS (STOCK) ===
    const produitsNonVendus = await databaseService.query<{
      id: string;
      nom: string;
      prixAchat: number;
      coutLivraison: number;
      dateMiseEnLigne: string | null;
      joursEnLigne: number | null;
      parcelleNumero: string;
    }>(
      `SELECT 
        p.id,
        p.nom as nom,
        p.prixArticle as prixAchat,
        COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0) as coutLivraison,
        p.tempsEnLigne as dateMiseEnLigne,
        CASE 
          WHEN p.tempsEnLigne IS NOT NULL
          THEN julianday('now') - julianday(p.tempsEnLigne)
          ELSE NULL
        END as joursEnLigne,
        COALESCE(parc.numero, 'Non spécifié') as parcelleNumero
      FROM products p
      LEFT JOIN parcelles parc ON p.parcelleId = parc.id
      WHERE p.user_id = ?
        AND p.vendu = '0'
        AND p.created_at >= ${dateFilter}
      ORDER BY p.tempsEnLigne ASC
      LIMIT 50`,
      [user.id],
      "get-produits-non-vendus"
    );

    // === 8. ANALYSE DES COÛTS ===
    const analyseCouts = await databaseService.queryOne<{
      coutAchatTotal: number;
      coutLivraisonTotal: number;
      coutTotalInvesti: number;
      nbParcelles: number;
      coutMoyenParProduit: number;
      coutMoyenLivraison: number;
    }>(
      `SELECT 
        COALESCE(SUM(prixArticle), 0) as coutAchatTotal,
        COALESCE(SUM(COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)), 0) as coutLivraisonTotal,
        COALESCE(SUM(prixArticle + COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)), 0) as coutTotalInvesti,
        COUNT(DISTINCT p.parcelleId) as nbParcelles,
        COALESCE(AVG(prixArticle), 0) as coutMoyenParProduit,
        COALESCE(AVG(COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)), 0) as coutMoyenLivraison
      FROM products p
      LEFT JOIN parcelles parc ON p.parcelleId = parc.id
      WHERE p.user_id = ?
        AND p.created_at >= ${dateFilter}`,
      [user.id],
      "get-analyse-couts"
    );

    // === CONSTRUCTION DE LA RÉPONSE ===
    const statistiques = {
      periode: period,
      groupBy: groupBy,
      
      vueEnsemble: vueEnsemble ? {
        totalProduits: vueEnsemble.totalProduits || 0,
        produitsVendus: vueEnsemble.produitsVendus || 0,
        produitsEnLigne: vueEnsemble.produitsEnLigne || 0,
        produitsStock: vueEnsemble.produitsStock || 0,
        tauxVente: vueEnsemble.totalProduits > 0 
          ? Math.round((vueEnsemble.produitsVendus / vueEnsemble.totalProduits) * 10000) / 100
          : 0,
        chiffreAffaires: Math.round((vueEnsemble.chiffreAffaires || 0) * 100) / 100,
        beneficesTotal: Math.round((vueEnsemble.beneficesTotal || 0) * 100) / 100,
        margeMoyenne: Math.round((vueEnsemble.margeMoyenne || 0) * 100) / 100,
        prixMoyenVente: Math.round((vueEnsemble.prixMoyenVente || 0) * 100) / 100,
        prixMoyenAchat: Math.round((vueEnsemble.prixMoyenAchat || 0) * 100) / 100,
      } : null,
      
      evolutionTemporelle: evolutionTemporelle.map(e => ({
        periode: e.periode,
        nbVentes: e.nbVentes || 0,
        chiffreAffaires: Math.round((e.chiffreAffaires || 0) * 100) / 100,
        benefices: Math.round((e.benefices || 0) * 100) / 100,
        margeMoyenne: Math.round((e.margeMoyenne || 0) * 100) / 100,
        prixMoyenVente: Math.round((e.prixMoyenVente || 0) * 100) / 100,
      })),
      
      performancePlateforme: performancePlateforme.map(p => ({
        plateforme: p.plateforme,
        nbVentes: p.nbVentes || 0,
        chiffreAffaires: Math.round((p.chiffreAffaires || 0) * 100) / 100,
        benefices: Math.round((p.benefices || 0) * 100) / 100,
        margeMoyenne: Math.round((p.margeMoyenne || 0) * 100) / 100,
        prixMoyenVente: Math.round((p.prixMoyenVente || 0) * 100) / 100,
        partMarche: Math.round((p.partMarche || 0) * 100) / 100,
      })),
      
      performanceParcelle: performanceParcelle.map(p => ({
        parcelleId: p.parcelleId,
        parcelleNumero: p.parcelleNumero || 'Non spécifié',
        parcelleNom: p.parcelleNom || 'Sans nom',
        nbProduitsTotal: p.nbProduitsTotal || 0,
        nbProduitsVendus: p.nbProduitsVendus || 0,
        tauxVente: Math.round((p.tauxVente || 0) * 100) / 100,
        chiffreAffaires: Math.round((p.chiffreAffaires || 0) * 100) / 100,
        coutTotal: Math.round((p.coutTotal || 0) * 100) / 100,
        beneficesTotal: Math.round((p.beneficesTotal || 0) * 100) / 100,
        ROI: Math.round((p.ROI || 0) * 100) / 100,
        prixParGramme: Math.round((p.prixParGramme || 0) * 1000) / 1000,
        poidsTotal: Math.round((p.poidsTotal || 0) * 100) / 100,
        coutLivraisonTotal: Math.round((p.coutLivraisonTotal || 0) * 100) / 100,
      })),
      
      topProduits: topProduits.map(p => ({
        id: p.id,
        nom: p.nom,
        prixAchat: Math.round((p.prixAchat || 0) * 100) / 100,
        prixVente: Math.round((p.prixVente || 0) * 100) / 100,
        benefice: Math.round((p.benefice || 0) * 100) / 100,
        margePercent: Math.round((p.margePercent || 0) * 100) / 100,
        plateforme: p.plateforme,
        dateVente: p.dateVente,
        delaiVente: p.delaiVente ? Math.round(p.delaiVente) : null,
      })),
      
      flopProduits: flopProduits.map(p => ({
        id: p.id,
        nom: p.nom,
        prixAchat: Math.round((p.prixAchat || 0) * 100) / 100,
        prixVente: Math.round((p.prixVente || 0) * 100) / 100,
        benefice: Math.round((p.benefice || 0) * 100) / 100,
        margePercent: Math.round((p.margePercent || 0) * 100) / 100,
        plateforme: p.plateforme,
        dateVente: p.dateVente,
      })),
      
      delaisVente: delaisVente ? {
        delaiMoyen: Math.round((delaisVente.delaiMoyen || 0) * 10) / 10,
        delaiMedian: Math.round((delaisVente.delaiMedian || 0) * 10) / 10,
        delaiMin: Math.round((delaisVente.delaiMin || 0) * 10) / 10,
        delaiMax: Math.round((delaisVente.delaiMax || 0) * 10) / 10,
        nbProduitsAvecDelai: delaisVente.nbProduitsAvecDelai || 0,
      } : null,
      
      produitsNonVendus: produitsNonVendus.map(p => ({
        id: p.id,
        nom: p.nom,
        prixAchat: Math.round((p.prixAchat || 0) * 100) / 100,
        coutLivraison: Math.round((p.coutLivraison || 0) * 100) / 100,
        coutTotal: Math.round(((p.prixAchat || 0) + (p.coutLivraison || 0)) * 100) / 100,
        dateMiseEnLigne: p.dateMiseEnLigne,
        joursEnLigne: p.joursEnLigne ? Math.round(p.joursEnLigne) : null,
        parcelleNumero: p.parcelleNumero,
      })),
      
      analyseCouts: analyseCouts ? {
        coutAchatTotal: Math.round((analyseCouts.coutAchatTotal || 0) * 100) / 100,
        coutLivraisonTotal: Math.round((analyseCouts.coutLivraisonTotal || 0) * 100) / 100,
        coutTotalInvesti: Math.round((analyseCouts.coutTotalInvesti || 0) * 100) / 100,
        nbParcelles: analyseCouts.nbParcelles || 0,
        coutMoyenParProduit: Math.round((analyseCouts.coutMoyenParProduit || 0) * 100) / 100,
        coutMoyenLivraison: Math.round((analyseCouts.coutMoyenLivraison || 0) * 100) / 100,
      } : null,
      
      lastUpdate: new Date().toISOString(),
    };

    return createSuccessResponse(statistiques);
    
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    return createErrorResponse(error);
  }
}
