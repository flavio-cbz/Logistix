export interface Parcelle {
  id: string
  numero: string
  transporteur: string
  poids: number
  prixAchat: number
  prixTotal: number // Calculé : prixAchat
  prixParGramme: number // Calculé : prixAchat / poids
  createdAt?: string
  updatedAt?: string
}

export interface Produit {
  id: string
  commandeId: string
  nom: string | null
  details?: string
  prixArticle: number // En euros uniquement
  poids: number
  prixLivraison: number // En euros uniquement
  vendu: boolean
  dateVente?: string
  tempsEnLigne?: string
  prixVente?: number // En euros uniquement
  plateforme?: string
  parcelleId: string
  benefices?: number // En euros uniquement
  pourcentageBenefice?: number
  createdAt?: string
  updatedAt?: string
}

export interface DashboardCard {
  id: string
  title: string
  type: "stats" | "chart" | "table"
  component: string
  enabled: boolean
  order: number
}

export interface DashboardConfig {
  cards: DashboardCard[]
  layout: string[]
  gridLayout?: {
    lg: number
    md: number
  }
}
