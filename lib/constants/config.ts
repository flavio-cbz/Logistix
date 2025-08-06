// lib/constants/config.ts

import { TestConfiguration, ProductTestCase, TimeoutSettings } from "@/lib/services/validation/types";

// Logging Constants
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}
export const NODE_ENV = typeof process !== 'undefined' ? process.env.NODE_ENV || 'development' : 'development';
export const LOG_LEVEL = NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

// Validation & Test Constants
export const MAX_EXECUTION_TIME = 5000;
export const CONCURRENT_REQUESTS = 10;

export const TEST_PRODUCTS: ProductTestCase[] = [
  {
    name: "Airpods",
    expectedPriceRange: {
      min: 50,
      max: 100,
      currency: "EUR"
    },
    description: "Test écouteurs Apple - validation fourchette 50-100€"
  },
  {
    name: "Robe",
    expectedPriceRange: {
      min: 5,
      max: 30,
      currency: "EUR"
    },
    description: "Test vêtement féminin - validation fourchette 5-30€"
  },
  {
    name: "T-shirt",
    expectedPriceRange: {
      min: 5,
      max: 10,
      currency: "EUR"
    },
    description: "Test vêtement basique - validation fourchette 5-10€"
  },
  {
    name: "Sèche-cheveux Dyson",
    expectedPriceRange: {
      min: 100,
      max: 500,
      currency: "EUR"
    },
    description: "Test appareil électronique premium - validation prix >100€"
  }
];

export const DEFAULT_TIMEOUT_SETTINGS: TimeoutSettings = {
  apiCallTimeout: 30000,
  analysisTimeout: 120000,
  pollingInterval: 2000,
  maxRetries: 3
};

export const VALIDATION_CONSTANTS = {
  DEBUG_LOG_LEVELS: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'] as const,
  API_VALIDATION: {
    MIN_TOKEN_LENGTH: 32,
    REQUIRED_SCOPES: ['read', 'search'],
    CONNECTION_TEST_ENDPOINT: '/api/v1/test'
  },
  DATABASE_VALIDATION: {
    INTEGRITY_CHECK_TABLES: [
      'market_analysis_tasks',
      'market_analysis_results',
      'market_metrics',
      'similar_sales'
    ],
    ORPHAN_DATA_CHECKS: [
      'market_analysis_results without tasks',
      'market_metrics without results',
      'similar_sales without results'
    ]
  },
  PERFORMANCE_THRESHOLDS: {
    MAX_API_RESPONSE_TIME: 5000,
    MAX_ANALYSIS_TIME: 120000,
    MAX_DATABASE_QUERY_TIME: 1000
  },
  ERROR_CATEGORIES: {
    TOKEN_ERROR: 'TOKEN_ERROR',
    API_ERROR: 'API_ERROR',
    ANALYSIS_ERROR: 'ANALYSIS_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SYSTEM_ERROR: 'SYSTEM_ERROR'
  } as const
};

export const ENV_KEYS = {
  VINTED_API_TOKEN: 'VINTED_ACCESS_TOKEN',
  VINTED_TOKEN_FALLBACK: 'VINTED_TOKEN',
  DEBUG_MODE: 'VALIDATION_DEBUG_MODE',
  API_TIMEOUT: 'VALIDATION_API_TIMEOUT',
  ANALYSIS_TIMEOUT: 'VALIDATION_ANALYSIS_TIMEOUT',
  MAX_RETRIES: 'VALIDATION_MAX_RETRIES'
} as const;

// Vinted API Constants
export const VINTED_API_URL = 'https://www.vinted.fr/api/v2/item_upload/items/similar_sold_items';
export const VINTED_API_CONFIG = {
  baseUrl: 'https://www.vinted.fr/api/v2',
  endpoints: {
    catalogs: '/catalogs',
    brands: '/brands',
    colors: '/colors',
    materials: '/materials',
    statuses: '/item_statuses',
    sizes: '/sizes'
  },
  headers: {
    'User-Agent': 'Logistix/1.0',
    'Accept': 'application/json'
  }
};

// Authentication Constants
export const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_tres_securise_a_changer_en_production";
export const COOKIE_NAME = process.env.COOKIE_NAME || "logistix_session";
export const COOKIE_MAX_AGE = Number(process.env.COOKIE_MAX_AGE) || 604800; // 7 days

// Scheduler Constants
export const SCHEDULE_CONFIG = {
  CHECK_INTERVAL: 60 * 1000, // 1 minute
  MAX_CONCURRENT_USERS: 5,
  RETRY_DELAY: 30 * 1000, // 30 secondes
};

// Admin Constants
export const DEFAULT_ADMIN_PASSWORD = "admin";