import { serviceContainer } from "@/lib/services/container";
import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
import { z } from "zod";
import { ValidationError, AuthError } from "@/lib/shared/errors/base-errors";
import { COOKIE_NAME } from "@/lib/constants/config";

<<<<<<< HEAD
const loginSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse(new ValidationError("Données invalides", validationResult.error.flatten() as any)),
        { status: 400 }
      );
=======
// Importations des services d'authentification
import { verifyCredentials, createSession } from "@/lib/services/auth/auth";
import { logAuthenticationEvent } from "@/lib/services/user-action-logger";

// Importations des classes d'erreur
import { AuthError } from "@/lib/errors/custom-error";

// Importations des nouveaux middlewares et utilitaires
import { validateBody } from "@/lib/middleware/validation-middleware";
import {
  createSuccessResponse,
  createErrorResponse,
  createResponseOptions,
  withErrorHandling,
} from "@/lib/utils/api-response";
import { 
  loginBruteForceProtection, 
  getIdentifier 
} from "@/lib/middleware/brute-force-protection";

// =============================================================================
// SCHÉMAS DE VALIDATION
// =============================================================================

const loginRequestSchema = z.object({
  username: z
    .string()
    .min(1, "L'identifiant est requis")
    .min(2, "L'identifiant doit faire au moins 2 caractères")
    .max(50, "L'identifiant ne peut pas dépasser 50 caractères")
    .trim(),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit faire au moins 6 caractères")
    .max(100, "Le mot de passe ne peut pas dépasser 100 caractères"),
});

// =============================================================================
// INTERFACES
// =============================================================================

// LoginRequest interface removed (validation uses Zod schema)

interface LoginSuccessData {
  username: string;
  userId: string;
  expiresAt: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Crée un UserActionContext pour les logs d'authentification
 */
function createAuthContext(
  request: NextRequest,
  userId?: string,
  requestId?: string
): {
  userId: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
} {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
            request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");
  
  const context: {
    userId: string;
    sessionId?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    timestamp: Date;
  } = {
    userId: userId || "anonymous",
    timestamp: new Date(),
  };

  if (requestId) {
    context.requestId = requestId;
  }
  if (ip) {
    context.ip = ip;
  }
  if (userAgent) {
    context.userAgent = userAgent;
  }

  return context;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const COOKIE_NAME = process.env['COOKIE_NAME'] || "logistix_session";

const isProduction = process.env['NODE_ENV'] === "production";

const cookieSameSite: 'lax' | 'strict' = isProduction ? 'strict' : 'lax';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: cookieSameSite,
  maxAge: 7 * 24 * 60 * 60, // 7 jours en secondes
  path: "/",
};

// =============================================================================
// HANDLER PRINCIPAL
// =============================================================================

export const POST = withErrorHandling(
  async (req: Request | NextRequest): Promise<NextResponse> => {
    const nextReq = req as NextRequest;
    const startTime = Date.now();
    const requestId = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.info("Starting login attempt", { requestId });

      // =============================================================================
      // REQUEST VALIDATION
      // =============================================================================

      const { data: validatedData, context } = await validateBody(
        loginRequestSchema,
        nextReq,
      );

      logger.debug("Login request validated", {
        requestId: context.requestId,
        username: validatedData.username,
      });

      // =============================================================================
      // BRUTE FORCE PROTECTION
      // =============================================================================

      const clientIp = nextReq.headers.get("x-forwarded-for")?.split(",")[0] || 
                       nextReq.headers.get("x-real-ip") || 
                       "unknown";
      const identifier = getIdentifier(clientIp, validatedData.username);

      // Vérifier si l'identifiant est bloqué
      const blockStatus = loginBruteForceProtection.isBlocked(identifier);
      
      if (blockStatus.blocked) {
        const remainingMinutes = Math.ceil(blockStatus.remainingTime! / 60000);
        const remainingSeconds = Math.ceil(blockStatus.remainingTime! / 1000);
        
        logger.warn("Login attempt blocked due to brute force protection", {
          requestId: context.requestId,
          username: validatedData.username,
          clientIp,
          attempts: blockStatus.attempts,
          remainingTime: blockStatus.remainingTime,
        });

        try {
          await logAuthenticationEvent("login_failed", createAuthContext(nextReq, undefined, context.requestId), {
            reason: "Blocked by brute force protection",
            metadata: { attempts: blockStatus.attempts },
          });
        } catch (logError) {
          logger.error("Failed to log authentication event", { error: logError });
        }

        const options = createResponseOptions(
          nextReq,
          startTime,
          context.requestId,
        );
        
        const rateLimitDetails = {
          limit: 5,
          remaining: 0,
          reset: Math.ceil(Date.now() / 1000) + remainingSeconds,
          retryAfter: remainingSeconds,
        };
        
        const response = createErrorResponse(
          new AuthError(
            `Trop de tentatives échouées. Veuillez réessayer dans ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
            { rateLimitDetails }
          ),
          options,
        );
        
        // Retourner avec status 429
        return new NextResponse(response.body, {
          status: 429,
          headers: response.headers,
        });
      }

      // =============================================================================
      // CREDENTIAL VERIFICATION
      // =============================================================================

      logger.debug("Verifying credentials", {
        requestId: context.requestId,
        username: validatedData.username,
      });

      let userId: string;
      try {
        logger.debug("BEFORE verifyCredentials call", {
          requestId: context.requestId,
          username: validatedData.username,
        });
        
        // Vérifier les credentials avec le service d'authentification
        const user = await verifyCredentials(validatedData.username, validatedData.password);
        userId = user.id;
        
        logger.debug("Credentials verified successfully", {
          requestId: context.requestId,
          userId,
          username: validatedData.username,
        });
      } catch (authError: unknown) {
        logger.error("CATCH BLOCK - authError caught", {
          requestId: context.requestId,
          errorType: typeof authError,
          errorMessage: authError instanceof Error ? authError.message : String(authError),
          errorStack: authError instanceof Error ? authError.stack : undefined,
          errorName: authError instanceof Error ? authError.name : undefined,
        });
        
        // Enregistrer la tentative échouée pour le brute-force protection
        loginBruteForceProtection.recordFailedAttempt(identifier, {
          username: validatedData.username,
          clientIp,
          requestId: context.requestId,
        });
        
        // Gérer les erreurs d'authentification
        const errorMessage = authError instanceof Error ? authError.message : String(authError);
        let userFriendlyMessage = "Identifiants invalides";
        
        if (errorMessage === "USER_NOT_FOUND") {
          userFriendlyMessage = "Utilisateur non trouvé";
        } else if (errorMessage === "INVALID_PASSWORD") {
          userFriendlyMessage = "Mot de passe incorrect";
        }
        
        const options = createResponseOptions(nextReq, startTime, context.requestId);
        return createErrorResponse(
          new AuthError(userFriendlyMessage),
          options,
        );
      }

      // =============================================================================
      // SESSION CREATION
      // =============================================================================

      logger.debug("Creating session for authenticated user", {
        requestId: context.requestId,
        userId,
        username: validatedData.username,
      });

      let sessionId: string;
      try {
        // Créer une vraie session avec le service d'authentification
        sessionId = await createSession(userId);
        
        logger.debug("Session created successfully", {
          requestId: context.requestId,
          userId,
          username: validatedData.username,
          sessionId,
        });
      } catch (sessionError: unknown) {
        logger.error("Error creating session", {
          requestId: context.requestId,
          userId,
          username: validatedData.username,
          error:
            sessionError instanceof Error
              ? sessionError.message
              : "Unknown error",
        });

        try {
          await logAuthenticationEvent("login_failed", createAuthContext(nextReq, userId, context.requestId), {
            reason: "Session creation failed",
          });
        } catch (logError) {
          logger.error("Failed to log authentication event", { error: logError });
        }

        throw new Error("Erreur lors de la création de session");
      }

      // =============================================================================
      // SUCCESS RESPONSE
      // =============================================================================

      // Réinitialiser le compteur de tentatives sur succès
      loginBruteForceProtection.recordSuccessfulAttempt(identifier);

      try {
        await logAuthenticationEvent("login", createAuthContext(nextReq, userId, context.requestId), {
          method: "password",
        });
      } catch (logError) {
        logger.error("Failed to log authentication event", { error: logError });
      }
      logger.info("Login successful", {
        requestId: context.requestId,
        userId,
        username: validatedData.username,
      });

      const responseData: LoginSuccessData = {
        username: validatedData.username,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const options = createResponseOptions(
        nextReq,
        startTime,
        context.requestId,
      );
      const response = createSuccessResponse(responseData, options);

      // Set session cookie (delete old one first to ensure refresh)
      logger.debug("Setting session cookie", {
        requestId: context.requestId,
        cookieName: COOKIE_NAME,
        sessionId,
      });

      // Clear old cookie first (to ensure browser updates it)
      response.cookies.delete(COOKIE_NAME);
      response.cookies.set(COOKIE_NAME, sessionId, COOKIE_OPTIONS);

      return response;
    } catch (error: unknown) {
      // Log authentication failure for audit
      try {
        await logAuthenticationEvent("login_failed", createAuthContext(nextReq, undefined, requestId), {
          reason: "Unexpected server error",
        });
      } catch (logError) {
        logger.error("Failed to log authentication event", { error: logError });
      }

      // Re-throw to let withErrorHandling handle the response
      throw error;
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
    }

    const { username, password } = validationResult.data;

    const authService = serviceContainer.getAuthService();
    
    // Authenticate user
    const user = await authService.verifyCredentials(username, password);
    
    if (!user) {
      return NextResponse.json(
        createErrorResponse(new AuthError("Identifiants invalides")),
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = await authService.createSession(user.id);

    const response = NextResponse.json(
      createSuccessResponse({
        user,
        message: "Connexion réussie",
      })
    );

    // Set cookie
    response.cookies.set(
      COOKIE_NAME,
      sessionToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400, // 24 hours
        path: '/',
      }
    );

    return response;

  } catch (error) {
    logger.error("Login error:", { error });
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error : new Error("Erreur de connexion")),
      { status: 500 }
    );
  }
}
