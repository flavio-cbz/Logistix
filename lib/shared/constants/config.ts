// Global configuration constants
import {
  autoConfigManager,
  getApiTimeout,
  getAnalysisTimeout,
  getPollingInterval,
  getMaxRetries,
} from "@/lib/services/auto-config-manager";

export const getGlobalPerformanceConfig = () => {
  const config = autoConfigManager.getCurrentConfig() as any;
  const baseInterval = 60 * 1000; // 1 minute de base

  return {
    CHECK_INTERVAL:
      config?.performance?.profile === "aggressive"
        ? baseInterval / 2
        : config?.performance?.profile === "conservative"
          ? baseInterval * 2
          : baseInterval,
    MAX_CONCURRENT_USERS:
      config?.performance?.profile === "aggressive"
        ? 100
        : config?.performance?.profile === "conservative"
          ? 25
          : 50
  };
};

// Logging Constants
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

export const NODE_ENV =
  typeof process !== "undefined"
    ? process.env["NODE_ENV"] || "development"
    : "development";

export const LOG_LEVEL =
  NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;

// API Configuration
export const VINTED_API_URL = "https://www.vinted.fr/api/v2";

// Auto-Configuration Replacements
export const getMaxExecutionTime = () => getApiTimeout();
export const getConcurrentRequests = () => {
  const config = autoConfigManager.getCurrentConfig() as any;
  return config?.performance?.profile === "aggressive"
    ? 20
    : config?.performance?.profile === "balanced"
      ? 10
      : 5;
};

export const TEST_PRODUCTS: any[] = [
  {
    name: "Airpods",
    expectedPriceRange: {
      min: 50,
      max: 100,
      currency: "EUR",
    },
    description: "Test écouteurs Apple - validation fourchette 50-100€",
  },
  {
    name: "Robe",
    expectedPriceRange: {
      min: 5,
      max: 30,
      currency: "EUR",
    },
    description: "Test vêtement féminin - validation fourchette 5-30€",
  },
];

export const DEFAULT_TIMEOUT_SETTINGS: any = {
  get apiCallTimeout() {
    return getApiTimeout();
  },
  get analysisTimeout() {
    return getAnalysisTimeout();
  },
  get pollingInterval() {
    return getPollingInterval();
  },
  get maxRetries() {
    return getMaxRetries();
  },
};

export const VALIDATION_CONSTANTS = {
  DEBUG_LOG_LEVELS: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"] as const,
  API_VALIDATION: {
    MIN_TOKEN_LENGTH: 32,
    REQUIRED_SCOPES: ["read", "search"],
    CONNECTION_TEST_ENDPOINT: "/api/v1/test",
  },
  DATABASE_VALIDATION: {
    INTEGRITY_CHECK_TABLES: [
      "market_analysis_tasks",
      "market_analysis_results",
      "market_metrics",
      "similar_sales",
    ],
    ORPHAN_DATA_CHECKS: [
      "market_analysis_results without tasks",
      "market_metrics without results",
      "similar_sales without results",
    ],
  },
  PERFORMANCE_THRESHOLDS: {
    MAX_API_RESPONSE_TIME: 5000,
    MAX_ANALYSIS_TIME: 120000,
    MAX_DATABASE_QUERY_TIME: 1000,
  },
  ERROR_CATEGORIES: {
    TOKEN_ERROR: "TOKEN_ERROR",
    API_ERROR: "API_ERROR",
    ANALYSIS_ERROR: "ANALYSIS_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    SYSTEM_ERROR: "SYSTEM_ERROR",
  } as const,
};

export const ENV_KEYS = {
  VINTED_API_TOKEN: "VINTED_ACCESS_TOKEN",
  VINTED_TOKEN_FALLBACK: "VINTED_TOKEN",
  DEBUG_MODE: "VALIDATION_DEBUG_MODE",
  API_TIMEOUT: "VALIDATION_API_TIMEOUT",
  ANALYSIS_TIMEOUT: "VALIDATION_ANALYSIS_TIMEOUT",
  MAX_RETRIES: "VALIDATION_MAX_RETRIES",
} as const;

// Authentication Constants
export const JWT_SECRET =
  process.env["JWT_SECRET"] ||
  "votre_secret_jwt_tres_securise_a_changer_en_production";
export const COOKIE_NAME = process.env["COOKIE_NAME"] || "logistix_session";

// Admin Constants
export const DEFAULT_ADMIN_PASSWORD = "admin";