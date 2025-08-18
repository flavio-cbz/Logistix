"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Input } from "@/components/ui/input"
import ParcelleForm from "@/components/features/parcelles/parcelle-form"
import { Copy, Edit, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { Parcelle } from "@/types/database"
import { useToast } from "@/components/ui/use-toast"
import { useStore } from "@/lib/services/admin/store"
import { useDuplicateEntity } from "@/lib/utils/duplication" // Import du hook de duplication

interface ParcellesListProps {
  initialParcelles: Parcelle[]
  onDelete: (id: string) => Promise<void>
}

export default function ParcellesList({ initialParcelles = [], onDelete }: ParcellesListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editParcelle, setEditParcelle] = useState<Parcelle | null>(null)
  const { toast } = useToast()
  const { addParcelle } = useStore() // Destructurer addParcelle du store
  const { duplicateEntity } = useDuplicateEntity<Parcelle>(); // Utilisation du hook générique

  const filteredParcelles = initialParcelles
    .filter(Boolean) // Supprimer les parcelles undefined/null
    .filter(
      (parcelle) =>
        parcelle.transporteur.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parcelle.numero.toString().includes(searchTerm),
    )

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id)
      toast({
        title: "Parcelle supprimée",
        description: "La parcelle a été supprimée avec succès.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression.",
      })
    }
    setDeleteId(null)
  }

  // Fonction pour dupliquer une parcelle
  const handleDuplicate = (parcelle: Parcelle) => {
    duplicateEntity({
      entity: parcelle,
      transform: (p) => ({
        ...p,
        numero: `${p.numero}-copie`,
      }),
      addFunction: addParcelle,
      entityName: "Parcelle",
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
        <Input
          placeholder="Rechercher des parcelles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <ParcelleForm
          className="w-full sm:w-auto sm:ml-auto"
          editParcelle={editParcelle}
          onClose={() => setEditParcelle(null)}
        />
      </div>

      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Transporteur</TableHead>
              <TableHead>Poids (g)</TableHead>
              <TableHead>Prix Total (€)</TableHead>
              <TableHead>Prix/g (€)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredParcelles.map((parcelle) => (
                <motion.tr
                  key={parcelle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <TableCell>#{parcelle.numero}</TableCell>
                  <TableCell>{parcelle.transporteur}</TableCell>
                  <TableCell>{parcelle.poids}</TableCell>
                  <TableCell>{parcelle.prixTotal.toFixed(2)} €</TableCell>
                  <TableCell>{parcelle.prixParGramme.toFixed(3)} €</TableCell>
                  <TableCell className="text-right space-x-2">
                    <AnimatedButton 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setEditParcelle(parcelle)}
                      ripple={true}
                      haptic={true}
                      screenReaderDescription="Modifier la parcelle"
                    >
                      <Edit className="h-4 w-4" />
                    </AnimatedButton>
                    <AnimatedButton 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDuplicate(parcelle)}
                      ripple={true}
                      haptic={true}
                      screenReaderDescription="Dupliquer la parcelle"
                    >
                      <Copy className="h-4 w-4" />
                    </AnimatedButton>
                    <AnimatedButton 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setDeleteId(parcelle.id)}
                      ripple={true}
                      haptic={true}
                      screenReaderDescription="Supprimer la parcelle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </AnimatedButton>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filteredParcelles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucune parcelle trouvée
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
        title="Supprimer la parcelle"
        description="Êtes-vous sûr de vouloir supprimer cette parcelle ? Cette action est irréversible."
      />
    </>
  )
}
