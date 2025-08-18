import { databaseService, generateId, getCurrentTimestamp } from "@/lib/services/database/db"
import { hashPasswordSync } from "@/lib/utils/crypto"
import fs from "fs"
import path from "path"
import { SimpleLogger as Logger } from "@/lib/utils/logging";
import { DEFAULT_ADMIN_PASSWORD } from "@/lib/constants/config"

const logger = new Logger("lib/admin")


// Fonction pour vérifier si l'utilisateur est un administrateur
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await databaseService.queryOne<{ username: string }>(
      `SELECT username FROM users WHERE id = ?`,
      [userId]
    )

    return !!user && user.username === "admin"
  } catch (error) {
    logger.error("Erreur lors de la vérification du statut d'administrateur:", error)
    return false
  }
}

// Fonction pour initialiser l'utilisateur administrateur
export async function initializeAdmin(): Promise<void> {
  try {
    // Vérifier si l'utilisateur admin existe déjà
    const adminUser = await databaseService.queryOne<{ id: string }>(
      `SELECT id FROM users WHERE username = 'admin'`
    )

    if (!adminUser) {
      logger.info("Utilisateur administrateur non trouvé, création en cours...")
      // Créer l'utilisateur admin s'il n'existe pas
      const id = generateId()
      const timestamp = getCurrentTimestamp()
      const passwordHash = hashPasswordSync(getAdminPassword())

      await databaseService.execute(
        `INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, "admin", "admin@logistix.local", passwordHash, timestamp, timestamp]
      )

      logger.info("Utilisateur administrateur créé avec succès")
    }
  } catch (error) {
    logger.error("Erreur lors de l'initialisation de l'administrateur:", error)
  }
}

// Fonction pour vérifier si l'administrateur utilise le mot de passe par défaut
export async function isAdminUsingDefaultPassword(): Promise<boolean> {
  try {
    const adminUser = await databaseService.queryOne<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE username = 'admin'`
    )

    if (!adminUser) {
      return false // L'utilisateur admin n'existe pas
    }

    const defaultPasswordHash = hashPasswordSync(DEFAULT_ADMIN_PASSWORD)
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
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD
}

// Fonction pour obtenir des statistiques de la base de données
export async function getDatabaseStats() {
  try {
    const userCount = (await databaseService.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users"))?.count || 0
    const parcelleCount = (await databaseService.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM parcelles"))?.count || 0
    const produitCount = (await databaseService.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM produits"))?.count || 0
    const sessionCount = (await databaseService.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM sessions"))?.count || 0

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
export async function getUsers() {
  try {
    return await databaseService.query(
      `SELECT id, username, email, created_at
       FROM users
       ORDER BY created_at DESC`
    )
  } catch (error) {
    logger.error("Erreur lors de la récupération des utilisateurs:", error)
    return []
  }
}

// Fonction pour réinitialiser le mot de passe d'un utilisateur
export async function resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    const passwordHash = hashPasswordSync(newPassword)
    const timestamp = getCurrentTimestamp()

    await databaseService.execute(
      `UPDATE users
       SET password_hash = ?, updated_at = ?
       WHERE id = ?`,
      [passwordHash, timestamp, userId]
    )

    return true
  } catch (error) {
    logger.error("Erreur lors de la réinitialisation du mot de passe:", error)
    return false
  }
}

// Fonction pour supprimer un utilisateur
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    // Vérifier que ce n'est pas l'administrateur
    const user = await databaseService.queryOne<{ username: string }>("SELECT username FROM users WHERE id = ?", [userId])
    if (user && user.username === "admin") {
      return false // Ne pas supprimer l'administrateur
    }

    // Supprimer l'utilisateur
    await databaseService.execute("DELETE FROM users WHERE id = ?", [userId])

    return true
  } catch (error) {
    logger.error("Erreur lors de la suppression de l'utilisateur:", error)
    return false
  }
}

// Fonction pour nettoyer les sessions expirées
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await databaseService.execute(
      `DELETE FROM sessions WHERE expires_at < ?`,
      [new Date().toISOString()]
    )

    return result.changes
  } catch (error) {
    logger.error("Erreur lors du nettoyage des sessions expirées:", error)
    return 0
  }
}
