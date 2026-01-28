"use client";

<<<<<<< HEAD
import { useState, useMemo, useEffect } from "react";
=======
import { useState, useMemo, useCallback, useEffect } from "react";
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
import { MoreVertical, Edit, Trash2, DollarSign, Package, TrendingUp, RefreshCw, CheckCircle, AlertTriangle, Sparkles, HelpCircle, Shirt, Footprints, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Product, EnrichmentData } from "@/lib/shared/types/entities";
import { formatEuro } from "@/lib/utils/formatting";
import ProductCreateForm from "./product-create-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EnhancedConflictResolutionDialog } from "./enhanced-conflict-resolution-dialog";
<<<<<<< HEAD
import { useEnrichmentPolling } from "@/lib/hooks/use-enrichment";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductSelection } from "@/lib/hooks/use-product-selection";
import { useProductActions } from "@/lib/hooks/use-product-actions";
import { useProductCalculations } from "@/lib/hooks/use-product-calculations";
import { BatchActionsBar } from "./batch-actions-bar";
import { VintedAssociationDialog } from "../vinted/vinted-association-dialog";
import { VintedStatsBlock } from "./vinted-stats-block";
import { Link as LinkIcon } from "lucide-react";
=======
import { useDeleteProduct } from "@/lib/hooks/use-products";
import { useEnrichmentPolling, useRetryEnrichment } from "@/lib/hooks/use-enrichment";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useProductSelection } from "@/lib/hooks/use-product-selection";
import { BatchActionsBar } from "./batch-actions-bar";
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

interface ProductsGridViewProps {
  products: Product[];
  onUpdate?: () => void;
}

export default function ProductsGridView({ products, onUpdate }: ProductsGridViewProps) {
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
<<<<<<< HEAD
  const [conflictProduct, setConflictProduct] = useState<Product | null>(null);

  // Use custom hooks for business logic
  const actions = useProductActions(onUpdate);
  const { calculateProfit, hasProfit } = useProductCalculations();
=======
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [conflictProduct, setConflictProduct] = useState<Product | null>(null);
  const [canceledEnrichments, setCanceledEnrichments] = useState<Set<string>>(new Set());

  const deleteMutation = useDeleteProduct();
  const { retryEnrichment } = useRetryEnrichment();
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

  const selection = useProductSelection(products);
  const { selectedIds, toggleSelect, clearSelection, selectRange } = selection;
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Get IDs of products with pending enrichment for polling
  const pendingProductIds = useMemo(() => {
    return products
      .filter(p => {
        // Exclude canceled products from polling
<<<<<<< HEAD
        if (actions.canceledEnrichments.has(p.id)) return false;
        return (p.enrichmentData as EnrichmentData | undefined)?.enrichmentStatus === 'pending';
      })
      .map(p => p.id);
  }, [products, actions.canceledEnrichments]);
=======
        if (canceledEnrichments.has(p.id)) return false;
        return (p.enrichmentData as EnrichmentData | undefined)?.enrichmentStatus === 'pending';
      })
      .map(p => p.id);
  }, [products, canceledEnrichments]);
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

  // Poll for enrichment completion
  useEnrichmentPolling({
    enabled: pendingProductIds.length > 0,
    pendingProductIds,
    intervalMs: 5000,
  });

  // Show toast notification for quota errors
  useEffect(() => {
    const quotaErrors = products.filter(p => {
      const enrichmentData = p.enrichmentData as EnrichmentData | undefined;
      if (!enrichmentData || enrichmentData.enrichmentStatus !== 'failed') return false;
      const errorMessage = enrichmentData.error || '';
      return errorMessage.includes('429') ||
        errorMessage.toLowerCase().includes('quota') ||
        errorMessage.toLowerCase().includes('rate limit');
    });

    if (quotaErrors.length > 0) {
      // Show toast only if we haven't shown it recently
      toast.error("Quota API épuisé", {
        description: "Le quota gratuit Gemini est épuisé. Réessayez plus tard ou configurez une clé API payante.",
        id: "quota-error-toast", // Use ID to prevent duplicate toasts
      });
    }
  }, [products]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await actions.handleDelete(deleteId);
    setDeleteId(null);
  };

<<<<<<< HEAD
  const getStatusBadge = (product: Product) => {
    if (product.vendu === "1" || product.status === "sold") {
      return <Badge variant="default" className="bg-success hover:bg-success/90">Vendu</Badge>;
    }
    if (product.status === "online") {
      return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">En ligne</Badge>;
    }
    if (product.status === "reserved") {
      return <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">Réservé</Badge>;
=======
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const handleAnalyzeMarket = useCallback(async (productId: string) => {
    setAnalyzingId(productId);
    try {
      const response = await fetch("/api/v1/market/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) throw new Error("Erreur lors de l'analyse");

      toast.success("✓ Analyse terminée", {
        description: "Les données de marché ont été mises à jour.",
      });
      onUpdate?.();
    } catch (error) {
      toast.error("Échec de l'analyse", {
        description: error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setAnalyzingId(null);
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    }
  }, [onUpdate]);

<<<<<<< HEAD
=======
  const handleRetryEnrichment = useCallback(async (productId: string) => {
    setRetryingId(productId);
    // Remove from canceled set so the pending badge shows up again
    setCanceledEnrichments(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });

    try {
      await retryEnrichment(productId);
      toast.success("✓ Enrichissement relancé", {
        description: "Le produit est en cours d'identification.",
      });
      onUpdate?.();
    } catch (error) {
      toast.error("Échec du ré-enrichissement", {
        description: error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setRetryingId(null);
    }
  }, [retryEnrichment, onUpdate]);

  const getStatusBadge = (product: Product) => {
    if (product.vendu === "1") {
      return <Badge variant="default" className="bg-success hover:bg-success/90">Vendu</Badge>;
    }
    if (product.status === "removed") {
      return <Badge variant="destructive">Retiré</Badge>;
    }
    if (product.status === "archived") {
      return <Badge variant="secondary">Archivé</Badge>;
    }
    return <Badge variant="outline">En stock</Badge>;
  };

>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
  // Enrichment status badge
  const getEnrichmentBadge = (product: Product) => {
    const enrichmentData = product.enrichmentData as EnrichmentData | undefined;
    if (!enrichmentData) return null;

    const status = enrichmentData.enrichmentStatus;

    // Don't show pending badge if product has been canceled
<<<<<<< HEAD
    if (status === 'pending' && !actions.canceledEnrichments.has(product.id)) {
      const handleCancelEnrichment = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await actions.handleCancelEnrichment(product.id, enrichmentData);
=======
    if (status === 'pending' && !canceledEnrichments.has(product.id)) {
      const handleCancelEnrichment = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Immediately mark as canceled to hide the badge
        setCanceledEnrichments(prev => new Set(prev).add(product.id));

        try {
          const response = await fetch(`/api/v1/produits/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enrichmentData: {
                ...enrichmentData,
                enrichmentStatus: 'failed',
                error: 'Annulé par l\'utilisateur',
              },
            }),
          });

          if (!response.ok) throw new Error('Erreur lors de l\'annulation');

          toast.success("✓ Enrichissement annulé");
          onUpdate?.();
        } catch (error) {
          // On error, remove from canceled set to show pending badge again
          setCanceledEnrichments(prev => {
            const next = new Set(prev);
            next.delete(product.id);
            return next;
          });
          toast.error("Échec de l'annulation", {
            description: error instanceof Error ? error.message : "Erreur inconnue",
          });
        }
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
      };

      return (
        <Badge variant="outline" className="ml-1 text-xs animate-pulse flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Enrichissement...
          <button
            onClick={handleCancelEnrichment}
            className="ml-1 w-3 h-3 bg-red-600 hover:bg-red-700 rounded-sm flex items-center justify-center transition-colors"
            title="Annuler l'enrichissement"
          >
            <span className="sr-only">Annuler</span>
          </button>
        </Badge>
      );
    }
    if (status === 'failed') {
      // Check if the error is a quota/rate limit error
      const errorMessage = enrichmentData.error || '';
      const isQuotaError = errorMessage.includes('429') ||
        errorMessage.toLowerCase().includes('quota') ||
        errorMessage.toLowerCase().includes('rate limit');

      if (isQuotaError) {
        return (
          <Badge variant="destructive" className="ml-1 text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Erreur
          </Badge>
        );
      }

      return (
        <Badge variant="destructive" className="ml-1 text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Non trouvé
        </Badge>
      );
    }
    if (status === 'conflict') {
      return (
        <Badge variant="outline" className="ml-1 text-xs border-warning text-warning">
          <HelpCircle className="h-3 w-3 mr-1" />
          Conflit
        </Badge>
      );
    }
    if (status === 'done' && enrichmentData.confidence >= 0.9) {
      return (
        <Badge variant="secondary" className="ml-1 text-xs bg-emerald-600 text-white hover:bg-emerald-600/90 border-0">
          <CheckCircle className="h-3 w-3 mr-1" />
          Identifié
        </Badge>
      );
    }
    if (status === 'done' && enrichmentData.confidence < 0.9) {
      return (
        <Badge variant="secondary" className="ml-1 text-xs">
          ~{Math.round(enrichmentData.confidence * 100)}%
        </Badge>
      );
    }
    return null;
  };

<<<<<<< HEAD
  const getCategoryIcon = (category?: string | null) => {
=======
  const calculateProfit = (product: Product) => {
    return calculateProductProfit(product as ProductWithLegacyFields) ?? 0;
  };

  const getCategoryIcon = (category?: string) => {
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    if (!category) return <Package className="w-12 h-12 text-muted-foreground/20" />;

    const lower = category.toLowerCase();
    if (lower.includes('vêtement') || lower.includes('t-shirt') || lower.includes('pull')) return <Shirt className="w-12 h-12 text-muted-foreground/20" />;
    if (lower.includes('chaussure') || lower.includes('sneaker')) return <Footprints className="w-12 h-12 text-muted-foreground/20" />;
    if (lower.includes('sac') || lower.includes('accessoire')) return <ShoppingBag className="w-12 h-12 text-muted-foreground/20" />;
    return <Package className="w-12 h-12 text-muted-foreground/20" />;
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
      <BatchActionsBar
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onSuccess={() => {
          clearSelection();
          onUpdate?.();
        }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => {
          const profit = calculateProfit(product);
<<<<<<< HEAD
          const productHasProfit = hasProfit(product, profit);
=======
          const hasProfit = product.vendu === "1" && profit > 0;
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

          return (
            <Card key={product.id} className="hover:shadow-lg transition-shadow group">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-start justify-between">
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={(checked) => {
                      // Handled by onClick for shift key access, but keeping this for accessibility/completeness
                      if (!checked) toggleSelect(product.id);
                    }}
                    className="mr-3 mt-1 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    onClick={(e) => {
                      e.stopPropagation();

                      if (e.shiftKey && lastSelectedId) {
                        // Range selection
                        selectRange(lastSelectedId, product.id);
                      } else {
                        // Single toggle
                        toggleSelect(product.id);
                        setLastSelectedId(product.id);
                      }
                    }}
                  />
                  <div className="flex-1 space-y-1 flex flex-wrap gap-1 items-center">
                    {getStatusBadge(product)}
                    {getEnrichmentBadge(product)}
                  </div>
<<<<<<< HEAD

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-1">
                    <VintedAssociationDialog
                      productId={product.id}
                      productTitle={product.name}
                      currentExternalId={product.externalId}
                      onAssociationComplete={onUpdate}
                      trigger={
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={product.externalId ? "Produit lié à Vinted" : "Associer à Vinted"}>
                          <LinkIcon className={`h-4 w-4 ${product.externalId ? "text-blue-500" : "text-muted-foreground"}`} />
                        </Button>
                      }
                    />

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
                        <DropdownMenuSeparator />
                        {(product.enrichmentData as EnrichmentData | undefined)?.enrichmentStatus === 'conflict' && (
                          <DropdownMenuItem onClick={() => setConflictProduct(product)}>
                            <HelpCircle className="mr-2 h-4 w-4 text-warning" />
                            Résoudre le conflit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => actions.handleRetryEnrichment(product.id)}
                          disabled={actions.retryingId === product.id}
                        >
                          <Sparkles className={`mr-2 h-4 w-4 ${actions.retryingId === product.id ? 'animate-spin' : ''}`} />
                          {actions.retryingId === product.id ? 'Analyse en cours...' : 'Relancer l\'analyse IA'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => actions.handleAnalyzeMarket(product.id)}
                          disabled={actions.analyzingId === product.id}
                        >
                          <TrendingUp className={`mr-2 h-4 w-4 ${actions.analyzingId === product.id ? 'animate-spin' : ''}`} />
                          {actions.analyzingId === product.id ? 'Calcul en cours...' : 'Analyser Marché'}
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
=======
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
                      <DropdownMenuSeparator />
                      {(product.enrichmentData as EnrichmentData | undefined)?.enrichmentStatus === 'conflict' && (
                        <DropdownMenuItem onClick={() => setConflictProduct(product)}>
                          <HelpCircle className="mr-2 h-4 w-4 text-warning" />
                          Résoudre le conflit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleRetryEnrichment(product.id)}
                        disabled={retryingId === product.id}
                      >
                        <Sparkles className={`mr-2 h-4 w-4 ${retryingId === product.id ? 'animate-spin' : ''}`} />
                        {retryingId === product.id ? 'Analyse en cours...' : 'Relancer l\'analyse IA'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAnalyzeMarket(product.id)}
                        disabled={analyzingId === product.id}
                      >
                        <TrendingUp className={`mr-2 h-4 w-4 ${analyzingId === product.id ? 'animate-spin' : ''}`} />
                        {analyzingId === product.id ? 'Calcul en cours...' : 'Analyser Marché'}
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
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
                </div>
                <div>
                  <CardTitle className="text-base line-clamp-1" title={product.name}>
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
              {/* Rotation de -90° pour corriger l'orientation des photos Superbuy */}
              <div className="px-6 pb-4">
                <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted/30 flex items-center justify-center">
                  {product.photoUrl ? (
                    <img
                      src={product.photoUrl}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      style={{ imageOrientation: 'from-image' }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      {getCategoryIcon(product.category)}
                      <span className="text-xs text-muted-foreground/50">Pas d'image</span>
                    </div>
                  )}
                </div>
              </div>

              <CardContent className="space-y-3">
                {/* Market Stats (Si disponible) */}
                {(product.enrichmentData as EnrichmentData | undefined)?.marketStats && (
                  <div className="flex items-center justify-between text-xs bg-muted/50 p-1.5 rounded-md mb-2">
                    <span className="text-muted-foreground">Marché Vinted:</span>
                    <div className="flex gap-2 font-medium">
                      <span className="text-blue-600">
                        {formatEuro((product.enrichmentData as EnrichmentData).marketStats!.minPrice)}
                      </span>
                      <span>-</span>
                      <span className="text-blue-600">
                        {formatEuro((product.enrichmentData as EnrichmentData).marketStats!.maxPrice)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Prix d'achat */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Prix d'achat
                  </span>
                  <span className="font-medium">{formatEuro(product.price || 0)}</span>
                </div>

                {/* Bénéfice si vendu */}
<<<<<<< HEAD
                {productHasProfit && (
=======
                {hasProfit && (
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Bénéfice
                    </span>
                    <span className="font-medium text-success">
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
<<<<<<< HEAD

                {/* Vinted Stats Block */}
                <div className="mt-3 pt-3 border-t">
                  <VintedStatsBlock
                    productId={product.id}
                    externalId={product.externalId}
                    stats={product.vintedStats}
                    vintedUrl={product.url}
                    onSync={onUpdate}
                    onAssociate={() => {
                      // The VintedAssociationDialog is already in the header, this is just a visual prompt
                    }}
                  />
                </div>
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
              </CardContent>
            </Card>
          );
        })}
<<<<<<< HEAD
      </div >

      {/* Dialog d'édition */}
      {
        editProduct && (
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
        )
      }
=======
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
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

      {/* Dialog de confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteId}
<<<<<<< HEAD
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={handleDelete}
        title="Supprimer le produit"
        description="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
      />

      {/* Dialog de résolution de conflit */}
      <EnhancedConflictResolutionDialog
        product={conflictProduct}
        open={!!conflictProduct}
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
        onOpenChange={(open) => {
          if (!open) setConflictProduct(null);
        }}
        onResolved={onUpdate}
      />

      {/* Dialog de résolution de conflit */}
      <EnhancedConflictResolutionDialog
        product={conflictProduct}
        open={!!conflictProduct}
        onOpenChange={(open) => {
          if (!open) setConflictProduct(null);
        }}
        onResolved={onUpdate}
      />
    </>
  );
}
