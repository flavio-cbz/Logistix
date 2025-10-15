"use client";

import { useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { Product, Platform, ProductStatus } from "@/lib/shared/types/entities";

// Types pour les données de produits
export interface ProductListResponse {
  success: boolean;
  data: Product[];
  count?: number;
}

// Hook pour récupérer les produits
export function useProducts() {
  return useQuery<ProductListResponse>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/v1/products");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des produits");
      }
      return response.json();
    },
  });
}

// Hook pour créer un produit
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await fetch("/api/v1/produits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Erreur lors de la création du produit");
      }

      return response.json();
    },
    onSuccess: async () => {
      // Invalidate et refetch des produits - ATTENDRE la fin
      await queryClient.invalidateQueries({ 
        queryKey: ["products"],
        refetchType: 'active' // Force le refetch immédiat des queries actives
      });
      // Petit délai pour s'assurer que le refetch est terminé
      await new Promise(resolve => setTimeout(resolve, 100));
    },
  });
}

// Hook pour mettre à jour un produit
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const response = await fetch(`/api/v1/produits/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du produit");
      }

      return response.json();
    },
    onSuccess: async () => {
      // Invalidate et refetch des produits - ATTENDRE la fin
      await queryClient.invalidateQueries({ 
        queryKey: ["products"],
        refetchType: 'active' // Force le refetch immédiat des queries actives
      });
      // Petit délai pour s'assurer que le refetch est terminé
      await new Promise(resolve => setTimeout(resolve, 100));
    },
  });
}

// Hook pour supprimer un produit
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/v1/produits/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression du produit");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate et refetch des produits
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// Hook pour obtenir les données formatées pour le front
export function useProductFormData(product?: Product) {
  // Mémoïse le résultat pour éviter de créer un nouvel objet à chaque render
  return useMemo(() => {
    if (!product) return undefined;
    
    // Convertir les valeurs pour le formulaire (null -> "" pour les champs texte)
    return {
      name: product.name || "",
      brand: product.brand || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      size: product.size || "",
      color: product.color || "",
      price: product.price || 0,
      poids: product.poids || 0,
      parcelleId: product.parcelleId || "",
      vendu: product.vendu || "0",
      dateMiseEnLigne: product.dateMiseEnLigne || "",
      dateVente: product.dateVente || "",
      prixVente: product.prixVente || 0,
      plateforme: (product.plateforme || Platform.LEBONCOIN) as Platform,
      url: product.url || "",
      photoUrl: product.photoUrl || "",
      coutLivraison: product.coutLivraison || 0,
      currency: product.currency || "EUR",
      status: (product.status || ProductStatus.AVAILABLE) as ProductStatus,
    };
  }, [product]); // Seulement si 'product' change
}