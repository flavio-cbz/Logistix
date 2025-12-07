"use client";

import { useState } from "react";
import { MoreVertical, Edit, Trash2, DollarSign, Package, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateProductProfit, type ProductWithLegacyFields } from "@/lib/utils/product-field-normalizers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Product } from "@/lib/shared/types/entities";
import { formatEuro } from "@/lib/utils/formatting";
import ProductCreateForm from "./product-create-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useDeleteProduct } from "@/lib/hooks/use-products";
import { toast } from "sonner";

interface ProductsGridViewProps {
  products: Product[];
  onUpdate?: () => void;
}

export default function ProductsGridView({ products, onUpdate }: ProductsGridViewProps) {
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useDeleteProduct();

  const handleDelete = async () => {
    if (!deleteId) return;

    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("✓ Produit supprimé", {
          description: "Le produit a été supprimé avec succès.",
        });
        setDeleteId(null);
        onUpdate?.();
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue lors de la suppression.";
        toast.error("Erreur", {
          description: errorMessage,
        });
      },
    });
  };

  const getStatusBadge = (product: Product) => {
    if (product.vendu === "1") {
      return <Badge variant="default" className="bg-green-500">Vendu</Badge>;
    }
    if (product.status === "removed") {
      return <Badge variant="destructive">Retiré</Badge>;
    }
    if (product.status === "archived") {
      return <Badge variant="secondary">Archivé</Badge>;
    }
    return <Badge variant="outline">En stock</Badge>;
  };

  const calculateProfit = (product: Product) => {
    return calculateProductProfit(product as ProductWithLegacyFields) ?? 0;
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium">Aucun produit trouvé</p>
        <p className="text-sm">Commencez par créer votre premier produit</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => {
          const profit = calculateProfit(product);
          const hasProfit = product.vendu === "1" && profit > 0;

          return (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    {getStatusBadge(product)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditProduct(product)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteId(product.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <CardTitle className="text-base line-clamp-2">
                    {product.name}
                  </CardTitle>
                  {product.brand && (
                    <CardDescription className="text-sm">
                      {product.brand}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>

              {/* Image du produit - uniquement en mode grille */}
              {product.photoUrl && (
                <div className="px-6 pb-4">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                    <img
                      src={product.photoUrl}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                </div>
              )}

              <CardContent className="space-y-3">
                {/* Prix d'achat */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Prix d'achat
                  </span>
                  <span className="font-medium">{formatEuro(product.price || 0)}</span>
                </div>

                {/* Bénéfice si vendu */}
                {hasProfit && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Bénéfice
                    </span>
                    <span className="font-medium text-green-600">
                      +{formatEuro(profit)}
                    </span>
                  </div>
                )}

                {/* Catégorie */}
                {product.category && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      Catégorie
                    </span>
                    <span className="text-xs">{product.category}</span>
                  </div>
                )}

                {/* Poids */}
                {product.poids && product.poids > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Poids: {product.poids}g
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog d'édition */}
      {editProduct && (
        <ProductCreateForm
          open={!!editProduct}
          onOpenChange={(open) => {
            if (!open) setEditProduct(null);
          }}
          editProduct={editProduct}
          onCreated={() => {
            setEditProduct(null);
            onUpdate?.();
          }}
        />
      )}

      {/* Dialog de confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer le produit"
        description="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </>
  );
}
