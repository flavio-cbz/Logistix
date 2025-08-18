// Nouveau sélecteur de catégories Vinted (dynamique, sans hiérarchie)

"use client"

import { useState, useEffect } from "react"
import { Search, ChevronRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

interface VintedCategory {
  id: number
  title: string
  catalogs?: VintedCategory[]
}

interface CatalogSelectorProps {
  value?: number
  onValueChange: (categoryId: number, category: VintedCategory) => void
  placeholder?: string
  disabled?: boolean
}

export function CatalogSelector({
  value,
  onValueChange,
  placeholder = "Sélectionner une catégorie...",
  disabled = false
}: CatalogSelectorProps) {
  const [open, setOpen] = useState(false)
  const [allCategories, setAllCategories] = useState<VintedCategory[]>([])
  const [currentCategories, setCurrentCategories] = useState<VintedCategory[]>([])
  const [history, setHistory] = useState<VintedCategory[][]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<VintedCategory | null>(null)
  
  useEffect(() => {
    setIsLoading(true)
    fetch("/api/v1/vinted/categories")
      .then(res => res.json())
      .then(data => {
        setAllCategories(data.categories || [])
        setCurrentCategories(data.categories || [])
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])
  
  const findCategoryById = (categories: VintedCategory[], id: number): VintedCategory | null => {
    for (const category of categories) {
      if (category.id === id) return category
      if (category.catalogs) {
        const found = findCategoryById(category.catalogs, id)
        if (found) return found
      }
    }
    return null
  }
  
  useEffect(() => {
    if (value) {
      const cat = findCategoryById(allCategories, value)
      if (cat) setSelected(cat)
    } else {
      setSelected(null)
    }
  }, [value, allCategories])
  
  const handleSelect = (cat: VintedCategory) => {
    if (cat.catalogs && cat.catalogs.length > 0) {
      setHistory([...history, currentCategories])
      setCurrentCategories(cat.catalogs)
    } else {
      setSelected(cat)
      onValueChange(cat.id, cat)
      setOpen(false)
    }
  }
  
  const handleBack = () => {
    const previousCategories = history[history.length - 1]
    setHistory(history.slice(0, -1))
    setCurrentCategories(previousCategories)
  }
  
  const filtered = search.length > 1
    ? currentCategories.filter(c =>
        c.title?.toLowerCase().includes(search.toLowerCase())
      )
    : currentCategories

  return (
    <div>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          {selected ? (
            <span className="truncate">{selected.title}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Rechercher une catégorie..."
              value={search}
              onValueChange={setSearch}
              className="flex h-11"
            />
          </div>
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Chargement...' : 'Aucune catégorie trouvée.'}
            </CommandEmpty>
            <CommandGroup>
              {history.length > 0 && (
                <CommandItem onSelect={handleBack} className="cursor-pointer">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour
                </CommandItem>
              )}
              {filtered.map(cat => (
                <CommandItem
                  key={cat.id}
                  value={cat.title}
                  onSelect={() => handleSelect(cat)}
                  disabled={!cat.catalogs && cat.catalogs?.length === 0}
                >
                  <span className="flex-1">{cat.title}</span>
                  {cat.catalogs && cat.catalogs.length > 0 && (
                    <ChevronRight className="ml-2 h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      )}
    </div>
  )
}