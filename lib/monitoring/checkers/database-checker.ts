<<<<<<< HEAD
import { DatabaseService } from "@/lib/database/database-service";
import { sql } from "drizzle-orm";
import { configService } from "@/lib/config/config-service";
import { HealthCheckResult } from "../types";

export class DatabaseChecker {
    /**
     * Check database connectivity and performance
     */
    async check(): Promise<HealthCheckResult> {
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
}
=======
import { DatabaseService } from "@/lib/database/database-service";
import { sql } from "drizzle-orm";
import { configService } from "@/lib/config/config-service";
import { HealthCheckResult } from "../types";

export class DatabaseChecker {
    /**
     * Check database connectivity and performance
     */
    async check(): Promise<HealthCheckResult> {
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
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
