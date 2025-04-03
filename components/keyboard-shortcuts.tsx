"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Keyboard } from "lucide-react"

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Liste des raccourcis clavier
  const shortcuts = [
    { key: "d", description: "Aller au tableau de bord", action: () => router.push("/dashboard") },
    { key: "p", description: "Aller aux parcelles", action: () => router.push("/parcelles") },
    { key: "r", description: "Aller aux produits", action: () => router.push("/produits") },
    { key: "s", description: "Aller aux statistiques", action: () => router.push("/statistiques") },
    { key: "u", description: "Aller au profil", action: () => router.push("/profile") },
    { key: "?", description: "Afficher l'aide des raccourcis", action: () => setOpen(true) },
    { key: "Escape", description: "Fermer les dialogues", action: () => setOpen(false) },
  ]

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ne pas déclencher les raccourcis si l'utilisateur est en train de saisir du texte
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      // Vérifier si la touche correspond à un raccourci
      const shortcut = shortcuts.find((s) => s.key === event.key)
      if (shortcut) {
        event.preventDefault()
        shortcut.action()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
        <Keyboard className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raccourcis clavier</DialogTitle>
            <DialogDescription>Utilisez ces raccourcis pour naviguer rapidement dans l'application.</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Touche</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shortcuts.map((shortcut) => (
                <TableRow key={shortcut.key}>
                  <TableCell className="font-mono">{shortcut.key}</TableCell>
                  <TableCell>{shortcut.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  )
}

