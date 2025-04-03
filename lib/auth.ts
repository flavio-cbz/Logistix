import { db, generateId, getCurrentTimestamp } from "@/lib/db"
import { cookies } from "next/headers"
import crypto from "crypto"

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_tres_securise_a_changer_en_production"
const COOKIE_NAME = process.env.COOKIE_NAME || "logistix_session"
const COOKIE_MAX_AGE = Number(process.env.COOKIE_MAX_AGE) || 604800 // 7 days

// Fonction pour hacher un mot de passe
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

// Fonction pour créer un utilisateur
export function createUser(username: string, email: string, password: string) {
  const id = generateId()
  const passwordHash = hashPassword(password)
  const timestamp = getCurrentTimestamp()

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, username, email, passwordHash, timestamp, timestamp)

  return { id, username, email }
}

// Fonction pour vérifier les identifiants
export function verifyCredentials(email: string, password: string) {
  const passwordHash = hashPassword(password)

  const user = db
    .prepare(`
    SELECT id, username, email, password_hash FROM users
    WHERE email = ?
  `)
    .get(email)

  if (!user || user.password_hash !== passwordHash) {
    return null
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
  }
}

// Fonction pour créer une session
export function createSession(userId: string) {
  const sessionId = generateId()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours

  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(sessionId, userId, expiresAt)

  return sessionId
}

// Fonction pour supprimer la session
export function signOut() {
  const sessionId = cookies().get("session_id")?.value

  if (sessionId) {
    db.prepare(`
      DELETE FROM sessions
      WHERE id = ?
    `).run(sessionId)
    cookies().delete("session_id")
  }
}

// Fonction pour vérifier si l'utilisateur est authentifié
export function requireAuth() {
  const sessionId = cookies().get("session_id")?.value

  if (!sessionId) {
    throw new Error("Non authentifié")
  }

  const session = db
    .prepare(`
    SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.email
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `)
    .get(sessionId)

  if (!session) {
    throw new Error("Session invalide")
  }

  return {
    id: session.user_id,
    username: session.username,
    email: session.email,
  }
}

// Fonction pour vérifier si l'utilisateur est un administrateur
export function requireAdmin() {
  const user = requireAuth()

  if (user.username !== "admin") {
    throw new Error("Non autorisé")
  }
}

// Modifier la fonction getSessionUser pour vérifier l'expiration de la session
export function getSessionUser() {
  const sessionId = cookies().get("session_id")?.value

  if (!sessionId) {
    return null
  }

  try {
    const session = db
      .prepare(`
      SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.email
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `)
      .get(sessionId)

    if (!session) {
      // Supprimer le cookie si la session n'existe pas
      cookies().delete("session_id")
      return null
    }

    // Vérifier si la session a expiré
    if (new Date(session.expires_at) < new Date()) {
      // Supprimer la session expirée
      db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId)
      cookies().delete("session_id")
      return null
    }

    return {
      id: session.user_id,
      username: session.username,
      email: session.email,
      isAdmin: session.username === "admin",
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur de la session:", error)
    return null
  }
}

