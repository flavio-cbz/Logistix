/**
 * Alert Service
 * Generates business alerts based on dashboard metrics
 */

import { BaseService } from "../base-service";
import { serviceContainer } from "../container";

export interface Alerte {
  type: "warning" | "info" | "error";
  message: string;
  action?: string;
}

export interface PerformanceJour {
  jour: string;
  totalVentes: number;
  totalBenefices: number;
  nbProduits: number;
}

export class AlertService extends BaseService {
  constructor() {
    super("AlertService");
  }

  /**
   * Generate business alerts based on user's metrics
   */
  async generateAlerts(
    userId: string,
    performanceJournaliere: PerformanceJour[]
  ): Promise<Alerte[]> {
    return this.executeOperation("generateAlerts", async () => {
      const alertes: Alerte[] = [];

      // Alert: Low stock
      const productService = serviceContainer.getProductService();
      const allProducts = await productService.getUserProducts(userId);
      const productsArray = Array.isArray(allProducts) ? allProducts : allProducts.data;
      const lowStockCount = productsArray.filter((p) => p.status === "draft").length;

      if (lowStockCount > 10) {
        alertes.push({
          type: "warning",
          message: `Vous avez ${lowStockCount} produits en stock non listés`,
          action: "Listez vos produits pour augmenter vos ventes",
        });
      }

      // Alert: Performance (no sales recently)
      if (performanceJournaliere.length > 0) {
        const dernierJour = performanceJournaliere[performanceJournaliere.length - 1];
        const avantDernierJour = performanceJournaliere[performanceJournaliere.length - 2];

        // Check if sales dropped to zero after having some
        if (dernierJour && avantDernierJour && avantDernierJour.totalVentes > 0 && dernierJour.totalVentes === 0) {
          alertes.push({
            type: "info",
            message: "Aucune vente aujourd'hui",
            action: "Vérifiez vos annonces actives",
          });
        }

        // Check if performance is improving
        if (dernierJour && avantDernierJour && dernierJour.totalVentes > avantDernierJour.totalVentes * 1.5) {
          alertes.push({
            type: "info",
            message: `📈 Vos ventes ont augmenté de ${Math.round(((dernierJour.totalVentes - avantDernierJour.totalVentes) / avantDernierJour.totalVentes) * 100)}%`,
            action: "Continuez sur cette lancée !",
          });
        }
      }

      // Alert: Negative profits
      const productsWithNegativeProfits = productsArray.filter((p) => {
        if (p.vendu !== "1") return false;
        const profit = (p.sellingPrice || 0) - (p.price || 0) - (p.coutLivraison || 0);
        return profit < 0;
      }).length;

      if (productsWithNegativeProfits > 0) {
        alertes.push({
          type: "error",
          message: `${productsWithNegativeProfits} produit(s) vendu(s) à perte`,
          action: "Vérifiez vos prix de vente",
        });
      }

      return alertes;
    }, { userId });
  }
}
