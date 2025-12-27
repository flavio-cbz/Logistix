"use client"

import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Edit, Copy, Trash2, Archive } from "lucide-react"
import { toast } from "sonner"
import { useCreateProduct, useUpdateProduct, useDeleteProduct, useProducts } from "@/lib/hooks/use-products"
import { useParcelles } from "@/lib/hooks/use-parcelles"
import { Product, ProductStatus, Platform } from "@/lib/shared/types/entities"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import ProductCreateForm from "./product-create-form"
import { ProductSaleDialog } from "./product-sale-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { EditableCell } from "@/components/ui/editable-cell"
import {
  calculateProductProfit,
  type ProductWithLegacyFields
} from "@/lib/utils/product-field-normalizers"
import { useFormatting } from "@/lib/hooks/use-formatting"


interface ProduitsListProps {
  onUpdate?: () => void // Callback pour rafraîchir après mise à jour
}

export default function ProduitsList({ onUpdate }: ProduitsListProps) {
  const [searchTerm] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [saleProduct, setSaleProduct] = useState<Product | null>(null)
  const [showSaleDialog, setShowSaleDialog] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const { formatCurrency, formatWeight } = useFormatting();

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  // Utiliser useProducts pour obtenir les données en temps réel
  const { data: productsResponse, refetch } = useProducts();
  const liveProducts = useMemo(() => productsResponse?.data || [], [productsResponse?.data]);

  // Récupérer les parcelles pour afficher leurs numéros
  const { data: parcelles } = useParcelles();

  // Map pour accéder rapidement aux parcelles par ID (inclut prixParGramme pour calculs)
  const parcelleMap = useMemo(() => {
    const map = new Map<string, { numero: string; nom: string; prixParGramme?: number | undefined }>();
    (parcelles || []).forEach(p => map.set(p.id, { numero: p.numero, nom: p.nom, prixParGramme: p.prixParGramme ?? undefined }));
    return map;
  }, [parcelles]);

  // Nous travaillons directement avec les `Product` retournés par le hook
  const liveProduits = liveProducts; // alias minimal pour compatibilité sémantique

  // Memoize filtered products to avoid recreating the array on every render
  const filteredProduits = useMemo(() => {
    return liveProduits.filter((product) => {
      const searchLower = searchTerm.toLowerCase()
      const nomMatch = (product.name || "").toLowerCase().includes(searchLower);
      const commandeMatch = product.id?.toLowerCase().includes(searchLower) ?? false
      return nomMatch || commandeMatch
    })
  }, [liveProduits, searchTerm])

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredProduits.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProduits.map(p => p.id)));
    }
  }, [selectedIds.size, filteredProduits]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isAllSelected = filteredProduits.length > 0 && selectedIds.size === filteredProduits.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredProduits.length;

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

  // Bulk actions
  const handleBulkDelete = async () => {
    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/v1/produits/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selectedIds) }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Supprimés", { description: `${data.data.affected} produit(s) supprimé(s).` });
        setSelectedIds(new Set());
        refetch();
        onUpdate?.();
      } else {
        throw new Error(data.error?.message || "Erreur");
      }
    } catch (err) {
      toast.error("Erreur", { description: err instanceof Error ? err.message : "Échec de la suppression" });
    } finally {
      setBulkActionLoading(false);
      setBulkDeleteOpen(false);
    }
  };

  const handleBulkDuplicate = async () => {
    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/v1/produits/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", ids: Array.from(selectedIds) }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Dupliqués", { description: `${data.data.affected} produit(s) dupliqué(s).` });
        setSelectedIds(new Set());
        refetch();
        onUpdate?.();
      } else {
        throw new Error(data.error?.message || "Erreur");
      }
    } catch (err) {
      toast.error("Erreur", { description: err instanceof Error ? err.message : "Échec de la duplication" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/v1/produits/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", ids: Array.from(selectedIds) }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Archivés", { description: `${data.data.affected} produit(s) archivé(s).` });
        setSelectedIds(new Set());
        refetch();
        onUpdate?.();
      } else {
        throw new Error(data.error?.message || "Erreur");
      }
    } catch (err) {
      toast.error("Erreur", { description: err instanceof Error ? err.message : "Échec de l'archivage" });
    } finally {
      setBulkActionLoading(false);
    }
  };

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
      dateVente: null,
      dateMiseEnLigne: null,
      prixVente: null,
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
      ...(product.parcelleId && { parcelleId: product.parcelleId }),
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

  // Memoized callback functions to avoid recreating onClick handlers
  const createEditHandler = useMemo(() => (product: Product) => () => {
    // Trouver le Product original dans liveProducts
    const originalProduct = liveProducts.find(p => p.id === product.id);
    setEditProduct(originalProduct || null);
    setShowEditForm(true);
  }, [liveProducts]);

  const createDuplicateHandler = useMemo(() => (product: Product) => () => {
    handleDuplicate(product);
  }, [handleDuplicate]);

  const createToggleHandler = useMemo(() => (product: Product) => () => {
    handleToggleVendu(product);
  }, [handleToggleVendu]);

  const createDeleteHandler = useMemo(() => (product: Product) => () => {
    setDeleteId(product.id);
  }, []);

  // Fonction pour confirmer la vente avec les informations du dialog
  const handleConfirmSale = async (saleData: {
    prixVente: number;
    dateVente: string;
    dateMiseEnLigne?: string;
    plateforme: Platform;
  }) => {
    if (!saleProduct) return;

    const updateData: Partial<Product> = {
      vendu: '1',
      prixVente: saleData.prixVente,
      dateVente: saleData.dateVente,
      plateforme: saleData.plateforme,
      soldAt: saleData.dateVente,
      status: ProductStatus.SOLD,
      dateMiseEnLigne: saleData.dateMiseEnLigne || saleProduct.dateMiseEnLigne || saleData.dateVente,
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


  // Statistiques rapides
  const stats = useMemo(() => {
    const total = filteredProduits.length;
    const vendus = filteredProduits.filter(p => p.vendu === '1').length;
    const enLigne = filteredProduits.filter(p => p.dateMiseEnLigne && p.vendu !== '1').length;
    const brouillons = total - vendus - enLigne;

    const totalBenefices = filteredProduits
      .filter(p => p.vendu === '1')
      .reduce((sum, p) => {
        const profit = calculateProductProfit(p as ProductWithLegacyFields);
        return sum + (profit ?? 0);
      }, 0);

    return { total, vendus, enLigne, brouillons, totalBenefices };
  }, [filteredProduits]);

  return (
    <>
      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Vendus</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.vendus}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">En ligne</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.enLigne}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Brouillons</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.brouillons}</p>
        </div>
        <div className="bg-card border rounded-lg p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">Bénéfices totaux</p>
          <p className={`text-2xl font-bold ${stats.totalBenefices >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {stats.totalBenefices >= 0 ? '+' : ''}{formatCurrency(stats.totalBenefices)}
          </p>
        </div>
      </div>

      {/* Barre d'actions groupées */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDuplicate}
            disabled={bulkActionLoading}
          >
            <Copy className="w-4 h-4 mr-2" />
            Dupliquer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkArchive}
            disabled={bulkActionLoading}
          >
            <Archive className="w-4 h-4 mr-2" />
            Archiver
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkActionLoading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-2">
        Cliquez sur une cellule pour la modifier
      </p>

      <div className="rounded-md border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isSomeSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Tout sélectionner"
                />
              </TableHead>
              <TableHead className="w-[60px] text-center">Statut</TableHead>
              <TableHead className="min-w-[150px]">Produit</TableHead>
              <TableHead className="w-[80px]">Marque</TableHead>
              <TableHead className="w-[80px]">Catégorie</TableHead>
              <TableHead className="w-[60px]">Taille</TableHead>
              <TableHead className="w-[60px]">Couleur</TableHead>
              <TableHead className="w-[80px] text-right">Prix achat</TableHead>
              <TableHead className="w-[80px] text-right">Poids</TableHead>
              <TableHead className="w-[100px] text-right">Coût total</TableHead>
              <TableHead className="w-[110px] text-right">Prix vente</TableHead>
              <TableHead className="w-[110px] text-right">Bénéfice</TableHead>
              <TableHead className="hidden lg:table-cell w-[110px]">Plateforme</TableHead>
              <TableHead className="text-right w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredProduits.map((product) => {
                // Calculs des coûts
                const parcelle = product.parcelleId ? parcelleMap.get(product.parcelleId) : undefined;
                const estimatedLivraison = parcelle?.prixParGramme ? (parcelle.prixParGramme * (product.poids || 0)) : 0;
                const coutLivraison = (product.coutLivraison && product.coutLivraison > 0) ? product.coutLivraison : estimatedLivraison;
                const coutTotal = (product.price || 0) + coutLivraison;

                // Calcul du bénéfice si vendu
                const benefice = product.vendu === '1' && product.prixVente
                  ? product.prixVente - coutTotal
                  : product.benefices || null;

                // Statut du produit
                const isVendu = product.vendu === '1';
                const statusColor = isVendu
                  ? "bg-green-500"
                  : product.dateMiseEnLigne
                    ? "bg-blue-500"
                    : "bg-gray-400";

                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`hover:bg-muted/50 ${selectedIds.has(product.id) ? "bg-muted/50" : ""}`}
                  >
                    {/* Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleSelect(product.id)}
                        aria-label={`Sélectionner ${product.name}`}
                      />
                    </TableCell>

                    {/* Statut visuel */}
                    <TableCell className="text-center">
                      <div
                        className={`w-3 h-3 rounded-full ${statusColor} mx-auto shadow-sm`}
                        title={isVendu ? "Vendu" : product.dateMiseEnLigne ? "En ligne" : "Brouillon"}
                      />
                    </TableCell>

                    {/* Nom du produit + infos secondaires */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <EditableCell
                          value={product.name}
                          onSave={(val) => handleInlineUpdate(product.id, "name", val)}
                          displayClassName="font-medium"
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {parcelle && (
                            <span title={`Parcelle: ${parcelle.nom}`}>📦 {parcelle.numero}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Marque */}
                    <TableCell>
                      <EditableCell
                        value={product.brand}
                        placeholder="—"
                        onSave={(val) => handleInlineUpdate(product.id, "brand", val)}
                        displayClassName="text-sm"
                      />
                    </TableCell>

                    {/* Catégorie */}
                    <TableCell>
                      <EditableCell
                        value={product.category}
                        placeholder="—"
                        onSave={(val) => handleInlineUpdate(product.id, "category", val)}
                        displayClassName="text-sm"
                      />
                    </TableCell>

                    {/* Taille */}
                    <TableCell>
                      <EditableCell
                        value={product.size}
                        placeholder="—"
                        onSave={(val) => handleInlineUpdate(product.id, "size", val)}
                        displayClassName="text-sm"
                      />
                    </TableCell>

                    {/* Couleur */}
                    <TableCell>
                      <EditableCell
                        value={product.color}
                        placeholder="—"
                        onSave={(val) => handleInlineUpdate(product.id, "color", val)}
                        displayClassName="text-sm"
                      />
                    </TableCell>

                    {/* Prix d'achat */}
                    <TableCell className="text-right">
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
                    <TableCell className="text-right">
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
                    <TableCell className="text-right tabular-nums" title={`Prix: ${formatCurrency(product.price)} + Livraison: ${formatCurrency(coutLivraison)}`}>
                      <span className="font-semibold">{formatCurrency(coutTotal)}</span>
                    </TableCell>

                    {/* Prix de vente */}
                    <TableCell className="text-right tabular-nums">
                      {isVendu && product.prixVente ? (
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          {formatCurrency(product.prixVente)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Bénéfice */}
                    <TableCell className="text-right tabular-nums">
                      {benefice !== null ? (
                        <span className={`font-bold text-base ${benefice >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {benefice >= 0 ? "+" : ""}{formatCurrency(benefice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Plateforme (si vendu) */}
                    <TableCell className="hidden lg:table-cell">
                      {isVendu && product.plateforme ? (
                        <span className="text-sm font-medium bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                          {product.plateforme}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Actions + Switch Vendu */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Switch
                          checked={product.vendu === '1'}
                          onCheckedChange={() => createToggleHandler(product)()}
                          disabled={updateProductMutation.isPending}
                          title={isVendu ? "Marquer comme disponible" : "Marquer comme vendu"}
                        />
                        <Button
                          data-testid="edit-button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={createEditHandler(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          data-testid="duplicate-button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={createDuplicateHandler(product)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          data-testid="delete-button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={createDeleteHandler(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filteredProduits.length === 0 && (
              <TableRow key="no-produits-row">
                <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Supprimer le produit"
        description="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
      />

      {/* Confirmation de suppression groupée */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        title={`Supprimer ${selectedIds.size} produit${selectedIds.size > 1 ? 's' : ''}`}
        description="Êtes-vous sûr de vouloir supprimer les produits sélectionnés ? Cette action est irréversible."
      />

      {/* Formulaire d'édition de produit */}
      {showEditForm && editProduct && (
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
      )}

      {/* Dialog de confirmation de vente */}
      {saleProduct && (
        <ProductSaleDialog
          open={showSaleDialog}
          onOpenChange={(open) => {
            setShowSaleDialog(open);
            if (!open) {
              setSaleProduct(null);
            }
          }}
          product={saleProduct}
          onConfirm={handleConfirmSale as any}
          coutTotal={(() => {
            // Calculer le coût total pour afficher le bénéfice estimé
            const parcelle = saleProduct.parcelleId ? parcelleMap.get(saleProduct.parcelleId) : undefined;
            const estimatedLivraison = parcelle?.prixParGramme ? (parcelle.prixParGramme * (saleProduct.poids || 0)) : 0;
            const coutLivraison = (saleProduct.coutLivraison && saleProduct.coutLivraison > 0) ? saleProduct.coutLivraison : estimatedLivraison;
            return (saleProduct.price || 0) + coutLivraison;
          })()}
        />
      )}

    </>
  )
}
