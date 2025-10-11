"use client";

import { useState, useMemo } from "react";
import { 
  Package, 
  RefreshCw, 
  Plus,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Edit,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ParcelleForm from "@/components/features/parcelles/parcelle-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useParcelles, useDeleteParcelle } from "@/lib/hooks/use-parcelles";
import type { Parcelle } from "@/lib/types/entities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";


export default function ParcellesPage() {
  const { data: parcelles, isLoading, isError, error, refetch } = useParcelles();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editParcelle, setEditParcelle] = useState<Parcelle | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();
  const deleteMutation = useDeleteParcelle();

  const parcellesList = useMemo(() => parcelles || [], [parcelles]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const total = parcellesList.length;
    const enTransit = parcellesList.filter(p => p.statut === "En transit").length;
    const livrees = parcellesList.filter(p => p.statut === "Livré").length;
    const enAttente = parcellesList.filter(p => p.statut === "En attente").length;
    return { total, enTransit, livrees, enAttente };
  }, [parcellesList]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatWeight = (grams: number | null) => {
    if (!grams) return "N/A";
    const kg = grams / 1000;
    return `${kg.toFixed(2)} kg`;
  };

  const formatPricePerGram = (price: number | null) => {
    if (!price) return "N/A";
    return `${price.toFixed(2)} €/g`;
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      "En attente": { variant: "secondary", icon: AlertTriangle },
      "En transit": { variant: "default", icon: Truck },
      "Livré": { variant: "outline", icon: CheckCircle2 },
    };
    const config = variants[statut] || { variant: "secondary" as const, icon: AlertTriangle };
    const Icon = config!.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {statut}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parcelles</h1>
          <p className="text-muted-foreground">
            Gérez vos parcelles et expéditions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button 
            size="sm" 
            onClick={() => setShowCreateForm(true)} 
            data-testid="open-create-parcelle"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Parcelle
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total === 0 ? 'Aucune parcelle' : 'parcelles au total'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Transit</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enTransit}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.enTransit / stats.total) * 100)}% du total` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livrées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.livrees}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.livrees / stats.total) * 100)}% du total` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enAttente}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.enAttente / stats.total) * 100)}% du total` : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des parcelles */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Parcelles</CardTitle>
          <CardDescription>
            {parcellesList.length} parcelle{parcellesList.length !== 1 ? 's' : ''} enregistrée{parcellesList.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground">{error?.message || "Erreur de chargement"}</p>
              <Button onClick={() => refetch()} className="mt-4" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          ) : parcellesList.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucune parcelle enregistrée</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre première parcelle
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Transporteur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Poids</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Prix/g</TableHead>
                    <TableHead>Date création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcellesList.map((parcelle) => (
                    <TableRow key={parcelle.id}>
                      <TableCell className="font-medium">{parcelle.numero}</TableCell>
                      <TableCell>{parcelle.nom}</TableCell>
                      <TableCell>{parcelle.transporteur}</TableCell>
                      <TableCell>{getStatutBadge(parcelle.statut)}</TableCell>
                      <TableCell>
                        {formatWeight(parcelle.poids)}
                      </TableCell>
                      <TableCell>
                        {parcelle.prixAchat ? `${parcelle.prixAchat.toFixed(2)} €` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {formatPricePerGram(parcelle.prixParGramme)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(parcelle.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditParcelle(parcelle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(parcelle.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulaire création/modification */}
      <ParcelleForm
        editParcelle={editParcelle}
        forceOpen={showCreateForm || !!editParcelle}
        showTrigger={false}
        onClose={() => {
          setShowCreateForm(false);
          setEditParcelle(null);
        }}
        onCreated={() => {
          setShowCreateForm(false);
          setEditParcelle(null);
        }}
      />

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteMutation.mutateAsync(deleteId);
            toast({
              title: "Parcelle supprimée",
              description: "La parcelle a été supprimée avec succès.",
            });
          } catch (error) {
            toast({
              variant: "destructive",
              title: "Erreur de suppression",
              description: error instanceof Error ? error.message : "Une erreur est survenue.",
            });
          } finally {
            setDeleteId(null);
          }
        }}
        title="Supprimer la parcelle"
        description="Êtes-vous sûr de vouloir supprimer cette parcelle ? Cette action est irréversible."
      />
    </div>
  );
}
