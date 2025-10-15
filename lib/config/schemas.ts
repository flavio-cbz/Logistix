import { z } from "zod";

// ============================================================================
// CONFIGURATION SCHEMAS
// ============================================================================

/**
 * Database configuration schema
 *
 * Defines all database-related configuration options with validation
 * and default values for optimal performance and reliability.
 */
export const DatabaseConfigSchema = z.object({
  /** Path to the SQLite database file */
  path: z
    .string()
    .min(1, "Database path cannot be empty")
    .default("./data/logistix.db")
    .describe("Path to the SQLite database file"),

  /** Maximum number of concurrent database connections */
  maxConnections: z
    .number()
    .min(1, "Must have at least 1 connection")
    .max(100, "Cannot exceed 100 connections")
    .default(10)
    .describe("Maximum number of concurrent database connections"),

  /** Connection timeout in milliseconds */
  connectionTimeout: z
    .number()
    .min(1000, "Timeout must be at least 1 second")
    .max(60000, "Timeout cannot exceed 60 seconds")
    .default(30000)
    .describe("Connection timeout in milliseconds"),

  /** Enable Write-Ahead Logging for better performance */
  enableWAL: z
    .boolean()
    .default(true)
    .describe("Enable Write-Ahead Logging for better performance"),

  /** Enable database query logging */
  enableLogging: z
    .boolean()
    .default(false)
    .describe("Enable database query logging (development only)"),
});

/**
 * Authentication configuration schema
 *
 * Defines security-related configuration with strong defaults
 * for JWT tokens, sessions, and password policies.
 */
export const AuthConfigSchema = z.object({
  /** JWT secret key for token signing */
  jwtSecret: z
    .string()
    .min(32, "JWT secret must be at least 32 characters for security")
    .describe(
      "JWT secret key for token signing (must be secure in production)",
    ),

  /** Name of the authentication cookie */
  cookieName: z
    .string()
    .min(1, "Cookie name cannot be empty")
    .default("logistix_session")
    .describe("Name of the authentication cookie"),

  /** Session timeout in seconds */
  sessionTimeout: z
    .number()
    .min(300, "Session timeout must be at least 5 minutes")
    .max(86400, "Session timeout cannot exceed 24 hours")
    .default(3600)
    .describe("Session timeout in seconds (default: 1 hour)"),

  /** Number of bcrypt rounds for password hashing */
  bcryptRounds: z
    .number()
    .min(10, "Bcrypt rounds must be at least 10 for security")
    .max(15, "Bcrypt rounds should not exceed 15 for performance")
    .default(12)
    .describe("Number of bcrypt rounds for password hashing"),

  /** Maximum login attempts before lockout */
  maxLoginAttempts: z
    .number()
    .min(3, "Must allow at least 3 login attempts")
    .max(10, "Cannot exceed 10 login attempts")
    .default(5)
    .describe("Maximum login attempts before account lockout"),

  /** Account lockout duration in seconds */
  lockoutDuration: z
    .number()
    .min(300, "Lockout duration must be at least 5 minutes")
    .max(3600, "Lockout duration should not exceed 1 hour")
    .default(900)
    .describe("Account lockout duration in seconds (default: 15 minutes)"),
});

/**
 * Application configuration schema
 *
 * Defines general application settings including environment,
 * logging, and runtime behavior.
 */
export const AppConfigSchema = z.object({
  /** Application environment */
  environment: z
    .enum(["development", "production", "test"])
    .default("development")
    .describe("Application environment"),

  /** Server port number */
  port: z
    .number()
    .min(1000, "Port must be at least 1000")
    .max(65535, "Port cannot exceed 65535")
    .default(3000)
    .describe("Server port number"),

  /** Logging level */
  logLevel: z
    .enum(["error", "warn", "info", "debug"])
    .default("info")
    .describe("Application logging level"),

  /** Enable performance metrics collection */
  enableMetrics: z
    .boolean()
    .default(false)
    .describe("Enable performance metrics collection"),

  /** Enable debug mode */
  enableDebug: z
    .boolean()
    .default(false)
    .describe("Enable debug mode with additional logging"),

  /** CORS allowed origins */
  corsOrigins: z
    .array(z.string().url("Must be a valid URL"))
    .default(["http://localhost:3000"])
    .describe("CORS allowed origins"),
});

/**
 * Admin configuration schema
 *
 * Defines administrative settings including default credentials
 * and admin-specific features.
 */
export const AdminConfigSchema = z.object({
  /** Default admin password */
  defaultPassword: z
    .string()
    .min(8, "Admin password must be at least 8 characters")
    .describe("Default admin password (must be changed in production)"),

  /** Force password change on first login */
  forcePasswordChange: z
    .boolean()
    .default(true)
    .describe("Force admin to change password on first login"),

  /** Enable admin API endpoints */
  enableAdminApi: z
    .boolean()
    .default(false)
    .describe("Enable administrative API endpoints"),
});

/**
 * Feature flags configuration schema
 *
 * Defines toggleable features for gradual rollout and
 * A/B testing capabilities.
 */
export const FeatureFlagsSchema = z.object({
  /** Enable analytics and tracking */
  enableAnalytics: z
    .boolean()
    .default(false)
    .describe("Enable analytics and user behavior tracking"),

  /** Enable caching layer */
  enableCaching: z
    .boolean()
    .default(false)
    .describe("Enable Redis or in-memory caching"),

  /** Enable API rate limiting */
  enableRateLimit: z
    .boolean()
    .default(true)
    .describe("Enable API rate limiting for security"),

  /** Enable metrics collection */
  enableMetrics: z
    .boolean()
    .default(false)
    .describe("Enable detailed performance metrics collection"),
});

/**
 * Complete application configuration schema
 *
 * Combines all configuration sections into a single,
 * comprehensive configuration object.
 */
export const ConfigSchema = z.object({
  /** Database configuration */
  database: DatabaseConfigSchema,

  /** Authentication and security configuration */
  auth: AuthConfigSchema,

  /** General application configuration */
  app: AppConfigSchema,

  /** Administrative configuration */
  admin: AdminConfigSchema,

  /** Feature flags and toggles */
  features: FeatureFlagsSchema,
});

// ============================================================================
// ENVIRONMENT VARIABLE MAPPING
// ============================================================================

/**
 * Maps environment variables to configuration schema
 *
 * This mapping defines how environment variables are parsed
 * and validated against the configuration schema.
 */
export const EnvironmentVariableMapping = {
  // Database configuration
  DATABASE_PATH: "database.path",
  DATABASE_MAX_CONNECTIONS: "database.maxConnections",
  DATABASE_CONNECTION_TIMEOUT: "database.connectionTimeout",
  DATABASE_ENABLE_WAL: "database.enableWAL",
  DATABASE_ENABLE_LOGGING: "database.enableLogging",

  // Authentication configuration
  JWT_SECRET: "auth.jwtSecret",
  COOKIE_NAME: "auth.cookieName",
  SESSION_TIMEOUT: "auth.sessionTimeout",
  BCRYPT_ROUNDS: "auth.bcryptRounds",
  MAX_LOGIN_ATTEMPTS: "auth.maxLoginAttempts",
  LOCKOUT_DURATION: "auth.lockoutDuration",

  // Application configuration
  NODE_ENV: "app.environment",
  PORT: "app.port",
  LOG_LEVEL: "app.logLevel",
  ENABLE_METRICS: "app.enableMetrics",
  ENABLE_DEBUG: "app.enableDebug",
  CORS_ORIGINS: "app.corsOrigins",

  // Admin configuration
  ADMIN_DEFAULT_PASSWORD: "admin.defaultPassword",
  ADMIN_FORCE_PASSWORD_CHANGE: "admin.forcePasswordChange",
  ENABLE_ADMIN_API: "admin.enableAdminApi",

  // Feature flags
  ENABLE_VINTED_INTEGRATION: "features.enableVintedIntegration",
  ENABLE_ANALYTICS: "features.enableAnalytics",
  ENABLE_CACHING: "features.enableCaching",
  ENABLE_RATE_LIMIT: "features.enableRateLimit",
  ENABLE_METRICS_COLLECTION: "features.enableMetrics",
} as const;

// ============================================================================
// CONFIGURATION VALIDATION HELPERS
// ============================================================================

/**
 * Validates a configuration object against the schema
 */
export function validateConfig(
  config: unknown,
): z.SafeParseReturnType<unknown, z.infer<typeof ConfigSchema>> {
  return ConfigSchema.safeParse(config);
}

/**
 * Gets default configuration values
 */
export function getDefaultConfig(): z.infer<typeof ConfigSchema> {
  return ConfigSchema.parse({
    database: {},
    auth: {
      jwtSecret:
        "default-secret-that-is-at-least-32-characters-long-for-testing",
    },
    app: {},
    admin: {
      defaultPassword: "default-admin-password",
    },
    features: {},
  });
}

/**
 * Validates environment variables and returns parsed configuration
 */
export function parseEnvironmentConfig(
  env: Record<string, string | undefined>,
): z.infer<typeof ConfigSchema> {
  const rawConfig = {
    database: {
      path: env['DATABASE_PATH'],
      maxConnections: env['DATABASE_MAX_CONNECTIONS']
        ? parseInt(env['DATABASE_MAX_CONNECTIONS'], 10)
        : undefined,
      connectionTimeout: env['DATABASE_CONNECTION_TIMEOUT']
        ? parseInt(env['DATABASE_CONNECTION_TIMEOUT'], 10)
        : undefined,
      enableWAL: env['DATABASE_ENABLE_WAL']
        ? env['DATABASE_ENABLE_WAL'].toLowerCase() === "true"
        : undefined,
      enableLogging: env['DATABASE_ENABLE_LOGGING']
        ? env['DATABASE_ENABLE_LOGGING'].toLowerCase() === "true"
        : undefined,
    },
    auth: {
      jwtSecret: env['JWT_SECRET'],
      cookieName: env['COOKIE_NAME'],
      sessionTimeout: env['SESSION_TIMEOUT']
        ? parseInt(env['SESSION_TIMEOUT'], 10)
        : undefined,
      bcryptRounds: env['BCRYPT_ROUNDS']
        ? parseInt(env['BCRYPT_ROUNDS'], 10)
        : undefined,
      maxLoginAttempts: env['MAX_LOGIN_ATTEMPTS']
        ? parseInt(env['MAX_LOGIN_ATTEMPTS'], 10)
        : undefined,
      lockoutDuration: env['LOCKOUT_DURATION']
        ? parseInt(env['LOCKOUT_DURATION'], 10)
        : undefined,
    },
    app: {
      environment: env['NODE_ENV'] as "development" | "production" | "test",
      port: env['PORT'] ? parseInt(env['PORT'], 10) : undefined,
      logLevel: env['LOG_LEVEL'] as "error" | "warn" | "info" | "debug",
      enableMetrics: env['ENABLE_METRICS']
        ? env['ENABLE_METRICS'].toLowerCase() === "true"
        : undefined,
      enableDebug: env['ENABLE_DEBUG']
        ? env['ENABLE_DEBUG'].toLowerCase() === "true"
        : undefined,
      corsOrigins: env['CORS_ORIGINS']
        ? env['CORS_ORIGINS'].split(",").map((origin) => origin.trim())
        : undefined,
    },
    admin: {
      defaultPassword: env['ADMIN_DEFAULT_PASSWORD'],
      forcePasswordChange: env['ADMIN_FORCE_PASSWORD_CHANGE']
        ? env['ADMIN_FORCE_PASSWORD_CHANGE'].toLowerCase() === "true"
        : undefined,
      enableAdminApi: env['ENABLE_ADMIN_API']
        ? env['ENABLE_ADMIN_API'].toLowerCase() === "true"
        : undefined,
    },
    features: {
      enableAnalytics: env['ENABLE_ANALYTICS']
        ? env['ENABLE_ANALYTICS'].toLowerCase() === "true"
        : undefined,
      enableCaching: env['ENABLE_CACHING']
        ? env['ENABLE_CACHING'].toLowerCase() === "true"
        : undefined,
      enableRateLimit: env['ENABLE_RATE_LIMIT']
        ? env['ENABLE_RATE_LIMIT'].toLowerCase() === "true"
        : undefined,
      enableMetrics: env['ENABLE_METRICS_COLLECTION']
        ? env['ENABLE_METRICS_COLLECTION'].toLowerCase() === "true"
        : undefined,
    },
  };

  return ConfigSchema.parse(rawConfig);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type AdminConfig = z.infer<typeof AdminConfigSchema>;
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export type LogLevel = AppConfig["logLevel"];
export type Environment = AppConfig["environment"];
