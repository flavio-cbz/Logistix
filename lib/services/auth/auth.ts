import { databaseService, generateId, getCurrentTimestamp } from "@/lib/services/database/db"
import { cookies } from "next/headers"
import crypto from "crypto"
import { SimpleLogger as Logger } from "@/lib/utils/logging";
import { AuthServiceInstrumentation } from "../logging-instrumentation";
import { authLogger, PerformanceTimer } from "@/lib/utils/logging";
import { getAdminPassword, isAdminUsingDefaultPassword } from "@/lib/services/admin"

const logger = new Logger("lib/auth")

// Interfaces pour les types de données de la base de données
interface User {
  id: string
  username: string
  password_hash: string
  bio?: string
  avatar?: string
  language?: string
  theme?: string
}

interface Session {
  session_id: string
  user_id: string
  expires_at: string
  username: string
  
  avatar?: string
  language?: string
  theme?: string
}

export interface UserSession {
  id: string
  username: string
  
  avatar?: string
  language?: string
  theme?: string
  isAdmin: boolean
}

// Fonction pour hacher un mot de passe
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

// Fonction pour créer un utilisateur
export async function createUser(username: string, password: string) {
  const timer = new PerformanceTimer('AUTH_CREATE_USER', authLogger);
  
  authLogger.info('Creating new user', { username });
  
  try {
    const id = generateId()
    const passwordHash = hashPassword(password)
    const timestamp = getCurrentTimestamp()

    await databaseService.execute(
      `INSERT INTO users (id, username, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, username, passwordHash, timestamp, timestamp],
      'createUser'
    )

    const result = { id, username };
    
    timer.end({
      success: true,
      userId: id,
      username
    });
    
    authLogger.info('User created successfully', { userId: id, username });
    
    return result;
  } catch (error) {
    authLogger.error('Failed to create user', error as Error, { username });
    timer.endWithError(error as Error, { username });
  }
}

// Fonction pour vérifier les identifiants
export async function verifyCredentials(password: string) {
  return AuthServiceInstrumentation.instrumentLogin(
    async () => {
      const user = await databaseService.queryOne<User>(
        `SELECT id, username, password_hash FROM users WHERE username = 'admin'`,
        [],
        'verifyCredentials'
      )

      if (!user) {
        logger.warn(`Tentative de connexion échouée pour l'utilisateur admin (utilisateur non trouvé)`)
        throw new Error('User not found')
      }

      // Vérification du mot de passe
      const passwordHash = hashPassword(password)

      // Si l'utilisateur est admin et qu'il utilise le mot de passe par défaut, on autorise la connexion
      // C'est pour le premier login de l'admin avec le mot de passe par défaut
      if (
        user.username === "admin" &&
        (await isAdminUsingDefaultPassword()) &&
        password === getAdminPassword()
      ) {
        logger.info(`Connexion réussie pour l'utilisateur admin avec mot de passe par défaut`)
        return {
          id: user.id,
          username: user.username,
        }
      }

      if (user.password_hash !== passwordHash) {
        logger.warn(`Tentative de connexion échouée pour l'utilisateur admin (mot de passe incorrect)`)
        throw new Error('Invalid password')
      }

      logger.info(`Connexion réussie pour l'utilisateur admin`)
      return {
        id: user.id,
        username: user.username,
      }
    },
    { username: 'admin', password }
  ).catch(error => {
    // Return null for authentication failures to maintain existing behavior
    return null;
  });
}

// Fonction pour créer une session
export async function createSession(userId: string) {
  const timer = new PerformanceTimer('AUTH_CREATE_SESSION', authLogger);
  
  authLogger.info('Creating new session', { userId });
  
  try {
    const sessionId = generateId()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours

    await databaseService.execute(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
      [sessionId, userId, expiresAt],
      'createSession'
    )

    timer.end({
      success: true,
      userId,
      sessionId,
      expiresAt
    });
    
    authLogger.info('Session created successfully', { userId, sessionId });
    
    return sessionId;
  } catch (error) {
    authLogger.error('Failed to create session', error as Error, { userId });
    timer.endWithError(error as Error, { userId });
  }
}

// Fonction pour supprimer la session
export async function signOut() {
  const timer = new PerformanceTimer('AUTH_SIGN_OUT', authLogger);
  const cookieStore = cookies()
  const sessionId = cookieStore.get("session_id")?.value

  if (sessionId) {
    authLogger.info('User signing out', { sessionId });
    
    try {
      await databaseService.execute(
        `DELETE FROM sessions WHERE id = ?`,
        [sessionId],
        'signOut'
      )
      cookieStore.delete("session_id")
      
      AuthServiceInstrumentation.instrumentLogout('unknown', sessionId);
      
      timer.end({
        success: true,
        sessionId
      });
      
      authLogger.info('User signed out successfully', { sessionId });
    } catch (error) {
      authLogger.error('Failed to sign out user', error as Error, { sessionId });
      timer.endWithError(error as Error, { sessionId });
    }
  } else {
    authLogger.debug('Sign out called but no session found');
    timer.end({ success: true, noSession: true });
  }
}

// Fonction pour vérifier si l'utilisateur est authentifié
export async function requireAuth(): Promise<UserSession> {
  try {
    const cookieStore = cookies()
    const sessionId = cookieStore.get("session_id")?.value

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      throw new Error("Non authentifié")
    }

    const session = await databaseService.queryOne<Session>(
      `SELECT s.id as session_id, s.user_id, s.expires_at, u.username FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [sessionId],
      'requireAuth'
    )

    if (!session) {
      throw new Error("Session invalide")
    }

    // Vérifier si la session a expiré
    let expiresAt: Date
    try {
      expiresAt = new Date(session.expires_at)
      if (isNaN(expiresAt.getTime())) {
        // Date invalide, supprimer la session
        await databaseService.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'requireAuth-cleanup')
        throw new Error("Session invalide")
      }
    } catch (dateError) {
      logger.error("Erreur lors du parsing de la date d'expiration:", dateError)
      await databaseService.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'requireAuth-cleanup')
      throw new Error("Session invalide")
    }

    if (expiresAt < new Date()) {
      // Supprimer la session expirée
      await databaseService.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'requireAuth-cleanup')
      // cookieStore.delete("session_id")
      throw new Error("Session expirée")
    }

    return {
      id: session.user_id,
      username: session.username,
      
      
      
      
      isAdmin: session.username === "admin",
    }
  } catch (error) {
    // Re-throw known authentication errors
    if (error instanceof Error && (
      error.message === "Non authentifié" || 
      error.message === "Session invalide" || 
      error.message === "Session expirée"
    )) {
      throw error
    }
    
    // Log unexpected errors and throw generic authentication error
    logger.error("Erreur inattendue lors de l'authentification:", error)
    throw new Error("Non authentifié")
  }
}

// Fonction pour vérifier si l'utilisateur est un administrateur
export async function requireAdmin() {
  const user = await requireAuth()

  if (user.username !== "admin") {
    throw new Error("Non autorisé")
  }
}

// Modifier la fonction getSessionUser pour vérifier l'expiration de la session
export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies()
    const sessionId = cookieStore.get("session_id")?.value

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      return null
    }

    const session = await databaseService.queryOne<Session>(
      `SELECT s.id as session_id, s.user_id, s.expires_at, u.username FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [sessionId],
      'getSessionUser'
    )

    if (!session) {
      // Supprimer le cookie si la session n'existe pas
      // cookieStore.delete("session_id")
      return null
    }

    // Vérifier si la session a expiré
    let expiresAt: Date
    try {
      expiresAt = new Date(session.expires_at)
      if (isNaN(expiresAt.getTime())) {
        // Date invalide, supprimer la session
        await databaseService.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'getSessionUser-cleanup')
        return null
      }
    } catch (dateError) {
      logger.error("Erreur lors du parsing de la date d'expiration:", dateError)
      await databaseService.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'getSessionUser-cleanup')
      return null
    }

    if (expiresAt < new Date()) {
      // Supprimer la session expirée
      await databaseService.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'getSessionUser-cleanup')
      // cookieStore.delete("session_id")
      return null
    }

    return {
      id: session.user_id,
      username: session.username,
      
      
      
      
      isAdmin: session.username === "admin",
    }
  } catch (error) {
    logger.error("Erreur lors de la récupération de l'utilisateur de la session:", error)
    return null
  }
}
