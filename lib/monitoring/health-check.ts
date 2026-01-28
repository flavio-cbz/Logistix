/**
 * Health Check System
 *
 * This module provides comprehensive health checks for all critical services
 * and system components to ensure deployment monitoring and system reliability.
 *
 * Requirements: 9.4, 9.5
 */

import { configService } from "@/lib/config/config-service";
import { getLogger } from "../utils/logging/logger";
import { SystemHealthStatus, HealthCheckResult } from "./types";
import { DatabaseChecker } from "./checkers/database-checker";
import { SystemChecker } from "./checkers/system-checker";

// ============================================================================
// HEALTH CHECK SERVICE
// ============================================================================

export class HealthCheckService {
  private static instance: HealthCheckService;
  private logger: ReturnType<typeof getLogger>;
  private startTime: number;
  private databaseChecker: DatabaseChecker;
  private systemChecker: SystemChecker;

  private constructor() {
    this.logger = getLogger("HealthCheckService");
    this.startTime = Date.now();
    this.databaseChecker = new DatabaseChecker();
    this.systemChecker = new SystemChecker();
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
        this.databaseChecker.check(),
        this.systemChecker.checkConfiguration(),
        this.systemChecker.checkMemory(),
        this.systemChecker.checkDiskSpace(),
        this.systemChecker.checkApiEndpoints(),
        this.systemChecker.checkFeatureFlags(),
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
        return this.databaseChecker.check();
      case "configuration":
        return this.systemChecker.checkConfiguration();
      case "memory":
        return this.systemChecker.checkMemory();
      case "disk_space":
        return this.systemChecker.checkDiskSpace();
      case "api_endpoints":
        return this.systemChecker.checkApiEndpoints();
      case "feature_flags":
        return this.systemChecker.checkFeatureFlags();
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
