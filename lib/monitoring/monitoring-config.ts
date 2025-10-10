/**
 * Monitoring Configuration
 * 
 * Centralized configuration for the unified monitoring system.
 * Provides environment-specific settings and feature toggles.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */

import type { MonitoringConfig } from './unified-monitoring-service';

// ============================================================================
// ENVIRONMENT-BASED CONFIGURATION
// ============================================================================

/**
 * Get monitoring configuration based on environment
 */
export function getMonitoringConfig(): MonitoringConfig {
  const environment = process.env.NODE_ENV || 'development';
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  const baseConfig: MonitoringConfig = {
    enablePerformanceTracking: true,
    enableHealthChecks: true,
    enableAlerting: true,
    enableStructuredLogging: true,
    metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    healthCheckInterval: 30 * 1000, // 30 seconds
    alertCooldownPeriod: 5 * 60 * 1000, // 5 minutes
    logLevel: isDevelopment ? 'debug' : 'info',
  };

  // Environment-specific overrides
  if (isDevelopment) {
    return {
      ...baseConfig,
      logLevel: 'debug',
      healthCheckInterval: 60 * 1000, // 1 minute (less frequent in dev)
      metricsRetentionPeriod: 2 * 60 * 60 * 1000, // 2 hours (shorter retention)
    };
  }

  if (isProduction) {
    return {
      ...baseConfig,
      logLevel: 'info',
      healthCheckInterval: 15 * 1000, // 15 seconds (more frequent in prod)
      metricsRetentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days (longer retention)
      alertCooldownPeriod: 2 * 60 * 1000, // 2 minutes (faster alerts in prod)
    };
  }

  // Test environment
  if (environment === 'test') {
    return {
      ...baseConfig,
      enableAlerting: false, // Disable alerts in tests
      enableStructuredLogging: false, // Reduce noise in tests
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes (very infrequent)
      metricsRetentionPeriod: 10 * 60 * 1000, // 10 minutes (minimal retention)
      logLevel: 'error', // Only log errors in tests
    };
  }

  return baseConfig;
}

// ============================================================================
// FEATURE FLAGS FOR MONITORING
// ============================================================================

export interface MonitoringFeatureFlags {
  enableRealTimeMetrics: boolean;
  enablePerformanceProfiling: boolean;
  enableMemoryLeakDetection: boolean;
  enableDatabaseQueryAnalysis: boolean;
  enableCacheMetrics: boolean;
  enableSecurityEventLogging: boolean;
  enableBusinessEventTracking: boolean;
  enableCustomMetrics: boolean;
  enableAlertNotifications: boolean;
  enableMetricsExport: boolean;
}

/**
 * Get monitoring feature flags based on environment and configuration
 */
export function getMonitoringFeatureFlags(): MonitoringFeatureFlags {
  const environment = process.env.NODE_ENV || 'development';
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  return {
    enableRealTimeMetrics: true,
    enablePerformanceProfiling: isDevelopment || isProduction,
    enableMemoryLeakDetection: isProduction,
    enableDatabaseQueryAnalysis: true,
    enableCacheMetrics: true,
    enableSecurityEventLogging: isProduction,
    enableBusinessEventTracking: isProduction,
    enableCustomMetrics: true,
    enableAlertNotifications: isProduction,
    enableMetricsExport: isProduction,
  };
}

// ============================================================================
// PERFORMANCE THRESHOLDS
// ============================================================================

export interface PerformanceThresholds {
  // Response time thresholds (milliseconds)
  responseTime: {
    warning: number;
    critical: number;
  };
  
  // Database query thresholds (milliseconds)
  databaseQuery: {
    warning: number;
    critical: number;
  };
  
  // Memory usage thresholds (percentage)
  memoryUsage: {
    warning: number;
    critical: number;
  };
  
  // CPU usage thresholds (percentage)
  cpuUsage: {
    warning: number;
    critical: number;
  };
  
  // Error rate thresholds (percentage)
  errorRate: {
    warning: number;
    critical: number;
  };
  
  // Cache hit rate thresholds (percentage)
  cacheHitRate: {
    warning: number; // Below this is warning
    critical: number; // Below this is critical
  };
  
  // Disk usage thresholds (percentage)
  diskUsage: {
    warning: number;
    critical: number;
  };
}

/**
 * Get performance thresholds based on environment
 */
export function getPerformanceThresholds(): PerformanceThresholds {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';

  // Stricter thresholds in production
  const multiplier = isProduction ? 1 : 1.5;

  return {
    responseTime: {
      warning: 1000 * multiplier, // 1s in prod, 1.5s in dev
      critical: 3000 * multiplier, // 3s in prod, 4.5s in dev
    },
    databaseQuery: {
      warning: 500 * multiplier, // 500ms in prod, 750ms in dev
      critical: 2000 * multiplier, // 2s in prod, 3s in dev
    },
    memoryUsage: {
      warning: 80, // 80% always
      critical: 90, // 90% always
    },
    cpuUsage: {
      warning: 70, // 70% always
      critical: 85, // 85% always
    },
    errorRate: {
      warning: isProduction ? 0.01 : 0.05, // 1% in prod, 5% in dev
      critical: isProduction ? 0.05 : 0.1, // 5% in prod, 10% in dev
    },
    cacheHitRate: {
      warning: 70, // Below 70% is warning
      critical: 50, // Below 50% is critical
    },
    diskUsage: {
      warning: 80, // 80% always
      critical: 90, // 90% always
    },
  };
}

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  enableStructuredLogging: boolean;
  enableConsoleOutput: boolean;
  enableFileOutput: boolean;
  enableRemoteLogging: boolean;
  logRotation: {
    enabled: boolean;
    maxFiles: number;
    maxSize: string;
  };
  sensitiveDataMasking: boolean;
  includeStackTraces: boolean;
  includeTimestamps: boolean;
  includeCorrelationIds: boolean;
}

/**
 * Get logging configuration based on environment
 */
export function getLoggingConfig(): LoggingConfig {
  const environment = process.env.NODE_ENV || 'development';
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  return {
    level: isDevelopment ? 'debug' : isProduction ? 'info' : 'error',
    enableStructuredLogging: isProduction,
    enableConsoleOutput: true,
    enableFileOutput: isProduction,
    enableRemoteLogging: isProduction,
    logRotation: {
      enabled: isProduction,
      maxFiles: 10,
      maxSize: '10MB',
    },
    sensitiveDataMasking: true,
    includeStackTraces: isDevelopment || isProduction,
    includeTimestamps: true,
    includeCorrelationIds: isProduction,
  };
}

// ============================================================================
// ALERTING CONFIGURATION
// ============================================================================

export interface AlertingConfig {
  enabled: boolean;
  channels: {
    console: boolean;
    email: boolean;
    webhook: boolean;
    slack: boolean;
  };
  cooldownPeriods: {
    low: number; // minutes
    medium: number;
    high: number;
    critical: number;
  };
  escalation: {
    enabled: boolean;
    timeToEscalate: number; // minutes
    escalationLevels: string[];
  };
  suppressionRules: {
    enabled: boolean;
    maxAlertsPerHour: number;
    suppressDuplicates: boolean;
  };
}

/**
 * Get alerting configuration based on environment
 */
export function getAlertingConfig(): AlertingConfig {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';

  return {
    enabled: !isDevelopment, // Disable in development
    channels: {
      console: true,
      email: isProduction,
      webhook: isProduction,
      slack: isProduction,
    },
    cooldownPeriods: {
      low: 30, // 30 minutes
      medium: 15, // 15 minutes
      high: 5, // 5 minutes
      critical: 1, // 1 minute
    },
    escalation: {
      enabled: isProduction,
      timeToEscalate: 15, // 15 minutes
      escalationLevels: ['team-lead', 'manager', 'on-call'],
    },
    suppressionRules: {
      enabled: true,
      maxAlertsPerHour: isProduction ? 10 : 50,
      suppressDuplicates: true,
    },
  };
}

// ============================================================================
// HEALTH CHECK CONFIGURATION
// ============================================================================

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  checks: {
    database: boolean;
    cache: boolean;
    memory: boolean;
    disk: boolean;
    api: boolean;
    external: boolean;
  };
  endpoints: {
    health: string;
    ready: string;
    live: string;
  };
}

/**
 * Get health check configuration based on environment
 */
export function getHealthCheckConfig(): HealthCheckConfig {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';

  return {
    enabled: true,
    interval: isProduction ? 15000 : isDevelopment ? 60000 : 300000, // 15s prod, 1m dev, 5m test
    timeout: 5000, // 5 seconds
    retries: 3,
    checks: {
      database: true,
      cache: true,
      memory: true,
      disk: true,
      api: true,
      external: isProduction, // Only check external services in production
    },
    endpoints: {
      health: '/api/health',
      ready: '/api/ready',
      live: '/api/live',
    },
  };
}

// ============================================================================
// METRICS CONFIGURATION
// ============================================================================

export interface MetricsConfig {
  enabled: boolean;
  retentionPeriod: number; // milliseconds
  aggregationInterval: number; // milliseconds
  exportFormats: string[];
  customMetrics: boolean;
  realTimeUpdates: boolean;
  compression: boolean;
  sampling: {
    enabled: boolean;
    rate: number; // 0-1
  };
}

/**
 * Get metrics configuration based on environment
 */
export function getMetricsConfig(): MetricsConfig {
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';

  return {
    enabled: true,
    retentionPeriod: isProduction 
      ? 7 * 24 * 60 * 60 * 1000 // 7 days in production
      : isDevelopment 
        ? 2 * 60 * 60 * 1000 // 2 hours in development
        : 10 * 60 * 1000, // 10 minutes in test
    aggregationInterval: isProduction ? 60000 : 300000, // 1m prod, 5m others
    exportFormats: ['json', 'prometheus', 'csv'],
    customMetrics: true,
    realTimeUpdates: isProduction,
    compression: isProduction,
    sampling: {
      enabled: isProduction,
      rate: 0.1, // Sample 10% in production
    },
  };
}

// ============================================================================
// COMPLETE MONITORING CONFIGURATION
// ============================================================================

export interface CompleteMonitoringConfig {
  monitoring: MonitoringConfig;
  features: MonitoringFeatureFlags;
  thresholds: PerformanceThresholds;
  logging: LoggingConfig;
  alerting: AlertingConfig;
  healthCheck: HealthCheckConfig;
  metrics: MetricsConfig;
}

/**
 * Get complete monitoring configuration for the current environment
 */
export function getCompleteMonitoringConfig(): CompleteMonitoringConfig {
  return {
    monitoring: getMonitoringConfig(),
    features: getMonitoringFeatureFlags(),
    thresholds: getPerformanceThresholds(),
    logging: getLoggingConfig(),
    alerting: getAlertingConfig(),
    healthCheck: getHealthCheckConfig(),
    metrics: getMetricsConfig(),
  };
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate monitoring configuration
 */
export function validateMonitoringConfig(config: CompleteMonitoringConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate intervals
  if (config.monitoring.healthCheckInterval < 5000) {
    warnings.push('Health check interval is very frequent (< 5s), may impact performance');
  }

  if (config.monitoring.metricsRetentionPeriod < 60000) {
    warnings.push('Metrics retention period is very short (< 1m), may lose important data');
  }

  // Validate thresholds
  if (config.thresholds.responseTime.warning >= config.thresholds.responseTime.critical) {
    errors.push('Response time warning threshold must be less than critical threshold');
  }

  if (config.thresholds.memoryUsage.warning >= config.thresholds.memoryUsage.critical) {
    errors.push('Memory usage warning threshold must be less than critical threshold');
  }

  // Validate alerting
  if (config.alerting.enabled && !Object.values(config.alerting.channels).some(Boolean)) {
    warnings.push('Alerting is enabled but no channels are configured');
  }

  // Validate logging
  if (config.logging.enableFileOutput && !config.logging.logRotation.enabled) {
    warnings.push('File logging is enabled without log rotation, may cause disk space issues');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// ENVIRONMENT VARIABLE OVERRIDES
// ============================================================================

/**
 * Apply environment variable overrides to configuration
 */
export function applyEnvironmentOverrides(config: CompleteMonitoringConfig): CompleteMonitoringConfig {
  const overrides = { ...config };

  // Monitoring overrides
  if (process.env.MONITORING_ENABLED !== undefined) {
    overrides.monitoring.enablePerformanceTracking = process.env.MONITORING_ENABLED === 'true';
  }

  if (process.env.LOG_LEVEL) {
    overrides.monitoring.logLevel = process.env.LOG_LEVEL as any;
    overrides.logging.level = process.env.LOG_LEVEL as any;
  }

  if (process.env.HEALTH_CHECK_INTERVAL) {
    overrides.monitoring.healthCheckInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL, 10);
  }

  if (process.env.METRICS_RETENTION_HOURS) {
    overrides.monitoring.metricsRetentionPeriod = 
      parseInt(process.env.METRICS_RETENTION_HOURS, 10) * 60 * 60 * 1000;
  }

  // Alerting overrides
  if (process.env.ALERTING_ENABLED !== undefined) {
    overrides.alerting.enabled = process.env.ALERTING_ENABLED === 'true';
  }

  // Performance threshold overrides
  if (process.env.RESPONSE_TIME_WARNING_MS) {
    overrides.thresholds.responseTime.warning = parseInt(process.env.RESPONSE_TIME_WARNING_MS, 10);
  }

  if (process.env.RESPONSE_TIME_CRITICAL_MS) {
    overrides.thresholds.responseTime.critical = parseInt(process.env.RESPONSE_TIME_CRITICAL_MS, 10);
  }

  if (process.env.MEMORY_WARNING_PERCENT) {
    overrides.thresholds.memoryUsage.warning = parseInt(process.env.MEMORY_WARNING_PERCENT, 10);
  }

  if (process.env.MEMORY_CRITICAL_PERCENT) {
    overrides.thresholds.memoryUsage.critical = parseInt(process.env.MEMORY_CRITICAL_PERCENT, 10);
  }

  return overrides;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getMonitoringConfig,
  getMonitoringFeatureFlags,
  getPerformanceThresholds,
  getLoggingConfig,
  getAlertingConfig,
  getHealthCheckConfig,
  getMetricsConfig,
  getCompleteMonitoringConfig,
  validateMonitoringConfig,
  applyEnvironmentOverrides,
};