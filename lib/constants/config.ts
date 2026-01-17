// lib/constants/config.ts

import {
  autoConfigManager,
  getApiTimeout,
  getAnalysisTimeout,
  getPollingInterval,
  getMaxRetries,
} from "@/lib/services/auto-config-manager";

export const getGlobalPerformanceConfig = () => {
  const config = autoConfigManager.getCurrentConfig() as { performance?: { profile?: string } };
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
  const config = autoConfigManager.getCurrentConfig() as { performance?: { profile?: string } };
  return config?.performance?.profile === "aggressive"
    ? 20
    : config?.performance?.profile === "balanced"
      ? 10
      : 5;
};

export interface TestProduct {
  name: string;
  expectedPriceRange: {
    min: number;
    max: number;
    currency: string;
  };
  description: string;
}

export const TEST_PRODUCTS: TestProduct[] = [
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

export const DEFAULT_TIMEOUT_SETTINGS: Record<string, number> = {
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

export const JWT_SECRET = (() => {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    // In development/test, allow a default for convenience
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return 'dev-only-secret-not-for-production-use-32chars';
    }
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return secret;
})();
export const COOKIE_NAME = process.env["COOKIE_NAME"] || "logistix_session";
export const getCookieMaxAgeValue = () => getCookieMaxAge();

// Scheduler Constants (maintenant adaptatifs)
export const getScheduleConfig = () => {
  const config = autoConfigManager.getCurrentConfig() as { performance?: { profile?: string } };
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

// Admin Constants - Password must come from environment
export const getDefaultAdminPassword = (): string => {
  const password = process.env['ADMIN_DEFAULT_PASSWORD'];
  if (!password) {
    throw new Error('ADMIN_DEFAULT_PASSWORD environment variable is required');
  }
  return password;
};

// =============================================================================
// FONCTIONS DE DÉTERMINATION AUTOMATIQUE DES CONSTANTES DE VALIDATION
// =============================================================================

/**
 * Détermine automatiquement l'ID d'un utilisateur admin pour les tests
 */
/**
 * Détermine automatiquement l'ID d'un utilisateur admin pour les tests
 */
async function determineTestAdminUserId(): Promise<string> {
  try {
    // Essayer d'importer le service de base de données unifiée (Drizzle)
    const { databaseService } = await import(
      "../database/database-service"
    );

    // Initialiser la base de données si nécessaire
    const db = await databaseService.getDb();

    // Chercher d'abord un utilisateur avec le plus de données
    try {
      // Import dynamique pour éviter cycles
      const { sql, desc } = await import("drizzle-orm");
      const { products } = await import("../database/schema");

      const result = await db.select({
        userId: products.userId,
        count: sql<number>`count(*)`
      })
        .from(products)
        .groupBy(products.userId)
        .orderBy(desc(sql`count(*)`))
        .limit(1);

      if (result.length > 0 && result[0].userId) {
        return result[0].userId;
      }
    } catch (_queryError) {
      // ignore
    }

    // Sinon, prendre le premier utilisateur créé
    try {
      const firstUser = await db.query.users.findFirst({
        orderBy: (users, { asc }) => [asc(users.createdAt)],
        columns: { id: true }
      });

      if (firstUser?.id) {
        return firstUser.id;
      }
    } catch (_userQueryError) {
      // ignore
    }

    // Fallback: ID par défaut
    return "e92b3c0d-e433-4853-94d9-6f3686b0df1d";
  } catch (_error) {
    return "e92b3c0d-e433-4853-94d9-6f3686b0df1d";
  }
}

/**
 * Détermine automatiquement les seuils de performance basés sur les capacités du système
 */
async function determinePerformanceThresholds() {
  const baseThresholds = {
    EXCELLENT_RESPONSE_TIME: 50,
    ACCEPTABLE_RESPONSE_TIME: 200,
    CONCURRENT_RESPONSE_TIME: 100,
  };

  try {
    // Test de latence système basique
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 1));
    const latency = Date.now() - start;

    // Ajuster les seuils en fonction de la latence du système
    const multiplier = Math.max(1, latency / 5); // Normaliser par rapport à 5ms

    return {
      EXCELLENT_RESPONSE_TIME: Math.round(
        baseThresholds.EXCELLENT_RESPONSE_TIME * multiplier,
      ),
      ACCEPTABLE_RESPONSE_TIME: Math.round(
        baseThresholds.ACCEPTABLE_RESPONSE_TIME * multiplier,
      ),
      CONCURRENT_RESPONSE_TIME: Math.round(
        baseThresholds.CONCURRENT_RESPONSE_TIME * multiplier,
      ),
    };
  } catch (_error) {
    // console.warn(
    //   "Impossible de déterminer automatiquement les seuils de performance:",
    //   error,
    // );
    return baseThresholds;
  }
}

/**
 * Détermine automatiquement le nombre d'itérations de test optimal
 */
function determineTestIterations(): number {
  // Basé sur les variables d'environnement ou calcul automatique
  const envIterations = process.env["VALIDATION_PERFORMANCE_ITERATIONS"];
  if (envIterations) {
    return Number(envIterations);
  }

  // Calcul automatique basé sur le NODE_ENV
  if (NODE_ENV === "production") {
    return 10; // Plus d'itérations en production pour plus de précision
  } else if (NODE_ENV === "test") {
    return 3; // Moins d'itérations en test pour aller plus vite
  } else {
    return 5; // Valeur par défaut pour le développement
  }
}

/**
 * Détermine automatiquement le nombre d'opérations concurrentes
 */
function determineConcurrentOperations(): number {
  const envConcurrent = process.env["VALIDATION_CONCURRENT_OPERATIONS"];
  if (envConcurrent) {
    return Number(envConcurrent);
  }

  // Calcul basé sur les capacités estimées du système
  const os = require("os");
  const cpuCount = os.cpus().length;

  // Utiliser un multiple du nombre de CPU, mais pas trop élevé
  return Math.min(Math.max(3, cpuCount * 2), 10);
}

// =============================================================================
// CONSTANTES DE VALIDATION AVEC DÉTERMINATION AUTOMATIQUE
// =============================================================================

// =============================================================================
// CONSTANTES DE VALIDATION AVEC DÉTERMINATION AUTOMATIQUE
// =============================================================================

// Cache pour les valeurs déterminées automatiquement
const validationConfigCache: {
  adminUserId?: string;
  performanceThresholds?: {
    EXCELLENT_RESPONSE_TIME: number;
    ACCEPTABLE_RESPONSE_TIME: number;
    CONCURRENT_RESPONSE_TIME: number;
  };
  initialized: boolean;
} = {
  initialized: false,
};

/**
 * Configuration de validation de base de données avec détermination automatique
 */
export const DATABASE_VALIDATION_CONFIG = {
  // Test user ID déterminé automatiquement
  get TEST_ADMIN_USER_ID(): string {
    if (validationConfigCache.adminUserId) {
      return validationConfigCache.adminUserId;
    }
    return (
      process.env["VALIDATION_ADMIN_USER_ID"] ||
      "e92b3c0d-e433-4853-94d9-6f3686b0df1d"
    );
  },

  // Performance test configuration
  get PERFORMANCE_TEST_ITERATIONS(): number {
    return determineTestIterations();
  },

  get CONCURRENT_TEST_OPERATIONS(): number {
    return determineConcurrentOperations();
  },

  // Performance thresholds déterminés automatiquement
  get PERFORMANCE_THRESHOLDS(): {
    EXCELLENT_RESPONSE_TIME: number;
    ACCEPTABLE_RESPONSE_TIME: number;
    CONCURRENT_RESPONSE_TIME: number;
  } {
    if (validationConfigCache.performanceThresholds) {
      return validationConfigCache.performanceThresholds;
    }
    return {
      EXCELLENT_RESPONSE_TIME:
        Number(process.env["VALIDATION_EXCELLENT_TIME"]) || 50,
      ACCEPTABLE_RESPONSE_TIME:
        Number(process.env["VALIDATION_ACCEPTABLE_TIME"]) || 200,
      CONCURRENT_RESPONSE_TIME:
        Number(process.env["VALIDATION_CONCURRENT_TIME"]) || 100,
    };
  },

  // Test configuration
  MAX_VALIDATION_RETRIES: Number(process.env["VALIDATION_MAX_RETRIES"]) || 3,
  VALIDATION_TIMEOUT: Number(process.env["VALIDATION_TIMEOUT"]) || 30000,
} as const;

/**
 * Fonction asynchrone pour initialiser les constantes de validation
 * À appeler au démarrage de l'application
 */
export async function initializeValidationConfig(): Promise<void> {
  if (validationConfigCache.initialized) {

    return;
  }

  try {


    // Déterminer l'utilisateur admin automatiquement
    const adminUserId = await determineTestAdminUserId();
    validationConfigCache.adminUserId = adminUserId;
    process.env["VALIDATION_ADMIN_USER_ID"] = adminUserId;


    // Déterminer les seuils de performance automatiquement
    const thresholds = await determinePerformanceThresholds();
    validationConfigCache.performanceThresholds = thresholds;
    process.env["VALIDATION_EXCELLENT_TIME"] =
      thresholds.EXCELLENT_RESPONSE_TIME.toString();
    process.env["VALIDATION_ACCEPTABLE_TIME"] =
      thresholds.ACCEPTABLE_RESPONSE_TIME.toString();
    process.env["VALIDATION_CONCURRENT_TIME"] =
      thresholds.CONCURRENT_RESPONSE_TIME.toString();


    validationConfigCache.initialized = true;

  } catch (_error) {
    // console.warn(
    //   "⚠️ Échec de l'initialisation automatique, utilisation des valeurs par défaut:",
    //   error,
    // );
    validationConfigCache.initialized = true; // Marquer comme initialisé même en cas d'erreur
  }
}

/**
 * Obtient un résumé de la configuration de validation déterminée automatiquement
 */
export function getValidationConfigSummary(): {
  initialized: boolean;
  adminUserId?: string | undefined;
  performanceThresholds?:
  | {
    EXCELLENT_RESPONSE_TIME: number;
    ACCEPTABLE_RESPONSE_TIME: number;
    CONCURRENT_RESPONSE_TIME: number;
  }
  | undefined;
  testIterations: number;
  concurrentOperations: number;
} {
  return {
    initialized: validationConfigCache.initialized,
    adminUserId: validationConfigCache.adminUserId,
    performanceThresholds: validationConfigCache.performanceThresholds,
    testIterations: determineTestIterations(),
    concurrentOperations: determineConcurrentOperations(),
  };
}
