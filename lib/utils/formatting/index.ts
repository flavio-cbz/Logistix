/**
 * Formatting utilities for display values
 * Supports user preferences for currency, weight unit, and date format
 */

export type CurrencyCode = "EUR" | "USD" | "CNY";
export type WeightUnit = "g" | "kg";
export type DateFormatType = "DD/MM/YYYY" | "MM/DD/YYYY";

/**
 * Currency configuration mapping
 */
const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; currency: string }> = {
  EUR: { locale: "fr-FR", currency: "EUR" },
  USD: { locale: "en-US", currency: "USD" },
  CNY: { locale: "zh-CN", currency: "CNY" },
};

/**
 * Formats a number as a Euro currency string (legacy function)
 */
export function formatEuro(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  return formatCurrency(value, "EUR", options);
}

/**
 * Formats a number as a percentage string
 */
export function formatPercentage(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || isNaN(value)) {
    return "0 %";
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    ...options,
  }).format(value);
}

/**
 * Formats a number as a currency string
 * 
 * @param value - The numeric value to format
 * @param currency - Currency code (EUR, USD, CNY). Defaults to EUR
 * @param options - Intl.NumberFormat options (optional)
 * @returns Formatted currency string (e.g., "25,50 €", "$25.50", "¥25.50")
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: CurrencyCode = "EUR",
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || isNaN(value)) {
    const config = CURRENCY_CONFIG[currency];
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }

  const config = CURRENCY_CONFIG[currency];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions): string {
  if (value == null || isNaN(value)) return "0";
  return new Intl.NumberFormat('fr-FR', options).format(value);
}

/**
 * Formats a date according to user preference
 * 
 * @param date - The date to format
 * @param format - Date format preference (DD/MM/YYYY or MM/DD/YYYY)
 * @param options - Additional Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  format: DateFormatType = "DD/MM/YYYY",
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";

  const dateObj = new Date(date);

  // If custom options provided, use them with appropriate locale
  if (options) {
    const locale = format === "MM/DD/YYYY" ? "en-US" : "fr-FR";
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  }

  // Use simple format based on preference
  if (format === "MM/DD/YYYY") {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateObj);
  }

  // Default DD/MM/YYYY
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
}

/**
 * Formats a date with time for display
 */
export function formatDateTime(
  date: Date | string | number | null | undefined,
  format: DateFormatType = "DD/MM/YYYY"
): string {
  if (!date) return "";

  const locale = format === "MM/DD/YYYY" ? "en-US" : "fr-FR";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/**
 * Formats weight according to user preference
 * 
 * @param weight - Weight value in grams
 * @param unit - Preferred unit (g or kg). Defaults to auto (g for <1000, kg for >=1000)
 * @param forceUnit - If true, always use the specified unit without auto-conversion
 * @returns Formatted weight string
 */
export function formatWeight(
  weight: number | null | undefined,
  unit?: WeightUnit,
  forceUnit: boolean = false
): string {
  if (weight == null || isNaN(weight)) return "0 g";

  // If forceUnit is true and unit is specified, use that unit
  if (forceUnit && unit) {
    if (unit === "kg") {
      return `${formatNumber(weight / 1000, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
    }
    return `${formatNumber(weight)} g`;
  }

  // Auto-convert based on value (legacy behavior) if no unit preference
  // or if unit is "kg" and value is >= 1000
  if (unit === "kg" || (!unit && weight >= 1000)) {
    return `${formatNumber(weight / 1000, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  }

  return `${formatNumber(weight)} g`;
}

export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str: string, length: number): string {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + "...";
}