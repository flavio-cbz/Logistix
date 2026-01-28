import { serviceContainer } from "@/lib/services/container";
import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";
import { z } from "zod";
import { env, getSignupConfig } from "@/lib/config/env";

// =============================================================================
// CONFIGURATION DE SÉCURITÉ
// =============================================================================

const signupConfig = getSignupConfig();

// =============================================================================
// SCHÉMAS DE VALIDATION
// =============================================================================

const signupSchema = z.object({
  username: z.string()
    .min(3, "Le nom d'utilisateur doit faire au moins 3 caractères")
    .max(50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores"
    ),

  email: z.string()
    .email("Format d'email invalide")
    .max(255, "L'email ne peut pas dépasser 255 caractères")
    .toLowerCase(),

  password: z.string()
    .min(8, "Le mot de passe doit faire au moins 8 caractères")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Le mot de passe doit contenir au moins : 1 minuscule, 1 majuscule, 1 chiffre et 1 caractère spécial"
    ),

  confirmPassword: z.string(),

  invitationCode: z.string().optional(),

  acceptTerms: z.boolean()
    .refine(val => val === true, "Vous devez accepter les conditions d'utilisation"),

  acceptPrivacy: z.boolean()
    .refine(val => val === true, "Vous devez accepter la politique de confidentialité"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// =============================================================================
// HANDLER D'API
// =============================================================================

/**
 * POST /api/v1/auth/signup - Inscription d'un nouvel utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation du schéma
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        createErrorResponse({ message: "Données invalides", details: validationResult.error.flatten() }),
        { status: 400 }
      );
    }

    const validatedBody = validationResult.data;

    // Récupérer l'IP du client
    const clientIp = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    logger.info(`Signup attempt from IP: ${clientIp}`, {
      username: validatedBody.username,
      email: validatedBody.email,
    });

    // Use AuthService to handle signup
    const authService = serviceContainer.getAuthService();
    const result = await authService.signupUser({
      username: validatedBody.username,
      email: validatedBody.email,
      password: validatedBody.password,
      clientIp,
      invitationCode: validatedBody.invitationCode,
      signupConfig
    });

    logger.info(`User successfully signed up and logged in: ${result.user.id}`);

    // Create response with user data
    const response = NextResponse.json(
      createSuccessResponse({
        user: result.user,
        message: 'Compte créé et connexion réussie',
      }),
      { status: 201 }
    );

    // Set session cookie
    response.cookies.set(
      env.COOKIE_NAME,
      result.sessionToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400, // 24 hours in seconds
        path: '/',
      }
    );

    return response;
  } catch (error) {
    logger.error('Signup error:', { error });
    return NextResponse.json(
      createErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as { statusCode: number }).statusCode || 500 : 500 }
    );
  }
}

// =============================================================================
// ROUTE DE CONFIGURATION (ADMIN UNIQUEMENT)
// =============================================================================

/**
 * GET /api/v1/auth/signup - Informations sur la configuration des inscriptions
 */
export async function GET() {
  logger.info('Signup configuration requested');

  return NextResponse.json(
    createSuccessResponse({
      signupEnabled: signupConfig.enabled,
      requiresInvitationCode: signupConfig.requireInvitationCode,
      rateLimit: {
        maxSignupsPerHour: signupConfig.maxSignupsPerHour,
      },
      validation: {
        usernameMinLength: 3,
        usernameMaxLength: 50,
        passwordMinLength: 8,
        passwordRequirements: [
          'Au moins 1 lettre minuscule',
          'Au moins 1 lettre majuscule',
          'Au moins 1 chiffre',
          'Au moins 1 caractère spécial (@$!%*?&)',
        ],
      },
    })
  );
}
