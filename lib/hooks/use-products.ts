"use client";

import { useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { Product, Platform, ProductStatus } from "@/lib/shared/types/entities";
import { useOptimisticMutation } from "./use-optimistic-mutation";

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
      const response = await fetch("/api/v1/produits");
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
    mutationFn: async (productData: Partial<Product>) => {
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

// Hook pour mettre à jour un produit avec mise à jour optimiste
export function useUpdateProduct() {
  return useOptimisticMutation<ProductListResponse, { id: string; data: Partial<Product> }>({
    queryKey: ["products"],
    mutationFn: async ({ id, data }) => {
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

      return response.json() as Promise<ProductListResponse>;
    },
    optimisticUpdate: (currentData: ProductListResponse | undefined, { id, data }: { id: string, data: Partial<Product> }): ProductListResponse => {
      if (!currentData?.data) return { success: true, data: [], count: 0 };
      return {
        ...currentData,
        success: true,
        data: currentData.data.map((product: Product) =>
          product.id === id ? { ...product, ...data } : product
        ),
      };
    },
  });
}

// Hook pour supprimer un produit avec mise à jour optimiste
export function useDeleteProduct() {
  return useOptimisticMutation<ProductListResponse, string>({
    queryKey: ["products"],
    mutationFn: async (id) => {
      const response = await fetch(`/api/v1/produits/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression du produit");
      }
      return {} as ProductListResponse; // Dummy return
    },
    optimisticUpdate: (currentData: ProductListResponse | undefined, productId: string): ProductListResponse => {
      if (!currentData?.data) return { success: true, data: [], count: 0 };
      return {
        ...currentData,
        success: true,
        data: currentData.data.filter((product: Product) => product.id !== productId),
        count: (currentData.count || currentData.data.length) - 1,
      };
    },
  });
}

// Hook pour obtenir les données formatées pour le front
export function useProductFormData(product?: Product) {
  // Mémoïse le résultat pour éviter de créer un nouvel objet à chaque render
  return useMemo(() => {
    if (!product) return undefined;

    // Convert values for form (null -> "" for text fields)
    // Field names now match schema directly - no translation needed
    return {
      name: product.name || "",
      brand: product.brand || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      size: product.size || "",
      color: product.color || "",
      price: product.price || 0,
      poids: product.poids || 0,
      parcelId: product.parcelId || "",
      vendu: product.vendu || "0",
      // Use database field names directly
      listedAt: product.listedAt || "",
      soldAt: product.soldAt || "",
      sellingPrice: product.sellingPrice || 0,
      plateforme: (product.plateforme || Platform.LEBONCOIN) as Platform,
      url: product.url || "",
      photoUrl: product.photoUrl || "",
      coutLivraison: product.coutLivraison || 0,
      currency: product.currency || "EUR",
      status: (product.status || ProductStatus.AVAILABLE) as ProductStatus,
    };
  }, [product]); // Seulement si 'product' change
}