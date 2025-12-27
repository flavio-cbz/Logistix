import { serviceContainer } from "@/lib/services/container";
import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
import { z } from "zod";
import { ValidationError, AuthError } from "@/lib/shared/errors/base-errors";
import { COOKIE_NAME } from "@/lib/constants/config";

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
