import { type ClassValue, clsx } from "clsx";

import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge class names
 * Combines clsx and tailwind-merge for optimal class handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export {
  formatEuro,
  formatPercentage,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatWeight,
  capitalize,
  truncate,
  type CurrencyCode,
  type WeightUnit,
  type DateFormatType,
} from '../../utils/formatting';

export { sleep } from '../../utils/async-utils';

// Re-export formatPercent as alias for backward compatibility
export { formatPercentage as formatPercent } from '../../utils/formatting';