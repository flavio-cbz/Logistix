import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid'; // Importation de uuidv4 pour generateId si nécessaire
import { hash as bcryptHashPassword, compare as bcryptComparePassword } from 'bcrypt'; // Correction: bcryptjs en bcrypt
import { NextRequest } from 'next/server'; // Import NextRequest

// Importations des modules de logging
import { getLogger, PerformanceTimer, authLogger as importedAuthLogger } from '@/lib/utils/logging';
const logger = getLogger("lib/auth"); // Utilisation de getLogger pour créer une instance de logger

// Importations des autres services et utilitaires
import { enhancedDb } from '@/lib/services/database/enhanced-database-service'; // Correction: databaseService en enhancedDb
import { getCurrentTimestamp } from '@/lib/utils/formatting/calculations'; // Assurez-vous que le chemin est correct
import { authInstrumentationCollector } from '@/lib/services/auth/auth-instrumentation'; // Import du collecteur d'instrumentation


// Interfaces pour les types de données de la base de données
interface User {
  id: string
  username: string
  password_hash: string
  encryption_secret?: string // Make optional if not always present
  email?: string
  bio?: string
  avatar?: string
  language?: string
  theme?: string
  ai_config?: string // Ajout du champ ai_config
}

interface Session {
  session_id: string
  user_id: string
  expires_at: string
  username: string
  
  avatar?: string
  language?: string
  mfa_enabled?: boolean // Example of a new field
  theme?: string
  ai_config?: string // Ajout du champ ai_config
}

export interface UserSession {
  id: string
  username: string
  email?: string
  avatar?: string
  language?: string
  theme?: string
  aiConfig?: { endpoint: string, apiKey: string, model: string } // Ajout du champ aiConfig
  isAdmin: boolean
}

// Fonction pour créer un utilisateur
export async function createUser(username: string, password: string) {
  const timer = new PerformanceTimer('AUTH_CREATE_USER', importedAuthLogger); // Utilisation de importedAuthLogger
  
  importedAuthLogger.info('Creating new user', { username }); // Utilisation de importedAuthLogger
  
  try {
    const id = uuidv4(); // Utilisation de uuidv4 pour générer l'ID
    const passwordHash = await bcryptHashPassword(password, 10); // Ajout du saltRounds
    const encryptionSecret = uuidv4(); // Utilisation de uuidv4 pour générer le secret
    const timestamp = getCurrentTimestamp();

    await enhancedDb.execute( // Correction: databaseService en enhancedDb
      `INSERT INTO users (id, username, password_hash, encryption_secret, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, username, passwordHash, encryptionSecret, timestamp, timestamp],
      'createUser'
    )

    const result = { id, username };
    
    timer.end({
      success: true,
      userId: id,
      username
    });
    
    importedAuthLogger.info('User created successfully', { userId: id, username }); // Utilisation de importedAuthLogger
    
    return result;
  } catch (error: unknown) { // Correction: error: any
    importedAuthLogger.error('Failed to create user', error as Error); // Utilisation de importedAuthLogger
    timer.endWithError(error as Error, { username });
    throw error;
  }
}

// Fonction pour vérifier les identifiants — maintenant par username + password
export async function verifyCredentials(username: string, password: string) {
  try {
      // Récupérer l'utilisateur par nom d'utilisateur fourni
      const user = await enhancedDb.queryOne<User>( // Correction: databaseService en enhancedDb
        `SELECT id, username, password_hash FROM users WHERE username = ?`,
        [username],
        'verifyCredentials'
      )

      if (!user) {
        logger.warn(`Tentative de connexion échouée pour l'utilisateur ${username} (utilisateur non trouvé)`)
        throw new Error('User not found')
      }

      // Vérification sécurisée avec bcrypt
      const passwordMatches = await bcryptComparePassword(password, user.password_hash)
      if (!passwordMatches) {
        logger.warn(`Tentative de connexion échouée pour l'utilisateur ${username} (mot de passe incorrect)`)
        throw new Error('Invalid password')
      }

      logger.info(`Connexion réussie pour l'utilisateur ${username}`)
      return {
        id: user.id,
        username: user.username,
      }
  } catch (_error: unknown) { // <-- correction : syntaxe valide pour le catch
    // Return null for authentication failures to maintain existing behavior
    return null;
  }
}

// Fonction pour créer une session
export async function createSession(userId: string) {
  const timer = new PerformanceTimer('AUTH_CREATE_SESSION', importedAuthLogger); // Utilisation de importedAuthLogger
  
  importedAuthLogger.info('Creating new session', { userId }); // Utilisation de importedAuthLogger
  
  try {
    const sessionId = uuidv4(); // Utilisation de uuidv4 pour générer l'ID
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours

    await enhancedDb.execute( // Correction: databaseService en enhancedDb
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
    
    importedAuthLogger.info('Session created successfully', { userId, sessionId }); // Utilisation de importedAuthLogger
    
    return sessionId;
  } catch (error: unknown) { // Correction: error: any
    importedAuthLogger.error('Failed to create session', error as Error); // Utilisation de importedAuthLogger
    timer.endWithError(error as Error, { userId });
    throw error;
  }
}

// Fonction pour supprimer la session
export async function signOut() {
  const timer = new PerformanceTimer('AUTH_SIGN_OUT', importedAuthLogger); // Utilisation de importedAuthLogger
  const cookieStore = cookies()
  const sessionId = cookieStore.get("session_id")?.value

  if (sessionId) {
    importedAuthLogger.info('User signing out', { sessionId }); // Utilisation de importedAuthLogger
    
    try {
      // Récupérer le user_id avant de supprimer la session
      const sessionToDelete = await enhancedDb.queryOne<{ user_id: string }>(
        `SELECT user_id FROM sessions WHERE id = ?`,
        [sessionId],
        'signOut-getUserId'
      );

      await enhancedDb.execute( // Correction: databaseService en enhancedDb
        `DELETE FROM sessions WHERE id = ?`,
        [sessionId],
        'signOut'
      )
      cookieStore.delete("session_id")
      
      authInstrumentationCollector.recordEvent({ // Utilisation de recordEvent
        id: sessionId,
        type: 'session_destroy',
        timestamp: Date.now(),
        userId: sessionToDelete?.user_id, // Utiliser le user_id récupéré
        success: true,
      });
      
      timer.end({
        success: true,
        sessionId
      });
      
      importedAuthLogger.info('User signed out successfully', { sessionId }); // Utilisation de importedLogger
    } catch (error: unknown) { // Correction: error: any
      importedAuthLogger.error('Failed to sign out user', error as Error); // Utilisation de importedLogger
      timer.endWithError(error as Error, { sessionId });
    }
  } else {
    importedAuthLogger.debug('Sign out called but no session found'); // Utilisation de importedLogger
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

    const session = await enhancedDb.queryOne<Session>( // Correction: databaseService en enhancedDb
      `SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.ai_config FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [sessionId],
      'requireAuth'
    )

    if (!session) {
      // Supprimer le cookie si la session n'existe pas
      // cookieStore.delete("session_id")
      throw new Error("Session invalide")
    }

    // Vérifier si la session a expiré
    let expiresAt: Date
    try {
      expiresAt = new Date(session.expires_at)
      if (isNaN(expiresAt.getTime())) {
        // Date invalide, supprimer la session
        await enhancedDb.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'requireAuth-cleanup') // Correction: databaseService en enhancedDb
        throw new Error("Session invalide")
      }
    } catch (dateError: unknown) { // Correction: dateError: any
      logger.error("Erreur lors du parsing de la date d'expiration:", dateError)
      await enhancedDb.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'requireAuth-cleanup') // Correction: databaseService en enhancedDb
      throw new Error("Session invalide")
    }

    if (expiresAt < new Date()) {
      // Supprimer la session expirée
      await enhancedDb.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'requireAuth-cleanup') // Correction: databaseService en enhancedDb
      // cookieStore.delete("session_id")
      throw new Error("Session expirée")
    }

    return {
      id: session.user_id,
      username: session.username,
      isAdmin: session.username === "admin",
      aiConfig: session.ai_config ? JSON.parse(session.ai_config) : undefined,
    }
  } catch (error: unknown) { // Correction: error: any
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

// Fonction pour valider une session depuis une requête NextRequest
export async function validateSession(_request: NextRequest): Promise<{ success: boolean; user: UserSession | null; message?: string }> { // Correction: _request
  try {
    const user = await getSessionUser();
    
    if (!user) {
      return {
        success: false,
        user: null,
          message: 'Non authentifié'
      };
    }
    
    return {
      success: true,
      user
    };
  } catch (error: unknown) { // Correction: error: any
    logger.error("Erreur lors de la validation de la session:", error);
    return {
      success: false,
      user: null,
      message: 'Erreur de validation de session'
    };
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

    const session = await enhancedDb.queryOne<Session>( // Correction: databaseService en enhancedDb
      `SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.ai_config FROM sessions s
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
        await enhancedDb.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'getSessionUser-cleanup') // Correction: databaseService en enhancedDb
        return null
      }
    } catch (dateError: unknown) { // Correction: dateError: any
      logger.error("Erreur lors du parsing de la date d'expiration:", dateError)
      await enhancedDb.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'getSessionUser-cleanup') // Correction: databaseService en enhancedDb
      return null
    }

    if (expiresAt < new Date()) {
      // Supprimer la session expirée
      await enhancedDb.execute("DELETE FROM sessions WHERE id = ?", [sessionId], 'getSessionUser-cleanup') // Correction: databaseService en enhancedDb
      // cookieStore.delete("session_id")
      return null
    }

    return {
      id: session.user_id,
      username: session.username,
      isAdmin: session.username === "admin",
      aiConfig: session.ai_config ? JSON.parse(session.ai_config) : undefined,
    }
  } catch (error: unknown) { // Correction: error: any
    logger.error("Erreur lors de la récupération de l'utilisateur de la session:", error)
    return null
  }
}