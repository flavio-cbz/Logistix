/**
 * Formatting utilities for display values
 */

/**
 * Formats a number as a Euro currency string
 *
 * @param value - The numeric value to format
 * @param options - Intl.NumberFormat options (optional)
 * @returns Formatted Euro string (e.g., "25,50 €")
 */
export function formatEuro(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || isNaN(value)) {
    return "0,00 €";
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

/**
 * Formats a number as a percentage string
 *
 * @param value - The numeric value to format (as decimal, e.g., 0.25 for 25%)
 * @param options - Intl.NumberFormat options (optional)
 * @returns Formatted percentage string (e.g., "25,5 %")
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

export function formatCurrency(value: number | null | undefined, options?: Intl.NumberFormatOptions): string {
  return formatEuro(value, options);
}

export function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions): string {
  if (value == null || isNaN(value)) return "0";
  return new Intl.NumberFormat('fr-FR', options).format(value);
}

export function formatDate(date: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return "";
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    ...options
  }).format(new Date(date));
}

export function formatWeight(weight: number | null | undefined): string {
  if (weight == null || isNaN(weight)) return "0 g";
  if (weight >= 1000) {
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