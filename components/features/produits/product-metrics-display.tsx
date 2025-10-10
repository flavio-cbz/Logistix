/**
 * Composant pour afficher les métriques financières d'un produit
 * Affiche le coût de livraison, coût total, bénéfice et autres indicateurs
 */

import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductMetrics } from "@/lib/utils/product-calculations";
import { formatEuro } from "@/lib/utils/product-calculations";

interface ProductMetricsDisplayProps {
  metrics: ProductMetrics;
  showProfit?: boolean;
  className?: string;
}

export function ProductMetricsDisplay({
  metrics,
  showProfit = false,
  className,
}: ProductMetricsDisplayProps) {
  const { coutLivraison, coutTotal, benefice, pourcentageBenefice, marge, joursEnVente } = metrics;

  return (
    <div className={cn("space-y-2 text-xs", className)}>
      {/* Coût de livraison */}
      {coutLivraison > 0 && (
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Coût livraison:</span>
          <span className="font-medium">{formatEuro(coutLivraison)}</span>
        </div>
      )}

      {/* Coût total */}
      {coutTotal > 0 && (
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Coût total:</span>
          <span className="font-semibold text-foreground">{formatEuro(coutTotal)}</span>
        </div>
      )}

      {/* Bénéfice (si vendu et demandé) */}
      {showProfit && benefice !== null && (
        <>
          <div className="h-px bg-border my-2" />
          
          <div
            className={cn(
              "flex items-center justify-between font-semibold",
              benefice > 0
                ? "text-green-600 dark:text-green-400"
                : benefice < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-1">
              {benefice > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : benefice < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              <span>Bénéfice:</span>
            </div>
            <span className="text-sm">{formatEuro(benefice)}</span>
          </div>

          {/* Pourcentage de bénéfice */}
          {pourcentageBenefice !== null && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Rendement:</span>
              <span
                className={cn(
                  "font-medium",
                  pourcentageBenefice > 0
                    ? "text-green-600 dark:text-green-400"
                    : pourcentageBenefice < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                )}
              >
                {pourcentageBenefice.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Marge */}
          {marge !== null && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Marge:</span>
              <span
                className={cn(
                  "font-medium",
                  marge > 0
                    ? "text-green-600 dark:text-green-400"
                    : marge < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                )}
              >
                {marge.toFixed(1)}%
              </span>
            </div>
          )}

          {/* Jours en vente */}
          {joursEnVente !== null && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Temps en vente:</span>
              <span className="font-medium">
                {joursEnVente} jour{joursEnVente > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
