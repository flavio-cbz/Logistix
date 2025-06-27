import { db, generateId, getCurrentTimestamp } from "./db"
import { hashPassword } from "./auth"
import fs from "fs"
import path from "path"
import { Logger } from "./logger"

const logger = new Logger("lib/admin")


// Fonction pour vérifier si l'utilisateur est un administrateur
export function isAdmin(userId: string): boolean {
  try {
    const user = db
      .prepare(
        `
      SELECT username FROM users
      WHERE id = ?
    `,
      )
      .get(userId) as { username: string } | undefined

    return !!user && user.username === "admin"
  } catch (error) {
    logger.error("Erreur lors de la vérification du statut d'administrateur:", error)
    return false
  }
}

// Fonction pour initialiser l'utilisateur administrateur
export function initializeAdmin(): void {
  try {
    // Vérifier si l'utilisateur admin existe déjà
    const adminUser = db
      .prepare(
        `
      SELECT id FROM users
      WHERE username = 'admin'
    `,
      )
      .get()

    if (!adminUser) {
      logger.info("Utilisateur administrateur non trouvé, création en cours...")
      // Créer l'utilisateur admin s'il n'existe pas
      const id = generateId()
      const timestamp = getCurrentTimestamp()
      const passwordHash = hashPassword(getAdminPassword())

      db.prepare(
        `
        INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      ).run(id, "admin", "admin@logistix.local", passwordHash, timestamp, timestamp)

      logger.info("Utilisateur administrateur créé avec succès")
    }
  } catch (error) {
    logger.error("Erreur lors de l'initialisation de l'administrateur:", error)
  }
}

// Fonction pour vérifier si l'administrateur utilise le mot de passe par défaut
export function isAdminUsingDefaultPassword(): boolean {
  try {
    const adminUser = db
      .prepare(
        `
      SELECT password_hash FROM users
      WHERE username = 'admin'
    `,
      )
      .get() as { password_hash: string } | undefined

    if (!adminUser) {
      return false // L'utilisateur admin n'existe pas
    }

    const defaultPasswordHash = hashPassword(DEFAULT_ADMIN_PASSWORD)
    return adminUser.password_hash === defaultPasswordHash
  } catch (error) {
    logger.error(
      "Erreur lors de la vérification du mot de passe par défaut de l'administrateur:",
      error,
    )
    return false
  }
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin"
}

const DEFAULT_ADMIN_PASSWORD = "admin"

// Fonction pour obtenir des statistiques de la base de données
export function getDatabaseStats() {
  try {
    const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count
    const parcelleCount = (db.prepare("SELECT COUNT(*) as count FROM parcelles").get() as { count: number }).count
    const produitCount = (db.prepare("SELECT COUNT(*) as count FROM produits").get() as { count: number }).count
    const sessionCount = (db.prepare("SELECT COUNT(*) as count FROM sessions").get() as { count: number }).count

    return {
      users: userCount,
      parcelles: parcelleCount,
      produits: produitCount,
      sessions: sessionCount,
      dbSize: getDatabaseSize(),
    }
  } catch (error) {
    logger.error("Erreur lors de la récupération des statistiques:", error)
    return {
      users: 0,
      parcelles: 0,
      produits: 0,
      sessions: 0,
      dbSize: "0 MB",
    }
  }
}

// Fonction pour obtenir la taille de la base de données
function getDatabaseSize(): string {
  try {
    const dbPath = path.join(process.cwd(), "data", "logistix.db")
    const stats = fs.statSync(dbPath)
    const fileSizeInBytes = stats.size
    const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024)
    return `${fileSizeInMegabytes.toFixed(2)} MB`
  } catch (error) {
    logger.error("Erreur lors de la récupération de la taille de la base de données:", error)
    return "0 MB"
  }
}

// Fonction pour obtenir la liste des utilisateurs
export function getUsers() {
  try {
    return db
      .prepare(
        `
      SELECT id, username, email, created_at
      FROM users
      ORDER BY created_at DESC
    `,
      )
      .all()
  } catch (error) {
    logger.error("Erreur lors de la récupération des utilisateurs:", error)
    return []
  }
}

// Fonction pour réinitialiser le mot de passe d'un utilisateur
export function resetUserPassword(userId: string, newPassword: string): boolean {
  try {
    const passwordHash = hashPassword(newPassword)
    const timestamp = getCurrentTimestamp()

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(passwordHash, timestamp, userId)

    return true
  } catch (error) {
    logger.error("Erreur lors de la réinitialisation du mot de passe:", error)
    return false
  }
}

// Fonction pour supprimer un utilisateur
export function deleteUser(userId: string): boolean {
  try {
    // Vérifier que ce n'est pas l'administrateur
    const user = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as { username: string } | undefined
    if (user && user.username === "admin") {
      return false // Ne pas supprimer l'administrateur
    }

    // Supprimer l'utilisateur
    db.prepare("DELETE FROM users WHERE id = ?").run(userId)

    return true
  } catch (error) {
    logger.error("Erreur lors de la suppression de l'utilisateur:", error)
    return false
  }
}

// Fonction pour nettoyer les sessions expirées
export function cleanupExpiredSessions(): number {
  try {
    const result = db
      .prepare(
        `
      DELETE FROM sessions
      WHERE expires_at < ?
    `,
      )
      .run(new Date().toISOString())

    return result.changes
  } catch (error) {
    logger.error("Erreur lors du nettoyage des sessions expirées:", error)
    return 0
  }
}
