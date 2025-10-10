"use client";

import { useState } from "react";
import { 
  Package,
  Plus,
  TrendingUp,
  List,
  
  AlertTriangle,
  DollarSign,
  ArrowUpDown,
  Archive,
  Grid3X3,
  RefreshCw,
  ShoppingCart
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductCreateForm from "@/components/features/produits/product-create-form";
import { useProducts } from "@/lib/hooks/use-products";
import type { Product } from "@/lib/shared/types/entities";
import ProductsList from "@/components/features/produits/produits-list";

// NOTE: ProductsList now consumes products via `useProducts()` internally.
// We keep Product typed data here and no longer convert to legacy `Produit`.

type ViewMode = 'grid' | 'list';
type SortBy = 'title' | 'prix' | 'stock' | 'ventes' | 'date' | 'note';
type FilterStatus = 'tous' | 'actif' | 'rupture' | 'inactif';

export default function RevolutionaryProductsPage() {
  // États du composant
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('title');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('tous');

  // Hooks pour les données
  const { data: productsResponse, isLoading, error, refetch } = useProducts();
  // toast not used here (actions are handled in ProductsList)

  // Fonction pour obtenir le statut d'un produit
  const getProductStatus = (product: Product) => {
    if (product.status === 'archived' || product.status === 'removed') return 'inactif';
    if (product.vendu === '1') return 'actif'; // Vendu
    if (product.vendu === '3') return 'rupture'; // Retiré
    return 'actif';
  };

  const products = productsResponse?.data || [];

  // bulk actions placeholder (unused for now)
  // const handleBulkAction = async (action: 'archive' | 'export' | 'edit') => { /* ... */ };

  // Calcul des statistiques basées sur les vrais produits
  const stats = {
    total: products.length,
    actifs: products.filter(p => getProductStatus(p) === 'actif').length,
    inactifs: products.filter(p => getProductStatus(p) === 'inactif').length,
    rupture: products.filter(p => getProductStatus(p) === 'rupture').length,
    valeurStock: products.reduce((sum, p) => sum + (p.price || 0), 0),
    beneficesTotal: products.reduce((sum, p: any) => {
      // Calcul des vrais bénéfices: prix de vente - (prix d'achat + coût de livraison)
      const prixVente = (p.prix_vente || p.selling_price || p.prixVente || 0) as number;
      const coutAchat = (p.price || p.prixAchat || 0) as number;
      const coutLivraison = (p.cout_livraison || p.coutLivraison || 0) as number;
      const benefice = prixVente - (coutAchat + coutLivraison);
      return sum + (benefice > 0 ? benefice : 0); // Ne compter que les bénéfices positifs
    }, 0),
    ventesTotales: products.filter((p: any) => String(p.vendu) === '1').length // Nombre de produits vendus
  };

  // Affichage du loading et des erreurs
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
            <ShoppingCart className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Chargement du Catalogue</h3>
            <p className="text-muted-foreground">Récupération des données produits...</p>
          </div>
        </div>
      </div>
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
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Section des filtres et recherche */}
      <div className="grid gap-4 lg:grid-cols-4">

        <Card>
    <CardContent className="p-4" data-sort-order={sortOrder}>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Statut</Label>
              <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actifs</SelectItem>
                  <SelectItem value="rupture">Rupture</SelectItem>
                  <SelectItem value="inactif">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Trier par</Label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Nom</SelectItem>
                    <SelectItem value="prix">Prix</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="ventes">Ventes</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Affichage</Label>
              <div className="flex gap-1">
                <Button
                  data-testid="view-mode-grid"
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="flex-1"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  data-testid="view-mode-list"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex-1"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des produits dans une Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Catalogue Produits</CardTitle>
            </div>
            <div className="flex gap-2">

            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'list' ? (
            <ProductsList onUpdate={refetch} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Grid view implementation can be added here */}
              <p className="col-span-full text-center text-muted-foreground py-8">
                Vue en grille à venir
              </p>
            </div>
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