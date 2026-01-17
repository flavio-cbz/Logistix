/**
 * @fileoverview Product calculation utilities for pricing, profit, and metrics
 * @description This module provides comprehensive calculation functions for product-related
 * financial metrics including shipping costs, profits, margins, and validation utilities.
 * All calculations follow business rules for e-commerce product management.
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */

import type { Parcel } from "@/lib/types/entities";

/**
 * Calculates the shipping cost for a product based on weight and price per gram
 * 
 * @description Computes shipping cost by multiplying product weight with the price per gram
 * from the associated parcelle. Returns 0 if weight is invalid or price per gram is not available.
 * @param {number} poids - Product weight in grams
 * @param {number | null | undefined} prixParGramme - Price per gram from parcelle
 * @returns {number} Calculated shipping cost in euros
 * @example
 * ```typescript
 * const cost = calculateShippingCost(250, 0.05); // 12.5 euros
 * ```
 * @since 1.0.0
 */
export function calculateShippingCost(
  poids: number,
  prixParGramme: number | null | undefined
): number {
  if (!prixParGramme || poids <= 0) return 0;
  return poids * prixParGramme;
}

/**
 * Calculates the total cost of a product including purchase price and shipping
 * 
 * @description Computes the total cost by adding the purchase price and shipping cost.
 * This represents the total investment in the product before sale.
 * @param {number} prixAchat - Purchase price of the product in euros
 * @param {number} coutLivraison - Shipping cost in euros
 * @returns {number} Total cost (purchase + shipping) in euros
 * @example
 * ```typescript
 * const total = calculateTotalCost(25.99, 3.50); // 29.49 euros
 * ```
 * @since 1.0.0
 */
export function calculateTotalCost(
  prixAchat: number,
  coutLivraison: number
): number {
  return prixAchat + coutLivraison;
}

/**
 * Calculates the profit from a sold product
 * 
 * @description Computes profit by subtracting total cost from sale price.
 * Positive values indicate profit, negative values indicate loss.
 * @param {number} prixVente - Sale price of the product in euros
 * @param {number} coutTotal - Total cost (purchase + shipping) in euros
 * @returns {number} Profit amount in euros (can be negative for losses)
 * @example
 * ```typescript
 * const profit = calculateProfit(35.00, 29.49); // 5.51 euros profit
 * ```
 * @since 1.0.0
 */
export function calculateProfit(
  prixVente: number,
  coutTotal: number
): number {
  return prixVente - coutTotal;
}

/**
 * Calculates the profit percentage based on total cost
 * 
 * @description Computes profit percentage by dividing profit by total cost and multiplying by 100.
 * Returns 0 if total cost is 0 to avoid division by zero.
 * @param {number} benefice - Profit amount in euros
 * @param {number} coutTotal - Total cost in euros
 * @returns {number} Profit percentage (e.g., 18.7 for 18.7%)
 * @example
 * ```typescript
 * const percentage = calculateProfitPercentage(5.51, 29.49); // ~18.7%
 * ```
 * @since 1.0.0
 */
export function calculateProfitPercentage(
  benefice: number,
  coutTotal: number
): number {
  if (coutTotal === 0) return 0;
  return (benefice / coutTotal) * 100;
}

/**
 * Calculates the profit margin as a percentage of sale price
 * 
 * @description Computes profit margin by dividing profit by sale price and multiplying by 100.
 * This shows what percentage of the sale price is profit. Returns 0 if sale price is 0.
 * @param {number} benefice - Profit amount in euros
 * @param {number} prixVente - Sale price in euros
 * @returns {number} Profit margin percentage (e.g., 15.7 for 15.7%)
 * @example
 * ```typescript
 * const margin = calculateMargin(5.51, 35.00); // ~15.7%
 * ```
 * @since 1.0.0
 */
export function calculateMargin(
  benefice: number,
  prixVente: number
): number {
  if (prixVente === 0) return 0;
  return (benefice / prixVente) * 100;
}

/**
 * Calculates the number of days between two dates
 * 
 * @description Computes the difference in days between start and end dates.
 * Returns null if either date is null/undefined or if dates are invalid.
 * @param {string | null | undefined} dateDebut - Start date in ISO string format
 * @param {string | null | undefined} dateFin - End date in ISO string format
 * @returns {number | null} Number of days between the dates (null if invalid dates)
 * @example
 * ```typescript
 * const days = calculateDaysBetween('2025-01-01', '2025-01-10'); // 9 days
 * ```
 * @since 1.0.0
 */
export function calculateDaysBetween(
  dateDebut: string | null | undefined,
  dateFin: string | null | undefined
): number | null {
  if (!dateDebut || !dateFin) return null;

  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);

  if (isNaN(debut.getTime()) || isNaN(fin.getTime())) return null;

  const diffTime = Math.abs(fin.getTime() - debut.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formate un montant en euros avec le symbole €
 * 
 * ```typescript
 * const formatted = formatEuro(25.99); // "25,99 €"
 * ```
 * @since 1.0.0
 */
export function formatEuro(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(montant);
}

/**
 * Formats weight in grams or kilograms based on value
 * 
 * @description Formats weight display by showing grams for values under 1000g
 * and kilograms with 2 decimal places for values 1000g and above.
 * @param {number} grammes - Weight in grams
 * @returns {string} Formatted weight string (e.g., "250 g" or "1.25 kg")
 * @example
 * ```typescript
 * const light = formatWeight(250); // "250 g"
 * const heavy = formatWeight(1250); // "1.25 kg"
 * ```
 * @since 1.0.0
 */
export function formatWeight(grammes: number): string {
  if (grammes >= 1000) {
    return `${(grammes / 1000).toFixed(2)} kg`;
  }
  return `${grammes.toFixed(0)} g`;
}

/**
 * Interface pour les métriques calculées d'un produit
 */
export interface ProductMetrics {
  coutLivraison: number;
  coutTotal: number;
  benefice: number | null;
  pourcentageBenefice: number | null;
  marge: number | null;
  joursEnVente: number | null;
}

/**
 * Calculates all product metrics in a single operation
 * 
 * @description Computes comprehensive product metrics including shipping cost, total cost,
 * profit, profit percentage, margin, and days on sale. This is an optimized function
 * that performs all calculations at once to avoid redundant computations.
 * @param {number} prixAchat - Purchase price in euros
 * @param {number} poids - Product weight in grams
 * @param {number | null | undefined} prixVente - Sale price in euros (null if not sold)
 * @param {string | null | undefined} dateMiseEnLigne - Date when product was listed
 * @param {string | null | undefined} dateVente - Date when product was sold
 * @param {Parcelle | null | undefined} parcelle - Associated parcelle for shipping calculation
 * @returns {ProductMetrics} Complete metrics object with all calculated values
 * @example
 * ```typescript
 * const metrics = calculateProductMetrics(25, 250, 35, '2025-01-01', '2025-01-10', parcelle);
 * // metrics.benefice contains the profit amount
 * ```
 * @since 1.0.0
 */
export function calculateProductMetrics(
  prixAchat: number,
  poids: number,
  prixVente: number | null | undefined,
  dateMiseEnLigne: string | null | undefined,
  dateVente: string | null | undefined,
  parcelle: Parcel | null | undefined
): ProductMetrics {
  // Business logic: Calculate shipping cost based on product weight and parcelle pricing
  // This uses the parcelle's price per gram to determine shipping costs
  const coutLivraison = calculateShippingCost(
    poids,
    parcelle?.pricePerGram
  );

  // Business logic: Total cost includes both purchase price and shipping
  // This represents the total investment before any profit calculation
  const coutTotal = calculateTotalCost(prixAchat, coutLivraison);

  // Initialize profit-related metrics as null (unsold product state)
  let benefice: number | null = null;
  let pourcentageBenefice: number | null = null;
  let marge: number | null = null;

  // Business logic: Only calculate profit metrics if product has been sold
  // This prevents showing misleading profit data for unsold items
  if (prixVente && prixVente > 0) {
    // Calculate absolute profit amount
    benefice = calculateProfit(prixVente, coutTotal);

    // Calculate profit percentage relative to total cost (ROI perspective)
    pourcentageBenefice = calculateProfitPercentage(benefice, coutTotal);

    // Calculate profit margin relative to sale price (business margin perspective)
    marge = calculateMargin(benefice, prixVente);
  }

  // Business logic: Calculate days on market for performance analysis
  // This helps understand how long products take to sell
  const joursEnVente = calculateDaysBetween(dateMiseEnLigne, dateVente);

  return {
    coutLivraison,
    coutTotal,
    benefice,
    pourcentageBenefice,
    marge,
    joursEnVente,
  };
}

/**
 * Validates that all required fields are present for marking a product as sold
 * 
 * @description Checks if the core required fields (listing date, sale date, sale price) are provided
 * and valid for marking a product as sold. Platform is now optional for flexibility.
 * @param {string | null | undefined} dateMiseEnLigne - Date when product was listed
 * @param {string | null | undefined} dateVente - Date when product was sold
 * @param {number | null | undefined} prixVente - Sale price in euros
 * @returns {boolean} True if all required fields are present and valid
 * @example
 * ```typescript
 * const isValid = validateSoldProductFields('2025-01-01', '2025-01-10', 35.00);
 * // Returns: true
 * ```
 * @since 1.0.0
 */
export function validateSoldProductFields(
  dateMiseEnLigne: string | null | undefined,
  dateVente: string | null | undefined,
  prixVente: number | null | undefined
): boolean {
  // Business logic: Core fields are required to mark a product as sold
  // This ensures data integrity and prevents incomplete sale records
  return !!(
    dateMiseEnLigne &&    // Must have listing date for performance tracking
    dateVente &&          // Must have sale date for completion tracking
    prixVente &&          // Must have sale price for profit calculation
    prixVente > 0         // Sale price must be positive (business rule)
  );
}

/**
 * Returns the missing fields for a sold product
 * 
 * @description Identifies which required fields are missing for marking a product as sold.
 * Returns an array of field names that need to be provided. Platform is now optional.
 * @param {string | null | undefined} dateMiseEnLigne - Date when product was listed
 * @param {string | null | undefined} dateVente - Date when product was sold
 * @param {number | null | undefined} prixVente - Sale price in euros
 * @returns {string[]} Array of missing field names
 * @example
 * ```typescript
 * const missing = getMissingSoldFields(null, '2025-01-10', 35.00);
 * // Returns: ['Date de mise en ligne']
 * ```
 * @since 1.0.0
 */
export function getMissingSoldFields(
  dateMiseEnLigne: string | null | undefined,
  dateVente: string | null | undefined,
  prixVente: number | null | undefined
): string[] {
  const missing: string[] = [];

  // Business logic: Check each required field and collect missing ones
  // This provides user-friendly feedback for incomplete sale data
  if (!dateMiseEnLigne) missing.push("Date de mise en ligne");  // Required for performance tracking
  if (!dateVente) missing.push("Date de vente");                // Required for completion status
  if (!prixVente || prixVente <= 0) missing.push("Prix de vente"); // Required for profit calculation
  // plateforme is now optional

  return missing;
}
