import { db, generateId, getCurrentTimestamp } from "./db"
import { hashPassword } from "./auth"
import fs from "fs"
import path from "path"

// Mot de passe par défaut pour l'administrateur
// Ce mot de passe est stocké dans un fichier pour pouvoir être modifié facilement
const ADMIN_PASSWORD_FILE = path.join(process.cwd(), "data", "admin-password.txt")
const DEFAULT_ADMIN_PASSWORD = "admin123"

// Fonction pour obtenir le mot de passe admin actuel
export function getAdminPassword(): string {
  try {
    if (fs.existsSync(ADMIN_PASSWORD_FILE)) {
      return fs.readFileSync(ADMIN_PASSWORD_FILE, "utf-8").trim()
    }
  } catch (error) {
    console.error("Erreur lors de la lecture du mot de passe admin:", error)
  }

  // Si le fichier n'existe pas ou ne peut pas être lu, utiliser le mot de passe par défaut
  return DEFAULT_ADMIN_PASSWORD
}

// Fonction pour définir un nouveau mot de passe admin
export function setAdminPassword(newPassword: string): boolean {
  try {
    // Créer le répertoire data s'il n'existe pas
    const dataDir = path.join(process.cwd(), "data")
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Écrire le nouveau mot de passe dans le fichier
    fs.writeFileSync(ADMIN_PASSWORD_FILE, newPassword)

    // Mettre à jour le mot de passe dans la base de données
    const passwordHash = hashPassword(newPassword)
    db.prepare(`
      UPDATE users
      SET password_hash = ?
      WHERE username = 'admin'
    `).run(passwordHash)

    return true
  } catch (error) {
    console.error("Erreur lors de la définition du mot de passe admin:", error)
    return false
  }
}

// Fonction pour vérifier si l'utilisateur est un administrateur
export function isAdmin(userId: string): boolean {
  try {
    const user = db
      .prepare(`
      SELECT username FROM users
      WHERE id = ?
    `)
      .get(userId)

    return user && user.username === "admin"
  } catch (error) {
    console.error("Erreur lors de la vérification du statut d'administrateur:", error)
    return false
  }
}

// Fonction pour initialiser l'utilisateur administrateur
export function initializeAdmin(): void {
  try {
    // Vérifier si l'utilisateur admin existe déjà
    const adminUser = db
      .prepare(`
      SELECT id FROM users
      WHERE username = 'admin'
    `)
      .get()

    if (!adminUser) {
      // Créer l'utilisateur admin s'il n'existe pas
      const id = generateId()
      const timestamp = getCurrentTimestamp()
      const password = getAdminPassword()
      const passwordHash = hashPassword(password)

      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, "admin", "admin@logistix.local", passwordHash, timestamp, timestamp)

      console.log("Utilisateur administrateur créé avec succès")
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation de l'administrateur:", error)
  }
}

// Fonction pour obtenir des statistiques de la base de données
export function getDatabaseStats() {
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count
    const parcelleCount = db.prepare("SELECT COUNT(*) as count FROM parcelles").get().count
    const produitCount = db.prepare("SELECT COUNT(*) as count FROM produits").get().count
    const sessionCount = db.prepare("SELECT COUNT(*) as count FROM sessions").get().count

    return {
      users: userCount,
      parcelles: parcelleCount,
      produits: produitCount,
      sessions: sessionCount,
      dbSize: getDatabaseSize(),
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error)
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
    console.error("Erreur lors de la récupération de la taille de la base de données:", error)
    return "0 MB"
  }
}

// Fonction pour obtenir la liste des utilisateurs
export function getUsers() {
  try {
    return db
      .prepare(`
      SELECT id, username, email, created_at
      FROM users
      ORDER BY created_at DESC
    `)
      .all()
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error)
    return []
  }
}

// Fonction pour réinitialiser le mot de passe d'un utilisateur
export function resetUserPassword(userId: string, newPassword: string): boolean {
  try {
    const passwordHash = hashPassword(newPassword)
    const timestamp = getCurrentTimestamp()

    db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `).run(passwordHash, timestamp, userId)

    return true
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error)
    return false
  }
}

// Fonction pour supprimer un utilisateur
export function deleteUser(userId: string): boolean {
  try {
    // Vérifier que ce n'est pas l'administrateur
    const user = db.prepare("SELECT username FROM users WHERE id = ?").get(userId)
    if (user && user.username === "admin") {
      return false // Ne pas supprimer l'administrateur
    }

    // Supprimer l'utilisateur
    db.prepare("DELETE FROM users WHERE id = ?").run(userId)

    return true
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error)
    return false
  }
}

// Fonction pour nettoyer les sessions expirées
export function cleanupExpiredSessions(): number {
  try {
    const result = db
      .prepare(`
      DELETE FROM sessions
      WHERE expires_at < ?
    `)
      .run(new Date().toISOString())

    return result.changes
  } catch (error) {
    console.error("Erreur lors du nettoyage des sessions expirées:", error)
    return 0
  }
}

