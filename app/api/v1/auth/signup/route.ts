import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { databaseService } from "@/lib/services/database/db";
import { logger } from "@/lib/utils/logging/logger";
import {
  createApiHandler,
  createSuccessResponse,
  ValidationError,
  ConflictError,
  DatabaseError,
} from "@/lib/middleware/error-handling";
import { createSession } from "@/lib/services/auth/auth";
import { COOKIE_NAME } from "@/lib/constants/config";

// =============================================================================
// CONFIGURATION DE SÉCURITÉ
// =============================================================================

const SIGNUP_ENABLED = process.env.SIGNUP_ENABLED === 'true' || false;
const REQUIRE_INVITATION_CODE = process.env.REQUIRE_INVITATION_CODE === 'true' || false;
const VALID_INVITATION_CODES = process.env.INVITATION_CODES?.split(',') || [];
const MAX_SIGNUPS_PER_HOUR = parseInt(process.env.MAX_SIGNUPS_PER_HOUR || '10');

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
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Vérifie si les inscriptions sont temporairement limitées
 */
async function checkSignupRateLimit(clientIp: string): Promise<boolean> {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentSignups = await databaseService.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM users 
       WHERE client_ip = ? AND created_at >= ?`,
      [clientIp, oneHourAgo.toISOString()],
      'check-signup-rate-limit'
    );

    const count = recentSignups[0]?.count || 0;
    return count < MAX_SIGNUPS_PER_HOUR;
  } catch (error) {
    logger.error('Error checking signup rate limit:', { error });
    // En cas d'erreur, on autorise l'inscription pour ne pas bloquer injustement
    return true;
  }
}

/**
 * Vérifie si un nom d'utilisateur ou email existe déjà
 */
async function checkUserExists(username: string, email: string): Promise<{
  usernameExists: boolean;
  emailExists: boolean;
}> {
  try {
    const existingUsername = await databaseService.queryOne(
      'SELECT id FROM users WHERE username = ?',
      [username],
      'check-username-exists'
    );

    const existingEmail = await databaseService.queryOne(
      'SELECT id FROM users WHERE email = ?',
      [email],
      'check-email-exists'
    );

    return {
      usernameExists: !!existingUsername,
      emailExists: !!existingEmail,
    };
  } catch (error) {
    logger.error('Error checking user existence:', { error });
    throw new DatabaseError('Erreur lors de la vérification des données utilisateur');
  }
}

/**
 * Crée un nouvel utilisateur avec des privilèges de base
 */
async function createUser(userData: {
  username: string;
  email: string;
  hashedPassword: string;
  clientIp: string;
}): Promise<{ id: string; username: string; email: string }> {
  try {
    const userId = uuidv4();
    const now = new Date().toISOString();

    await databaseService.execute(
      `INSERT INTO users (
        id, username, email, password_hash, role, client_ip,
        email_verified, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userData.username,
        userData.email,
        userData.hashedPassword,
        'user', // Rôle par défaut
        userData.clientIp,
        false, // Email non vérifié par défaut
        true, // Compte actif par défaut
        now,
        now,
      ],
      'create-new-user'
    );

    logger.info(`New user created: ${userId} (${userData.username})`);

    return {
      id: userId,
      username: userData.username,
      email: userData.email,
    };
  } catch (error) {
    logger.error('Error creating user:', { error });
    throw new DatabaseError('Erreur lors de la création du compte utilisateur');
  }
}

// =============================================================================
// HANDLER D'API
// =============================================================================

/**
 * POST /api/v1/auth/signup - Inscription d'un nouvel utilisateur
 */
export const POST = createApiHandler({
  bodySchema: signupSchema,
  requireAuth: false,
  handler: async ({ request, body }) => {
    // Vérifier si les inscriptions sont activées
    if (!SIGNUP_ENABLED) {
      logger.warn('Signup attempt blocked - signups disabled');
      throw new ValidationError(
        'Les inscriptions sont actuellement désactivées. Veuillez contacter l\'administrateur.'
      );
    }

    // Récupérer l'IP du client pour la limitation de taux
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    logger.info(`Signup attempt from IP: ${clientIp}`, {
      username: body!.username,
      email: body!.email,
    });

    // Vérifier la limitation de taux
    const rateLimitOk = await checkSignupRateLimit(clientIp);
    if (!rateLimitOk) {
      logger.warn(`Signup rate limit exceeded for IP: ${clientIp}`);
      throw new ValidationError(
        'Trop de tentatives d\'inscription récentes. Veuillez réessayer plus tard.'
      );
    }

    // Vérifier le code d'invitation si requis
    if (REQUIRE_INVITATION_CODE) {
      if (!body!.invitationCode) {
        throw new ValidationError('Un code d\'invitation est requis');
      }
      
      if (!VALID_INVITATION_CODES.includes(body!.invitationCode)) {
        logger.warn(`Invalid invitation code used: ${body!.invitationCode}`);
        throw new ValidationError('Code d\'invitation invalide');
      }
    }

    try {
      // Vérifier si l'utilisateur existe déjà
      const { usernameExists, emailExists } = await checkUserExists(
        body!.username,
        body!.email
      );

      if (usernameExists) {
        throw new ConflictError('Ce nom d\'utilisateur est déjà utilisé');
      }

      if (emailExists) {
        throw new ConflictError('Cette adresse email est déjà utilisée');
      }

      // Hasher le mot de passe
      const saltRounds = 12;
      const hashedPassword = await hash(body!.password, saltRounds);

      // Créer l'utilisateur
      const newUser = await createUser({
        username: body!.username,
        email: body!.email,
        hashedPassword,
        clientIp,
      });

      // Créer une session pour l'utilisateur nouvellement inscrit
      const sessionToken = await createSession(newUser.id);

      logger.info(`User successfully signed up and logged in: ${newUser.id}`);

      // Utilisateur créé ET connecté automatiquement
      const response = NextResponse.json(
        createSuccessResponse({
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
          },
          message: 'Compte créé et connexion réussie',
        }),
        { status: 201 }
      );

      // Définir le cookie de session
      response.cookies.set(
        COOKIE_NAME,
        sessionToken,
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
      
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error; // Re-throw validation/conflict errors as-is
      }
      
      throw new DatabaseError('Erreur lors de la création du compte');
    }
  },
});

// =============================================================================
// ROUTE DE CONFIGURATION (ADMIN UNIQUEMENT)
// =============================================================================

/**
 * GET /api/v1/auth/signup - Informations sur la configuration des inscriptions
 */
export const GET = createApiHandler({
  requireAuth: false,
  handler: async () => {
    logger.info('Signup configuration requested');

    return NextResponse.json(
      createSuccessResponse({
        signupEnabled: SIGNUP_ENABLED,
        requiresInvitationCode: REQUIRE_INVITATION_CODE,
        rateLimit: {
          maxSignupsPerHour: MAX_SIGNUPS_PER_HOUR,
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
  },
});
