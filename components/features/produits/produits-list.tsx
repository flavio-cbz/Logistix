"use client"

import { useState, useMemo, useCallback } from "react"
<<<<<<< HEAD
import { AnimatePresence } from "framer-motion"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/shared/utils"
=======
import { motion, AnimatePresence } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/shared/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Edit, MoreHorizontal, ExternalLink, Calculator, Banknote, Copy, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
import { toast } from "sonner"
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/lib/hooks/use-products"
import { useParcelles } from "@/lib/hooks/use-parcelles"
import { Product, ProductStatus, Platform } from "@/lib/shared/types/entities"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import ProductCreateForm from "./product-create-form"
import { ProductSaleDialog } from "./product-sale-dialog"
import { QuickSaleDialog } from "./quick-sale-dialog"
import { Checkbox } from "@/components/ui/checkbox"
<<<<<<< HEAD
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
=======
import { EditableCell } from "@/components/ui/editable-cell"
import { useFormatting } from "@/lib/hooks/use-formatting"
import { TableSkeleton } from "@/components/ui/loading-skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { PackageSearch } from "lucide-react"
import { TableControls } from "./table-controls"
import { BatchActionsBar } from "./batch-actions-bar"

// Extracted hooks
import { useProductSelection } from "@/lib/hooks/use-product-selection"

>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
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

<<<<<<< HEAD
=======
  const { formatCurrency, formatWeight } = useFormatting();

>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
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
<<<<<<< HEAD
    (parcelles || []).forEach(p => map.set(p.id, { superbuyId: p.superbuyId, name: p.name ?? "", pricePerGram: p.pricePerGram ?? undefined }));
    return map;
  }, [parcelles]);

  // Use extracted sort hook
  const { sortedProducts, sortConfig, handleSort } = useProductSort({
    products: filteredProduits,
    parcelleMap
  });
=======
    (parcelles || []).forEach(p => map.set(p.id, { superbuyId: p.superbuyId, name: p.name, pricePerGram: p.pricePerGram ?? undefined }));
    return map;
  }, [parcelles]);

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = useMemo(() => {
    if (!sortConfig) return filteredProduits;

    return [...filteredProduits].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Product];
      let bValue: any = b[sortConfig.key as keyof Product];

      // Custom sort keys
      if (sortConfig.key === 'coutTotal') {
        const parcelleA = a.parcelId ? parcelleMap.get(a.parcelId) : undefined;
        const estLivraisonA = parcelleA?.pricePerGram ? (parcelleA.pricePerGram * (a.poids || 0)) : 0;
        const coutLivraisonA = (a.coutLivraison && a.coutLivraison > 0) ? a.coutLivraison : estLivraisonA;
        aValue = (a.price || 0) + coutLivraisonA;

        const parcelleB = b.parcelId ? parcelleMap.get(b.parcelId) : undefined;
        const estLivraisonB = parcelleB?.pricePerGram ? (parcelleB.pricePerGram * (b.poids || 0)) : 0;
        const coutLivraisonB = (b.coutLivraison && b.coutLivraison > 0) ? b.coutLivraison : estLivraisonB;
        bValue = (b.price || 0) + coutLivraisonB;
      } else if (sortConfig.key === 'benefice') {
        const parcelleA = a.parcelId ? parcelleMap.get(a.parcelId) : undefined;
        const estLivraisonA = parcelleA?.pricePerGram ? (parcelleA.pricePerGram * (a.poids || 0)) : 0;
        const coutLivraisonA = (a.coutLivraison && a.coutLivraison > 0) ? a.coutLivraison : estLivraisonA;
        const coutTotalA = (a.price || 0) + coutLivraisonA;
        aValue = a.vendu === '1' && a.sellingPrice ? a.sellingPrice - coutTotalA : (a.benefices || -Infinity);

        const parcelleB = b.parcelId ? parcelleMap.get(b.parcelId) : undefined;
        const estLivraisonB = parcelleB?.pricePerGram ? (parcelleB.pricePerGram * (b.poids || 0)) : 0;
        const coutLivraisonB = (b.coutLivraison && b.coutLivraison > 0) ? b.coutLivraison : estLivraisonB;
        const coutTotalB = (b.price || 0) + coutLivraisonB;
        bValue = b.vendu === '1' && b.sellingPrice ? b.sellingPrice - coutTotalB : (b.benefices || -Infinity);
      } else if (sortConfig.key === 'status') {
        // Sort by visual status priority: Sold > Online > Draft
        const getStatusPriority = (p: Product) => {
          if (p.vendu === '1') return 3;
          if (p.dateMiseEnLigne) return 2;
          return 1;
        };
        aValue = getStatusPriority(a);
        bValue = getStatusPriority(b);
      }

      // Handle null/undefined
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Numeric comparison
      return sortConfig.direction === 'asc'
        ? (Number(aValue) - Number(bValue))
        : (Number(bValue) - Number(aValue));
    });
  }, [filteredProduits, sortConfig, parcelleMap]);
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

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
<<<<<<< HEAD
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
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
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
<<<<<<< HEAD
      <ProductStatsHeader stats={stats} />
=======
      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Vendus</p>
          <p className="text-2xl font-bold text-success">{stats.vendus}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">En ligne</p>
          <p className="text-2xl font-bold text-primary">{stats.enLigne}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Brouillons</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.brouillons}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Bénéfices totaux</p>
          <p className={`text-2xl font-bold ${stats.totalBenefices >= 0 ? 'text-success' : 'text-destructive'}`}>
            {stats.totalBenefices >= 0 ? '+' : ''}{formatCurrency(stats.totalBenefices)}
          </p>
        </div>
      </div>
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

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
<<<<<<< HEAD
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
=======
                {sortedProducts.map((product) => {
                  // Calculs des coûts
                  const parcelle = product.parcelId ? parcelleMap.get(product.parcelId) : undefined;
                  const estimatedLivraison = parcelle?.pricePerGram ? (parcelle.pricePerGram * (product.poids || 0)) : 0;
                  const coutLivraison = (product.coutLivraison && product.coutLivraison > 0) ? product.coutLivraison : estimatedLivraison;
                  const coutTotal = (product.price || 0) + coutLivraison;

                  // Calcul du bénéfice si vendu
                  const benefice = product.vendu === '1' && product.sellingPrice
                    ? product.sellingPrice - coutTotal
                    : product.benefices || null;

                  // Statut du produit
                  const isVendu = product.vendu === '1';
                  const statusColor = isVendu
                    ? "bg-success"
                    : product.dateMiseEnLigne
                      ? "bg-primary"
                      : "bg-gray-400";

                  return (
                    <ContextMenu key={product.id}>
                      <ContextMenuTrigger asChild>
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                          className={`hover:bg-muted/50 ${selectedIds.has(product.id) ? "bg-muted/50" : ""}`}
                        >
                          {/* Checkbox */}
                          <TableCell className={cellPadding}>
                            <Checkbox
                              checked={selectedIds.has(product.id)}
                              onCheckedChange={() => toggleSelect(product.id)}
                              aria-label={`Sélectionner ${product.name}`}
                            />
                          </TableCell>

                          {/* Statut visuel */}
                          <TableCell className={cn("text-center", cellPadding)} style={{ display: columnVisibility.status ? undefined : 'none' }}>
                            <div
                              className={`w-3 h-3 rounded-full ${statusColor} mx-auto shadow-sm`}
                              title={isVendu ? "Vendu" : product.dateMiseEnLigne ? "En ligne" : "Brouillon"}
                            />
                          </TableCell>

                          {/* Nom du produit + infos secondaires */}
                          <TableCell className={cellPadding}>
                            <div className="flex flex-col gap-0.5">
                              <EditableCell
                                value={product.name}
                                onSave={(val) => handleInlineUpdate(product.id, "name", val)}
                                displayClassName="font-medium"
                              />
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {parcelle && (
                                  <span title={`Parcelle: ${parcelle.name}`}>📦 {parcelle.superbuyId}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Marque */}
                          <TableCell className={cellPadding} style={{ display: columnVisibility.brand ? undefined : 'none' }}>
                            <EditableCell
                              value={product.brand}
                              placeholder="—"
                              onSave={(val) => handleInlineUpdate(product.id, "brand", val)}
                              displayClassName="text-sm truncate max-w-[80px] block"
                            />
                          </TableCell>

                          {/* Catégorie */}
                          <TableCell className={cellPadding} style={{ display: columnVisibility.category ? undefined : 'none' }}>
                            <EditableCell
                              value={product.category}
                              placeholder="—"
                              onSave={(val) => handleInlineUpdate(product.id, "category", val)}
                              displayClassName="text-sm"
                            />
                          </TableCell>

                          {/* Taille */}
                          <TableCell className={cellPadding} style={{ display: columnVisibility.size ? undefined : 'none' }}>
                            <EditableCell
                              value={product.size}
                              placeholder="—"
                              onSave={(val) => handleInlineUpdate(product.id, "size", val)}
                              displayClassName="text-sm"
                            />
                          </TableCell>

                          {/* Couleur */}
                          <TableCell className={cellPadding} style={{ display: columnVisibility.color ? undefined : 'none' }}>
                            <EditableCell
                              value={product.color}
                              placeholder="—"
                              onSave={(val) => handleInlineUpdate(product.id, "color", val)}
                              displayClassName="text-sm"
                            />
                          </TableCell>

                          {/* Prix d'achat */}
                          <TableCell className={cn("text-right", cellPadding)} style={{ display: columnVisibility.price ? undefined : 'none' }}>
                            <EditableCell
                              type="number"
                              value={product.price}
                              min={0}
                              step={0.01}
                              onSave={(val) => handleInlineUpdate(product.id, "price", val)}
                              formatter={(val) => formatCurrency(Number(val || 0))}
                              displayClassName="font-medium tabular-nums"
                            />
                          </TableCell>

                          {/* Poids */}
                          <TableCell className={cn("text-right", cellPadding)} style={{ display: columnVisibility.weight ? undefined : 'none' }}>
                            <EditableCell
                              type="number"
                              value={product.poids}
                              min={0}
                              step={1}
                              onSave={(val) => handleInlineUpdate(product.id, "poids", val)}
                              formatter={(val) => val ? formatWeight(Number(val)) : "—"}
                              displayClassName="tabular-nums text-sm"
                            />
                          </TableCell>

                          {/* Coût total (achat + livraison) */}
                          <TableCell className={cn("text-right tabular-nums", cellPadding)} title={`Prix: ${formatCurrency(product.price)} + Livraison: ${formatCurrency(coutLivraison)}`} style={{ display: columnVisibility.totalCost ? undefined : 'none' }}>
                            <span className="font-semibold">{formatCurrency(coutTotal)}</span>
                          </TableCell>

                          {/* Prix de vente */}
                          <TableCell className={cn("text-right tabular-nums", cellPadding)} style={{ display: columnVisibility.salePrice ? undefined : 'none' }}>
                            {isVendu && product.sellingPrice ? (
                              <span className="font-semibold text-success">
                                {formatCurrency(product.sellingPrice)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Bénéfice */}
                          <TableCell className={cn("text-right tabular-nums", cellPadding)} style={{ display: columnVisibility.profit ? undefined : 'none' }}>
                            {benefice !== null ? (
                              <span className={`font-bold text-base ${benefice >= 0 ? "text-success" : "text-destructive"}`}>
                                {benefice >= 0 ? "+" : ""}{formatCurrency(benefice)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Plateforme (si vendu) */}
                          <TableCell className={cn("hidden lg:table-cell", cellPadding)} style={{ display: columnVisibility.platform ? undefined : 'none' }}>
                            {isVendu && product.plateforme ? (
                              <span className="text-sm font-medium bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                                {product.plateforme}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Actions + Switch Vendu */}
                          <TableCell className={cn("text-right", cellPadding)}>
                            <div className="flex items-center justify-end gap-1">
                              <Switch
                                checked={product.vendu === '1'}
                                onCheckedChange={() => handleToggleVendu(product)}
                                disabled={updateProductMutation.isPending}
                                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700"
                                title={isVendu ? "Marquer comme disponible" : "Marquer comme vendu"}
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Ouvrir menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  {product.url && (
                                    <DropdownMenuItem onClick={() => window.open(product.url, '_blank')}>
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Voir sur Vinted
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => {
                                    setEditProduct(product);
                                    setShowEditForm(true);
                                  }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Dupliquer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    // Placeholder for recalculate or just show details
                                    toast("Marge recalculée", { description: "Les données sont à jour." });
                                  }}>
                                    <Calculator className="mr-2 h-4 w-4" />
                                    Détails Financiers
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteId(product.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </motion.tr>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => {
                          setEditProduct(product);
                          setShowEditForm(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleDuplicate(product)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Dupliquer
                        </ContextMenuItem>
                        {product.vendu !== '1' && (
                          <ContextMenuItem onClick={() => {
                            setQuickSaleProduct(product);
                          }} className="text-green-600">
                            <Banknote className="mr-2 h-4 w-4" />
                            Vente rapide
                          </ContextMenuItem>
                        )}
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => {
                            setDeleteId(product.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
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

<<<<<<< HEAD
=======


>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
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
