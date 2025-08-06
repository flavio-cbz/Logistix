import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createSession } from "@/lib/services/auth";
import { z } from "zod";
import { optimizedApiPost } from "@/lib/utils/api-route-optimization";
import { withAuthenticationAuditLogging, logAuthenticationEvent } from "@/lib/middlewares/comprehensive-audit-logging";

const loginSchema = z.object({
  identifier: z.string(),
  password: z.string(),
});

async function loginHandler(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = request.headers.get('user-agent') || undefined;
  const timestamp = new Date();

  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    const user = await verifyCredentials(validatedData.password);

    if (!user) {
      // Log failed login attempt
      await logAuthenticationEvent(
        'login_failed',
        {
          userId: 'unknown',
          requestId,
          ip,
          userAgent,
          timestamp
        },
        {
          reason: 'Invalid credentials',
          method: 'password',
          provider: 'local',
          metadata: {
            identifier: validatedData.identifier
          }
        }
      );

      return NextResponse.json(
        { success: false, message: "Identifiant ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const sessionId = await createSession(user.id);
    
    // Log successful login
    await logAuthenticationEvent(
      'login',
      {
        userId: user.id,
        sessionId,
        requestId,
        ip,
        userAgent,
        timestamp
      },
      {
        method: 'password',
        provider: 'local',
        metadata: {
          identifier: validatedData.identifier
        }
      }
    );

    const response = NextResponse.json({ 
      success: true, 
      message: "Connexion réussie",
      userId: user.id 
    });
    
    response.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (error) {
    // Log authentication error
    await logAuthenticationEvent(
      'login_failed',
      {
        userId: 'unknown',
        requestId,
        ip,
        userAgent,
        timestamp
      },
      {
        reason: (error as Error).message,
        method: 'password',
        provider: 'local'
      }
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Erreur de validation", errors: error.errors },
        { status: 400 }
      );
    }
    
    console.error("Erreur dans l'API login:", error);
    return NextResponse.json(
      { success: false, message: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// Utiliser le handler optimisé avec audit logging complet pour les routes d'authentification
export const POST = optimizedApiPost(
  withAuthenticationAuditLogging(loginHandler),
  {
    requiresDatabase: true,
    skipInitializationCheck: false,
    enableHealthCheck: true,
    logPerformance: true
  }
);
