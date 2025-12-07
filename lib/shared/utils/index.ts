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
  formatWeight,
  capitalize,
  truncate,
} from '../../utils/formatting';

export { sleep } from '../../utils/async-utils';