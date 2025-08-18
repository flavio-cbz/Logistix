"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useStore } from "@/lib/services/admin/store"
import { Package, Map, BarChart, User } from "lucide-react"

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const { parcelles, produits } = useStore()
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Préparer les données de recherche
  const searchItems = [
    // Pages
    {
      id: "dashboard",
      name: "Tableau de bord",
      type: "page",
      icon: <BarChart className="mr-2 h-4 w-4" />,
      onSelect: () => router.push("/dashboard"),
      description: undefined, // Explicitly undefined for pages
    },
    {
      id: "parcelles",
      name: "Parcelles",
      type: "page",
      icon: <Map className="mr-2 h-4 w-4" />,
      onSelect: () => router.push("/parcelles"),
      description: undefined, // Explicitly undefined for pages
    },
    {
      id: "produits",
      name: "Produits",
      type: "page",
      icon: <Package className="mr-2 h-4 w-4" />,
      onSelect: () => router.push("/produits"),
      description: undefined, // Explicitly undefined for pages
    },
    {
      id: "statistiques",
      name: "Statistiques",
      type: "page",
      icon: <BarChart className="mr-2 h-4 w-4" />,
      onSelect: () => router.push("/statistiques"),
      description: undefined, // Explicitly undefined for pages
    },
    {
      id: "profile",
      name: "Profil",
      type: "page",
      icon: <User className="mr-2 h-4 w-4" />,
      onSelect: () => router.push("/profile"),
      description: undefined, // Explicitly undefined for pages
    },

    // Parcelles
    ...parcelles.filter(Boolean).map((parcelle) => ({
      id: `parcelle-${parcelle.id}`,
      name: `Parcelle #${parcelle.numero}`,
      description: `${parcelle.transporteur} - ${parcelle.poids}g`,
      type: "parcelle",
      icon: <Map className="mr-2 h-4 w-4" />,
      onSelect: () => {
        router.push("/parcelles")
        // Idéalement, nous devrions ouvrir directement la parcelle pour l'édition
      },
    })),

    // Produits
    ...produits.filter(Boolean).map((produit) => ({
      id: `produit-${produit.id}`,
      name: produit.nom,
      description: produit.vendu ? "Vendu" : "Non vendu",
      type: "produit",
      icon: <Package className="mr-2 h-4 w-4" />,
      onSelect: () => {
        router.push("/produits")
        // Idéalement, nous devrions ouvrir directement le produit pour l'édition
      },
    })),
  ]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Ouvrir la recherche globale (⌘K)"
      >
        <span className="hidden md:inline-flex">Recherche</span>
        <kbd className="ml-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Rechercher..." />
          <CommandList>
            <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
            <CommandGroup heading="Pages">
              {searchItems
                .filter((item) => item.type === "page")
                .map((item) => (
                  <CommandItem key={item.id} onSelect={item.onSelect}>
                    {item.icon}
                    <span>{item.name}</span>
                  </CommandItem>
                ))}
            </CommandGroup>

            {parcelles.length > 0 && (
              <CommandGroup heading="Parcelles">
                {searchItems
                  .filter((item) => item.type === "parcelle")
                  .slice(0, 5)
                  .map((item) => (
                    <CommandItem key={item.id} onSelect={item.onSelect}>
                      {item.icon}
                      <span>{item.name}</span>
                      {item.description && <span className="ml-2 text-muted-foreground">{item.description}</span>}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {produits.length > 0 && (
              <CommandGroup heading="Produits">
                {searchItems
                  .filter((item) => item.type === "produit")
                  .slice(0, 5)
                  .map((item) => (
                    <CommandItem key={item.id} onSelect={item.onSelect}>
                      {item.icon}
                      <span>{item.name}</span>
                      {item.description && <span className="ml-2 text-muted-foreground">{item.description}</span>}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
