/**
 * Barrel file for monitoring system
 *
 * Exports all monitoring-related functionality for easy import
 */

// Core monitoring service
export {
  UnifiedMonitoringService,
  getUnifiedMonitoring,
  monitorPerformance,
  type MonitoringConfig,
  type SystemStatus,
  type ComponentStatus,
  type PerformanceMetrics,
  type AlertMetrics,
  type CriticalMetrics,
} from './unified-monitoring-service';

// Structured logging
export {
  StructuredLoggingService,
  MetricsCollectionService,
} from './unified-monitoring-service';

// Performance monitoring
export {
  PerformanceMonitoringService,
  getPerformanceMonitor,
  type PerformanceAlert,
  type SystemMetrics,
  type DatabaseMetrics,
  type ApiMetrics,
} from './performance-monitor';

// Performance metrics collection
export {
  performanceCollector,
  measurePerformance,
  measureOperation,
  getPerformanceMetrics,
  resetPerformanceMetrics,
  type PerformanceMetric,
  type PerformanceStats,
} from './performance-metrics';

// Health checks
export {
  HealthCheckService,
  HealthChecks,
  type HealthCheckResult,
  type SystemHealthStatus,
  type HealthCheckConfig,
} from './health-check';

// Alerting system
export {
  AlertingService,
  type Alert,
  type AlertAction,
  type AlertRule,
  type AlertCondition,
  type AlertActionConfig,
} from './alerting-system';

// Metrics dashboard
export {
  MetricsDashboard,
  createMetricsDashboard,
  type DashboardMetrics,
  type MetricsExportOptions,
} from './metrics-dashboard';

// Convenience functions and factory methods
export {
  initializeMonitoring,
  quickHealthCheck,
  getCurrentMetrics,
  createOperationLogger,
  logBusinessEvent,
  logSecurityEvent,
  createCriticalAlert,
  getMonitoringDashboard,
  createMonitoringMiddleware,
  monitorDatabaseQuery,
  monitorCacheOperation,
} from './unified-monitoring-service';

// Constants and defaults
export {
  MONITORING_DEFAULTS,
  LOG_LEVELS,
  METRIC_TYPES,
  ALERT_SEVERITIES,
  COMPONENT_STATUSES,
} from './unified-monitoring-service';

// Integration test utilities
export {
  runMonitoringIntegrationTest,
  runAndLogMonitoringTest,
} from './monitoring-integration-test';
