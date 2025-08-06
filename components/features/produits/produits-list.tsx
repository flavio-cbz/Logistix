"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ProduitForm from "@/components/features/produits/produit-form"
import { Copy, Edit, Trash2, DollarSign } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/confirm-dialog"
import VenteForm from "@/components/features/produits/vente-form"
import type { Produit } from "@/types/database"
import { useToast } from "@/components/ui/use-toast"
import { useStore } from "@/store/store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDuplicateEntity } from "@/lib/utils/duplication" // Import du hook de duplication

interface ProduitsListProps {
  initialProduits: Produit[]
}

export default function ProduitsList({ initialProduits = [] }: ProduitsListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editProduit, setEditProduit] = useState<Produit | null>(null)
  const [venteFormProduitId, setVenteFormProduitId] = useState<string | null>(null)
  const { toast } = useToast()
  const { deleteProduit, updateProduit, addProduit } = useStore() // Destructurer addProduit du store
  const { duplicateEntity } = useDuplicateEntity<Produit>(); // Utilisation du hook générique


  const filteredProduits = initialProduits.filter((produit) => {
    const searchLower = searchTerm.toLowerCase()
    const nomMatch = (produit.nom || "").toLowerCase().includes(searchLower);
    const commandeMatch = produit.commandeId?.toLowerCase().includes(searchLower) ?? false
    return nomMatch || commandeMatch
  })

  const handleDelete = async (id: string) => {
    try {
      deleteProduit(id)
      toast({
        title: "Produit supprimé",
        description: "Le produit a été supprimé avec succès.",
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

  const handleToggleVendu = async (produit: Produit) => {
    if (!produit.vendu) {
      setVenteFormProduitId(produit.id)
    } else {
      try {
        updateProduit(produit.id, {
          vendu: false,
          dateVente: undefined,
          tempsEnLigne: undefined,
          prixVente: undefined,
          plateforme: undefined,
        })
        toast({
          title: "Statut mis à jour",
          description: "Le statut du produit a été mis à jour avec succès.",
        })
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue lors de la mise à jour du statut.",
        })
      }
    }
  }

  // Fonction pour dupliquer un produit
  const handleDuplicate = (produit: Produit) => {
    duplicateEntity({
      entity: produit,
      transform: (p) => ({
        ...p,
        nom: `${p.nom} (copie)`,
      }),
      addFunction: addProduit,
      entityName: "Produit",
    });
  };


  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-4 py-4">
        <Input
          placeholder="Rechercher des produits..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <ProduitForm
          className="w-full sm:w-auto sm:ml-auto"
          editProduit={editProduit}
          onClose={() => setEditProduit(null)}
        />
      </div>

      <div className="rounded-md border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Commande</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead className="hidden md:table-cell">Détails</TableHead>
              <TableHead>Prix Article (€)</TableHead>
              <TableHead className="hidden md:table-cell">Livraison (€)</TableHead>
              <TableHead>Vendu</TableHead>
              <TableHead>Prix de vente (€)</TableHead>
              <TableHead>Bénéfice (€)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {filteredProduits.map((produit) => (
                <motion.tr
                  key={produit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <TableCell>{produit.commandeId || "-"}</TableCell>
                  <TableCell className="font-medium">{produit.nom || "-"}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                    {produit.details || "-"}
                  </TableCell>
                  <TableCell>{(produit.prixArticle || 0).toFixed(2)} €</TableCell>
                  <TableCell className="hidden md:table-cell">{(produit.prixLivraison || 0).toFixed(2)} €</TableCell>
                  <TableCell>
                    <Switch checked={produit.vendu || false} onCheckedChange={() => handleToggleVendu(produit)} />
                  </TableCell>
                  <TableCell>
                    {produit.vendu ? (
                      <div className="flex items-center">
                        {produit.prixVente ? `${produit.prixVente.toFixed(2)} €` : "-"}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-1"
                          onClick={() => setEditProduit(produit)}
                        >
                          <DollarSign className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {produit.benefices ? (
                      <span className={produit.benefices > 0 ? "text-green-600" : "text-red-600"}>
                        {produit.benefices.toFixed(2)} €
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditProduit(produit)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(produit)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(produit.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
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

      {venteFormProduitId && (
        <VenteForm produitId={venteFormProduitId} open={true} onClose={() => setVenteFormProduitId(null)} />
      )}
    </>
  )
}
