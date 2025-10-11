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