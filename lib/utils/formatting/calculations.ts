import type { Parcelle, Produit } from "@/types/database"

/**
 * Calcule les bénéfices et le pourcentage de bénéfice pour un produit.
 * @param produit Le produit pour lequel calculer les bénéfices.
 * @returns Un objet contenant les bénéfices et le pourcentage de bénéfice.
 */
export function calculerBenefices(produit: Partial<Produit>) {
  if (!produit.vendu || !produit.prixVente || !produit.prixArticle || !produit.prixLivraison) {
    return { benefices: 0, pourcentageBenefice: 0 }
  }

  const coutTotal = produit.prixArticle + produit.prixLivraison
  const benefices = produit.prixVente - coutTotal
  const pourcentageBenefice = (benefices / coutTotal) * 100

  return { benefices, pourcentageBenefice }
}

/**
 * Calcule le prix de livraison basé sur le poids et le prix par gramme de la parcelle.
 * @param poids Le poids du produit.
 * @param parcelles La liste de toutes les parcelles.
 * @param parcelleId L'ID de la parcelle associée au produit.
 * @returns Le prix de livraison calculé.
 */
export function calculPrixLivraison(poids: number, parcelles: Parcelle[], parcelleId: string): number {
  const parcelle = parcelles.find((p) => p.id === parcelleId)
  if (!parcelle) return 0

  return poids * parcelle.prixParGramme
}