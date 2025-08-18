"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Parcelle } from "@/types/database";
import { Button } from "@/components/ui/button";
import { PencilIcon, Trash2Icon, CopyIcon } from "lucide-react";
import { useDuplicateEntity } from "@/lib/utils/duplication";
import { useStore } from "@/lib/services/admin/store";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ParcelleForm from "@/components/features/parcelles/parcelle-form"; // Correction: import par défaut
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ParcellesTableProps {
  parcelles: Parcelle[];
}

export function ParcellesTable({ parcelles }: ParcellesTableProps) {
  const { addParcelle, updateParcelle, deleteParcelle } = useStore();
  const { duplicateEntity } = useDuplicateEntity<Parcelle>();
  const [editingParcelle, setEditingParcelle] = useState<Parcelle | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDuplicate = (parcelle: Parcelle) => {
    duplicateEntity({
      entity: parcelle,
      transform: (p) => ({
        ...p,
        numero: `${p.numero ?? ""}-copie`, // Exemple: ajouter "-copie" au numéro
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      addFunction: addParcelle,
      entityName: "Parcelle",
    });
  };

  const handleEdit = (parcelle: Parcelle) => {
    setEditingParcelle(parcelle);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteParcelle(id);
    setDeleteId(null);
  };

  const handleFormClose = () => {
    setEditingParcelle(null);
    setIsFormOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liste des Parcelles</CardTitle>
        <CardDescription>
          Gérez et visualisez toutes vos parcelles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Transporteur</TableHead>
              <TableHead>Poids (g)</TableHead>
              <TableHead>Prix Achat (€)</TableHead>
              <TableHead>Prix/Gramme (€)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Aucune parcelle trouvée.
                </TableCell>
              </TableRow>
            ) : (
              parcelles.map((parcelle) => (
                <TableRow key={parcelle.id}>
                  <TableCell className="font-medium">
                    {parcelle.numero ?? ""}
                  </TableCell>
                  <TableCell>{parcelle.transporteur ?? "N/A"}</TableCell>
                  <TableCell>{parcelle.poids ?? 0}</TableCell>
                  <TableCell>{(parcelle.prixAchat ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{(parcelle.prixParGramme ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(parcelle)}
                      className="mr-1"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(parcelle)}
                      className="mr-1"
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(parcelle.id)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingParcelle ? "Modifier la parcelle" : "Ajouter une parcelle"}
            </DialogTitle>
          </DialogHeader>
          {editingParcelle && (
            <ParcelleForm
              editParcelle={editingParcelle}
              onClose={handleFormClose}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDeleteConfirm(deleteId)}
        title="Supprimer la parcelle"
        description="Êtes-vous sûr de vouloir supprimer cette parcelle ? Cette action est irréversible."
      />
    </Card>
  );
}