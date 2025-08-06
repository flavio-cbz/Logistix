export interface Parcelle {
  id: string
  userId: string
  numero: string
  transporteur: string
  poids: number
  prixAchat: number
  prixTotal: number
  prixParGramme: number // Calculé : prixTotal / poids
  createdAt?: string
  updatedAt?: string
}

export interface Produit {
  id: string
  userId: string;
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