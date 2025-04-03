"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import {
  getDatabaseStats,
  getUsers,
  resetUserPassword,
  deleteUser,
  cleanupExpiredSessions,
  setAdminPassword,
  getAdminPassword,
} from "@/lib/admin"
import { z } from "zod"

// Schéma de validation pour le changement de mot de passe
const passwordSchema = z.object({
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
})

// Action pour obtenir les statistiques de la base de données
export async function getStats() {
  requireAdmin()
  return getDatabaseStats()
}

// Action pour obtenir la liste des utilisateurs
export async function getAllUsers() {
  requireAdmin()
  return getUsers()
}

// Action pour réinitialiser le mot de passe d'un utilisateur
export async function resetPassword(userId: string, newPassword: string) {
  requireAdmin()

  try {
    const validatedData = passwordSchema.parse({ password: newPassword })
    const success = resetUserPassword(userId, validatedData.password)

    return {
      success,
      message: success ? "Mot de passe réinitialisé avec succès" : "Échec de la réinitialisation du mot de passe",
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Action pour supprimer un utilisateur
export async function removeUser(userId: string) {
  requireAdmin()

  try {
    const success = deleteUser(userId)
    revalidatePath("/admin")

    return {
      success,
      message: success ? "Utilisateur supprimé avec succès" : "Échec de la suppression de l'utilisateur",
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Action pour nettoyer les sessions expirées
export async function cleanupSessions() {
  requireAdmin()

  try {
    const count = cleanupExpiredSessions()

    return { success: true, message: `${count} sessions expirées ont été supprimées` }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Action pour changer le mot de passe administrateur
export async function changeAdminPassword(newPassword: string) {
  requireAdmin()

  try {
    const validatedData = passwordSchema.parse({ password: newPassword })
    const success = setAdminPassword(validatedData.password)

    return {
      success,
      message: success ? "Mot de passe administrateur modifié avec succès" : "Échec de la modification du mot de passe",
    }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

// Action pour obtenir le mot de passe administrateur actuel
export async function getCurrentAdminPassword() {
  requireAdmin()

  return getAdminPassword()
}

