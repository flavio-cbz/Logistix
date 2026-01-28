<<<<<<< HEAD
=======
import { NextRequest } from "next/server";
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
import { serviceContainer } from "@/lib/services/container";
import { UserSession } from "@/lib/services/auth-service";

// Export types compatible with old implementation
export type { UserSession } from "@/lib/services/auth-service";

interface CreateUserResult {
  id: string;
  username: string;
}

interface AuthValidationResult {
  success: boolean;
  user: UserSession | null;
  message?: string;
}

// =============================================================================
// ADAPTATEUR D'AUTHENTIFICATION (FACADE)
// =============================================================================
// Ce fichier sert maintenant d'adaptateur vers le singleton AuthService
// pour maintenir la compatibilité avec le code existant sans duplication.

/**
 * Crée un nouvel utilisateur
 */
export async function createUser(
  username: string,
  password: string,
): Promise<CreateUserResult> {
  return serviceContainer.getAuthService().createUser({ username, password });
}

/**
 * Vérifie les identifiants utilisateur
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<CreateUserResult> {
  return serviceContainer.getAuthService().verifyCredentials(username, password);
}

/**
 * Crée une nouvelle session utilisateur
 */
export async function createSession(userId: string): Promise<string> {
  return serviceContainer.getAuthService().createSession(userId);
}

/**
 * Supprime la session active (déconnexion)
 */
export async function signOut(): Promise<void> {
  return serviceContainer.getAuthService().destroySession();
}

/**
 * Vérifie l'authentification et retourne l'utilisateur ou lance une erreur
 */
export async function requireAuth(): Promise<UserSession> {
  return serviceContainer.getAuthService().requireAuth();
}

/**
 * Vérifie si l'utilisateur est administrateur
 */
export async function requireAdmin(): Promise<UserSession> {
  const user = await requireAuth();
  if (!user.isAdmin) {
    throw new Error("Admin access required");
  }
  return user;
}

/**
 * Valide une session
 */
<<<<<<< HEAD
export async function validateSession(): Promise<AuthValidationResult> {
=======
export async function validateSession(
  _request: NextRequest,
): Promise<AuthValidationResult> {
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
  const result = await serviceContainer.getAuthService().validateSession();
  return {
    success: result.success,
    user: result.user ?? null,
    message: result.message,
  };
}

/**
 * Récupère l'utilisateur de la session active (ou null si aucune)
 */
export async function getSessionUser(): Promise<UserSession | null> {
  return serviceContainer.getAuthService().getSessionUser();
}
