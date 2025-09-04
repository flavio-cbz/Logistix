"use server"

import { revalidatePath } from "next/cache"
import { databaseService, generateId, getCurrentTimestamp } from "./database/db"
import { requireAuth, createUser, verifyCredentials, createSession, signOut as authSignOut, UserSession } from "./auth/auth"
import { z } from "zod"
import { ZodError } from "zod"
import { calculerBenefices } from "@/lib/utils/formatting/calculations" // Import de calculerBenefices
import type { Parcelle, Produit, DashboardConfig } from '@/types/index'
import { getErrorMessage } from '@/lib/utils/error-utils';

// Schémas de validation
const userSchema = z.object({
  username: z.string().min(2, "Le nom d'utilisateur doit faire au moins 2 caractères"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
})

const loginSchema = z.object({
  password: z.string().min(1, "Le mot de passe est requis"),
})

const parcelleSchema = z.object({
  numero: z.string().min(1, "Le numéro est requis"),
  transporteur: z.string().min(1, "Le transporteur est requis"),
  poids: z.number().min(1, "Le poids doit être supérieur à 0"),
  prixTotal: z.number().min(0, "Le prix doit être positif"),
})

const produitSchema = z.object({
  commandeId: z.string().min(1, "L'ID de commande est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  details: z.string().optional(),
  prixArticle: z.number().min(0, "Le prix doit être positif"),
  poids: z.number().min(1, "Le poids doit être positif"),
  parcelleId: z.string().min(1, "La parcelle est requise"),
  vendu: z.boolean().optional(),
  dateVente: z.string().optional().nullable(),
  tempsEnLigne: z.string().optional().nullable(),
  prixVente: z.number().optional().nullable(),
  plateforme: z.string().optional().nullable(),
})

// Actions d'authentification
export async function signUp(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string


  if (!username || !password) {
    console.error("Données d'inscription incomplètes")
    return { success: false, _message: "Tous les champs sont requis" }
  }

  try {
    const validatedData = userSchema.parse({ username, password })

    const user = await createUser(validatedData.username, validatedData.password)
 
    await createSession(user.id)
 
    return { success: true, _message: "Inscription réussie" }
  } catch (error: unknown) {
    console.error("Erreur lors de l'inscription:", error)
  
    // Gestion spécifique des erreurs de validation Zod
    if (error instanceof ZodError) {
      const errorMessages = error.errors.map((err: any) => err.message).join(", ")
      return { success: false, _message: errorMessages }
    }
  
    return { success: false, _message: getErrorMessage(error) || "Une erreur s'est produite lors de l'inscription" }
  }
}

// Dans la fonction signIn, utilisons une approche différente pour définir le cookie
export async function signIn(formData: FormData) {
  const username = formData.get("username") as string
  const password = formData.get("password") as string

  try {
    const validatedData = loginSchema.parse({ password })

    if (!username) {
      return { success: false, _message: "Le nom d'utilisateur est requis" }
    }

    // Vérifier si la table users existe
    try {
      await databaseService.queryOne("SELECT 1 FROM users LIMIT 1", [], 'signIn-check')
    } catch (error: unknown) {
      console.error("Erreur lors de l'accès à la table users:", error)
      if (getErrorMessage(error).includes("no such table")) {
        return {
          success: false,
          _message: "Erreur de base de données: la table users n'existe pas. Veuillez contacter l'administrateur.",
        }
      }
    }

    const user = await verifyCredentials(username, validatedData.password)

    if (!user) {
      return { success: false, _message: "Mot de passe incorrect" }
    }


    // Supprimer toute session existante pour cet utilisateur
    try {
      await databaseService.execute("DELETE FROM sessions WHERE user_id = ?", [user.id], 'signIn-cleanup')
    } catch (error: unknown) {
      console.error("Erreur lors de la suppression des sessions existantes:", error)
    }

    // Créer une nouvelle session
    const sessionId = generateId() // Utilisation de generateId
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours

    try {
      await databaseService.execute(
        `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
        [sessionId, user.id, expiresAt],
        'signIn-createSession'
      )
  
  
      // Retourner le sessionId pour que le client puisse le définir
      return {
        success: true,
        _message: "Connexion réussie",
        sessionId: sessionId,
      }
    } catch (error: unknown) {
      console.error("Erreur lors de la création de la session:", error)
      return { success: false, _message: getErrorMessage(error) }
    }
  } catch (error: unknown) {
    console.error("Erreur lors de la connexion:", error)
    return { success: false, _message: getErrorMessage(error) }
  }
}

export async function signOut() {
  authSignOut()
  return { success: true }
}

// Actions pour les parcelles
export async function getParcelles(): Promise<Parcelle[]> {
  const user: UserSession = await requireAuth()

  try {
    const parcelles = await databaseService.query<Parcelle>(
      `SELECT * FROM parcelles WHERE user_id = ? ORDER BY created_at DESC`,
      [user.id],
      'getParcelles'
    )

    return parcelles
  } catch (error: unknown) {
    console.error("Erreur lors de la récupération des parcelles:", error)
    return []
  }
}

export async function addParcelle(formData: FormData) {
  const user: UserSession = await requireAuth()

  try {
    const numero = formData.get("numero") as string
    const transporteur = formData.get("transporteur") as string
    const poids = Number(formData.get("poids"))
    const prixTotal = Number(formData.get("prixTotal"))

    const validatedData = parcelleSchema.parse({
      numero,
      transporteur,
      poids,
      prixTotal,
    })

    const prixParGramme = validatedData.poids > 0 ? validatedData.prixTotal / validatedData.poids : 0
    const id = generateId()
    const timestamp = getCurrentTimestamp()

    await databaseService.execute(
      `INSERT INTO parcelles (id, numero, transporteur, poids, prixTotal, prixParGramme, user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, validatedData.numero, validatedData.transporteur, validatedData.poids, validatedData.prixTotal, prixParGramme, user.id, timestamp, timestamp],
      'addParcelle'
    )

    revalidatePath("/parcelles")
    revalidatePath("/dashboard")
    revalidatePath("/statistiques")

    return { success: true, _message: "Parcelle ajoutée avec succès" }
  } catch (error: unknown) {
    return { success: false, _message: getErrorMessage(error) }
  }
}

export async function updateParcelle(id: string, formData: FormData) {
  const user: UserSession = await requireAuth()

  try {
    const numero = formData.get("numero") as string
    const transporteur = formData.get("transporteur") as string
    const poids = Number(formData.get("poids"))
    const prixTotal = Number(formData.get("prixTotal"))

    const validatedData = parcelleSchema.parse({
      numero,
      transporteur,
      poids,
      prixTotal,
    })

    const prixParGramme = validatedData.poids > 0 ? validatedData.prixTotal / validatedData.poids : 0
    const timestamp = getCurrentTimestamp()

    await databaseService.execute(
      `UPDATE parcelles
       SET numero = ?, transporteur = ?, poids = ?, prixTotal = ?, prixParGramme = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      [validatedData.numero, validatedData.transporteur, validatedData.poids, validatedData.prixTotal, prixParGramme, timestamp, id, user.id],
      'updateParcelle'
    )

    // Mettre à jour les prix de livraison des produits associés
    const produits = await databaseService.query<{ id: string; poids: number }>(
      `SELECT id, poids FROM produits WHERE parcelleId = ? AND user_id = ?`,
      [id, user.id],
      'updateParcelle-getProduits'
    )

    for (const produit of produits) {
      const prixLivraison = produit.poids * prixParGramme
      await databaseService.execute(
        `UPDATE produits SET prixLivraison = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        [prixLivraison, timestamp, produit.id, user.id],
        'updateParcelle-updateProduit'
      )
    }

    revalidatePath("/parcelles")
    revalidatePath("/dashboard")
    revalidatePath("/statistiques")

    return { success: true, _message: "Parcelle mise à jour avec succès" }
  } catch (error: unknown) {
    return { success: false, _message: getErrorMessage(error) }
  }
}

export async function deleteParcelle(id: string) {
  const user: UserSession = await requireAuth()

  try {
    // Vérifier si des produits sont associés à cette parcelle
    const produits = await databaseService.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM produits WHERE parcelleId = ? AND user_id = ?`,
      [id, user.id],
      'deleteParcelle-check'
    )

    if ((produits?.count ?? 0) > 0) {
      return {
        success: false,
        _message: "Impossible de supprimer cette parcelle car des produits y sont associés",
      }
    }

    await databaseService.execute(
      `DELETE FROM parcelles WHERE id = ? AND user_id = ?`,
      [id, user.id],
      'deleteParcelle'
    )

    revalidatePath("/parcelles")
    revalidatePath("/dashboard")
    revalidatePath("/statistiques")

    return { success: true, _message: "Parcelle supprimée avec succès" }
  } catch (error: unknown) {
    return { success: false, _message: getErrorMessage(error) }
  }
}

// Actions pour les produits
export async function getProduits(): Promise<Produit[]> {
  const user: UserSession = await requireAuth()

  try {
    const produits = await databaseService.query<Produit>(`
      SELECT * FROM produits
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [user.id])

    return produits
  } catch (error: unknown) {
    console.error("Erreur lors de la récupération des produits:", error)
    return []
  }
}

export async function addProduit(formData: FormData) {
  const user: UserSession = await requireAuth()

  try {
    const commandeId = formData.get("commandeId") as string
    const nom = formData.get("nom") as string
    const details = (formData.get("details") as string) || ""
    const prixArticle = Number(formData.get("prixArticle"))
    const poids = Number(formData.get("poids"))
    const parcelleId = formData.get("parcelleId") as string
    const vendu = formData.get("vendu") === "true"

    // Valider les données de base
    const validatedData = produitSchema.parse({
      commandeId,
      nom,
      details,
      prixArticle,
      poids,
      parcelleId,
      vendu,
    })
    
    // Récupérer le prix par gramme de la parcelle
    const parcelle = await databaseService.queryOne<{ prixParGramme: number }>(`
      SELECT prixParGramme FROM parcelles
      WHERE id = ? AND user_id = ?
    `, [validatedData.parcelleId, user.id])

    if (!parcelle) {
      return { success: false, _message: "Parcelle introuvable" }
    }

    const prixLivraison = validatedData.poids * parcelle.prixParGramme
    const id = generateId()
    const timestamp = getCurrentTimestamp()

    // Préparer les données pour l'insertion
    const insertData: Partial<Produit> = { // Typage plus précis
      id,
      commandeId: validatedData.commandeId,
      nom: validatedData.nom,
      details: validatedData.details ?? "",
      prixArticle: validatedData.prixArticle,
      poids: validatedData.poids,
      prixLivraison,
      vendu: validatedData.vendu ?? false,
      parcelleId: validatedData.parcelleId,
      userId: user.id, // Correction: user_id -> userId
      createdAt: timestamp, // Correction: created_at -> createdAt
      updatedAt: timestamp, // Correction: updated_at -> updatedAt
    }

    // Si le produit est vendu, ajouter les informations de vente
    if (validatedData.vendu) {
      const dateVente = formData.get("dateVente") as string
      const tempsEnLigne = formData.get("tempsEnLigne") as string
      const prixVente = Number(formData.get("prixVente"))
      const plateforme = formData.get("plateforme") as string
    
      // Calculer les bénéfices en utilisant la fonction centralisée
      const { benefices, pourcentageBenefice } = calculerBenefices({
        prixVente,
        prixArticle: validatedData.prixArticle,
        prixLivraison,
        vendu: true, // Assurer que vendu est true pour le calcul
      })

      Object.assign(insertData, {
        dateVente,
        tempsEnLigne,
        prixVente,
        plateforme,
        benefices,
        pourcentageBenefice,
      })
    }

    // Construire la requête SQL dynamiquement
    const columns = Object.keys(insertData).join(", ")
    const placeholders = Object.keys(insertData)
      .map(() => "?")
      .join(", ")
    const values = Object.values(insertData)

    await databaseService.execute(`
      INSERT INTO produits (${columns})
      VALUES (${placeholders})
    `, values)

    revalidatePath("/produits")
    revalidatePath("/dashboard")
    revalidatePath("/statistiques")

    return { success: true, _message: "Produit ajouté avec succès" }
  } catch (error: unknown) {
    return { success: false, _message: getErrorMessage(error) }
  }
}

export async function updateProduit(id: string, formData: FormData) {
  const user: UserSession = await requireAuth()

  try {
    const commandeId = formData.get("commandeId") as string
    const nom = formData.get("nom") as string
    const details = (formData.get("details") as string) || ""
    const prixArticle = Number(formData.get("prixArticle"))
    const poids = Number(formData.get("poids"))
    const parcelleId = formData.get("parcelleId") as string
    const vendu = formData.get("vendu") === "true"

    // Valider les données de base
    const validatedData = produitSchema.parse({
      commandeId,
      nom,
      details,
      prixArticle,
      poids,
      parcelleId,
      vendu,
    })

    // Récupérer le prix par gramme de la parcelle
    const parcelle = await databaseService.queryOne<{ prixParGramme: number }>(`
      SELECT prixParGramme FROM parcelles
      WHERE id = ? AND user_id = ?
    `, [validatedData.parcelleId, user.id])

    if (!parcelle) {
      return { success: false, _message: "Parcelle introuvable" }
    }

    const prixLivraison = validatedData.poids * parcelle.prixParGramme
    const timestamp = getCurrentTimestamp()

    // Préparer les données pour la mise à jour
    const updateData: Partial<Produit> = { // Typage plus précis
      commandeId: validatedData.commandeId,
      nom: validatedData.nom,
      details: validatedData.details ?? "",
      prixArticle: validatedData.prixArticle,
      poids: validatedData.poids,
      prixLivraison,
      vendu: validatedData.vendu ?? false,
      parcelleId: validatedData.parcelleId,
      updatedAt: timestamp, // Correction: updated_at -> updatedAt
    }

    // Si le produit est vendu, ajouter les informations de vente
    if (validatedData.vendu) {
      const dateVente = formData.get("dateVente") as string
      const tempsEnLigne = formData.get("tempsEnLigne") as string
      const prixVente = Number(formData.get("prixVente"))
      const plateforme = formData.get("plateforme") as string
    
      // Calculer les bénéfices en utilisant la fonction centralisée
      const { benefices, pourcentageBenefice } = calculerBenefices({
        prixVente,
        prixArticle: validatedData.prixArticle,
        prixLivraison,
        vendu: true, // Assurer que vendu est true pour le calcul
      })

      Object.assign(updateData, {
        dateVente,
        tempsEnLigne,
        prixVente,
        plateforme,
        benefices,
        pourcentageBenefice,
      })
    } else {
      // Si le produit n'est pas vendu, effacer les informations de vente
      Object.assign(updateData, {
        dateVente: null,
        tempsEnLigne: null,
        prixVente: null,
        plateforme: null,
        benefices: null,
        pourcentageBenefice: null,
      })
    }

    // Construire la requête SQL dynamiquement
    const setClause = Object.keys(updateData)
      .map((_key) => `${_key} = ?`)
      .join(", ")
    const values = [...Object.values(updateData), id, user.id]

    await databaseService.execute(`
      UPDATE produits
      SET ${setClause}
      WHERE id = ? AND user_id = ?
    `, values)

    revalidatePath("/produits")
    revalidatePath("/dashboard")
    revalidatePath("/statistiques")

    return { success: true, _message: "Produit mis à jour avec succès" }
  } catch (error: unknown) {
    return { success: false, _message: getErrorMessage(error) }
  }
}

export async function deleteProduit(id: string) {
  const user: UserSession = await requireAuth()

  try {
    await databaseService.execute(`
      DELETE FROM produits
      WHERE id = ? AND user_id = ?
    `, [id, user.id])

    revalidatePath("/produits")
    revalidatePath("/dashboard")
    revalidatePath("/statistiques")

    return { success: true, _message: "Produit supprimé avec succès" }
  } catch (error: unknown) {
    return { success: false, _message: getErrorMessage(error) }
  }
}

// Actions pour le profil utilisateur
export async function updateAppProfile(_data: Record<string, unknown>) {
  try {
    const response = await fetch(`${process.env['NEXT_PUBLIC_BASE_URL']!}/api/profile/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(_data),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, _message: errorData.message || "Erreur lors de la mise à jour du profil." }
    }

    const result = await response.json()
    revalidatePath("/profile")
    return { success: result.success, _message: result.message }
  } catch (error: unknown) {
    console.error("Erreur lors de la mise à jour du profil:", error)
    return { success: false, _message: getErrorMessage(error) || "Une erreur s'est produite lors de la mise à jour du profil." }
  }
}

// Actions pour la configuration du dashboard
export async function getDashboardConfig(): Promise<DashboardConfig> {
  const user: UserSession = await requireAuth()

  try {
    const config = await databaseService.queryOne<{ config: string }>(`
      SELECT config
      FROM dashboard_config
      WHERE user_id = ?
    `, [user.id])

    if (!config) {
      // Configuration par défaut
      return {
        cards: [
          {
            id: "stats",
            title: "Statistiques principales",
            type: "stats",
            component: "MainStats",
            enabled: true,
            order: 0,
          },
          {
            id: "performance",
            title: "Performance des ventes",
            type: "chart",
            component: "PerformanceChart",
            enabled: true,
            order: 1,
          },
          {
            id: "plateformes",
            title: "Répartition par plateforme",
            type: "chart",
            component: "VentesPlateformes",
            enabled: true,
            order: 2,
          },
          {
            id: "top-produits",
            title: "Top produits",
            type: "table",
            component: "TopProduits",
            enabled: true,
            order: 3,
          },
          {
            id: "temps-vente",
            title: "Temps de vente",
            type: "chart",
            component: "TempsVente",
            enabled: true,
            order: 4,
          },
        ],
        layout: ["stats", "performance", "plateformes", "top-produits", "temps-vente"],
        gridLayout: { lg: 2, md: 1 },
      }
    }

    return JSON.parse(config.config) as DashboardConfig
  } catch (error: unknown) {
    console.error("Erreur lors de la récupération de la configuration du dashboard:", error)
    // Configuration par défaut en cas d'erreur
    return {
      cards: [
        {
          id: "stats",
          title: "Statistiques principales",
          type: "stats",
          component: "MainStats",
          enabled: true,
          order: 0,
        },
        {
          id: "performance",
          title: "Performance des ventes",
          type: "chart",
          component: "PerformanceChart",
          enabled: true,
          order: 1,
        },
      ],
      layout: ["stats", "performance"],
      gridLayout: { lg: 2, md: 1 },
    }
  }
}

export async function updateDashboardConfig(config: DashboardConfig) { // Typage plus précis
  const user: UserSession = await requireAuth()

  try {
    const timestamp = getCurrentTimestamp()
    const configJson = JSON.stringify(config)

    // Vérifier si une configuration existe déjà
    const existingConfig = await databaseService.queryOne<{ id: string }>(`
      SELECT id FROM dashboard_config
      WHERE user_id = ?
    `, [user.id])

    if (existingConfig) {
      // Mettre à jour la configuration existante
      await databaseService.execute(`
        UPDATE dashboard_config
        SET config = ?, updated_at = ?
        WHERE user_id = ?
      `, [configJson, timestamp, user.id])
    } else {
      // Créer une nouvelle configuration
      await databaseService.execute(`
        INSERT INTO dashboard_config (id, user_id, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `, [generateId(), user.id, configJson, timestamp, timestamp])
    }

    revalidatePath("/dashboard")
    return { success: true, _message: "Configuration mise à jour avec succès" }
  } catch (error: unknown) {
    return { success: false, _message: getErrorMessage(error) }
  }
}

// Actions pour les statistiques
export async function getStatistiques() {
  const user: UserSession = await requireAuth()

  try {
    // Récupérer les produits pour calculer les statistiques
    const produits = await databaseService.query<Produit>(`
      SELECT * FROM produits
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [user.id])

    // Récupérer les parcelles
    const parcelles = await databaseService.query<Parcelle>(`
      SELECT * FROM parcelles
      WHERE user_id = ?
    `, [user.id])

    // Calculer les statistiques
    const produitsVendus = produits.filter((p) => p.vendu).length
    const ventesTotales = produits.filter((p) => p.vendu && p.prixVente).reduce((sum, p) => sum + (p.prixVente || 0), 0)
    const beneficesTotaux = produits.filter((p) => p.benefices).reduce((sum, p) => sum + (p.benefices || 0), 0)
    const nombreParcelles = parcelles.length

    return {
      produitsVendus,
      ventesTotales,
      beneficesTotaux,
      nombreParcelles,
    }
  } catch (error: unknown) {
    console.error("Erreur lors de la récupération des statistiques:", error)
    return {
      produitsVendus: 0,
      ventesTotales: 0,
      beneficesTotaux: 0,
      nombreParcelles: 0,
    }
  }
}