import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Parcelle, Produit, DashboardConfig } from "@/types"

const defaultDashboardConfig: DashboardConfig = {
  cards: [
    { id: "stats", title: "Statistiques principales", type: "stats", component: "MainStats", enabled: true, order: 0 },
    { id: "performance", title: "Performance des ventes", type: "chart", component: "PerformanceChart", enabled: true, order: 1 },
    { id: "plateformes", title: "Répartition par plateforme", type: "chart", component: "VentesPlateformes", enabled: true, order: 2 },
    { id: "top-produits", title: "Top produits", type: "table", component: "TopProduits", enabled: true, order: 3 },
    { id: "temps-vente", title: "Temps de vente", type: "chart", component: "TempsVente", enabled: true, order: 4 },
    { id: "marge-mensuelle", title: "Marge mensuelle", type: "chart", component: "MargeMensuelle", enabled: false, order: 5 },
    { id: "top-parcelles", title: "Top parcelles", type: "table", component: "TopParcelles", enabled: false, order: 6 },
    { id: "cout-poids", title: "Coût par poids", type: "chart", component: "CoutPoids", enabled: false, order: 7 },
    { id: "tendances", title: "Tendances de vente", type: "chart", component: "TendancesVente", enabled: false, order: 8 },
  ],
  layout: ["stats", "performance", "plateformes", "top-produits", "temps-vente"],
  gridLayout: { lg: 2, md: 1 },
}

// Le type pour les données du formulaire correspond maintenant à Omit<...>
type ParcelleFormData = Omit<Parcelle, "id" | "createdAt" | "updatedAt" | "prixTotal" | "prixParGramme">;

interface StoreState {
  parcelles: Parcelle[]
  produits: Produit[]
  dashboardConfig: DashboardConfig
  notifications: { id: string; type: "success" | "error" | "warning" | "info"; message: string }[]
  initializeStore: () => void
  addParcelle: (parcelle: ParcelleFormData) => void
  updateParcelle: (id: string, data: Partial<ParcelleFormData>) => void
  deleteParcelle: (id: string) => Promise<void>
  addProduit: (produit: Omit<Produit, "id" | "createdAt" | "updatedAt" | "benefices" | "pourcentageBenefice">) => void
  updateProduit: (id: string, data: Partial<Produit>) => void
  updateProduitVente: (id: string, data: Partial<Produit>) => void
  deleteProduit: (id: string) => void
  updateDashboardConfig: (config: DashboardConfig) => void
  addNotification: (type: "success" | "error" | "warning" | "info", message: string) => void
  clearNotification: (id: string) => void
  importData: (data: any) => void
  exportData: () => { parcelles: Parcelle[]; produits: Produit[]; dashboardConfig: DashboardConfig }
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      parcelles: [],
      produits: [],
      dashboardConfig: defaultDashboardConfig,
      notifications: [],

      initializeStore: async () => {
        try {
          const [parcellesRes, produitsRes] = await Promise.all([
            fetch('/api/v1/parcelles'),
            fetch('/api/v1/produits'),
          ]);
          const parcelles = await parcellesRes.json();
          const produits = await produitsRes.json();
          set({ parcelles, produits });
        } catch (error) {
          console.error("Erreur lors de l'initialisation du store:", error)
        }
      },

      addParcelle: async (parcelle) => {
        const response = await fetch('/api/v1/parcelles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parcelle),
        });
        const newParcelle = await response.json();
        if (newParcelle.success) {
          set((state) => ({ parcelles: [...state.parcelles, newParcelle.parcelle] }))
        }
      },

      updateParcelle: async (id, data) => {
        const originalParcelles = get().parcelles;
        const updatedParcelles = originalParcelles.map(p => p.id === id ? { ...p, ...data } : p);
        set({ parcelles: updatedParcelles });
        
        const response = await fetch('/api/v1/parcelles', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data }),
        });

        if (!response.ok) {
            set({ parcelles: originalParcelles });
        }
      },

      deleteParcelle: async (id) => {
        const originalParcelles = get().parcelles;
        set((state) => ({ parcelles: state.parcelles.filter((p) => p.id !== id) }));
        const response = await fetch('/api/v1/parcelles', { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });

        if (!response.ok) {
            set({ parcelles: originalParcelles });
        }
      },

      addProduit: async (produit) => {
        try {
          
          const response = await fetch('/api/v1/produits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(produit),
          });

          if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.errors 
              ? errorData.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') 
              : errorData.error || `Erreur HTTP: ${response.status}`;
            throw new Error(errorMessage);
          }

          const newProduit = await response.json();
          if (newProduit && newProduit.produit) {
            set((state) => ({ produits: [...state.produits, newProduit.produit] }))
            get().addNotification("success", `Le produit ${newProduit.produit.nom} a été ajouté.`);
          } else {
            throw new Error("La réponse de l'API ne contient pas de produit valide.");
          }
        } catch (error) {
          console.error("Erreur lors de l'ajout du produit:", error);
          get().addNotification("error", error instanceof Error ? error.message : "Une erreur inconnue est survenue.");
        }
      },

      updateProduit: async (id, data) => {
        const originalProduits = get().produits;
        const updatedProduits = originalProduits.map(p => p.id === id ? { ...p, ...data } : p);
        set({ produits: updatedProduits });

        try {
          const response = await fetch(`/api/v1/produits/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
          });

          if (!response.ok) {
            throw new Error('La mise à jour du produit a échoué.');
          }

        } catch (error) {
          set({ produits: originalProduits });
          get().addNotification("error", "La mise à jour a échoué. Les données ont été restaurées.");
        }
      },
      
      updateProduitVente: (id, data) => {
        // This can be a specific case of updateProduit
        get().updateProduit(id, data);
      },

      deleteProduit: async (id) => {
        set((state) => ({ produits: state.produits.filter((p) => p.id !== id) }));
        await fetch(`/api/v1/produits/${id}`, { method: 'DELETE' });
      },

      updateDashboardConfig: (config) => set({ dashboardConfig: config }),
      
      addNotification: (type, message) => {
        const newNotification = { id: Math.random().toString(), type, message };
        set((state) => ({ notifications: [newNotification, ...state.notifications.slice(0, 9)] }));
        setTimeout(() => get().clearNotification(newNotification.id), 5000);
      },

      clearNotification: (id) => set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
      
      importData: (data) => {
        set({
          parcelles: data.parcelles || [],
          produits: data.produits || [],
          dashboardConfig: data.dashboardConfig || defaultDashboardConfig,
        });
        get().addNotification("success", "Données importées avec succès.");
      },

      exportData: () => ({
        parcelles: get().parcelles,
        produits: get().produits,
        dashboardConfig: get().dashboardConfig,
      }),
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
