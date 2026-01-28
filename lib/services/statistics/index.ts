/**
 * Statistics Services - Barrel Export
 *
 * This module exports all statistics-related services as a unified interface.
 * Import from here instead of individual files for cleaner imports.
 */

export { DashboardStatsService } from './dashboard-stats.service';
export { ProductStatsService, productStatsService } from './product-stats.service';
export { AdvancedStatsService, advancedStatsService } from './advanced-stats.service';
export { calculateTrend, getDateRanges } from './utils';
