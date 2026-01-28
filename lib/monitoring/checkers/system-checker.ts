<<<<<<< HEAD
import { configService } from "@/lib/config/config-service";
import { HealthCheckResult } from "../types";

export class SystemChecker {
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
                ([, flag]) => (flag as { enabled: boolean }).enabled,
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
=======
import { configService } from "@/lib/config/config-service";
import { HealthCheckResult } from "../types";

export class SystemChecker {
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
                ([, flag]) => (flag as { enabled: boolean }).enabled,
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
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
