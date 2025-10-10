"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  vintedCatalogService,
  type VintedCatalog,
} from "@/lib/services/vinted-catalogs";

interface CatalogSelectorProps {
  value?: number;
  onValueChange: (catalogId: number, catalog: VintedCatalog) => void;
  productName?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CatalogSelector({
  value,
  onValueChange,
  productName,
  placeholder = "Sélectionner une catégorie...",
  disabled = false,
}: CatalogSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<VintedCatalog[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<VintedCatalog | null>(
    null,
  );

  // Charger les catalogues au montage
  useEffect(() => {
    // const loadedCatalogs = vintedCatalogService.getAllCatalogs()
    // setAllCatalogs(loadedCatalogs)

    // Charger le catalogue sélectionné si une valeur est fournie
    if (value) {
      const catalog = vintedCatalogService.getCatalogById(value);
      setSelectedCatalog(catalog);
    }
  }, [value]);

  // Générer des suggestions basées sur le nom du produit
  useEffect(() => {
    if (productName) {
      const productSuggestions =
        vintedCatalogService.suggestCatalogsForProduct(productName);
      setSuggestions(productSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [productName]);
  // Filtrer les catalogues selon la recherche
  const filteredCatalogs = searchQuery
    ? vintedCatalogService.searchCatalogs(searchQuery)
    : vintedCatalogService.getMainCatalogs();

  const handleSelect = (catalog: VintedCatalog) => {
    setSelectedCatalog(catalog);
    onValueChange(catalog.id, catalog);
    setOpen(false);
  };

  const handleSuggestionSelect = (catalog: VintedCatalog) => {
    handleSelect(catalog);
  };

  return (
    <div className="space-y-2">
      {/* Suggestions basées sur le produit */}
      {suggestions.length > 0 && !selectedCatalog && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Suggestions pour "{productName}" :
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((catalog) => (
              <Badge
                key={catalog.id}
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleSuggestionSelect(catalog)}
              >
                {catalog.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Sélecteur principal */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedCatalog ? (
              <div className="flex items-center gap-2">
                <span>{selectedCatalog.name}</span>
                <Badge variant="outline" className="text-xs">
                  ID: {selectedCatalog.id}
                </Badge>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Rechercher une catégorie..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucune catégorie trouvée
                  </p>
                </div>
              </CommandEmpty>

              {/* Catégories principales */}
              <CommandGroup heading="Catégories principales">
                {filteredCatalogs
                  .filter((catalog) => !catalog.parentId)
                  .map((catalog) => (
                    <CommandItem
                      key={catalog.id}
                      value={catalog.name}
                      onSelect={() => handleSelect(catalog)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCatalog?.id === catalog.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{catalog.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {catalog.id}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {catalog.description}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>

              {/* Sous-catégories si recherche */}
              {searchQuery &&
                filteredCatalogs.some((catalog) => catalog.parentId) && (
                  <CommandGroup heading="Sous-catégories">
                    {filteredCatalogs
                      .filter((catalog) => catalog.parentId)
                      .map((catalog) => (
                        <CommandItem
                          key={catalog.id}
                          value={catalog.name}
                          onSelect={() => handleSelect(catalog)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCatalog?.id === catalog.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {catalog.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {catalog.id}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {catalog.description}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Informations sur la catégorie sélectionnée */}
      {selectedCatalog && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{selectedCatalog.name}</span>
            <Badge variant="outline">ID: {selectedCatalog.id}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedCatalog.description}
          </p>
          {selectedCatalog.keywords.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Mots-clés :</p>
              <div className="flex flex-wrap gap-1">
                {selectedCatalog.keywords.slice(0, 5).map((keyword, _index) => (
                  <Badge key={_index} variant="secondary" className="text-xs">
                    {" "}
                    {/* Corrected index usage */}
                    {keyword}
                  </Badge>
                ))}
                {selectedCatalog.keywords.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedCatalog.keywords.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
