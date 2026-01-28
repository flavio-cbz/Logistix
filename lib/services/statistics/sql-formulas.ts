import { sql } from "drizzle-orm";
import { products, parcels } from "@/lib/database/schema";

/**
 * Standard SQL formulas for financial calculations.
 * Centralizes logic to ensure consistency across all statistics services.
 */
export const sqlFormulas = {
  // Shipping cost calculation:
  // Use explicit coutLivraison if available, otherwise fallback to weight * parcel price per gram
  coutLivraison: sql<number>`COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)`,

  // Total cost calculation:
  // Purchase price + Shipping cost
  coutTotal: sql<number>`(${products.price} + COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0))`,

  // Profit calculation (unit):
  // Selling price - Total cost
  benefice: sql<number>`(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0))`,

  // Aggregations
  sumChiffreAffaires: sql<number>`COALESCE(SUM(${products.sellingPrice}), 0)`,

  sumBenefices: sql<number>`COALESCE(SUM(${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)), 0)`,

  // Conditional Aggregations (for "sold" products only within a larger set)
  sumChiffreAffairesVendus: sql<number>`COALESCE(SUM(CASE WHEN ${products.vendu} = '1' THEN ${products.sellingPrice} ELSE 0 END), 0)`,

  sumBeneficesVendus: sql<number>`COALESCE(SUM(CASE WHEN ${products.vendu} = '1' THEN (${products.sellingPrice} - ${products.price} - COALESCE(${products.coutLivraison}, ${parcels.pricePerGram} * ${products.poids}, 0)) ELSE 0 END), 0)`,

  // Counts
  countVendus: sql<number>`SUM(CASE WHEN ${products.vendu} = '1' THEN 1 ELSE 0 END)`,
};
