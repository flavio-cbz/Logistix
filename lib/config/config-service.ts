<<<<<<< HEAD
export const configService = {
    get: (key: string) => process.env[key],
    getNumber: (key: string, defaultValue: number) => {
        const val = process.env[key];
        return val ? parseInt(val, 10) : defaultValue;
    },
    getBoolean: (key: string, defaultValue: boolean) => {
        const val = process.env[key];
        return val ? val === 'true' : defaultValue;
    },
    getDatabasePath: () => process.env['DATABASE_PATH'] || 'f:/Youcloud/Documents/Projets/Logistix/prisma/dev.db',
    validateConfiguration: () => ({ valid: true, errors: [] }),
    getEnvironment: () => process.env['NODE_ENV'] || 'development',
    getFeatureFlags: () => ({
        newAuth: true,
        betaFeatures: false,
    }),
    getPort: () => parseInt(process.env['PORT'] || '3000', 10),
    getCorsOrigins: () => (process.env['CORS_ORIGINS'] || '*').split(','),
    getJwtSecret: () => process.env['JWT_SECRET'] || 'secret',
    getAllAdvancedFeatureFlags: () => ({}),
};
=======
import "server-only";
import {
  parseEnvironmentConfig,
  type Config,
  type DatabaseConfig,
  type AuthConfig,
  type AppConfig,
  type AdminConfig,
  type FeatureFlags,
  type LogLevel,
  type Environment,
} from "./schemas";
import { FeatureFlagService, type FeatureFlagsConfig } from "./feature-flags";

// ============================================================================
// CONFIGURATION SERVICE
// ============================================================================

/**
 * Centralized Configuration Service
 *
 * Provides type-safe access to all application configuration with:
 * - Environment variable parsing and validation
 * - Default value handling
 * - Configuration caching and refresh
 * - Type safety through Zod schemas
 * - Feature flag management
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: Config | null = null;
  private lastRefresh: number = 0;
  private refreshInterval: number = 60000; // 1 minute
  private isInitialized: boolean = false;
  private featureFlagService: FeatureFlagService;

  private constructor() {
    this.featureFlagService = FeatureFlagService.getInstance();
    this.loadConfiguration();
  }

  /**
   * Get the singleton instance of ConfigService
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load and validate configuration from environment variables
   */
  private loadConfiguration(): void {
    try {
      // Use the centralized environment parsing function
      this.config = parseEnvironmentConfig(process.env);
      this.lastRefresh = Date.now();
      this.isInitialized = true;

      this.logConfigLoad();
    } catch (error) {
      console.error("Configuration validation failed:", error);
      throw new Error(
        `Invalid configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Refresh configuration from environment variables
   */
  public refreshConfiguration(): void {
    this.loadConfiguration();
  }

  /**
   * Get configuration with automatic refresh if needed
   */
  private getConfig(): Config {
    if (!this.isInitialized || !this.config) {
      throw new Error("Configuration service is not initialized");
    }

    // Auto-refresh if interval has passed
    if (Date.now() - this.lastRefresh > this.refreshInterval) {
      try {
        this.refreshConfiguration();
      } catch (error) {
        console.warn(
          "Failed to refresh configuration, using cached version:",
          error,
        );
      }
    }

    return this.config;
  }

  // ============================================================================
  // DATABASE CONFIGURATION
  // ============================================================================

  public getDatabasePath(): string {
    return this.getConfig().database.path;
  }

  public getDatabaseMaxConnections(): number {
    return this.getConfig().database.maxConnections;
  }

  public getDatabaseConnectionTimeout(): number {
    return this.getConfig().database.connectionTimeout;
  }

  public isDatabaseWALEnabled(): boolean {
    return this.getConfig().database.enableWAL;
  }

  public isDatabaseLoggingEnabled(): boolean {
    return this.getConfig().database.enableLogging;
  }

  public getDatabaseConfig(): DatabaseConfig {
    return this.getConfig().database;
  }

  // ============================================================================
  // AUTHENTICATION CONFIGURATION
  // ============================================================================

  public getJwtSecret(): string {
    return this.getConfig().auth.jwtSecret;
  }

  public getCookieName(): string {
    return this.getConfig().auth.cookieName;
  }

  public getSessionTimeout(): number {
    return this.getConfig().auth.sessionTimeout;
  }

  public getBcryptRounds(): number {
    return this.getConfig().auth.bcryptRounds;
  }

  public getMaxLoginAttempts(): number {
    return this.getConfig().auth.maxLoginAttempts;
  }

  public getLockoutDuration(): number {
    return this.getConfig().auth.lockoutDuration;
  }

  public getAuthConfig(): AuthConfig {
    return this.getConfig().auth;
  }

  // ============================================================================
  // APPLICATION CONFIGURATION
  // ============================================================================

  public getEnvironment(): Environment {
    return this.getConfig().app.environment;
  }

  public getPort(): number {
    return this.getConfig().app.port;
  }

  public getLogLevel(): LogLevel {
    return this.getConfig().app.logLevel;
  }

  public isMetricsEnabled(): boolean {
    return this.getConfig().app.enableMetrics;
  }

  public isDebugEnabled(): boolean {
    return this.getConfig().app.enableDebug;
  }

  public getCorsOrigins(): string[] {
    return this.getConfig().app.corsOrigins;
  }

  public getAppConfig(): AppConfig {
    return this.getConfig().app;
  }

  // ============================================================================
  // ADMIN CONFIGURATION
  // ============================================================================

  public getAdminDefaultPassword(): string {
    return this.getConfig().admin.defaultPassword;
  }

  public isAdminPasswordChangeForced(): boolean {
    return this.getConfig().admin.forcePasswordChange;
  }

  public isAdminApiEnabled(): boolean {
    return this.getConfig().admin.enableAdminApi;
  }

  public getAdminConfig(): AdminConfig {
    return this.getConfig().admin;
  }

  // ============================================================================
  // FEATURE FLAGS (Legacy - for backward compatibility)
  // ============================================================================

  public isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.getConfig().features[feature];
  }

  public isAnalyticsEnabled(): boolean {
    return this.getConfig().features.enableAnalytics;
  }

  public isCachingEnabled(): boolean {
    return this.getConfig().features.enableCaching;
  }

  public isRateLimitEnabled(): boolean {
    return this.getConfig().features.enableRateLimit;
  }

  public getFeatureFlags(): FeatureFlags {
    return this.getConfig().features;
  }

  // ============================================================================
  // ADVANCED FEATURE FLAGS (New System)
  // ============================================================================

  /**
   * Check if an advanced feature flag is enabled for a user
   */
  public async isAdvancedFeatureEnabled(
    flagName: keyof FeatureFlagsConfig,
    userId?: string,
    userGroups?: string[],
  ): Promise<boolean> {
    return this.featureFlagService.isEnabled(flagName, userId, userGroups);
  }

  /**
   * Get advanced feature flag configuration
   */
  public getAdvancedFeatureFlag(flagName: keyof FeatureFlagsConfig) {
    return this.featureFlagService.getFlag(flagName);
  }

  /**
   * Get all advanced feature flags
   */
  public getAllAdvancedFeatureFlags(): FeatureFlagsConfig {
    return this.featureFlagService.getAllFlags();
  }

  /**
   * Update an advanced feature flag
   */
  public updateAdvancedFeatureFlag(
    flagName: keyof FeatureFlagsConfig,
    flag: Partial<any>,
  ): void {
    this.featureFlagService.updateFlag(flagName, flag);
  }

  /**
   * Reload advanced feature flags configuration
   */
  public reloadAdvancedFeatureFlags(): void {
    this.featureFlagService.reloadConfig();
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if running in development mode
   */
  public isDevelopment(): boolean {
    return this.getEnvironment() === "development";
  }

  /**
   * Check if running in production mode
   */
  public isProduction(): boolean {
    return this.getEnvironment() === "production";
  }

  /**
   * Check if running in test mode
   */
  public isTest(): boolean {
    return this.getEnvironment() === "test";
  }

  /**
   * Get complete configuration object (for debugging)
   */
  public getFullConfig(): Config {
    return this.getConfig();
  }

  /**
   * Validate configuration without throwing
   */
  public validateConfiguration(): { valid: boolean; errors?: string[] } {
    try {
      this.getConfig();
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [
          error instanceof Error ? error.message : "Unknown validation error",
        ],
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private logConfigLoad(): void {
    if (this.isDevelopment()) {
      console.log("[CONFIG] Configuration loaded successfully", {
        environment: this.getEnvironment(),
        databasePath: this.getDatabasePath(),
        cookieName: this.getCookieName(),
        logLevel: this.getLogLevel(),
        featuresEnabled: Object.entries(this.getFeatureFlags())
          .filter(([, enabled]) => enabled)
          .map(([feature]) => feature),
      });
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const configService = ConfigService.getInstance();

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export default configService;
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
