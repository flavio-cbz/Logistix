"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  RefreshCw,
  Plus,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Edit,
  Trash2,
  Copy,
  UploadCloud,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SuperbuyImportWizard } from "@/components/features/superbuy/superbuy-import-wizard";
import { useAuth } from "@/components/auth/auth-provider";
import { EditableCell } from "@/components/ui/editable-cell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ParcelleForm from "@/components/features/parcelles/parcelle-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import { useParcelles, useDeleteParcelle, useUpdateParcelle, useCreateParcelle } from "@/lib/hooks/use-parcelles";
import type { Parcelle, ParcelStatus } from "@/lib/types/entities";
import type { CreateParcelFormData } from "@/lib/schemas/parcelle";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { logger } from "@/lib/utils/logging/logger";







export default function ParcellesPage() {
  const { data: parcelles, isLoading, isError, error, refetch } = useParcelles();
  const { formatDate, formatWeight, formatCurrency } = useFormatting();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editParcelle, setEditParcelle] = useState<Parcelle | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const { user } = useAuth();

  const deleteMutation = useDeleteParcelle();
  const updateMutation = useUpdateParcelle();
  const createMutation = useCreateParcelle();
  const router = useRouter();



  const parcellesList = useMemo(() => parcelles || [], [parcelles]);


  const handleInlineUpdate = async (id: string, field: string, value: unknown) => {
    try {
      // Find the parcelle to get other required fields if necessary, 
      // but assuming patch allows partial or the transformer handles it.
      // We pass the field as part of the data object.
      await updateMutation.mutateAsync({
        id,
        data: { [field]: value }
      });
      toast.success("Mise à jour réussie");
    } catch (error) {
      logger.error("Update error", { error });
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id));
      await Promise.all(promises);

      toast.success(`${selectedIds.size} parcelles supprimées`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch (error) {
      logger.error("Bulk delete error", { error });
      toast.error("Erreur lors de la suppression groupée");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        const parcelle = parcellesList.find(p => p.id === id);
        if (!parcelle) return;

        // Remove system fields and derived fields not needed for creation
        const {
          id: _id,
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          userId: _userId,
          pricePerGram: _pricePerGram,
          ...rest
        } = parcelle;

        const newParcelleData: CreateParcelFormData = {
          ...rest,
          name: `${parcelle.name || ''} (Copy)`.trim(),
          status: parcelle.status as ParcelStatus,
          isActive: Boolean(parcelle.isActive),
          carrier: parcelle.carrier || "Inconnu",
          totalPrice: parcelle.totalPrice || 0,
          weight: parcelle.weight || 0,
          trackingNumber: parcelle.trackingNumber || undefined,
          pricePerGram: 0, // This will be recalculated by the transform in createParcelSchema
        };

        await createMutation.mutateAsync(newParcelleData);
      });

      await Promise.all(promises);
      toast.success(`${selectedIds.size} parcelles dupliquées`);
      setSelectedIds(new Set());
    } catch (error) {
      logger.error("Bulk duplicate error", { error });
      toast.error("Erreur lors de la duplication");
    } finally {
      setBulkActionLoading(false);
    }
  };


  // Calculer les statistiques avec normalisation des statuts
  const stats = useMemo(() => {
    const total = parcellesList.length;
    // Handle both English and French status strings
    const enTransit = parcellesList.filter(p => ["In Transit", "En transit"].includes(p.status)).length;
    const livrees = parcellesList.filter(p => ["Delivered", "Livré"].includes(p.status)).length;
    const enAttente = parcellesList.filter(p => ["Pending", "En attente"].includes(p.status)).length;
    return { total, enTransit, livrees, enAttente };
  }, [parcellesList]);

  const getStatutBadge = (statut: string) => {
    // Normalisation pour le calcul de l'index de progression (timeline)
    let normalizedStatus = statut;
    if (statut === "En attente") normalizedStatus = "Pending";
    if (statut === "En transit") normalizedStatus = "In Transit";
    if (statut === "Livré") normalizedStatus = "Delivered";

    const steps = ["Pending", "In Transit", "Delivered"];
    const currentStepIndex = steps.indexOf(normalizedStatus);

    // Status mapping for display
    const labels: Record<string, string> = {
      // English
      "Pending": "En attente",
      "In Transit": "En transit",
      "Delivered": "Livré",
      "Returned": "Retourné",
      "Lost": "Perdu",
      "Cancelled": "Annulé",
      // French (already translated)
      "En attente": "En attente",
      "En transit": "En transit",
      "Livré": "Livré",
      "Retourné": "Retourné",
      "Perdu": "Perdu",
      "Annulé": "Annulé",
    };

    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: React.ComponentType<{ className?: string }> }> = {
      // English
      "Pending": { variant: "secondary", icon: AlertTriangle },
      "In Transit": { variant: "default", icon: Truck },
      "Delivered": { variant: "outline", icon: CheckCircle2 },
      "Returned": { variant: "destructive", icon: AlertTriangle },
      "Lost": { variant: "destructive", icon: AlertTriangle },
      "Cancelled": { variant: "destructive", icon: Trash2 },
      // French
      "En attente": { variant: "secondary", icon: AlertTriangle },
      "En transit": { variant: "default", icon: Truck },
      "Livré": { variant: "outline", icon: CheckCircle2 },
      "Retourné": { variant: "destructive", icon: AlertTriangle },
      "Perdu": { variant: "destructive", icon: AlertTriangle },
      "Annulé": { variant: "destructive", icon: Trash2 },
    };

    const config = variants[statut] || { variant: "secondary" as const, icon: AlertTriangle };
    const Icon = config.icon;
    const isError = ["Returned", "Lost", "Cancelled", "Retourné", "Perdu", "Annulé"].includes(statut);

    return (
      <div className="flex flex-col gap-1.5 w-[140px]">
        <Badge variant={config.variant} className="w-fit gap-1 whitespace-nowrap">
          <Icon className="w-3 h-3" />
          {labels[statut] || statut}
        </Badge>

        {/* Mini Timeline - Hide for error states */}
        {!isError && currentStepIndex !== -1 && (
          <div className="flex items-center gap-1 h-1.5 w-full">
            {[0, 1, 2].map((step) => {
              const isActive = step <= currentStepIndex;
              const isCurrent = step === currentStepIndex;
              return (
                <div
                  key={step}
                  className={`h-full flex-1 rounded-full transition-colors ${isActive ? (isCurrent ? "bg-primary" : "bg-primary/80") : "bg-muted"
                    }`}
                  title={step === 0 ? "En attente" : step === 1 ? "En transit" : "Livré"}
                />
              );
            })}
          </div>
        )}
      </div>
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
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <SuperbuyImportWizard
            trigger={
              <Button variant="outline" size="sm">
                <UploadCloud className="w-4 h-4 mr-2" />
                Importer (Superbuy)
              </Button>
            }
            onSuccess={() => refetch()}
          />
        )}
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

      {/* Barre d'actions groupées */}
      {
        selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
            <span className="text-sm font-medium">
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="h-4 w-[1px] bg-border mx-2" />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Poids: <span className="font-medium text-foreground">
                  {formatWeight(parcellesList.filter(p => selectedIds.has(p.id)).reduce((acc, p) => acc + (p.weight || 0), 0))}
                </span>
              </span>
              <span>
                Prix: <span className="font-medium text-foreground">
                  {formatCurrency(parcellesList.filter(p => selectedIds.has(p.id)).reduce((acc, p) => acc + (p.totalPrice || 0), 0))}
                </span>
              </span>
            </div>
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
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={bulkActionLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </div>
        )
      }

      {/* Tableau des parcelles */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Parcelles</CardTitle>
          <CardDescription>
            {parcellesList.length} parcelle{parcellesList.length !== 1 ? 's' : ''} enregistrée{parcellesList.length !== 1 ? 's' : ''}
            {" • "}
            <span className="text-muted-foreground">Cliquez sur une cellule pour la modifier</span>
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
                    <TableHead className="w-[50px] align-middle">
                      <Checkbox
                        checked={parcellesList.length > 0 && selectedIds.size === parcellesList.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(new Set(parcellesList.map(p => p.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        aria-label="Tout sélectionner"
                      />
                    </TableHead>
                    <TableHead className="align-middle">Numéro</TableHead>
                    <TableHead className="align-middle">Nom</TableHead>
                    <TableHead className="align-middle">Transporteur</TableHead>
                    <TableHead className="align-middle">Statut</TableHead>
                    <TableHead className="align-middle">Poids</TableHead>
                    <TableHead className="align-middle">Prix</TableHead>
                    <TableHead className="align-middle">Prix/g (€)</TableHead>
                    <TableHead>Date création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcellesList.map((parcelle) => (
                    <TableRow key={parcelle.id} className={selectedIds.has(parcelle.id) ? "bg-muted/50" : ""}>
                      <TableCell className="align-middle">
                        <Checkbox
                          checked={selectedIds.has(parcelle.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedIds);
                            if (checked) newSet.add(parcelle.id);
                            else newSet.delete(parcelle.id);
                            setSelectedIds(newSet);
                          }}
                          aria-label={`Sélectionner ${parcelle.superbuyId}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{parcelle.superbuyId}</TableCell>
                      <TableCell>{parcelle.name}</TableCell>
                      <TableCell>{parcelle.carrier}</TableCell>
                      <TableCell>{getStatutBadge(parcelle.status)}</TableCell>
                      <TableCell>
                        <EditableCell
                          type="number"
                          value={parcelle.weight}
                          min={0}
                          step={0.01}
                          onSave={(val) => handleInlineUpdate(parcelle.id, "weight", val)}
                          formatter={(val) => formatWeight(val as number | null)}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          type="number"
                          value={parcelle.totalPrice}
                          min={0}
                          step={0.01}
                          onSave={(val) => handleInlineUpdate(parcelle.id, "totalPrice", val)}
                          formatter={(val) => val ? `${formatCurrency(Number(val))}` : "N/A"}
                        />
                      </TableCell>
                      <TableCell>
                        {formatCurrency(parcelle.pricePerGram)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(parcelle.createdAt) || "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/parcelles/${parcelle.id}`)}
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Confirmation de suppression simple */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteMutation.mutateAsync(deleteId);
            toast.success("Parcelle supprimée", {
              description: "La parcelle a été supprimée avec succès.",
            });
          } catch (err) {
            toast.error("Erreur de suppression", {
              description: err instanceof Error ? err.message : "Une erreur est survenue.",
            });
          } finally {
            setDeleteId(null);
          }
        }}
        title="Supprimer la parcelle"
        description="Êtes-vous sûr de vouloir supprimer cette parcelle ? Cette action est irréversible."
      />

      {/* Confirmation de suppression groupée */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={handleBulkDelete}
        title={`Supprimer ${selectedIds.size} parcelle${selectedIds.size > 1 ? 's' : ''}`}
        description="Êtes-vous sûr de vouloir supprimer les parcelles sélectionnées ? Cette action est irréversible."
      />
    </div >
  );
}
