"use client"

import { useState, useMemo, useCallback } from "react"
import { AnimatePresence } from "framer-motion"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/shared/utils"
import { toast } from "sonner"
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/lib/hooks/use-products"
import { useParcelles } from "@/lib/hooks/use-parcelles"
import { Product, ProductStatus, Platform } from "@/lib/shared/types/entities"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import ProductCreateForm from "./product-create-form"
import { ProductSaleDialog } from "./product-sale-dialog"
import { QuickSaleDialog } from "./quick-sale-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { TableSkeleton } from "@/components/ui/loading-skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { PackageSearch, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { TableControls } from "./table-controls"
import { BatchActionsBar } from "./batch-actions-bar"
import { ProductStatsHeader } from "./product-stats-header"
import { ProductRow } from "./product-row"

// Extracted hooks
import { useProductSelection } from "@/lib/hooks/use-product-selection"
import { useProductSort } from "@/lib/hooks/use-product-sort"
import { useProductStats } from "@/lib/hooks/use-product-stats"
import { useProductTableConfig } from "@/lib/hooks/use-product-table-config"


interface ProduitsListProps {
  products: Product[];
  isLoading?: boolean;
  onUpdate?: () => void // Callback pour rafraîchir après mise à jour
}

export default function ProduitsList({ products: sourceProducts, isLoading = false, onUpdate }: ProduitsListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [saleProduct, setSaleProduct] = useState<Product | null>(null)
  const [showSaleDialog, setShowSaleDialog] = useState(false)
  const [quickSaleProduct, setQuickSaleProduct] = useState<Product | null>(null)

  // Use extracted hooks
  const liveProducts = useMemo(() => sourceProducts || [], [sourceProducts]);

  const selection = useProductSelection(liveProducts);

  const stats = useProductStats(liveProducts);
  const tableConfig = useProductTableConfig();

  // Destructure for convenience
  const { columnVisibility, toggleColumnVisibility, density, setDensity, headerPadding, cellPadding } = tableConfig;
  const { selectedIds, toggleSelectAll, toggleSelect, isAllSelected, isSomeSelected } = selection;

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  // Alias for compatibility
  const filteredProduits = liveProducts;
  // Récupérer les parcelles pour afficher leurs numéros
  const { data: parcelles } = useParcelles();

  // Map pour accéder rapidement aux parcelles par ID
  const parcelleMap = useMemo(() => {
    const map = new Map<string, { superbuyId: string; name: string; pricePerGram?: number | undefined }>();
    (parcelles || []).forEach(p => map.set(p.id, { superbuyId: p.superbuyId, name: p.name ?? "", pricePerGram: p.pricePerGram ?? undefined }));
    return map;
  }, [parcelles]);

  // Use extracted sort hook
  const { sortedProducts, sortConfig, handleSort } = useProductSort({
    products: filteredProduits,
    parcelleMap
  });

  // Inline edit handler
  const handleInlineUpdate = useCallback(async (id: string, field: string, value: string | number) => {
    try {
      await updateProductMutation.mutateAsync({ id, data: { [field]: value } });
      toast.success("Mis à jour", { description: `Champ modifié avec succès.` });
    } catch (err) {
      toast.error("Erreur", { description: err instanceof Error ? err.message : "Échec de la mise à jour" });
      throw err;
    }
  }, [updateProductMutation]);

  // Memoize event handlers to avoid recreating them on every render
  const handleDelete = useMemo(() => (id: string) => {
    deleteProductMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Produit supprimé", {
          description: "Le produit a été supprimé avec succès.",
        });
        setDeleteId(null);
        onUpdate?.(); // Rafraîchir la liste
      },
      onError: () => {
        toast.error("Erreur", {
          description: "Une erreur est survenue lors de la suppression.",
        });
        setDeleteId(null);
      },
    });
  }, [deleteProductMutation, onUpdate])

  const handleToggleVendu = useMemo(() => async (product: Product) => {
    const newVenduStatus = product.vendu === '1' ? '0' : '1';

    // Si on passe à "Vendu", ouvrir le dialog de vente spécialisé
    if (newVenduStatus === '1') {
      setSaleProduct(product);
      setShowSaleDialog(true);
      return;
    }

    // Si on repasse à "Non vendu", mise à jour directe
    const updateData: Partial<Product> = {
      vendu: '0',
      soldAt: null,
      listedAt: null,
      sellingPrice: null,
      plateforme: null,
    };

    updateProductMutation.mutate(
      { id: product.id, data: updateData },
      {
        onSuccess: () => {
          toast.success("Statut mis à jour", {
            description: "Le produit est maintenant marqué comme disponible.",
          });
          onUpdate?.(); // Rafraîchir la liste
        },
        onError: () => {
          toast.error("Erreur", {
            description: "Une erreur est survenue lors de la mise à jour du statut.",
          });
        },
      }
    );
  }, [updateProductMutation, onUpdate])

  const handleDuplicate = useMemo(() => (product: Product) => {
    // Convertir le produit en format API
    const productData = {
      name: `${product.name} (copie)`,
      price: product.price ?? 0,
      poids: product.poids ?? 0,
      userId: product.userId,
      currency: 'EUR' as const,
      vendu: '0' as const,
      status: ProductStatus.AVAILABLE,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      description: product.description,
      size: product.size,
      color: product.color,
      coutLivraison: product.coutLivraison,
      sellingPrice: null,
      photoUrl: product.photoUrl,
      photoUrls: product.photoUrls,
      plateforme: null,
      externalId: null,
      url: null,
      ...(product.parcelId && { parcelId: product.parcelId }),
    };

    createProductMutation.mutate(productData, {
      onSuccess: () => {
        toast.success("Produit dupliqué", {
          description: "Le produit a été dupliqué avec succès.",
        });
        onUpdate?.(); // Rafraîchir la liste
      },
      onError: () => {
        toast.error("Erreur", {
          description: "Impossible de dupliquer le produit.",
        });
      },
    });
  }, [createProductMutation, onUpdate]);

  // Fonction pour confirmer la vente avec les informations du dialog
  const handleConfirmSale = async (saleData: {
    prixVente?: number;
    dateVente?: string;
    dateMiseEnLigne?: string;
    plateforme?: Platform;
  }) => {
    if (!saleProduct) return;

    // Validation runtime pour s'assurer que les données requises sont présentes
    if (!saleData.prixVente || !saleData.dateVente || !saleData.plateforme) {
      toast.error("Erreur", { description: "Données de vente incomplètes" });
      return;
    }

    const updateData: Partial<Product> = {
      vendu: '1',
      sellingPrice: saleData.prixVente,
      soldAt: saleData.dateVente,
      plateforme: saleData.plateforme,
      status: ProductStatus.SOLD,
      listedAt: saleData.dateMiseEnLigne || saleProduct.listedAt || saleData.dateVente,
    };

    return new Promise<void>((resolve, reject) => {
      updateProductMutation.mutate(
        { id: saleProduct.id, data: updateData },
        {
          onSuccess: () => {
            toast.success("Vente confirmée ! 🎉", {
              description: `${saleProduct.name} a été marqué comme vendu.`,
            });
            setSaleProduct(null);
            onUpdate?.();
            resolve();
          },
          onError: (error) => {
            toast.error("Erreur", {
              description: "Impossible d'enregistrer la vente. Veuillez réessayer.",
            });
            reject(error);
          },
        }
      );
    });
  };

  // Helper for sort icon
  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4 text-primary" />
      : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
  };

  // Helper for sortable header
  const SortableHeader = ({ column, label, className, style }: { column: string, label: string, className?: string, style?: React.CSSProperties }) => (
    <TableHead
      className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className, headerPadding)}
      style={style}
      onClick={() => handleSort(column)}
    >
      <div className={cn("flex items-center", className?.includes("text-right") && "justify-end")}>
        {label}
        <SortIcon column={column} />
      </div>
    </TableHead>
  );

  return (
    <>
      <ProductStatsHeader stats={stats} />

      {/* Barre d'actions groupées */}
      <BatchActionsBar
        selectedIds={selectedIds}
        onClearSelection={selection.clearSelection}
        onSuccess={() => {
          selection.clearSelection();
          onUpdate?.();
        }}
      />

      <p className="text-xs text-muted-foreground mb-2">
        Cliquez sur une cellule pour la modifier. Cliquez sur les en-têtes pour trier.
      </p>

      {/* Table Controls */}
      <div className="flex items-center justify-between mb-3">
        <div /> {/* Spacer */}
        <TableControls
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={toggleColumnVisibility}
          density={density}
          onDensityChange={setDensity}
        />
      </div>

      <div className="rounded-md border shadow-sm overflow-x-auto">
        {isLoading ? (
          <TableSkeleton columns={14} rows={10} />
        ) : filteredProduits.length === 0 ? (
          <div className="p-8 flex justify-center">
            <EmptyState
              icon={PackageSearch}
              title={"Aucun résultat"}
              description={"Aucun produit ne correspond à vos filtres"}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn("w-[50px]", headerPadding)}>
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Tout sélectionner"
                  />
                </TableHead>
                <SortableHeader column="status" label="Statut" className="w-[80px] text-center" style={{ display: columnVisibility.status ? undefined : 'none' }} />
                <SortableHeader column="name" label="Produit" className="min-w-[150px]" />
                <SortableHeader column="brand" label="Marque" className="w-[80px]" style={{ display: columnVisibility.brand ? undefined : 'none' }} />
                <SortableHeader column="category" label="Catégorie" className="w-[80px]" style={{ display: columnVisibility.category ? undefined : 'none' }} />
                <SortableHeader column="size" label="Taille" className="w-[60px]" style={{ display: columnVisibility.size ? undefined : 'none' }} />
                <SortableHeader column="color" label="Couleur" className="w-[60px]" style={{ display: columnVisibility.color ? undefined : 'none' }} />
                <SortableHeader column="price" label="Prix achat" className="w-[100px] text-right" style={{ display: columnVisibility.price ? undefined : 'none' }} />
                <SortableHeader column="poids" label="Poids" className="w-[90px] text-right" style={{ display: columnVisibility.weight ? undefined : 'none' }} />
                <SortableHeader column="coutTotal" label="Coût total" className="w-[110px] text-right" style={{ display: columnVisibility.totalCost ? undefined : 'none' }} />
                <SortableHeader column="sellingPrice" label="Prix vente" className="w-[110px] text-right" style={{ display: columnVisibility.salePrice ? undefined : 'none' }} />
                <SortableHeader column="benefice" label="Bénéfice" className="w-[110px] text-right" style={{ display: columnVisibility.profit ? undefined : 'none' }} />
                <SortableHeader column="plateforme" label="Plateforme" className="hidden lg:table-cell w-[110px]" style={{ display: columnVisibility.platform ? undefined : 'none' }} />
                <TableHead className={cn("text-right w-[80px]", headerPadding)}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {sortedProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    isSelected={selectedIds.has(product.id)}
                    onToggleSelect={toggleSelect}
                    columnVisibility={columnVisibility}
                    cellPadding={cellPadding}
                    parcelleMap={parcelleMap}
                    onInlineUpdate={handleInlineUpdate}
                    onToggleVendu={handleToggleVendu}
                    onEdit={(p) => {
                      setEditProduct(p);
                      setShowEditForm(true);
                    }}
                    onDuplicate={handleDuplicate}
                    onDelete={(id) => setDeleteId(id)}
                    onQuickSale={setQuickSaleProduct}
                    isUpdatePending={updateProductMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Supprimer le produit"
        description="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
      />

      {/* Formulaire d'édition de produit */}
      {
        showEditForm && editProduct && (
          <ProductCreateForm
            open={showEditForm}
            onOpenChange={(open) => {
              setShowEditForm(open);
              if (!open) {
                setEditProduct(null);
              }
            }}
            editProduct={editProduct}
            onCreated={() => {
              // Optionnel: rafraîchir la liste si nécessaire
              setEditProduct(null);
              setShowEditForm(false);
            }}
          />
        )
      }

      {/* Dialog de confirmation de vente */}
      {
        saleProduct && (
          <ProductSaleDialog
            open={showSaleDialog}
            onOpenChange={(open) => {
              setShowSaleDialog(open);
              if (!open) {
                setSaleProduct(null);
              }
            }}
            product={saleProduct}
            onConfirm={handleConfirmSale}
            coutTotal={(() => {
              // Calculer le coût total pour afficher le bénéfice estimé
              const parcelle = saleProduct.parcelId ? parcelleMap.get(saleProduct.parcelId) : undefined;
              const estimatedLivraison = parcelle?.pricePerGram ? (parcelle.pricePerGram * (saleProduct.poids || 0)) : 0;
              const coutLivraison = (saleProduct.coutLivraison && saleProduct.coutLivraison > 0) ? saleProduct.coutLivraison : estimatedLivraison;
              return (saleProduct.price || 0) + coutLivraison;
            })()}
          />
        )
      }

      {/* Quick Sale Dialog - Simplified one-click sale */}
      <QuickSaleDialog
        product={quickSaleProduct}
        open={!!quickSaleProduct}
        onOpenChange={(open) => {
          if (!open) setQuickSaleProduct(null);
        }}
        onSuccess={() => {
          setQuickSaleProduct(null);
          onUpdate?.();
        }}
      />
    </>
  )
}
