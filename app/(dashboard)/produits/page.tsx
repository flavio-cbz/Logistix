"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Plus,
  TrendingUp,
  List,
  Grid3X3,
  AlertTriangle,
  DollarSign,
  Archive,
  RefreshCw,
  ShoppingCart
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProductCreateForm from "@/components/features/produits/product-create-form";
import { useProducts } from "@/lib/hooks/use-products";
import { Product, EnrichmentData } from "@/lib/shared/types/entities";
<<<<<<< HEAD
import { SuperbuyImportWizard } from "@/components/features/superbuy/superbuy-import-wizard";
import { useAuth } from "@/components/auth/auth-provider";
=======
import { SuperbuySyncDialog } from "@/components/features/superbuy/sync-dialog";
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
import {
  calculateProductProfit,
  type ProductWithLegacyFields
} from "@/lib/utils/product-field-normalizers";
import ProductsList from "@/components/features/produits/produits-list";
import ProductsGridView from "@/components/features/produits/products-grid-view";
import { ProductFilters, EnrichmentStatusFilter } from "@/components/features/produits/components/product-filters";
import { PageLoading } from "@/components/ui/loading-state";

// NOTE: ProductsList now consumes products via `useProducts()` internally.
// We keep Product typed data here and no longer convert to legacy `Produit`.

type ViewMode = 'grid' | 'list';

export default function RevolutionaryProductsPage() {
  // États du composant
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user } = useAuth();

  // États des filtres
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<("all" | "available" | "online" | "sold")[]>(["all"]);
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [enrichmentFilter, setEnrichmentFilter] = useState<EnrichmentStatusFilter[]>(["all"]);

  // États des filtres
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<("all" | "available" | "online" | "sold")[]>(["all"]);
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [enrichmentFilter, setEnrichmentFilter] = useState<EnrichmentStatusFilter[]>(["all"]);

  // Hooks pour les données
  const { data: productsResponse, isLoading, error, refetch } = useProducts();
  // toast not used here (actions are handled in ProductsList)

  // Fonction pour obtenir le statut d'un produit
  const getProductStatus = (product: Product) => {
    if (product.status === 'archived' || product.status === 'removed') return 'inactif';
    if (product.vendu === '1') return 'actif'; // Vendu
    // Note: vendu is now "0" | "1" only, status field handles other states
    return 'actif';
  };

  const products = useMemo(() => productsResponse?.data || [], [productsResponse?.data]);

  // Filtrage côté client
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Filtre recherche texte
      if (searchValue) {
        const search = searchValue.toLowerCase();
        const matchesSearch =
          product.name?.toLowerCase().includes(search) ||
          product.brand?.toLowerCase().includes(search) ||
          product.category?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filtre statut
      if (!statusFilter.includes("all")) {
        const productStatusValue =
          product.vendu === '1' ? 'sold' :
            product.dateMiseEnLigne ? 'online' : 'available';
        if (!statusFilter.includes(productStatusValue as "all" | "available" | "online" | "sold")) return false;
      }

      // Filtre plateforme
      if (platformFilter.length > 0) {
        if (!product.plateforme || !platformFilter.includes(product.plateforme)) {
          return false;
        }
      }

      // Filtre enrichissement
      if (!enrichmentFilter.includes("all")) {
        const enrichmentData = product.enrichmentData as EnrichmentData | undefined;
        const enrichmentStatus = enrichmentData?.enrichmentStatus;

        let productEnrichmentStatus: EnrichmentStatusFilter;
        if (!enrichmentData || !enrichmentStatus) {
          productEnrichmentStatus = "not_analyzed";
        } else if (enrichmentStatus === 'done') {
          productEnrichmentStatus = "identified";
        } else if (enrichmentStatus === 'pending') {
          productEnrichmentStatus = "pending";
        } else if (enrichmentStatus === 'conflict') {
          productEnrichmentStatus = "conflict";
        } else if (enrichmentStatus === 'failed') {
          // Treat both quota errors and regular failures as "error"
          productEnrichmentStatus = "error";
        } else {
          productEnrichmentStatus = "not_analyzed";
        }

        if (!enrichmentFilter.includes(productEnrichmentStatus)) return false;
      }

      return true;
    });
  }, [products, searchValue, statusFilter, platformFilter, enrichmentFilter]);

  // bulk actions placeholder (unused for now)
  // const handleBulkAction = async (action: 'archive' | 'export' | 'edit') => { /* ... */ };

  // Calcul des statistiques basées sur les vrais produits
  const stats = {
    total: products.length,
    actifs: products.filter(p => getProductStatus(p) === 'actif').length,
    inactifs: products.filter(p => getProductStatus(p) === 'inactif').length,
    rupture: 0, // Legacy field - now handled by status field
    valeurStock: products.reduce((sum, p) => sum + (p.price || 0), 0),
    beneficesTotal: products.reduce((sum, p) => {
      // Utiliser les utilitaires pour un accès sûr aux champs legacy
      const profit = calculateProductProfit(p as ProductWithLegacyFields);
      return sum + (profit && profit > 0 ? profit : 0);
    }, 0),
    ventesTotales: products.filter(p => p.vendu === '1').length
  };

  // Affichage du loading et des erreurs
  if (isLoading) {
    return (
      <PageLoading
        title="Chargement du Catalogue"
        message="Récupération des données produits..."
        icon={<ShoppingCart className="w-6 h-6" />}
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <CardTitle>Erreur de Connexion</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Impossible de charger les produits. Vérifiez votre connexion.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header harmonisé */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Catalogue Produits
            </h1>
            <Badge variant="secondary" className="animate-pulse">
              <ShoppingCart className="w-3 h-3 mr-1" />
              {stats.total} Produits
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Gestion intelligente et analyse de votre inventaire
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-3"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              Grille
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              <List className="w-4 h-4 mr-2" />
              Liste
            </Button>
          </div>
          {user && (
            <SuperbuyImportWizard
              onSuccess={() => refetch()}
            />
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Produit
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      {/* Statistiques rapides */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, staggerChildren: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
              <Package className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.actifs} produits actifs
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
              <DollarSign className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.valeurStock.toLocaleString()}€</div>
              <p className="text-xs text-muted-foreground">
                Valeur totale inventaire
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bénéfices</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.beneficesTotal.toLocaleString()}€</div>
              <p className="text-xs text-muted-foreground">
                Bénéfices générés
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactifs</CardTitle>
              <Archive className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.inactifs}</div>
              <p className="text-xs text-muted-foreground">
                Produits archivés
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filtres produits */}
      <ProductFilters
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        enrichmentFilter={enrichmentFilter}
        onEnrichmentFilterChange={setEnrichmentFilter}
      />

      {/* Liste des produits dans une Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Catalogue Produits
                {filteredProducts.length !== products.length && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredProducts.length} sur {products.length})
                  </span>
                )}
              </CardTitle>
            </div>
            <div className="flex gap-2">

            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'list' ? (
            <ProductsList
              products={filteredProducts}
              isLoading={isLoading}
              onUpdate={refetch}
            />
          ) : (
            <ProductsGridView products={filteredProducts} onUpdate={refetch} />
          )}
        </CardContent>
      </Card>

      {/* Formulaire de création */}
      {showCreateForm && (
        <ProductCreateForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onCreated={() => {
            refetch(); // Rafraîchir la liste après création
          }}
        />
      )}
    </div>
  );
}