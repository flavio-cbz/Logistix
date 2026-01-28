import { useState, useMemo } from "react";
import { Product } from "@/lib/shared/types/entities";

type SortDirection = "asc" | "desc";
export type SortConfig = { key: string; direction: SortDirection } | null;

interface UseProductSortProps {
  products: Product[];
  parcelleMap: Map<
    string,
    { superbuyId: string; name: string; pricePerGram?: number }
  >;
}

export function useProductSort({ products, parcelleMap }: UseProductSortProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      let direction: SortDirection = "asc";
      if (current && current.key === key && current.direction === "asc") {
        direction = "desc";
      }
      return { key, direction };
    });
  };

  const sortedProducts = useMemo(() => {
    if (!sortConfig) return products;

    return [...products].sort((a, b) => {
      let aValue: string | number | null | undefined;
      let bValue: string | number | null | undefined;

      // --- Logique de tri personnalisée ---

      if (sortConfig.key === "coutTotal") {
        // Tri par Coût Total (Prix d'achat + Livraison estimée/réelle)
        const parcelleA = a.parcelId ? parcelleMap.get(a.parcelId) : undefined;
        const estLivraisonA = parcelleA?.pricePerGram
          ? parcelleA.pricePerGram * (a.poids || 0)
          : 0;
        const coutLivraisonA =
          a.coutLivraison && a.coutLivraison > 0
            ? a.coutLivraison
            : estLivraisonA;
        aValue = (a.price || 0) + coutLivraisonA;

        const parcelleB = b.parcelId ? parcelleMap.get(b.parcelId) : undefined;
        const estLivraisonB = parcelleB?.pricePerGram
          ? parcelleB.pricePerGram * (b.poids || 0)
          : 0;
        const coutLivraisonB =
          b.coutLivraison && b.coutLivraison > 0
            ? b.coutLivraison
            : estLivraisonB;
        bValue = (b.price || 0) + coutLivraisonB;
      } else if (sortConfig.key === "benefice") {
        // Tri par Bénéfice (Prix vente - Coût total) ou Bénéfice estimé
        const parcelleA = a.parcelId ? parcelleMap.get(a.parcelId) : undefined;
        const estLivraisonA = parcelleA?.pricePerGram
          ? parcelleA.pricePerGram * (a.poids || 0)
          : 0;
        const coutLivraisonA =
          a.coutLivraison && a.coutLivraison > 0
            ? a.coutLivraison
            : estLivraisonA;
        const coutTotalA = (a.price || 0) + coutLivraisonA;
        aValue =
          a.vendu === "1" && a.sellingPrice
            ? a.sellingPrice - coutTotalA
            : a.benefices || -Infinity;

        const parcelleB = b.parcelId ? parcelleMap.get(b.parcelId) : undefined;
        const estLivraisonB = parcelleB?.pricePerGram
          ? parcelleB.pricePerGram * (b.poids || 0)
          : 0;
        const coutLivraisonB =
          b.coutLivraison && b.coutLivraison > 0
            ? b.coutLivraison
            : estLivraisonB;
        const coutTotalB = (b.price || 0) + coutLivraisonB;
        bValue =
          b.vendu === "1" && b.sellingPrice
            ? b.sellingPrice - coutTotalB
            : b.benefices || -Infinity;
      } else if (sortConfig.key === "status") {
        // Tri par priorité de statut: Vendu > En ligne > Brouillon
        const getStatusPriority = (p: Product) => {
          if (p.vendu === "1") return 3;
          if (p.dateMiseEnLigne) return 2;
          return 1;
        };
        aValue = getStatusPriority(a);
        bValue = getStatusPriority(b);
      } else {
        // Tri standard sur les propriétés directes
        aValue = a[sortConfig.key as keyof Product] as
          | string
          | number
          | null
          | undefined;
        bValue = b[sortConfig.key as keyof Product] as
          | string
          | number
          | null
          | undefined;
      }

      // --- Gestion des valeurs nulles/undefined ---
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";

      // --- Comparaison ---
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Comparaison numérique par défaut
      return sortConfig.direction === "asc"
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
  }, [products, sortConfig, parcelleMap]);

  return {
    sortedProducts,
    sortConfig,
    handleSort,
  };
}
