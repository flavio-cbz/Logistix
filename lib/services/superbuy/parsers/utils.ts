/**
 * Utility functions for safely parsing data from unknown sources (API responses, DOM scraping)
 */

/**
 * Safely parse a number from any input.
 * Handles strings with currency symbols, commas, etc.
 * Returns defaultValue if parsing fails or result is NaN.
 */
export function safeFloat(value: unknown, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') return isNaN(value) ? defaultValue : value;

  const str = String(value).trim();
  if (str === '') return defaultValue;

  // Remove non-numeric characters except dot and minus, handle comma as decimal separator if needed
  // This is a simple implementation, for complex locale handling more logic might be needed
  const cleanStr = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleanStr);

  return isNaN(num) ? defaultValue : num;
}

/**
 * Safely parse an integer from any input.
 */
export function safeInt(value: unknown, defaultValue: number = 0): number {
  const num = safeFloat(value, defaultValue);
  return Math.round(num);
}

/**
 * Safely convert any input to a trimmed string.
 * Returns defaultValue if input is null/undefined/empty.
 */
export function safeString(value: unknown, defaultValue: string = ''): string {
  if (value === null || value === undefined) return defaultValue;
  const str = String(value).trim();
  return str === '' ? defaultValue : str;
}

/**
 * Safely parse a JSON string.
 * Returns undefined or a default value if parsing fails.
 */
export function safeJsonParse<T>(jsonString: unknown, defaultValue?: T): T | undefined {
  if (typeof jsonString !== 'string') return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}
