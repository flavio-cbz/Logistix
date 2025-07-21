import { NextResponse } from "next/server"
import { db, generateId, getCurrentTimestamp } from "@/lib/services/db"
import { getSessionUser } from "@/lib/services/auth"
import { Logger } from "@/lib/utils/logger"

const logger = new Logger("api/data/sync")

export async function POST(request: Request) {
  try {
    // Vérifier l'authentification
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: "Non authentifié" }, { status: 401 })
    }
    logger.info(`Synchronisation demandée par l'utilisateur: ${user.id}`)

    // Récupérer les données du corps de la requête
    const { parcelles, produits } = await request.json()
    logger.info(`Données reçues: ${parcelles.length} parcelles, ${produits.length} produits`)

    // Validation des données
    if (!Array.isArray(parcelles) || !Array.isArray(produits)) {
      return NextResponse.json({ success: false, message: "Format de données invalide" }, { status: 400 })
    }

    const syncTransaction = db.transaction(() => {
      logger.info("Début de la transaction de synchronisation")
      // Supprimer les anciennes données de l'utilisateur
      db.prepare("DELETE FROM parcelles WHERE user_id = ?").run(user.id)
      db.prepare("DELETE FROM produits WHERE user_id = ?").run(user.id)
      logger.info("Anciennes données supprimées")

      // Insérer les nouvelles parcelles
      const insertParcelle = db.prepare(`
        INSERT INTO parcelles (id, user_id, numero, transporteur, poids, prixTotal, prixParGramme, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const parcelle of parcelles) {
        const timestamp = getCurrentTimestamp()
        insertParcelle.run(
          parcelle.id || generateId(),
          user.id,
          parcelle.numero,
          parcelle.transporteur,
          parcelle.poids,
          parcelle.prixTotal,
          parcelle.prixParGramme,
          parcelle.created_at || timestamp,
          parcelle.updated_at || timestamp,
        )
      }
      logger.info(`${parcelles.length} parcelles insérées`)

      // Insérer les nouveaux produits
      const insertProduit = db.prepare(`
        INSERT INTO produits (
          id, user_id, parcelleId, commandeId, nom, details, prixArticle, poids, prixLivraison,
          vendu, dateVente, tempsEnLigne, prixVente, plateforme, benefices, pourcentageBenefice,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const produit of produits) {
        const timestamp = getCurrentTimestamp()
        insertProduit.run(
          produit.id || generateId(),
          user.id,
          produit.parcelleId,
          produit.commandeId,
          produit.nom,
          produit.details || null,
          produit.prixArticle,
          produit.poids,
          produit.prixLivraison,
          produit.vendu ? 1 : 0,
          produit.dateVente || null,
          produit.tempsEnLigne || null,
          produit.prixVente || null,
          produit.plateforme || null,
          produit.benefices || null,
          produit.pourcentageBenefice || null,
          produit.created_at || timestamp,
          produit.updated_at || timestamp,
        )
      }
      logger.info(`${produits.length} produits insérés`)
      logger.info("Transaction de synchronisation terminée")
    })

    syncTransaction()

    return NextResponse.json({
      success: true,
      message: "Données synchronisées avec succès",
      count: {
        parcelles: parcelles.length,
        produits: produits.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    logger.error("Erreur lors de la synchronisation des données:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Une erreur s'est produite lors de la synchronisation des données",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Vérifier l'authentification
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ success: false, message: "Non authentifié" }, { status: 401 })
    }

    // Récupérer les parcelles de l'utilisateur
    const parcelles = db
      .prepare(
        `
        SELECT * FROM parcelles
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
      )
      .all(user.id)

    // Récupérer les produits de l'utilisateur
    const produits = db
      .prepare(
        `
        SELECT * FROM produits
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
      )
      .all(user.id)

    return NextResponse.json({
      success: true,
      data: {
        parcelles,
        produits,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    logger.error("Erreur lors de la récupération des données:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Une erreur s'est produite lors de la récupération des données",
      },
      { status: 500 },
    )
  }
}
