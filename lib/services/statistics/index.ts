/**
 * Statistics Services - Barrel Export
 * 
 * This module exports all statistics-related services as a unified interface.
 * Import from here instead of individual files for cleaner imports.
 */

export { DashboardStatsService, dashboardStatsService } from './dashboard-stats.service';
export { ProductStatsService, productStatsService } from './product-stats.service';
export { AdvancedStatsService, advancedStatsService, calculateTrend, getDateRanges } from './advanced-stats.service';
