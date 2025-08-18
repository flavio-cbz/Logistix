import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface Brand {
  id: number
  title: string
}

interface BrandSelectorProps {
  value?: number
  onValueChange: (brandId: number) => void
  brands: Brand[]
  placeholder?: string
  disabled?: boolean
}

export function BrandSelector({
  value,
  onValueChange,
  brands,
  placeholder = "Sélectionner une marque...",
  disabled = false
}: BrandSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const selected = brands.find(b => b.id === value)

  const filtered = search.length > 0
    ? brands.filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    : brands

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
        <span className="truncate">{selected ? selected.title : placeholder}</span>
        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <Command>
          <CommandInput
            placeholder="Rechercher une marque..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Aucune marque trouvée.</CommandEmpty>
            <CommandGroup>
              {filtered.map(brand => (
                <CommandItem
                  key={brand.id}
                  value={brand.title}
                  onSelect={() => {
                    onValueChange(brand.id)
                    setOpen(false)
                  }}
                >
                  {brand.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      )}
    </div>
  )
}