/**
 * Feature Flags System
 *
 * This module provides a centralized feature flag system for gradual rollout
 * of changes and A/B testing capabilities.
 *
 * Requirements: 6.1, 6.4
 */

import { z } from "zod";

// ============================================================================
// FEATURE FLAG DEFINITIONS
// ============================================================================

export const FeatureFlagSchema = z.object({
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100).default(100),
  userGroups: z.array(z.string()).default([]),
  excludeUserGroups: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).default({}),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const FeatureFlagsConfigSchema = z.object({
  // Database and API refactoring flags
  unifiedDatabaseService: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description:
      "Use the new unified database service instead of legacy database clients",
  }),

  standardizedApiRoutes: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description:
      "Use standardized API routes with new middleware and validation",
  }),

  newAuthenticationSystem: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description: "Use the new authentication service and middleware",
  }),

  enhancedErrorHandling: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description: "Use the new error handling system with custom error classes",
  }),

  centralizedConfiguration: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description: "Use the centralized configuration service",
  }),

  // Performance and monitoring flags
  databaseQueryOptimization: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description: "Enable database query optimization and monitoring",
  }),

  cachingLayer: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description: "Enable caching layer for frequently accessed data",
  }),

  performanceMonitoring: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description: "Enable performance monitoring and metrics collection",
  }),

  // Frontend-backend alignment flags
  alignedTypeDefinitions: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description:
      "Use aligned TypeScript type definitions between frontend and backend",
  }),

  standardizedFormValidation: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description: "Use standardized form validation aligned with API schemas",
  }),

  // A/B Testing flags
  newProductFormUi: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 50,
    description: "A/B test for new product form UI design",
  }),

  // Development and debugging flags
  debugMode: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    userGroups: ["developers", "testers"],
    description: "Enable debug mode with additional logging and error details",
  }),

  maintenanceMode: FeatureFlagSchema.default({
    enabled: false,
    rolloutPercentage: 0,
    description: "Enable maintenance mode to prevent certain operations",
  }),
});

export type FeatureFlagsConfig = z.infer<typeof FeatureFlagsConfigSchema>;

// ============================================================================
// FEATURE FLAG SERVICE
// ============================================================================

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private config: FeatureFlagsConfig;
  private userGroupResolver?: (userId: string) => Promise<string[]>;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Load feature flags configuration from environment or config file
   */
  private loadConfig(): FeatureFlagsConfig {
    try {
      // Try to load from environment variable
      const envConfig = process.env['FEATURE_FLAGS_CONFIG'];
      if (envConfig) {
        const parsed = JSON.parse(envConfig);
        return FeatureFlagsConfigSchema.parse(parsed);
      }

      // Try to load from config file
      try {
        const fs = require("fs");
        const path = require("path");
        const configPath = path.join(
          process.cwd(),
          "config",
          "feature-flags.json",
        );

        if (fs.existsSync(configPath)) {
          const fileContent = fs.readFileSync(configPath, "utf-8");
          const parsed = JSON.parse(fileContent);
          return FeatureFlagsConfigSchema.parse(parsed);
        }
      } catch (error) {
        console.warn("Failed to load feature flags from file:", error);
      }

      // Return default configuration
      return FeatureFlagsConfigSchema.parse({});
    } catch (error) {
      console.error("Failed to parse feature flags configuration:", error);
      return FeatureFlagsConfigSchema.parse({});
    }
  }

  /**
   * Set a custom user group resolver function
   */
  public setUserGroupResolver(
    resolver: (userId: string) => Promise<string[]>,
  ): void {
    this.userGroupResolver = resolver;
  }

  /**
   * Check if a feature flag is enabled for a user
   */
  public async isEnabled(
    flagName: keyof FeatureFlagsConfig,
    userId?: string,
    userGroups?: string[],
  ): Promise<boolean> {
    const flag = this.config[flagName];

    if (!flag || !flag.enabled) {
      return false;
    }

    // Check date constraints
    if (flag.startDate && new Date() < new Date(flag.startDate)) {
      return false;
    }

    if (flag.endDate && new Date() > new Date(flag.endDate)) {
      return false;
    }

    // Resolve user groups if userId is provided and no groups are given
    let resolvedUserGroups = userGroups;
    if (userId && !resolvedUserGroups && this.userGroupResolver) {
      try {
        resolvedUserGroups = await this.userGroupResolver(userId);
      } catch (error) {
        console.warn("Failed to resolve user groups:", error);
        resolvedUserGroups = [];
      }
    }

    // Check user group exclusions
    if (flag.excludeUserGroups.length > 0 && resolvedUserGroups) {
      const hasExcludedGroup = flag.excludeUserGroups.some((group) =>
        resolvedUserGroups!.includes(group),
      );
      if (hasExcludedGroup) {
        return false;
      }
    }

    // Check user group inclusions
    if (flag.userGroups.length > 0) {
      if (!resolvedUserGroups) {
        return false;
      }
      const hasRequiredGroup = flag.userGroups.some((group) =>
        resolvedUserGroups!.includes(group),
      );
      if (!hasRequiredGroup) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      if (!userId) {
        // If no user ID, use random rollout
        return Math.random() * 100 < flag.rolloutPercentage;
      }

      // Use deterministic rollout based on user ID
      const hash = this.hashUserId(userId);
      const userPercentile = hash % 100;
      return userPercentile < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get feature flag configuration
   */
  public getFlag(flagName: keyof FeatureFlagsConfig): FeatureFlag | undefined {
    return this.config[flagName];
  }

  /**
   * Get all feature flags configuration
   */
  public getAllFlags(): FeatureFlagsConfig {
    return { ...this.config };
  }

  /**
   * Update a feature flag configuration
   */
  public updateFlag(
    flagName: keyof FeatureFlagsConfig,
    flag: Partial<FeatureFlag>,
  ): void {
    if (this.config[flagName]) {
      this.config[flagName] = { ...this.config[flagName], ...flag };
    }
  }

  /**
   * Reload configuration from source
   */
  public reloadConfig(): void {
    this.config = this.loadConfig();
  }

  /**
   * Create a simple hash from user ID for deterministic rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Check if a feature flag is enabled (convenience function)
 */
export async function isFeatureEnabled(
  flagName: keyof FeatureFlagsConfig,
  userId?: string,
  userGroups?: string[],
): Promise<boolean> {
  const service = FeatureFlagService.getInstance();
  return service.isEnabled(flagName, userId, userGroups);
}

/**
 * Get feature flag configuration (convenience function)
 */
export function getFeatureFlag(
  flagName: keyof FeatureFlagsConfig,
): FeatureFlag | undefined {
  const service = FeatureFlagService.getInstance();
  return service.getFlag(flagName);
}

/**
 * Feature flag decorator for functions
 */
export function withFeatureFlag(flagName: keyof FeatureFlagsConfig) {
  return function (
    _target: any,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const userId = (this as any).userId || args[0]?.userId;
      const enabled = await isFeatureEnabled(flagName, userId);

      if (!enabled) {
        throw new Error(`Feature ${flagName} is not enabled`);
      }

      return method.apply(this, args);
    };
  };
}

// ============================================================================
// REACT HOOKS (for frontend usage)
// ============================================================================

/**
 * React hook for feature flags (to be used in frontend components)
 */
export function useFeatureFlag(
  _flagName: keyof FeatureFlagsConfig,
  _userId?: string,
) {
  // This would be implemented in the frontend with React hooks
  // Placeholder for now
  return {
    isEnabled: false,
    isLoading: true,
    error: null,
  };
}

// ============================================================================
// MIDDLEWARE INTEGRATION
// ============================================================================

/**
 * Express middleware to add feature flag context to requests
 */
export function featureFlagMiddleware() {
  return async (req: any, _res: any, next: any) => {
    const service = FeatureFlagService.getInstance();

    req.featureFlags = {
      isEnabled: async (flagName: keyof FeatureFlagsConfig) => {
        const userId = req.user?.id;
        const userGroups = req.user?.groups;
        return service.isEnabled(flagName, userId, userGroups);
      },
      getFlag: (flagName: keyof FeatureFlagsConfig) =>
        service.getFlag(flagName),
    };

    next();
  };
}

export default FeatureFlagService;
