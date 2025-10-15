/**
 * @fileoverview Product Field Normalizers
 * @description Utility functions to handle legacy field names and provide consistent access
 * to product data. These normalizers handle the transition from French to English field names.
 * 
 * **Canonical Fields** (Modern - English):
 * - `sellingPrice` (replaces `prixVente`, `prix_vente`)
 * - `listedAt` (replaces `dateMiseEnLigne`, `date_mise_en_ligne`)
 * - `soldAt` (replaces `dateVente`, `date_vente`)
 * - `shippingCost` (replaces `coutLivraison`, `cout_livraison`)
 * 
 * @version 1.0.0
 * @since 2025-10-15
 */

import type { Product } from "@/lib/shared/types/entities";

/**
 * Product with potential legacy field names from database
 */
export interface ProductWithLegacyFields extends Partial<Product> {
  // Legacy selling price fields
  prixVente?: number | null;
  prix_vente?: number | null;
  selling_price?: number | null;
  
  // Legacy listing date fields
  dateMiseEnLigne?: string | null;
  date_mise_en_ligne?: string | null;
  listed_at?: string | null;
  
  // Legacy sold date fields
  dateVente?: string | null;
  date_vente?: string | null;
  sold_at?: string | null;
  
  // Legacy shipping cost fields
  coutLivraison?: number | null;
  cout_livraison?: number | null;
  shipping_cost?: number | null;
}

/**
 * Get selling price from product, handling legacy field names
 * 
 * @description Returns the selling price checking modern field first, then legacy fields.
 * Priority: sellingPrice → prixVente → prix_vente → selling_price → null
 * 
 * @param product - Product object with potential legacy fields
 * @returns Selling price or null if not set
 * 
 * @example
 * ```typescript
 * const price = getSellingPrice(product);
 * console.log(price); // 35.50 or null
 * ```
 */
export function getSellingPrice(product: ProductWithLegacyFields): number | null {
  return (
    product.sellingPrice ??
    product.prixVente ??
    product.prix_vente ??
    product.selling_price ??
    null
  );
}

/**
 * Get listing date from product, handling legacy field names
 * 
 * @description Returns the listing date checking modern field first, then legacy fields.
 * Priority: listedAt → dateMiseEnLigne → date_mise_en_ligne → listed_at → null
 * 
 * @param product - Product object with potential legacy fields
 * @returns Listing date ISO string or null if not set
 * 
 * @example
 * ```typescript
 * const date = getListedAt(product);
 * console.log(date); // "2025-01-15T10:30:00Z" or null
 * ```
 */
export function getListedAt(product: ProductWithLegacyFields): string | null {
  return (
    product.listedAt ??
    product.dateMiseEnLigne ??
    product.date_mise_en_ligne ??
    product.listed_at ??
    null
  );
}

/**
 * Get sold date from product, handling legacy field names
 * 
 * @description Returns the sold date checking modern field first, then legacy fields.
 * Priority: soldAt → dateVente → date_vente → sold_at → null
 * 
 * @param product - Product object with potential legacy fields
 * @returns Sold date ISO string or null if not set
 * 
 * @example
 * ```typescript
 * const date = getSoldAt(product);
 * console.log(date); // "2025-02-01T14:20:00Z" or null
 * ```
 */
export function getSoldAt(product: ProductWithLegacyFields): string | null {
  return (
    product.soldAt ??
    product.dateVente ??
    product.date_vente ??
    product.sold_at ??
    null
  );
}

/**
 * Get shipping cost from product, handling legacy field names
 * 
 * @description Returns the shipping cost checking modern field first, then legacy fields.
 * Priority: shippingCost → coutLivraison → cout_livraison → shipping_cost → null
 * 
 * @param product - Product object with potential legacy fields
 * @returns Shipping cost or null if not set
 * 
 * @example
 * ```typescript
 * const cost = getShippingCost(product);
 * console.log(cost); // 3.50 or null
 * ```
 */
export function getShippingCost(product: ProductWithLegacyFields): number | null {
  return (
    product.coutLivraison ??
    product.cout_livraison ??
    product.shipping_cost ??
    null
  );
}

/**
 * Normalize a product by converting all legacy fields to canonical names
 * 
 * @description Creates a new product object with all fields using canonical (English) names.
 * Legacy fields are converted and the original legacy fields are removed.
 * This is useful when importing data from legacy systems or database queries.
 * 
 * @param raw - Raw product data potentially containing legacy field names
 * @returns Normalized product with canonical field names
 * 
 * @example
 * ```typescript
 * const legacy = { prixVente: 35, dateMiseEnLigne: "2025-01-15" };
 * const normalized = normalizeProduct(legacy);
 * // { sellingPrice: 35, listedAt: "2025-01-15" }
 * ```
 */
export function normalizeProduct(raw: ProductWithLegacyFields): Product {
  const normalized: any = { ...raw };
  
  // Normalize selling price
  const sellingPrice = getSellingPrice(raw);
  if (sellingPrice !== null) {
    normalized.sellingPrice = sellingPrice;
  }
  // Clean up legacy fields
  delete normalized.prixVente;
  delete normalized.prix_vente;
  delete normalized.selling_price;
  
  // Normalize listed date
  const listedAt = getListedAt(raw);
  if (listedAt !== null) {
    normalized.listedAt = listedAt;
  }
  // Clean up legacy fields
  delete normalized.dateMiseEnLigne;
  delete normalized.date_mise_en_ligne;
  delete normalized.listed_at;
  
  // Normalize sold date
  const soldAt = getSoldAt(raw);
  if (soldAt !== null) {
    normalized.soldAt = soldAt;
  }
  // Clean up legacy fields
  delete normalized.dateVente;
  delete normalized.date_vente;
  delete normalized.sold_at;
  
  // Normalize shipping cost
  const shippingCost = getShippingCost(raw);
  if (shippingCost !== null) {
    normalized.coutLivraison = shippingCost; // Keep coutLivraison for now
  }
  delete normalized.cout_livraison;
  delete normalized.shipping_cost;
  
  return normalized as Product;
}

/**
 * Check if a product has been sold
 * 
 * @description Determines if a product is sold by checking both the vendu flag
 * and the presence of a sold date.
 * 
 * @param product - Product to check
 * @returns True if product is marked as sold
 */
export function isProductSold(product: ProductWithLegacyFields): boolean {
  return product.vendu === "1" || getSoldAt(product) !== null;
}

/**
 * Check if a product is currently listed for sale
 * 
 * @description A product is considered listed if it has a listing date but no sold date
 * and is not marked as sold.
 * 
 * @param product - Product to check
 * @returns True if product is currently listed
 */
export function isProductListed(product: ProductWithLegacyFields): boolean {
  return getListedAt(product) !== null && !isProductSold(product);
}

/**
 * Calculate profit from product sale
 * 
 * @description Calculates profit as: sellingPrice - (purchasePrice + shippingCost)
 * Returns null if the product hasn't been sold or required data is missing.
 * 
 * @param product - Product with sale data
 * @returns Calculated profit or null if not applicable
 */
export function calculateProductProfit(product: ProductWithLegacyFields): number | null {
  const sellingPrice = getSellingPrice(product);
  const purchasePrice = product.price ?? 0;
  const shippingCost = getShippingCost(product) ?? 0;
  
  if (sellingPrice === null || !isProductSold(product)) {
    return null;
  }
  
  return sellingPrice - (purchasePrice + shippingCost);
}

/**
 * Type guard to check if an object is a ProductWithLegacyFields
 */
export function isProductWithLegacyFields(obj: any): obj is ProductWithLegacyFields {
  return (
    typeof obj === "object" &&
    obj !== null &&
    (obj.id !== undefined || obj.name !== undefined)
  );
}
