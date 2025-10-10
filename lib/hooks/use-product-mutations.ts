"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import type {
  Product,
} from "@/lib/types/entities";
import type {
  CreateProductFormData,
  UpdateProductFormData,
} from "@/lib/schemas/product";
import { autoPerf } from "@/lib/services/auto-performance-integration";
import {
  validateApiResponse,
  validateProduct,
} from "@/lib/utils/api-validation";

// --- Add Product ---
const addProduct = async (product: CreateProductFormData): Promise<Product> => {
  const response = await autoPerf.autoFetch("/api/v1/produits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!response.ok) {
    throw new Error("Failed to create product");
  }

  const jsonResponse = await response.json();
  const validatedResponse = validateApiResponse<Product>(
    jsonResponse,
    "addProduct",
  );

  if (!validatedResponse.success) {
    throw new Error(
      validatedResponse.error?.message || "Failed to create product",
    );
  }

  return validateProduct(validatedResponse.data, "addProduct");
};

/**
 * Hook pour ajouter un nouveau produit.
 * Invalide la requête "products" en cas de succès pour rafraîchir la liste.
 * @returns Une mutation `useMutation` pour ajouter un produit.
 */
export const useAddProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<Product, Error, CreateProductFormData>({
    mutationFn: addProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Produit ajouté",
        description: "Le nouveau produit a été ajouté avec succès.",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    },
  });
};

// --- Update Product ---
const updateProduct = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateProductFormData;
}): Promise<Product> => {
  const response = await autoPerf.autoFetch(`/api/v1/produits/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update product");
  }

  const jsonResponse = await response.json();
  const validatedResponse = validateApiResponse<Product>(
    jsonResponse,
    "updateProduct",
  );

  if (!validatedResponse.success) {
    throw new Error(
      validatedResponse.error?.message || "Failed to update product",
    );
  }

  return validateProduct(validatedResponse.data, "updateProduct");
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<
    Product,
    Error,
    { id: string; data: UpdateProductFormData }
  >({
    mutationFn: updateProduct,
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData(
        ["products"],
        (oldData: Product[] | undefined) => {
          if (!oldData) return [updatedProduct];
          return oldData.map((p) =>
            p.id === updatedProduct.id ? updatedProduct : p,
          );
        },
      );
      toast({
        title: "Produit mis à jour",
        description: "Le produit a été mis à jour avec succès.",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    },
  });
};

/**
 * Hook pour supprimer un produit.
 * Met à jour le cache de la requête "products" en cas de succès pour rafraîchir la liste.
 * @returns Une mutation `useMutation` pour supprimer un produit.
 */
// --- Delete Product ---
const deleteProduct = async (id: string): Promise<void> => {
  const response = await autoPerf.autoFetch(`/api/v1/produits/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete product");
  }
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteProduct,
    onSuccess: (_result, id) => {
      queryClient.setQueryData(
        ["products"],
        (oldData: Product[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter((p) => p.id !== id);
        },
      );
      toast({
        title: "Produit supprimé",
        description: "Le produit a été supprimé avec succès.",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    },
  });
};
