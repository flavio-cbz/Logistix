import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { databaseService } from "@/lib/services/database/db";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";

/**
 * GET /api/v1/dashboard
 * Récupère toutes les données nécessaires pour le dashboard principal
 */
export async function GET(_request: NextRequest) {
  try {
    // Validation de l'authentification  
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    // === MÉTRIQUES PRINCIPALES ===
    
    // Total des ventes et bénéfices
    const ventesData = await databaseService.queryOne<{
      ventesTotales: number;
      beneficesTotaux: number;
      produitsVendus: number;
    }>(
      `SELECT 
        COALESCE(SUM(COALESCE(selling_price, prix_vente, price)), 0) as ventesTotales,
        COALESCE(SUM(COALESCE(selling_price, prix_vente, price) - price), 0) as beneficesTotaux,
        COUNT(*) as produitsVendus
      FROM products 
      WHERE user_id = ? AND vendu = '1'`,
      [user.id],
      "get-ventes-totales"
    );

    // Nombre de colis/parcelles
    const colisData = await databaseService.queryOne<{ nombreColis: number }>(
      "SELECT COUNT(*) as nombreColis FROM parcelles WHERE user_id = ? AND actif = 1",
      [user.id],
      "get-nombre-colis"
    );

    // Nombre total de produits
    const produitsTotal = await databaseService.queryOne<{ total: number }>(
      "SELECT COUNT(*) as total FROM products WHERE user_id = ?",
      [user.id],
      "get-produits-total"
    );

    // Calcul du taux de conversion
    const tauxConversion = produitsTotal?.total 
      ? ((ventesData?.produitsVendus || 0) / produitsTotal.total) * 100 
      : 0;

    // Calcul du panier moyen
    const panierMoyen = ventesData?.produitsVendus 
      ? (ventesData.ventesTotales || 0) / ventesData.produitsVendus 
      : 0;

    // Clients actifs (nombre d'utilisateurs uniques ayant acheté - pour l'instant 1)
    const clientsActifs = (ventesData?.produitsVendus || 0) > 0 ? 1 : 0;

    // === PERFORMANCE JOURNALIÈRE (7 derniers jours) ===
    const performanceJournaliere = await databaseService.query<{
      date: string;
      ventes: number;
      commandes: number;
      benefices: number;
    }>(
      `SELECT 
        DATE(dateVente) as date,
        COALESCE(SUM(prixVente), 0) as ventes,
        COUNT(*) as commandes,
        COALESCE(SUM(benefices), 0) as benefices
      FROM products 
      WHERE user_id = ? 
        AND vendu = 1 
        AND dateVente >= DATE('now', '-7 days')
      GROUP BY DATE(dateVente)
      ORDER BY date ASC`,
      [user.id],
      "get-performance-journaliere"
    );

    // === TOP PRODUITS (5 meilleurs) ===
    const topProduits = await databaseService.query<{
      nom: string;
      ventesRevenue: number; // somme des prix de vente (chiffre d'affaires)
      ventesCount: number; // nombre d'unités vendues
      benefices: number;
      stock: number;
    }>(
      `SELECT 
        nom,
        COALESCE(SUM(prixVente), 0) as ventesRevenue,
        COUNT(*) as ventesCount,
        COALESCE(SUM(benefices), 0) as benefices,
        COUNT(*) as stock
      FROM products 
      WHERE user_id = ? AND vendu = 1
      GROUP BY nom
      ORDER BY ventesRevenue DESC
      LIMIT 5`,
      [user.id],
      "get-top-produits"
    );

    // === ALERTES ===
    const alertes = [];

    // Alerte stock faible (produits non vendus < 5)
    const stockFaible = await databaseService.queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT nom) as count 
      FROM products 
      WHERE user_id = ? 
        AND vendu = 0 
      GROUP BY nom 
      HAVING COUNT(*) < 5`,
      [user.id],
      "get-stock-faible"
    );

    if (stockFaible && stockFaible.count > 0) {
      alertes.push({
        id: 'stock-faible',
        type: 'stock' as const,
        severity: 'high' as const,
        title: 'Stock faible',
        message: `${stockFaible.count} produit(s) ont un stock inférieur à 5 unités`,
        timestamp: new Date().toISOString()
      });
    }

    // Alerte performance (si ventes en hausse)
    if (performanceJournaliere.length >= 2) {
      const dernierJour = performanceJournaliere[performanceJournaliere.length - 1];
      const avantDernierJour = performanceJournaliere[performanceJournaliere.length - 2];
      
      if (dernierJour && avantDernierJour) {
        const evolution = avantDernierJour.ventes > 0
          ? ((dernierJour.ventes - avantDernierJour.ventes) / avantDernierJour.ventes) * 100
          : 0;

        if (evolution > 10) {
          alertes.push({
            id: 'performance-hausse',
            type: 'performance' as const,
            severity: 'medium' as const,
            title: 'Performances en hausse',
            message: `Les ventes ont augmenté de ${evolution.toFixed(1)}% aujourd'hui`,
            timestamp: new Date().toISOString()
          });
        } else if (evolution < -10) {
          alertes.push({
            id: 'performance-baisse',
            type: 'performance' as const,
            severity: 'high' as const,
            title: 'Performances en baisse',
            message: `Les ventes ont baissé de ${Math.abs(evolution).toFixed(1)}% aujourd'hui`,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Alerte bénéfices négatifs
    const beneficesNegatifs = await databaseService.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count 
      FROM products 
      WHERE user_id = ? 
        AND vendu = 1 
        AND benefices < 0`,
      [user.id],
      "get-benefices-negatifs"
    );

    if (beneficesNegatifs && beneficesNegatifs.count > 0) {
      alertes.push({
        id: 'benefices-negatifs',
        type: 'finance' as const,
        severity: 'critical' as const,
        title: 'Bénéfices négatifs',
        message: `${beneficesNegatifs.count} produit(s) vendu(s) à perte`,
        timestamp: new Date().toISOString()
      });
    }

    // === STATISTIQUES DES PARCELLES ===
    const statsParcelles = await databaseService.query<{
      parcelleId: string;
      numero: string;
      nom: string;
      nbProduits: number;
      nbVendus: number;
      poidsTotal: number;
      coutTotal: number;
      chiffreAffaires: number;
      benefices: number;
    }>(
      `SELECT 
        parc.id as parcelleId,
        parc.numero,
        parc.nom,
        COUNT(p.id) as nbProduits,
        SUM(CASE WHEN p.vendu = 1 THEN 1 ELSE 0 END) as nbVendus,
        COALESCE(SUM(p.poids), 0) as poidsTotal,
        COALESCE(SUM(p.prixArticle + COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)), 0) as coutTotal,
        COALESCE(SUM(CASE WHEN p.vendu = 1 THEN p.prixVente ELSE 0 END), 0) as chiffreAffaires,
        COALESCE(SUM(CASE WHEN p.vendu = 1 THEN (p.prixVente - p.prixArticle - COALESCE(p.prixLivraison, parc.prix_par_gramme * p.poids, 0)) ELSE 0 END), 0) as benefices
      FROM parcelles parc
      LEFT JOIN produits p ON parc.id = p.parcelleId
      WHERE parc.user_id = ? AND parc.actif = 1
      GROUP BY parc.id, parc.numero, parc.nom
      ORDER BY benefices DESC`,
      [user.id],
      "get-stats-parcelles"
    );

    // === ROTATION DES STOCKS ===
    const rotationStock = await databaseService.queryOne<{
      stockTotal: number;
      stockEnLigne: number;
      stockBrouillon: number;
      valeurStockTotal: number;
      valeurStockEnLigne: number;
      ageStockMoyen: number;
    }>(
      `SELECT 
        COUNT(*) as stockTotal,
        SUM(CASE WHEN tempsEnLigne IS NOT NULL AND tempsEnLigne != '' THEN 1 ELSE 0 END) as stockEnLigne,
        SUM(CASE WHEN tempsEnLigne IS NULL OR tempsEnLigne = '' THEN 1 ELSE 0 END) as stockBrouillon,
        COALESCE(SUM(prixArticle + COALESCE(prixLivraison, 0)), 0) as valeurStockTotal,
        COALESCE(SUM(CASE WHEN tempsEnLigne IS NOT NULL AND tempsEnLigne != '' THEN prixArticle + COALESCE(prixLivraison, 0) ELSE 0 END), 0) as valeurStockEnLigne,
        COALESCE(AVG(julianday('now') - julianday(created_at)), 0) as ageStockMoyen
      FROM products
      WHERE user_id = ? AND vendu = 0`,
      [user.id],
      "get-rotation-stock"
    );

    // === CONSTRUCTION DE LA RÉPONSE ===
    const dashboardData = {
      // Métriques principales
      ventesTotales: Math.round((ventesData?.ventesTotales || 0) * 100) / 100,
      produitsVendus: ventesData?.produitsVendus || 0,
      beneficesTotaux: Math.round((ventesData?.beneficesTotaux || 0) * 100) / 100,
      nombreColis: colisData?.nombreColis || 0,
      tauxConversion: Math.round(tauxConversion * 100) / 100,
      panierMoyen: Math.round(panierMoyen * 100) / 100,
      clientsActifs,
      
      // Statistiques des parcelles
      statsParcelles: statsParcelles.map(p => ({
        parcelleId: p.parcelleId,
        numero: p.numero || 'N/A',
        nom: p.nom || 'Sans nom',
        nbProduits: p.nbProduits || 0,
        nbVendus: p.nbVendus || 0,
        tauxVente: p.nbProduits > 0 ? Math.round((p.nbVendus / p.nbProduits) * 10000) / 100 : 0,
        poidsTotal: Math.round((p.poidsTotal || 0) * 100) / 100,
        coutTotal: Math.round((p.coutTotal || 0) * 100) / 100,
        chiffreAffaires: Math.round((p.chiffreAffaires || 0) * 100) / 100,
        benefices: Math.round((p.benefices || 0) * 100) / 100,
        ROI: p.coutTotal > 0 ? Math.round((p.benefices / p.coutTotal) * 10000) / 100 : 0,
      })),
      
      // Rotation des stocks
      rotationStock: rotationStock ? {
        stockTotal: rotationStock.stockTotal || 0,
        stockEnLigne: rotationStock.stockEnLigne || 0,
        stockBrouillon: rotationStock.stockBrouillon || 0,
        valeurStockTotal: Math.round((rotationStock.valeurStockTotal || 0) * 100) / 100,
        valeurStockEnLigne: Math.round((rotationStock.valeurStockEnLigne || 0) * 100) / 100,
        ageStockMoyen: Math.round((rotationStock.ageStockMoyen || 0) * 10) / 10,
        tauxRotation: rotationStock.stockTotal > 0 
          ? Math.round(((ventesData?.produitsVendus || 0) / rotationStock.stockTotal) * 10000) / 100
          : 0,
      } : null,
      
      // Performance temporelle
      performanceJournaliere: performanceJournaliere.map(p => ({
        date: p.date,
        ventes: Math.round((p.ventes || 0) * 100) / 100,
        commandes: p.commandes || 0,
        benefices: Math.round((p.benefices || 0) * 100) / 100
      })),
      
      // Top produits - on expose à la fois le CA (ventesRevenue) et le nombre d'unités vendues (ventesCount)
      topProduits: topProduits.map(p => ({
        nom: p.nom,
        ventesRevenue: Math.round((p.ventesRevenue || 0) * 100) / 100,
        ventesCount: p.ventesCount || 0,
        benefices: Math.round((p.benefices || 0) * 100) / 100,
        stock: p.stock || 0
      })),
      
      // Alertes
      alertes,
      
      // Métadonnées
      lastUpdate: new Date().toISOString()
    };

    return createSuccessResponse(dashboardData);
    
  } catch (error) {
    console.error("Erreur lors de la récupération des données du dashboard:", error);
    return createErrorResponse(error);
  }
}
