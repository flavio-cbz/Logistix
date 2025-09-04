import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Parcelle, Produit } from "@/types/database"
import type { DashboardConfig } from "@/types/features/dashboard"
// Simple logger disabled
// import { Logger } from "@/lib/utils/simple-logger.js"
import { calculerBenefices, calculPrixLivraison } from "@/lib/utils/formatting/calculations" // Import des fonctions utilitaires

// Simple logger disabled
const logger = { 
  log: console.log, 
  error: console.error, 
  warn: console.warn,
  debug: console.log,
  info: console.log
};



interface StoreState {
  parcelles: Parcelle[]
  produits: Produit[]
  dashboardConfig: DashboardConfig
  notifications: { id: string; type: "success" | "error" | "warning" | "info"; message: string }[]

  // Actions
  initializeStore: () => void

  // Parcelles
  addParcelle: (parcelle: Omit<Parcelle, "id" | "createdAt" | "updatedAt" | "prixParGramme">) => void
  updateParcelle: (id: string, data: Partial<Parcelle>) => void
  deleteParcelle: (id: string) => Promise<void>

  // Produits
  addProduit: (
    produit: Omit<Produit, "id" | "createdAt" | "updatedAt" | "prixLivraison" | "benefices" | "pourcentageBenefice">,
  ) => void
  updateProduit: (id: string, data: Partial<Produit>) => void
  updateProduitVente: (id: string, data: Partial<Produit>) => void
  deleteProduit: (id: string) => void

  // Dashboard
  updateDashboardConfig: (config: DashboardConfig) => void

  // Notifications
  addNotification: (type: "success" | "error" | "warning" | "info", message: string) => void
  clearNotification: (id: string) => void

  // Import/Export
  importData: (data: { parcelles: Parcelle[]; produits: Produit[]; dashboardConfig: DashboardConfig }) => void
  exportData: () => { parcelles: Parcelle[]; produits: Produit[]; dashboardConfig: DashboardConfig; exportDate: string }

  syncWithDatabase: () => Promise<boolean | { parcelles: Parcelle[]; produits: Produit[]; dashboardConfig: DashboardConfig } | null>;
  loadFromDatabase: (returnData?: boolean) => Promise<boolean | { parcelles: Parcelle[]; produits: Produit[]; dashboardConfig: DashboardConfig } | null>;
}

type StoreWithSync = StoreState & {
  _syncInProgress?: boolean
  _syncPromise?: Promise<boolean | { parcelles: Parcelle[]; produits: Produit[]; dashboardConfig: DashboardConfig } | null>
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      parcelles: get().parcelles,
      produits: get().produits,
      dashboardConfig: get().dashboardConfig,
      notifications: [],

      initializeStore: async () => {
        await get().loadFromDatabase();
      },

      // Parcelles
      addParcelle: (parcelle) => {
        const prixParGramme = parcelle.poids > 0 ? parcelle.prixTotal / parcelle.poids : 0

        const newParcelle: Parcelle = {
          ...parcelle,
          id: crypto.randomUUID(),
          prixParGramme,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({ parcelles: [...state.parcelles, newParcelle] }))
        get().addNotification("success", `La parcelle ${parcelle.numero} a été ajoutée avec succès.`)

        // Synchroniser avec la base de données
        get().syncWithDatabase()
      },

      updateParcelle: (id, data) => {
        const { parcelles } = get()
        const currentParcelle = parcelles.find((p) => p.id === id)

        if (!currentParcelle) return

        let updateData = { ...data }

        // Recalculer le prix par gramme si nécessaire
        if (data.prixTotal !== undefined || data.poids !== undefined) {
          const prixTotal = data.prixTotal ?? currentParcelle.prixTotal
          const poids = data.poids ?? currentParcelle.poids

          const prixParGramme = poids > 0 ? prixTotal / poids : 0

          updateData = {
            ...data,
            prixParGramme,
          }
        }

        set((state) => ({
          parcelles: state.parcelles.map((p) =>
            p.id === id ? { ...p, ...updateData, updatedAt: new Date().toISOString() } : p,
          ),
        }))

        get().addNotification("success", `La parcelle a été mise à jour avec succès.`)

        // Mettre à jour les prix de livraison des produits associés à cette parcelle
        if (updateData.prixParGramme !== undefined) {
          const { produits, parcelles } = get()
          const produitsAMettreAJour = produits.filter((p) => p.parcelleId === id)

          produitsAMettreAJour.forEach((produit) => {
            const prixLivraison = calculPrixLivraison(produit.poids, parcelles, id)

            const { benefices, pourcentageBenefice } = calculerBenefices({
              ...produit,
              prixLivraison,
            })

            get().updateProduit(produit.id, {
              prixLivraison,
              benefices,
              pourcentageBenefice,
            })
          })
        }

        // Synchroniser avec la base de données
        get().syncWithDatabase()
      },

      deleteParcelle: async (id) => {
        set((state) => ({
          parcelles: state.parcelles.filter((p) => p.id !== id),
        }))
        get().addNotification("success", `La parcelle a été supprimée avec succès.`)

        // Synchroniser avec la base de données
        await get().syncWithDatabase()
      },

      // Produits
      addProduit: (produit) => {
        const { parcelles } = get()
        const parcelleAssociee = parcelles.find((p) => p.id === produit.parcelleId)
        const prixLivraison = parcelleAssociee ? calculPrixLivraison(produit.poids, parcelles, produit.parcelleId) : 0

        const { benefices, pourcentageBenefice } = calculerBenefices({
          ...produit,
          prixLivraison,
        })

        const newProduit: Produit = {
          id: crypto.randomUUID(),
          userId: produit.userId,
          commandeId: produit.commandeId,
          nom: produit.nom ?? undefined, // Use ?? undefined to handle null
          details: produit.details ?? undefined, // Use ?? undefined to handle null
          prixArticle: produit.prixArticle,
          poids: produit.poids,
          parcelleId: produit.parcelleId,
          vendu: produit.vendu,
          prixLivraison,
          benefices,
          pourcentageBenefice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dateAchat: produit.dateAchat ?? undefined, // Handle dateAchat
          tempsEnLigne: produit.tempsEnLigne ?? undefined, // Handle tempsEnLigne
        }
        
        set((state) => ({ produits: [...state.produits, newProduit] }))
        get().addNotification("success", `Le produit ${produit.nom} a été ajouté avec succès.`)

        // Synchroniser avec la base de données
        get().syncWithDatabase()
      },

      updateProduit: (id, data) => {
        const { produits, parcelles } = get()
        const currentProduit = produits.find((p) => p.id === id)

        if (!currentProduit) return

        let updateData = { ...data }

        // Recalculer prixLivraison, benefices et pourcentageBenefice si des champs pertinents changent
        if (
          data.poids !== undefined ||
          data.parcelleId !== undefined ||
          data.prixArticle !== undefined ||
          data.prixVente !== undefined ||
          data.vendu !== undefined
        ) {
          const parcelleId = data.parcelleId ?? currentProduit.parcelleId
          const poids = data.poids ?? currentProduit.poids
          const prixArticle = data.prixArticle ?? currentProduit.prixArticle
          const prixVente = data.prixVente ?? currentProduit.prixVente
          const vendu = data.vendu ?? currentProduit.vendu

          const parcelleAssociee = parcelles.find((p) => p.id === parcelleId)
          const prixLivraison = parcelleAssociee ? calculPrixLivraison(poids, parcelles, parcelleId) : 0

          const { benefices, pourcentageBenefice } = calculerBenefices({
            ...currentProduit,
            ...data,
            prixLivraison,
            prixArticle,
            prixVente,
            vendu,
          })

          updateData = {
            ...data,
            prixLivraison,
            benefices,
            pourcentageBenefice,
            nom: data.nom ?? undefined, // Handle nom
            details: data.details ?? undefined, // Handle details
            dateAchat: data.dateAchat ?? undefined, // Handle dateAchat
            tempsEnLigne: data.tempsEnLigne ?? undefined, // Handle tempsEnLigne
          }
        }

        set((state) => ({
          produits: state.produits.map((p) =>
            p.id === id ? { ...p, ...updateData, updatedAt: new Date().toISOString() } : p,
          ),
        }))

        get().addNotification("success", `Le produit a été mis à jour avec succès.`)

        // Synchroniser avec la base de données
        get().syncWithDatabase()
      },

      updateProduitVente: (id, data) => {
        const { produits } = get()
        const currentProduit = produits.find((p) => p.id === id)

        if (!currentProduit) return

        const updatedProduit = {
          ...currentProduit,
          ...data,
          updatedAt: new Date().toISOString(),
        }

        const { benefices, pourcentageBenefice } = calculerBenefices(updatedProduit)

        updatedProduit.benefices = benefices
        updatedProduit.pourcentageBenefice = pourcentageBenefice

        set((state) => ({
          produits: state.produits.map((p) => (p.id === id ? updatedProduit : p)),
        }))

        get().addNotification("success", `La vente du produit a été enregistrée avec succès.`)

        // Synchroniser avec la base de données
        get().syncWithDatabase()
      },

      deleteProduit: (id) => {
        set((state) => ({
          produits: state.produits.filter((p) => p.id !== id),
        }))
        get().addNotification("success", `Le produit a été supprimé avec succès.`)

        // Synchroniser avec la base de données
        get().syncWithDatabase()
      },

      // Dashboard
      updateDashboardConfig: (config) => {
        set({ dashboardConfig: config })
      },

      // Notifications
      addNotification: (type, message) => {
        const newNotification = {
          id: crypto.randomUUID(),
          type,
          message,
        }
        set((state) => ({
          notifications: [newNotification, ...state.notifications.slice(0, 9)],
        }))

        // Supprimer automatiquement la notification après 5 secondes
        setTimeout(() => {
          get().clearNotification(newNotification.id)
        }, 5000)
      },

      clearNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      // Import/Export
      importData: (data) => {
        // Fonctionnalité temporairement désactivée
        logger.warn("Tentative d'utilisation de la fonctionnalité d'importation désactivée.", { data })
        get().addNotification("warning", "La fonctionnalité d'importation est temporairement désactivée.")
        return false
      },

      exportData: () => {
        // Fonctionnalité temporairement désactivée
        logger.warn("Tentative d'utilisation de la fonctionnalité d'exportation désactivée.")
        get().addNotification("warning", "La fonctionnalité d'exportation est temporairement désactivée.")
        return {
          parcelles: get().parcelles,
          produits: get().produits,
          dashboardConfig: get().dashboardConfig,
          exportDate: new Date().toISOString(), // Add exportDate
        }
      },

      // Améliorer la synchronisation avec la base de données
      syncWithDatabase: async () => {
        // Empêcher les synchronisations concurrentes en utilisant un verrou interne (_syncInProgress)
        const store = get() as StoreWithSync
        if (store._syncInProgress) {
          logger.info("Synchronisation déjà en cours, attente de la première requête")
          return store._syncPromise || false
        }
        store._syncInProgress = true

        const syncPromise = (async () => {
          try {
            const { parcelles, produits } = get()

            // Envoyer les données au serveur
            const response = await fetch("/api/v1/data/sync", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ parcelles, produits }),
              // Timeout pour éviter les blocages
              signal: AbortSignal.timeout(10000),
            })

            if (!response.ok) {
              throw new Error(`Erreur HTTP: ${response.status}`)
            }

            const result = await response.json()

            if (!result.success) {
              throw new Error(result.message)
            }

            // Ajouter une notification de succès
            get().addNotification("success", "Données synchronisées avec le serveur")
            return true
          } catch (error) {
            logger.error("Erreur lors de la synchronisation avec la base de données:", error)
            // Ajouter une notification d'erreur
            get().addNotification("error", "Échec de la synchronisation avec le serveur")
            return false
          } finally {
            // Libérer le verrou et supprimer la promesse interne
            store._syncInProgress = false
            try { delete store._syncPromise } catch { /* ignore */ }
          }
        })()

        store._syncPromise = syncPromise
        return syncPromise
      },

      loadFromDatabase: async (returnData = false) => {
        try {
          // Récupérer les données du serveur
          const response = await fetch("/api/v1/data/sync", {
            signal: AbortSignal.timeout(10000),
          })

          if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`)
          }

          const result = await response.json()

          if (!result.success) {
            throw new Error(result.message)
          }
          
          // Vérifier si les données sont valides et non vides avant de les appliquer
          if (result.data && Array.isArray(result.data.parcelles) && Array.isArray(result.data.produits)) {
            if (returnData) {
              return result.data;
            }
            set({
              parcelles: result.data.parcelles.filter((p: Parcelle) => p.id),
              produits: result.data.produits.filter((p: Produit) => p.id),
            })
            return true;
          } else {
            logger.warn("Données invalides ou vides reçues de la base de données. Conservation de l'état local.")
            get().addNotification("warning", "Données de la base de données invalides ou vides. Utilisation des données locales.")
            return returnData ? null : false;
          }
        } catch (error) {
          logger.error("Erreur lors du chargement depuis la base de données:", error)
          get().addNotification("warning", "Échec du chargement depuis le serveur. Utilisation des données locales.")
          return returnData ? null : false;
        }
      },
    }),
    {
      name: "logistix-storage",
      partialize: (state) => ({
        parcelles: state.parcelles,
        produits: state.produits,
        dashboardConfig: state.dashboardConfig,
      }),
    },
  ),
)