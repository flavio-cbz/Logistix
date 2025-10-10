"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AnimatedButton } from "@/components/ui/animated-button"
// Input removed: search field is handled at page level
import ProductCreateForm from "@/components/features/produits/product-create-form"
import { ProductSaleDialog } from "@/components/features/produits/product-sale-dialog"
import { Copy, Edit, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Product, ProductStatus, Platform } from "@/lib/shared/types/entities"

import { useCreateProduct, useUpdateProduct, useDeleteProduct, useProducts } from "@/lib/hooks/use-products";
import { useParcelles } from "@/lib/hooks/use-parcelles";


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
  const { toast } = useToast()
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  
  // Utiliser useProducts pour obtenir les données en temps réel
  const { data: productsResponse } = useProducts();
  const liveProducts = productsResponse?.data || [];
  
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

  // ...existing code...

  // editProduct est maintenant géré via state, pas via useMemo

  // Memoize filtered products to avoid recreating the array on every render
  const filteredProduits = useMemo(() => {
    return liveProduits.filter((product) => {
      const searchLower = searchTerm.toLowerCase()
      const nomMatch = (product.name || "").toLowerCase().includes(searchLower);
      const commandeMatch = product.id?.toLowerCase().includes(searchLower) ?? false
      return nomMatch || commandeMatch
    })
  }, [liveProduits, searchTerm])

  // Memoize event handlers to avoid recreating them on every render
  const handleDelete = useMemo(() => (id: string) => {
    deleteProductMutation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Produit supprimé",
          description: "Le produit a été supprimé avec succès.",
        });
        setDeleteId(null);
        onUpdate?.(); // Rafraîchir la liste
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression.",
        });
        setDeleteId(null);
      },
    });
  }, [deleteProductMutation, toast, onUpdate])

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
          toast({
            title: "Statut mis à jour",
            description: "Le produit est maintenant marqué comme disponible.",
          });
          onUpdate?.(); // Rafraîchir la liste
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Une erreur est survenue lors de la mise à jour du statut.",
          });
        },
      }
    );
  }, [updateProductMutation, toast, onUpdate])

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
        toast({
          title: "Produit dupliqué",
          description: "Le produit a été dupliqué avec succès.",
        });
        onUpdate?.(); // Rafraîchir la liste
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de dupliquer le produit.",
        });
      },
    });
  }, [createProductMutation, toast, onUpdate]);

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
      // Si pas de date de mise en ligne, utiliser la date de vente comme fallback
      // (un produit vendu doit avoir été mis en ligne à un moment donné)
  // Préférer la date de mise en ligne fournie par le formulaire,
  // sinon conserver la valeur existante sur le produit,
  // sinon utiliser la date de vente comme fallback.
  dateMiseEnLigne: saleData.dateMiseEnLigne || saleProduct.dateMiseEnLigne || saleData.dateVente,
    };

    return new Promise<void>((resolve, reject) => {
      updateProductMutation.mutate(
        { id: saleProduct.id, data: updateData },
        {
          onSuccess: () => {
            toast({
              title: "Vente confirmée ! 🎉",
              description: `${saleProduct.name} a été marqué comme vendu.`,
            });
            setSaleProduct(null);
            onUpdate?.();
            resolve();
          },
          onError: (error) => {
            toast({
              variant: "destructive",
              title: "Erreur",
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
        const parcelle = p.parcelleId ? parcelleMap.get(p.parcelleId) : undefined;
        const estimatedLivraison = parcelle?.prixParGramme ? (parcelle.prixParGramme * (p.poids || 0)) : 0;
        const coutLivraison = (p.coutLivraison && p.coutLivraison > 0) ? p.coutLivraison : estimatedLivraison;
        const coutTotal = (p.price || 0) + coutLivraison;
        const benefice = p.prixVente ? p.prixVente - coutTotal : 0;
        return sum + benefice;
      }, 0);
    
    return { total, vendus, enLigne, brouillons, totalBenefices };
  }, [filteredProduits, parcelleMap]);

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
            {stats.totalBenefices >= 0 ? '+' : ''}{stats.totalBenefices.toFixed(2)} €
          </p>
        </div>
      </div>

      <div className="rounded-md border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">Statut</TableHead>
              <TableHead className="min-w-[200px]">Produit</TableHead>
              <TableHead className="w-[100px] text-right">Prix achat</TableHead>
              <TableHead className="w-[100px] text-right">Coût total</TableHead>
              <TableHead className="w-[110px] text-right">Prix vente</TableHead>
              <TableHead className="w-[110px] text-right">Bénéfice</TableHead>
              <TableHead className="hidden lg:table-cell w-[110px]">Plateforme</TableHead>
              <TableHead className="hidden xl:table-cell w-[110px]">Date</TableHead>
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
                    className="hover:bg-muted/50"
                  >
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
                        <span className="font-medium">{product.name || "-"}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {product.poids > 0 && (
                            <span title="Poids">{product.poids}g</span>
                          )}
                          {parcelle && (
                            <>
                              <span>•</span>
                              <span title={`Parcelle: ${parcelle.nom}`}>📦 {parcelle.numero}</span>
                            </>
                          )}
                          {product.vintedItemId && (
                            <>
                              <span>•</span>
                              <span title={`Vinted ID: ${product.vintedItemId}`} className="font-mono">
                                #{product.vintedItemId.substring(0, 8)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Prix d'achat */}
                    <TableCell className="font-medium text-right tabular-nums">
                      {(product.price || 0).toFixed(2)} €
                    </TableCell>

                    {/* Coût total (achat + livraison) */}
                    <TableCell className="text-right tabular-nums" title={`Prix: ${product.price?.toFixed(2)}€ + Livraison: ${coutLivraison.toFixed(2)}€`}>
                      <span className="font-semibold">{coutTotal.toFixed(2)} €</span>
                    </TableCell>

                    {/* Prix de vente */}
                    <TableCell className="text-right tabular-nums">
                      {isVendu && product.prixVente ? (
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          {product.prixVente.toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Bénéfice */}
                    <TableCell className="text-right tabular-nums">
                      {benefice !== null ? (
                        <span className={`font-bold text-base ${benefice >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {benefice >= 0 ? "+" : ""}{benefice.toFixed(2)} €
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

                    {/* Date de mise en ligne */}
                    <TableCell className="hidden xl:table-cell text-sm">
                      {product.dateMiseEnLigne ? (
                        <span className="text-muted-foreground font-medium">
                          {new Date(product.dateMiseEnLigne).toLocaleDateString('fr-FR', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
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
                        <AnimatedButton 
                          data-testid="edit-button"
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={createEditHandler(product)}
                          ripple={true}
                          haptic={true}
                          screenReaderDescription="Modifier le produit"
                        >
                          <Edit className="h-4 w-4" />
                        </AnimatedButton>
                        <AnimatedButton 
                          data-testid="duplicate-button"
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={createDuplicateHandler(product)}
                          ripple={true}
                          haptic={true}
                          screenReaderDescription="Dupliquer le produit"
                        >
                          <Copy className="h-4 w-4" />
                        </AnimatedButton>
                        <AnimatedButton 
                          data-testid="delete-button"
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={createDeleteHandler(product)}
                          ripple={true}
                          haptic={true}
                          screenReaderDescription="Supprimer le produit"
                        >
                          <Trash2 className="h-4 w-4" />
                        </AnimatedButton>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filteredProduits.length === 0 && (
              <TableRow key="no-produits-row">
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
          onConfirm={handleConfirmSale}
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
