/**
 * Comprehensive Audit Logging Middleware
 * Integrates all logging systems for complete user action and audit tracking
 */

import { NextResponse, NextRequest } from "next/server";
import { getLogger } from "@/lib/utils/logging/logger";
import { v4 as uuidv4 } from "uuid";

const logger = getLogger("AuditMiddleware");

/**
 * Comprehensive audit logging middleware that combines all logging systems
 */
export function withComprehensiveAuditLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = uuidv4();
    const timestamp = new Date();

    // Extract request context
    const context = {
      requestId,
      method: request.method,
      url: request.url,
      pathname: new URL(request.url).pathname,
      ip: extractClientIP(request),
      userAgent: request.headers.get("user-agent") || undefined,
      timestamp,
      userId: await extractUserIdFromRequest(request),
      sessionId: request.cookies.get("session_id")?.value ?? undefined,
    };

    const requestWithContext = new NextRequest(request, {
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        "x-request-id": requestId,
        "x-audit-timestamp": timestamp.toISOString(),
      },
    });

    try {
      // Log request start
      logger.info(`Request started: ${context.method} ${context.pathname}`, {
        requestId,
        userId: context.userId,
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent,
        url: context.url,
      });

      // Execute the handler
      const response = await handler(requestWithContext, ...args);
      const duration = Date.now() - startTime;
      const statusCode = response.status;
      const success = statusCode < 400;

      // Determine action and resource from path
      const { action, resource } = parseActionFromPath(
        context.pathname,
        context.method,
      );

      logger.info(
        `Request completed: ${context.method} ${context.pathname} - ${statusCode}`,
        {
          requestId,
          userId: context.userId,
          sessionId: context.sessionId,
          statusCode,
          duration,
          success,
          ip: context.ip,
          action,
          resource,
        },
      );

      response.headers.set("x-request-id", requestId);
      response.headers.set("x-response-time", duration.toString());
      response.headers.set("x-audit-logged", "true");

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const { action, resource } = parseActionFromPath(
        context.pathname,
        context.method,
      );

      logger.error(
        `Request failed: ${context.method} ${context.pathname}`,
        error as Error,
        {
          requestId,
          userId: context.userId,
          sessionId: context.sessionId,
          duration,
          ip: context.ip,
          action,
          resource,
        },
      );

      throw error;
    }
  };
}

// --- Utilities ---
function extractClientIP(request: NextRequest): string {
  const forwardedValue = request.headers.get("x-forwarded-for");
  if (forwardedValue != null) {
    // @ts-expect-error: TypeScript incorrectly thinks this could be undefined after null check
    return forwardedValue.split(",")[0].trim();
  }
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-client-ip") ??
    "unknown"
  );
}

async function extractUserIdFromRequest(
  request: NextRequest,
): Promise<string | undefined> {
  const sessionId = request.cookies.get("session_id")?.value;
  if (sessionId) {
    // TODO: Implement session lookup to get user ID
    return undefined;
  }
  return undefined;
}

function parseActionFromPath(
  pathname: string,
  method: string,
): { action: string; resource: string } {
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts[0] === "api" && pathParts[1] === "v1") {
    const resource = pathParts[2] || "unknown";
    let action = method.toLowerCase();
    switch (method) {
      case "GET":
        action = pathParts[3] ? "read_specific" : "read_list";
        break;
      case "POST":
        action = "create";
        break;
      case "PUT":
      case "PATCH":
        action = "update";
        break;
      case "DELETE":
        action = "delete";
        break;
    }
    return { action, resource };
  }
  return { action: method.toLowerCase(), resource: "unknown" };
}
