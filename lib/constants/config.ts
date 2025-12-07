// lib/constants/config.ts

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

// Auto-Configuration Replacements (remplace les constantes hardcodées)
export const getMaxExecutionTime = () => getApiTimeout(); // Dynamique selon l'environnement
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
  {
    name: "T-shirt",
    expectedPriceRange: {
      min: 5,
      max: 10,
      currency: "EUR",
    },
    description: "Test vêtement basique - validation fourchette 5-10€",
  },
  {
    name: "Sèche-cheveux Dyson",
    expectedPriceRange: {
      min: 100,
      max: 500,
      currency: "EUR",
    },
    description: "Test appareil électronique premium - validation prix >100€",
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
      "products",
      "parcelles",
      "users",
    ],
    ORPHAN_DATA_CHECKS: [
      "products without parcelles",
      "parcelles without users",
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
  DEBUG_MODE: "VALIDATION_DEBUG_MODE",
  API_TIMEOUT: "VALIDATION_API_TIMEOUT",
  ANALYSIS_TIMEOUT: "VALIDATION_ANALYSIS_TIMEOUT",
  MAX_RETRIES: "VALIDATION_MAX_RETRIES",
} as const;

// API Configuration endpoints
export const API_CONFIG = {
  endpoints: {
    catalogs: "/catalogs",
    brands: "/brands",
    colors: "/colors",
    materials: "/materials",
    statuses: "/item_statuses",
    sizes: "/sizes",
  },
  headers: {
    "User-Agent": "Logistix/1.0",
    Accept: "application/json",
  },
};

// Authentication Constants (maintenant dynamiques)
import { getCookieMaxAge } from "@/lib/services/auto-config-manager";

export const JWT_SECRET =
  process.env["JWT_SECRET"] ||
  "votre_secret_jwt_tres_securise_a_changer_en_production";
export const COOKIE_NAME = process.env["COOKIE_NAME"] || "logistix_session";
export const getCookieMaxAgeValue = () => getCookieMaxAge();

// Scheduler Constants (maintenant adaptatifs)
export const getScheduleConfig = () => {
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
        ? 10
        : config?.performance?.profile === "conservative"
          ? 3
          : 5,
    RETRY_DELAY: getPollingInterval(),
  };
};

// Admin Constants
export const DEFAULT_ADMIN_PASSWORD = "admin";

// ======================================================================