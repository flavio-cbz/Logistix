import type { Parcelle, Product } from "@/lib/database/schema";

// Extended Product type for calculations that includes calculated fields
interface ProductForCalculation extends Partial<Product> {
  benefices?: number | null;
  coutLivraison?: number | null;
  prixVente?: number | null;
  vendu?: "0" | "1";
}

/**
 * Calculates profit and profit percentage for a product
 * 
 * @description Computes profit metrics for sold products by calculating the difference
 * between sale price and total costs (purchase price + shipping). Returns zero values
 * for unsold products or products with missing data.
 * @param {Partial<Product>} produit - Product data with pricing information
 * @returns {{ benefices: number, pourcentageBenefice: number }} Profit metrics object
 * @example
 * ```typescript
 * const metrics = calculerBenefices({
 *   vendu: true,
 *   prixVente: 35,
 *   price: 25,
 *   coutLivraison: 3.5
 * });
 * // Returns: { benefices: 6.5, pourcentageBenefice: 22.8 }
 * ```
 * @since 1.0.0
 */
export function calculerBenefices(produit: ProductForCalculation) {
  // Business logic: Only calculate profits for sold products with complete data
  // Return zero values for unsold products or missing required fields
  const isVendu = typeof produit.vendu === 'boolean' ? produit.vendu : produit.vendu === '1';
  if (
    !isVendu ||
    produit.prixVente == null ||
    produit.price == null ||
    produit.coutLivraison == null
  ) {
    return { benefices: 0, pourcentageBenefice: 0 };
  }

  // Data validation: Return NaN for invalid numeric values to indicate data issues
  // This helps identify data quality problems in the UI
  if (
    isNaN(produit.prixVente) ||
    isNaN(produit.price) ||
    isNaN(produit.coutLivraison)
  ) {
    return { benefices: NaN, pourcentageBenefice: NaN };
  }

  // Financial calculation: Total cost includes purchase price and shipping
  const coutTotal = produit.price + produit.coutLivraison;
  // Profit is the difference between sale price and total costs
  const benefices = produit.prixVente - coutTotal;

  // Garde contre la division par zéro si le coût total est 0
  if (coutTotal === 0) {
    return { benefices, pourcentageBenefice: 0 };
  }

  const pourcentageBenefice = (benefices / coutTotal) * 100;

  return { benefices, pourcentageBenefice };
}

/**
 * Calculates shipping price based on product weight and parcelle pricing
 * 
 * @description Computes shipping cost by finding the specific parcelle and multiplying
 * product weight by the parcelle's price per gram. Returns 0 if parcelle is not found.
 * @param {number} poids - Product weight in grams
 * @param {Parcelle[]} parcelles - Array of all available parcelles
 * @param {string} parcelleId - ID of the parcelle associated with the product
 * @returns {number} Calculated shipping price in euros (0 if parcelle not found)
 * @example
 * ```typescript
 * const cost = calculPrixLivraison(250, parcelles, 'parcelle-123');
 * ```
 * @since 1.0.0
 */
export function calculPrixLivraison(
  poids: number,
  parcelles: Parcelle[],
  parcelleId: string,
): number {
  // Business logic: Find the specific parcelle by ID to get pricing information
  const parcelle = parcelles.find((p) => p.id === parcelleId);
  
  // Safety check: Return 0 cost if parcelle is not found (prevents errors)
  if (!parcelle) return 0;

  // Financial calculation: Multiply weight by price per gram
  // Use 0 as fallback if prixParGramme is null/undefined
  return poids * (parcelle.prixParGramme || 0);
}

/**
 * Gets the current timestamp in ISO format
 * 
 * @description Returns the current date and time as an ISO 8601 string.
 * Useful for timestamping operations and logging.
 * @returns {string} Current timestamp in ISO format (e.g., "2025-01-09T10:30:00.000Z")
 * @example
 * ```typescript
 * const timestamp = getCurrentTimestamp();
 * // // console.log(timestamp); // "2025-01-09T10:30:00.000Z"
 * ```
 * @since 1.0.0
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
