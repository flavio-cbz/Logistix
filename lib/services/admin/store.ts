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

// Mettons à jour la configuration par défaut du dashboard avec nos nouveaux composants
const defaultDashboardConfig: DashboardConfig = {
  cards: [
    { id: "stats", title: "Statistiques principales", type: "stats", component: "MainStats", enabled: true, order: 0 },
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
    { id: "top-produits", title: "Top produits", type: "table", component: "TopProduits", enabled: true, order: 3 },
    { id: "temps-vente", title: "Temps de vente", type: "chart", component: "TempsVente", enabled: true, order: 4 },
    {
      id: "marge-mensuelle",
      title: "Marge mensuelle",
      type: "chart",
      component: "MargeMensuelle",
      enabled: false,
      order: 5,
    },
    { id: "top-parcelles", title: "Top parcelles", type: "table", component: "TopParcelles", enabled: false, order: 6 },
    { id: "cout-poids", title: "Coût par poids", type: "chart", component: "CoutPoids", enabled: false, order: 7 },
    {
      id: "tendances",
      title: "Tendances de vente",
      type: "chart",
      component: "TendancesVente",
      enabled: false,
      order: 8,
    },
  ],
  layout: ["stats", "performance", "plateformes", "top-produits", "temps-vente"],
  gridLayout: { lg: 2, md: 1 },
}

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
  importData: (data: any) => void
  exportData: () => { parcelles: Parcelle[]; produits: Produit[]; dashboardConfig: DashboardConfig }

  syncWithDatabase: () => Promise<boolean>
  loadFromDatabase: () => Promise<boolean>
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      parcelles: [],
      produits: [],
      dashboardConfig: defaultDashboardConfig,
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
          userId: produit.userId || '', // Add userId field
          commandeId: produit.commandeId,
          nom: produit.nom,
          details: produit.details,
          prixArticle: produit.prixArticle,
          poids: produit.poids,
          parcelleId: produit.parcelleId,
          vendu: produit.vendu,
          prixLivraison,
          benefices,
          pourcentageBenefice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          parcelles: [],
          produits: [],
          dashboardConfig: defaultDashboardConfig,
          exportDate: new Date().toISOString(),
        }
      },

      // Améliorer la synchronisation avec la base de données
      syncWithDatabase: async () => {
        // Empêcher les synchronisations concurrentes en utilisant un verrou interne (_syncInProgress)
        const storeAny: any = get() as any
        if (storeAny._syncInProgress) {
          logger.info("Synchronisation déjà en cours, attente de la première requête")
          return storeAny._syncPromise || false
        }
        storeAny._syncInProgress = true

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
            storeAny._syncInProgress = false
            try { delete storeAny._syncPromise } catch { /* ignore */ }
          }
        })()

        storeAny._syncPromise = syncPromise
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
