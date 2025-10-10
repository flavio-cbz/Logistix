/**
 * @fileoverview Unified formatting utilities for currency, numbers, dates, and other display formats
 * @description Consolidates all formatting functions into a single, consistent module
 * @version 1.0.0
 * @since 2025-01-10
 */

/**
 * Formats a number as currency in EUR using French locale
 * 
 * @description Uses Intl.NumberFormat for proper localization and currency formatting.
 * This is the unified currency formatter that replaces formatEuro and formatCurrency.
 * @param {number} amount - Amount to format in euros
 * @returns {string} Formatted currency string (e.g., "25,50 €")
 * @example
 * ```typescript
 * const formatted = formatCurrency(25.99); // "25,99 €"
 * const formatted2 = formatCurrency(1234.56); // "1 234,56 €"
 * ```
 * @since 1.0.0
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Formats a plain number with French locale and optional fraction digits
 * 
 * @description Formats numbers with proper French locale formatting (comma as decimal separator)
 * @param {number} value - Number to format
 * @param {number} maximumFractionDigits - Maximum number of decimal places (default: 2)
 * @returns {string} Formatted number string
 * @example
 * ```typescript
 * const formatted = formatNumber(1234.567, 2); // "1 234,57"
 * const formatted2 = formatNumber(100, 0); // "100"
 * ```
 * @since 1.0.0
 */
export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a percent value already expressed in percent (e.g. 72.73) -> "72,73 %"
 * 
 * @description Formats percentage values with proper French locale formatting
 * @param {number} value - Percentage value (e.g., 72.73 for 72.73%)
 * @param {number} maximumFractionDigits - Maximum number of decimal places (default: 2)
 * @returns {string} Formatted percentage string
 * @example
 * ```typescript
 * const formatted = formatPercent(72.73); // "72,73 %"
 * const formatted2 = formatPercent(100, 0); // "100 %"
 * ```
 * @since 1.0.0
 */
export function formatPercent(value: number, maximumFractionDigits = 2): string {
  const formatter = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });

  // Handle NaN / Infinity defensively
  if (!isFinite(value) || isNaN(value)) return "0 %";

  return `${formatter.format(value)} %`;
}

/**
 * Formats a date in French locale
 * 
 * @description Formats dates with French locale (day month year format)
 * @param {Date | string} date - Date to format (Date object or ISO string)
 * @returns {string} Formatted date string
 * @example
 * ```typescript
 * const formatted = formatDate(new Date()); // "10 janvier 2025"
 * const formatted2 = formatDate("2025-01-10"); // "10 janvier 2025"
 * ```
 * @since 1.0.0
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Formats weight in grams or kilograms based on value
 * 
 * @description Automatically chooses appropriate unit (g or kg) based on weight value
 * @param {number} grammes - Weight in grams
 * @returns {string} Formatted weight string (e.g., "250 g" or "1,25 kg")
 * @example
 * ```typescript
 * const light = formatWeight(250); // "250 g"
 * const heavy = formatWeight(1250); // "1,25 kg"
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
 * Capitalizes first letter of a string
 * 
 * @description Converts first character to uppercase and rest to lowercase
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 * @example
 * ```typescript
 * const capitalized = capitalize("hello world"); // "Hello world"
 * ```
 * @since 1.0.0
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncates text to specified length with ellipsis
 * 
 * @description Shortens text to specified length and adds ellipsis if truncated
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 * @example
 * ```typescript
 * const truncated = truncate("This is a long text", 10); // "This is a..."
 * ```
 * @since 1.0.0
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

/**
 * Sleep utility for delays
 * 
 * @description Creates a promise that resolves after specified milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after delay
 * @example
 * ```typescript
 * await sleep(1000); // Wait 1 second
 * ```
 * @since 1.0.0
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Legacy compatibility exports
/**
 * @deprecated Use formatCurrency instead
 * @description Legacy function for backward compatibility. Use formatCurrency for new code.
 */
export const formatEuro = formatCurrency;