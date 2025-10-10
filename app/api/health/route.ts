/**
 * Health Check API Endpoint
 *
 * Provides system health status for monitoring and deployment verification.
 *
 * Requirements: 9.4, 9.5
 */

import { NextRequest, NextResponse } from "next/server";

import { HealthCheckService } from "../../../lib/monitoring/health-check";

const healthCheckService = HealthCheckService.getInstance();

export async function GET(request: NextRequest) {
  try {
    // Check if detailed health check is requested
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get("detailed") === "true";
    const checkName = searchParams.get("check");

    // If specific check is requested
    if (checkName) {
      try {
        const result = await healthCheckService.runHealthCheck(checkName);
        return NextResponse.json({
          success: true,
          data: result,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_HEALTH_CHECK",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
            },
          },
          { status: 400 },
        );
      }
    }

    // Get full system health
    const systemHealth = await healthCheckService.getSystemHealth();

    // Return appropriate status code based on health
    const statusCode =
      systemHealth.status === "healthy"
        ? 200
        : systemHealth.status === "degraded"
          ? 200
          : 503;

    const response = {
      success: systemHealth.status !== "unhealthy",
      data: detailed
        ? systemHealth
        : {
            status: systemHealth.status,
            timestamp: systemHealth.timestamp,
            uptime: systemHealth.uptime,
            version: systemHealth.version,
            environment: systemHealth.environment,
            summary: systemHealth.summary,
          },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    };

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error("Health check endpoint error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "HEALTH_CHECK_ERROR",
          message: "Health check system error",
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 },
    );
  }
}

// Simple HEAD request for basic health check
export async function HEAD() {
  try {
    const systemHealth = await healthCheckService.getSystemHealth();
    const statusCode = systemHealth.status === "healthy" ? 200 : 503;

    return new NextResponse(null, {
      status: statusCode,
      headers: {
        "X-Health-Status": systemHealth.status,
        "X-Uptime": systemHealth.uptime.toString(),
        "X-Version": systemHealth.version,
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}
