/**
 * @fileoverview Main utilities re-export
 * @description Re-exports consolidated utilities for backward compatibility
 * @deprecated Import directly from @/lib/shared/utils for new code
 */

// Re-export all utilities from the consolidated shared utilities
export {
  cn,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatWeight,
  capitalize,
  truncate,
  sleep,
  // Legacy compatibility
  formatEuro,
} from '@/lib/shared/utils';
