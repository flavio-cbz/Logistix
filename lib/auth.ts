import { db, generateId, getCurrentTimestamp } from "@/lib/db"
import { cookies } from "next/headers"
import crypto from "crypto"
import { Logger } from "./logger"
import { getAdminPassword, isAdminUsingDefaultPassword } from "./admin"

const logger = new Logger("lib/auth")

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_tres_securise_a_changer_en_production"
const COOKIE_NAME = process.env.COOKIE_NAME || "logistix_session"
const COOKIE_MAX_AGE = Number(process.env.COOKIE_MAX_AGE) || 604800 // 7 days

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
  bio?: string
  avatar?: string
  language?: string
  theme?: string
}

export interface UserSession {
  id: string
  username: string
  bio?: string
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
export function createUser(username: string, password: string) {
  const id = generateId()
  const passwordHash = hashPassword(password)
  const timestamp = getCurrentTimestamp()

  db.prepare(
    `
    INSERT INTO users (id, username, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(id, username, passwordHash, timestamp, timestamp)

  return { id, username }
}

// Fonction pour vérifier les identifiants
export function verifyCredentials(password: string) {
  const user = db
    .prepare<[], User>(
      `
    SELECT id, username, password_hash FROM users
    WHERE username = 'admin'
  `,
    )
    .get()

  if (!user) {
    logger.warn(`Tentative de connexion échouée pour l'utilisateur admin (utilisateur non trouvé)`)
    return null
  }


  // Vérification du mot de passe
  const passwordHash = hashPassword(password)

  // Si l'utilisateur est admin et qu'il utilise le mot de passe par défaut, on autorise la connexion
  // C'est pour le premier login de l'admin avec le mot de passe par défaut
  if (
    user.username === "admin" &&
    isAdminUsingDefaultPassword() &&
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
    return null
  }

  logger.info(`Connexion réussie pour l'utilisateur admin`)
  return {
    id: user.id,
    username: user.username,
  }
}

// Fonction pour créer une session
export function createSession(userId: string) {
  const sessionId = generateId()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours

  db.prepare(
    `
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `,
  ).run(sessionId, userId, expiresAt)

  return sessionId
}

// Fonction pour supprimer la session
export async function signOut() {
  const cookieStore = cookies()
  const sessionId = cookieStore.get("session_id")?.value

  if (sessionId) {
    db.prepare(
      `
      DELETE FROM sessions
      WHERE id = ?
    `,
    ).run(sessionId)
    cookieStore.delete("session_id")
  }
}

// Fonction pour vérifier si l'utilisateur est authentifié
export async function requireAuth(): Promise<UserSession> {
  const cookieStore = cookies()
  const sessionId = cookieStore.get("session_id")?.value

  if (!sessionId) {
    throw new Error("Non authentifié")
  }

  const session = db
    .prepare<[string], Session>(
      `
    SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.bio, u.language, u.theme, u.avatar
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `,
    )
    .get(sessionId)

  if (!session) {
    throw new Error("Session invalide")
  }

  // Vérifier si la session a expiré
  if (new Date(session.expires_at) < new Date()) {
    // Supprimer la session expirée
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId)
    cookieStore.delete("session_id")
    throw new Error("Session expirée")
  }

  return {
    id: session.user_id,
    username: session.username,
    bio: session.bio,
    language: session.language,
    theme: session.theme,
    avatar: session.avatar,
    isAdmin: session.username === "admin",
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
  const cookieStore = cookies()
  const sessionId = cookieStore.get("session_id")?.value

  if (!sessionId) {
    return null
  }

  try {
    const session = db
      .prepare<[string], Session>(
        `
      SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.bio, u.language, u.theme, u.avatar
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `,
      )
      .get(sessionId)

    if (!session) {
      // Supprimer le cookie si la session n'existe pas
      cookieStore.delete("session_id")
      return null
    }

    // Vérifier si la session a expiré
    if (new Date(session.expires_at) < new Date()) {
      // Supprimer la session expirée
      db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId)
      cookieStore.delete("session_id")
      return null
    }

    return {
      id: session.user_id,
      username: session.username,
      bio: session.bio,
      language: session.language,
      theme: session.theme,
      avatar: session.avatar,
      isAdmin: session.username === "admin",
    }
  } catch (error) {
    logger.error("Erreur lors de la récupération de l'utilisateur de la session:", error)
    return null
  }
}
