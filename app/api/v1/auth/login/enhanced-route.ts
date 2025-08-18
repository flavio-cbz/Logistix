/**
 * Enhanced Login API Route with Comprehensive Logging
 * Example of how to apply service-level logging instrumentation
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createSession } from "@/lib/services/auth";
import { z } from "zod";
import { withEnhancedRequestLogging } from "@/lib/middlewares/enhanced-request-logging";
import { serviceInstrumentation } from "@/lib/services/comprehensive-service-instrumentation";
import { auditLogger } from "@/lib/services/audit-logger";
import { createRequestLogger } from "@/lib/utils/logging";

const loginSchema = z.object({
  identifier: z.string(),
  password: z.string(),
});

async function loginHandler(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const logger = createRequestLogger(requestId);
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Log the login attempt start
    logger.info('Login attempt started', {
      ip: clientIP,
      userAgent,
      endpoint: '/api/v1/auth/login'
    });

    // Parse and validate request body with instrumentation
    const body = await serviceInstrumentation.instrumentOperation(
      {
        serviceName: 'api',
        operationName: 'parseRequestBody',
        requestId,
        metadata: { endpoint: '/api/v1/auth/login' }
      },
      () => request.json(),
      'api'
    );

    const validatedData = await serviceInstrumentation.instrumentOperation(
      {
        serviceName: 'api',
        operationName: 'validateLoginData',
        requestId,
        metadata: { 
          endpoint: '/api/v1/auth/login',
          hasIdentifier: !!body.identifier,
          hasPassword: !!body.password
        }
      },
      () => Promise.resolve(loginSchema.parse(body)),
      'api'
    );

    // Verify credentials with comprehensive instrumentation
    const user = await serviceInstrumentation.instrumentAuthOperation(
      'verifyCredentials',
      () => verifyCredentials(validatedData.identifier, validatedData.password),
      validatedData.identifier,
      {
        requestId,
        metadata: {
          ip: clientIP,
          userAgent,
          identifier: validatedData.identifier
        }
      }
    );

    if (!user) {
      // Log failed authentication attempt
      await auditLogger.logSecurityEvent(
        {
          type: 'failed_login',
          severity: 'medium',
          details: {
            identifier: validatedData.identifier,
            reason: 'invalid_credentials',
            ip: clientIP,
            userAgent
          }
        },
        { requestId }
      );

      logger.warn('Login failed - invalid credentials', {
        identifier: validatedData.identifier,
        ip: clientIP,
        userAgent
      });

      return NextResponse.json(
        { success: false, message: "Identifiant ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Create session with instrumentation
    const sessionId = await serviceInstrumentation.instrumentAuthOperation(
      'createSession',
      () => createSession(user.id),
      user.username,
      {
        userId: user.id,
        requestId,
        metadata: {
          username: user.username,
          ip: clientIP,
          userAgent
        }
      }
    );

    // Log successful authentication
    await auditLogger.logSecurityEvent(
      {
        type: 'login',
        severity: 'low',
        details: {
          username: user.username,
          sessionId,
          ip: clientIP,
          userAgent,
          success: true
        }
      },
      {
        userId: user.id,
        sessionId,
        requestId
      }
    );

    // Log user action for audit trail
    await auditLogger.logUserAction(
      user.id,
      {
        action: 'LOGIN',
        resource: 'auth',
        details: {
          sessionId,
          ip: clientIP,
          userAgent,
          success: true
        }
      },
      {
        sessionId,
        ip: clientIP,
        userAgent,
        requestId
      }
    );

    logger.info('Login successful', {
      userId: user.id,
      username: user.username,
      sessionId,
      ip: clientIP
    });

    // Create response with session cookie
    const response = NextResponse.json({ 
      success: true, 
      message: "Connexion réussie",
      user: {
        id: user.id,
        username: user.username
      }
    });

    response.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
      sameSite: 'lax'
    });

    return response;

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Login validation error', {
        errors: error.errors,
        ip: clientIP,
        userAgent
      });

      // Log validation failure as security event
      await auditLogger.logSecurityEvent(
        {
          type: 'failed_login',
          severity: 'low',
          details: {
            reason: 'validation_error',
            errors: error.errors,
            ip: clientIP,
            userAgent
          }
        },
        { requestId }
      );

      return NextResponse.json(
        { 
          success: false, 
          message: "Erreur de validation", 
          errors: error.errors 
        },
        { status: 400 }
      );
    }

    // Log unexpected error
    logger.error("Unexpected error in login API", {
      error: error as Error,
      ip: clientIP,
      userAgent,
      endpoint: '/api/v1/auth/login'
    });

    // Log system error
    await auditLogger.logSystemEvent(
      'LOGIN_API_ERROR',
      {
        error: (error as Error).message,
        stack: (error as Error).stack,
        ip: clientIP,
        userAgent,
        endpoint: '/api/v1/auth/login'
      },
      false,
      error as Error
    );

    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// Apply enhanced request logging middleware
export const POST = withEnhancedRequestLogging(loginHandler);