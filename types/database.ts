export interface Parcelle {
  id: string
  userId: string
  numero: string
  transporteur: string
  poids: number
  prixAchat?: number
  prixTotal: number
  prixParGramme: number // Calculé : prixTotal / poids
  createdAt?: string
  updatedAt?: string
}

export interface Produit {
  id: string
  userId: string;
  commandeId: string
  nom?: string | undefined;
  details?: string | undefined;
  prixArticle: number // En euros uniquement
  poids: number
  prixLivraison: number // En euros uniquement
  vendu: boolean
  dateVente?: string | undefined;
  dateAchat?: string | undefined; // Ajout de la propriété dateAchat
  tempsEnLigne?: string | undefined; // Modifié pour être string | undefined
  prixVente?: number | undefined; // En euros uniquement
  plateforme?: string | undefined;
  parcelleId: string
  benefices?: number | undefined; // En euros uniquement
  pourcentageBenefice?: number | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}