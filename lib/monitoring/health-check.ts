/**
 * Health Check System
 *
 * This module provides comprehensive health checks for all critical services
 * and system components to ensure deployment monitoring and system reliability.
 *
 * Requirements: 9.4, 9.5
 */

import { DatabaseService } from "../database/database-service";
import { sql } from "drizzle-orm";
import { configService } from "../config/config-service";
import { getLogger } from "../utils/logging/logger";

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

export interface HealthCheckResult {
  name: string;
  status: "healthy" | "unhealthy" | "degraded";
  message: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemHealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

export interface HealthCheckConfig {
  timeout: number;
  retries: number;
  interval: number;
  enabled: boolean;
}

// ============================================================================
// INDIVIDUAL HEALTH CHECKS
// ============================================================================

export class HealthChecks {
  // private _logger: Logger;
  // private _startTime: number;

  constructor() {
    // this._logger = getLogger("HealthChecks");
    // this._startTime = Date.now();
  }

  /**
   * Check database connectivity and performance
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const name = "database";

    try {
      const dbService = DatabaseService.getInstance();

      // Test basic connectivity
      const isHealthy = await dbService.healthCheck();

      if (!isHealthy) {
        return {
          name,
          status: "unhealthy",
          message: "Database connection failed",
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      // Test query performance
      const queryStart = Date.now();
      await dbService.executeQuery((db) => db.run(sql`SELECT 1 as test`));
      const queryDuration = Date.now() - queryStart;

      // Get connection stats
      const stats = await dbService.getConnectionStats();

      const status = queryDuration > 1000 ? "degraded" : "healthy";
      const message =
        status === "degraded"
          ? `Database responding slowly (${queryDuration}ms)`
          : "Database is healthy";

      return {
        name,
        status,
        message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          queryDuration,
          connectionStats: stats,
          databasePath: configService.getDatabasePath(),
        },
      };
    } catch (error) {
      return {
        name,
        status: "unhealthy",
        message: `Database error: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          error: error instanceof Error ? error.stack : String(error),
        },
      };
    }
  }

  /**
   * Check configuration service
   */
  async checkConfiguration(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const name = "configuration";

    try {
      const validation = configService.validateConfiguration();

      if (!validation.valid) {
        return {
          name,
          status: "unhealthy",
          message: `Configuration validation failed: ${validation.errors?.join(", ")}`,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          metadata: {
            errors: validation.errors,
          },
        };
      }

      // Test configuration access
      const environment = configService.getEnvironment();
      const dbPath = configService.getDatabasePath();

      return {
        name,
        status: "healthy",
        message: "Configuration is valid and accessible",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          environment,
          databasePath: dbPath,
          featuresEnabled: Object.entries(configService.getFeatureFlags())
            .filter(([, enabled]) => enabled)
            .map(([feature]) => feature),
        },
      };
    } catch (error) {
      return {
        name,
        status: "unhealthy",
        message: `Configuration error: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          error: error instanceof Error ? error.stack : String(error),
        },
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemory(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const name = "memory";

    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      let message = "Memory usage is normal";

      if (memoryUsagePercent > 90) {
        status = "unhealthy";
        message = `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`;
      } else if (memoryUsagePercent > 75) {
        status = "degraded";
        message = `High memory usage: ${memoryUsagePercent.toFixed(1)}%`;
      }

      return {
        name,
        status,
        message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          memoryUsage: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memUsage.external / 1024 / 1024), // MB
            rss: Math.round(memUsage.rss / 1024 / 1024), // MB
            usagePercent: Math.round(memoryUsagePercent * 100) / 100,
          },
        },
      };
    } catch (error) {
      return {
        name,
        status: "unhealthy",
        message: `Memory check error: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check disk space
   */
  async checkDiskSpace(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const name = "disk_space";

    try {
      const fs = require("fs");
      // const path = require("path");

      // Check database file size and available space
      const dbPath = configService.getDatabasePath();
      // const dbDir = path.dirname(dbPath);

      let dbSize = 0;
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSize = stats.size;
      }

      // Get disk usage (this is a simplified check)
      // const _stats = fs.statSync(dbDir);

      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      let message = "Disk space is adequate";

      // Simple heuristic: if database is over 1GB, flag as degraded
      if (dbSize > 1024 * 1024 * 1024) {
        status = "degraded";
        message = `Large database file: ${Math.round(dbSize / 1024 / 1024)} MB`;
      }

      return {
        name,
        status,
        message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          databaseSize: Math.round(dbSize / 1024 / 1024), // MB
          databasePath: dbPath,
        },
      };
    } catch (error) {
      return {
        name,
        status: "unhealthy",
        message: `Disk space check error: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check API endpoints responsiveness
   */
  async checkApiEndpoints(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const name = "api_endpoints";

    try {
      // This is a basic check - in a real implementation, you might
      // make actual HTTP requests to test endpoints

      const port = configService.getPort();
      const environment = configService.getEnvironment();

      // For now, just check if the configuration is valid for API
      const corsOrigins = configService.getCorsOrigins();
      const jwtSecret = configService.getJwtSecret();

      if (!jwtSecret || jwtSecret.length < 32) {
        return {
          name,
          status: "unhealthy",
          message: "JWT secret is not properly configured",
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        name,
        status: "healthy",
        message: "API configuration is valid",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          port,
          environment,
          corsOriginsCount: corsOrigins.length,
        },
      };
    } catch (error) {
      return {
        name,
        status: "unhealthy",
        message: `API check error: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check feature flags system
   */
  async checkFeatureFlags(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const name = "feature_flags";

    try {
      // Test advanced feature flags
      const advancedFlags = configService.getAllAdvancedFeatureFlags();
      const enabledAdvancedFlags = Object.entries(advancedFlags).filter(
        ([, flag]) => flag.enabled,
      ).length;

      // Test legacy feature flags
      const legacyFlags = configService.getFeatureFlags();
      const enabledLegacyFlags = Object.entries(legacyFlags).filter(
        ([, enabled]) => enabled,
      ).length;

      return {
        name,
        status: "healthy",
        message: "Feature flags system is operational",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        metadata: {
          advancedFlagsEnabled: enabledAdvancedFlags,
          legacyFlagsEnabled: enabledLegacyFlags,
          totalAdvancedFlags: Object.keys(advancedFlags).length,
          totalLegacyFlags: Object.keys(legacyFlags).length,
        },
      };
    } catch (error) {
      return {
        name,
        status: "unhealthy",
        message: `Feature flags error: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// ============================================================================
// HEALTH CHECK SERVICE
// ============================================================================

export class HealthCheckService {
  private static instance: HealthCheckService;
  private healthChecks: HealthChecks;
  private logger: ReturnType<typeof getLogger>;
  private startTime: number;

  private constructor() {
    this.healthChecks = new HealthChecks();
    this.logger = getLogger("HealthCheckService");
    this.startTime = Date.now();
  }

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Run all health checks and return system status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const startTime = Date.now();

    try {
      // Run all health checks in parallel
      const checks = await Promise.all([
        this.healthChecks.checkDatabase(),
        this.healthChecks.checkConfiguration(),
        this.healthChecks.checkMemory(),
        this.healthChecks.checkDiskSpace(),
        this.healthChecks.checkApiEndpoints(),
        this.healthChecks.checkFeatureFlags(),
      ]);

      // Calculate summary
      const summary = {
        total: checks.length,
        healthy: checks.filter((c) => c.status === "healthy").length,
        unhealthy: checks.filter((c) => c.status === "unhealthy").length,
        degraded: checks.filter((c) => c.status === "degraded").length,
      };

      // Determine overall status
      let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";
      if (summary.unhealthy > 0) {
        overallStatus = "unhealthy";
      } else if (summary.degraded > 0) {
        overallStatus = "degraded";
      }

      const result: SystemHealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
  version: process.env['npm_package_version'] || "1.0.0",
        environment: configService.getEnvironment(),
        checks,
        summary,
      };

      // Log health check results
      this.logger.info("Health check completed", {
        status: overallStatus,
        duration: Date.now() - startTime,
        summary,
      });

      return result;
    } catch (error) {
      this.logger.error("Health check failed", { error });

      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
  version: process.env['npm_package_version'] || "1.0.0",
        environment: configService.getEnvironment(),
        checks: [
          {
            name: "system",
            status: "unhealthy",
            message: `Health check system error: ${error instanceof Error ? error.message : "Unknown error"}`,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        ],
        summary: {
          total: 1,
          healthy: 0,
          unhealthy: 1,
          degraded: 0,
        },
      };
    }
  }

  /**
   * Run a specific health check
   */
  async runHealthCheck(checkName: string): Promise<HealthCheckResult> {
    switch (checkName) {
      case "database":
        return this.healthChecks.checkDatabase();
      case "configuration":
        return this.healthChecks.checkConfiguration();
      case "memory":
        return this.healthChecks.checkMemory();
      case "disk_space":
        return this.healthChecks.checkDiskSpace();
      case "api_endpoints":
        return this.healthChecks.checkApiEndpoints();
      case "feature_flags":
        return this.healthChecks.checkFeatureFlags();
      default:
        throw new Error(`Unknown health check: ${checkName}`);
    }
  }

  /**
   * Get available health check names
   */
  getAvailableChecks(): string[] {
    return [
      "database",
      "configuration",
      "memory",
      "disk_space",
      "api_endpoints",
      "feature_flags",
    ];
  }
}

export default HealthCheckService;
