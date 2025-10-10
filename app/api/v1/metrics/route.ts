import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Import monitoring services
import { getPerformanceMonitor } from "@/lib/monitoring/performance-monitor";
import { databasePerformanceMonitor } from "@/lib/database/performance-monitor";
import { cacheManager } from "@/lib/cache/cache-manager";
import { createMetricsDashboard } from "@/lib/monitoring/metrics-dashboard";

// Import middleware and utilities
import { requireAuth } from "@/lib/middleware/auth-middleware";
import {
  createSuccessResponse,
  createResponseOptions,
  withErrorHandling,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const metricsQuerySchema = z.object({
  timeRange: z.string().optional().default("1h"),
  format: z.enum(["json", "csv", "prometheus"]).optional().default("json"),
  realTime: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

// ============================================================================
// METRICS DASHBOARD API
// ============================================================================

/**
 * GET /api/v1/metrics - Get performance metrics and dashboard data
 */
export const GET = withErrorHandling(
  async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = `get_metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info("Starting metrics retrieval", { requestId });

      // ============================================================================
      // AUTHENTICATION & AUTHORIZATION
      // ============================================================================

      const authContext = await requireAuth(req);
      const user = authContext.user;

      // Only allow admin users to access metrics (you might want to adjust this)
      if (user.username !== "admin") {
        logger.warn("Non-admin user attempted to access metrics", {
          requestId,
          userId: user.id,
          username: user.username,
        });

        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Access denied. Admin privileges required.",
            },
          },
          { status: 403 },
        );
      }

      logger.debug("Admin user authenticated for metrics access", {
        requestId,
        userId: user.id,
        username: user.username,
      });

      // ============================================================================
      // QUERY PARAMETER VALIDATION
      // ============================================================================

      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());

      const validatedQuery = metricsQuerySchema.parse(queryParams);

      logger.debug("Query parameters validated", {
        requestId,
        query: validatedQuery,
      });

      // ============================================================================
      // INITIALIZE METRICS DASHBOARD
      // ============================================================================

      const performanceMonitor = getPerformanceMonitor();
      const metricsDashboard = createMetricsDashboard(
        performanceMonitor,
        databasePerformanceMonitor,
        cacheManager,
      );

      // ============================================================================
      // GET METRICS DATA
      // ============================================================================

      let metricsData;

      if (validatedQuery.realTime) {
        // Get real-time metrics (lightweight)
        logger.debug("Retrieving real-time metrics", { requestId });
        metricsData = await metricsDashboard.getRealTimeMetrics();
      } else {
        // Get full dashboard metrics
        logger.debug("Retrieving full dashboard metrics", { requestId });
        metricsData = await metricsDashboard.getDashboardMetrics();
      }

      // ============================================================================
      // FORMAT RESPONSE
      // ============================================================================

      if (validatedQuery.format === "json") {
        logger.info("Metrics retrieval successful", {
          requestId,
          userId: user.id,
          format: validatedQuery.format,
          realTime: validatedQuery.realTime,
        });

        const options = createResponseOptions(req, startTime, requestId);
        return createSuccessResponse(metricsData, options);
      } else {
        // Export in requested format
        logger.debug("Exporting metrics in format", {
          requestId,
          format: validatedQuery.format,
        });

        const timeRangeMs = parseTimeRange(validatedQuery.timeRange);
        const exportedData = await metricsDashboard.exportMetrics({
          format: validatedQuery.format,
          timeRange: timeRangeMs,
        });

        const contentType =
          validatedQuery.format === "csv" ? "text/csv" : "text/plain";

        const filename = `metrics_${new Date().toISOString().split("T")[0]}.${validatedQuery.format}`;

        logger.info("Metrics export successful", {
          requestId,
          userId: user.id,
          format: validatedQuery.format,
          size: exportedData.length,
        });

        return new NextResponse(exportedData, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "X-Request-ID": requestId,
          },
        });
      }
    } catch (error: unknown) {
      // Re-throw to let withErrorHandling handle the response
      throw error;
    }
  },
);

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * GET /api/v1/metrics/health - Get system health check
 */
export async function GET_health(): Promise<NextResponse> {
  const requestId = `health_check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.debug("Starting health check", { requestId });

    // Initialize metrics dashboard
    const performanceMonitor = getPerformanceMonitor();
    const metricsDashboard = createMetricsDashboard(
      performanceMonitor,
      databasePerformanceMonitor,
      cacheManager,
    );

    // Get health check results
    const healthCheck = await metricsDashboard.getHealthCheck();

    logger.info("Health check completed", {
      requestId,
      status: healthCheck.status,
      checksCount: healthCheck.checks.length,
    });

    // Return appropriate HTTP status based on health
    const httpStatus =
      healthCheck.status === "healthy"
        ? 200
        : healthCheck.status === "degraded"
          ? 200
          : 503;

    return NextResponse.json(healthCheck, {
      status: httpStatus,
      headers: {
        "X-Request-ID": requestId,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: unknown) {
    logger.error("Health check failed", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        status: "unhealthy",
        checks: [
          {
            name: "health_check",
            status: "fail",
            message: "Health check endpoint failed",
            duration: 0,
          },
        ],
        timestamp: Date.now(),
      },
      {
        status: 503,
        headers: {
          "X-Request-ID": requestId,
        },
      },
    );
  }
}

// ============================================================================
// RECOMMENDATIONS ENDPOINT
// ============================================================================

/**
 * GET /api/v1/metrics/recommendations - Get performance recommendations
 */
export async function GET_recommendations(
  req: NextRequest,
): Promise<NextResponse> {
  const requestId = `recommendations_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.debug("Starting recommendations retrieval", { requestId });

    // Authentication required for recommendations
    const authContext = await requireAuth(req);
    const user = authContext.user;

    if (user.username !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied. Admin privileges required.",
          },
        },
        { status: 403 },
      );
    }

    // Initialize metrics dashboard
    const performanceMonitor = getPerformanceMonitor();
    const metricsDashboard = createMetricsDashboard(
      performanceMonitor,
      databasePerformanceMonitor,
      cacheManager,
    );

    // Get recommendations
    const recommendations =
      await metricsDashboard.getPerformanceRecommendations();

    logger.info("Recommendations retrieval successful", {
      requestId,
      userId: user.id,
      recommendationsCount: recommendations.length,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          recommendations,
          timestamp: Date.now(),
          count: recommendations.length,
        },
      },
      {
        headers: {
          "X-Request-ID": requestId,
        },
      },
    );
  } catch (error: unknown) {
    logger.error("Recommendations retrieval failed", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve recommendations",
        },
      },
      {
        status: 500,
        headers: {
          "X-Request-ID": requestId,
        },
      },
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse time range string to milliseconds
 */
function parseTimeRange(timeRange: string): number {
  const timeRangeMap: Record<string, number> = {
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  return timeRangeMap[timeRange] || timeRangeMap["1h"];
}
