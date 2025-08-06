"use client"

import { useState, useEffect, useMemo } from "react"
import { Check, ChevronsUpDown, Search, ChevronRight, AlertCircle, CheckCircle, ArrowLeft, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { vintedCatalogHierarchyService } from "@/lib/services/vinted-catalog-hierarchy"
import { categoryValidationService } from "@/lib/services/category-validation"
import type {
  VintedCatalogLevel1,
  VintedCatalogLevel2,
  VintedCatalogLevel3,
  VintedCatalogAny,
  ValidationResult
} from "@/lib/types/vinted-catalog-hierarchy"

interface HierarchicalCatalogSelectorProps {
  value?: number
  onValueChange: (categoryId: number, category: VintedCatalogLevel3) => void
  productName?: string
  onValidationChange?: (isValid: boolean) => void
  placeholder?: string
  disabled?: boolean
}

type NavigationLevel = 1 | 2 | 3 | 'search'

interface NavigationState {
  level: NavigationLevel
  selectedLevel1?: VintedCatalogLevel1
  selectedLevel2?: VintedCatalogLevel2
  selectedLevel3?: VintedCatalogLevel3
  searchQuery: string
  searchMode: boolean
}

export function HierarchicalCatalogSelector({
  value,
  onValueChange,
  productName,
  onValidationChange,
  placeholder = "Sélectionner une catégorie...",
  disabled = false
}: HierarchicalCatalogSelectorProps) {
  const [open, setOpen] = useState(false)
  const [navigation, setNavigation] = useState<NavigationState>({
    level: 1,
    searchQuery: "",
    searchMode: false
  })
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<VintedCatalogLevel3 | null>(null)

  // Charger la catégorie sélectionnée si une valeur est fournie
  useEffect(() => {
    if (value) {
      const category = vintedCatalogHierarchyService.findCategoryById(value)
      if (category && category.level === 3) {
        setSelectedCategory(category as VintedCatalogLevel3)
        
        // Reconstruire le chemin de navigation
        const path = vintedCatalogHierarchyService.getCategoryFullPath(value)
        if (path) {
          setNavigation(prev => ({
            ...prev,
            selectedLevel1: path.level1,
            selectedLevel2: path.level2,
            selectedLevel3: path.level3,
            level: 3
          }))
        }
      }
    } else {
      setSelectedCategory(null)
      setNavigation({
        level: 1,
        searchQuery: "",
        searchMode: false
      })
    }
  }, [value])

  // Validation en temps réel
  useEffect(() => {
    if (selectedCategory) {
      const validationResult = categoryValidationService.validateCategoryForAnalysis(
        selectedCategory.id,
        { productContext: productName }
      )
      setValidation(validationResult)
      onValidationChange?.(validationResult.isValid)
    } else {
      setValidation(null)
      onValidationChange?.(false)
    }
  }, [selectedCategory, productName, onValidationChange])

  // Suggestions basées sur le nom du produit
  const productSuggestions = useMemo(() => {
    if (!productName || productName.length < 3) return []
    return vintedCatalogHierarchyService.suggestLevel3ForProduct(productName)
  }, [productName])

  // Recherche intelligente
  const searchResults = useMemo(() => {
    if (!navigation.searchQuery || navigation.searchQuery.length < 2) {
      return { exact: [], suggestions: [], popular: [] }
    }
    return vintedCatalogHierarchyService.smartSearch(navigation.searchQuery)
  }, [navigation.searchQuery])

  // Données pour l'affichage selon le niveau de navigation
  const displayData = useMemo(() => {
    if (navigation.searchMode) {
      return {
        title: "Résultats de recherche",
        items: [
          ...searchResults.exact,
          ...searchResults.suggestions,
          ...searchResults.popular
        ].slice(0, 20)
      }
    }

    switch (navigation.level) {
      case 1:
        return {
          title: "Catégories principales",
          items: vintedCatalogHierarchyService.getLevel1Categories()
        }
      case 2:
        return {
          title: navigation.selectedLevel1?.name || "Sous-catégories",
          items: navigation.selectedLevel1 
            ? vintedCatalogHierarchyService.getLevel2Categories(navigation.selectedLevel1.id)
            : []
        }
      case 3:
        return {
          title: navigation.selectedLevel2?.name || "Catégories spécifiques",
          items: navigation.selectedLevel2
            ? vintedCatalogHierarchyService.getLevel3Categories(navigation.selectedLevel2.id)
            : []
        }
      default:
        return { title: "", items: [] }
    }
  }, [navigation, searchResults])

  // Gestion de la sélection
  const handleSelect = (item: VintedCatalogAny) => {
    if (item.level === 1) {
      const level1 = item as VintedCatalogLevel1
      setNavigation(prev => ({
        ...prev,
        selectedLevel1: level1,
        selectedLevel2: undefined,
        selectedLevel3: undefined,
        level: 2,
        searchMode: false
      }))
    } else if (item.level === 2) {
      const level2 = item as VintedCatalogLevel2
      setNavigation(prev => ({
        ...prev,
        selectedLevel2: level2,
        selectedLevel3: undefined,
        level: 3,
        searchMode: false
      }))
    } else if (item.level === 3) {
      const level3 = item as VintedCatalogLevel3
      setSelectedCategory(level3)
      onValueChange(level3.id, level3)
      setOpen(false)
      
      // Mettre à jour la navigation pour refléter la sélection
      const path = vintedCatalogHierarchyService.getCategoryFullPath(level3.id)
      if (path) {
        setNavigation(prev => ({
          ...prev,
          selectedLevel1: path.level1,
          selectedLevel2: path.level2,
          selectedLevel3: path.level3,
          level: 3,
          searchMode: false
        }))
      }
    }
  }

  // Navigation vers le niveau précédent
  const navigateBack = () => {
    if (navigation.searchMode) {
      setNavigation(prev => ({ ...prev, searchMode: false, searchQuery: "" }))
      return
    }

    switch (navigation.level) {
      case 2:
        setNavigation(prev => ({
          ...prev,
          level: 1,
          selectedLevel1: undefined,
          selectedLevel2: undefined,
          selectedLevel3: undefined
        }))
        break
      case 3:
        setNavigation(prev => ({
          ...prev,
          level: 2,
          selectedLevel2: undefined,
          selectedLevel3: undefined
        }))
        break
    }
  }

  // Navigation vers l'accueil
  const navigateHome = () => {
    setNavigation({
      level: 1,
      searchQuery: "",
      searchMode: false
    })
  }

  // Gestion de la recherche
  const handleSearch = (query: string) => {
    setNavigation(prev => ({
      ...prev,
      searchQuery: query,
      searchMode: query.length >= 2
    }))
  }

  // Sélection d'une suggestion produit
  const handleProductSuggestionSelect = (category: VintedCatalogLevel3) => {
    handleSelect(category)
  }

  // Génération du breadcrumb
  const breadcrumb = useMemo(() => {
    const path: string[] = []
    if (navigation.selectedLevel1) path.push(navigation.selectedLevel1.name)
    if (navigation.selectedLevel2) path.push(navigation.selectedLevel2.name)
    if (navigation.selectedLevel3) path.push(navigation.selectedLevel3.name)
    return path
  }, [navigation])

  // Indicateur de validation visuel
  const getValidationIcon = () => {
    if (!validation) return null
    
    if (validation.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <AlertCircle className="h-4 w-4 text-orange-500" />
    }
  }

  return (
    <div className="space-y-3">
      {/* Suggestions basées sur le produit */}
      {productSuggestions.length > 0 && !selectedCategory && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Suggestions pour "{productName}" :
          </p>
          <div className="flex flex-wrap gap-2">
            {productSuggestions.slice(0, 4).map((category) => (
              <Badge
                key={category.id}
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleProductSuggestionSelect(category)}
              >
                {category.name}
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedCategory ? (
                <>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <span className="truncate">{selectedCategory.name}</span>
                    {getValidationIcon()}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    Niveau 3
                  </Badge>
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Rechercher une catégorie..."
                value={navigation.searchQuery}
                onValueChange={handleSearch}
                className="flex h-11"
              />
            </div>

            {/* Breadcrumb et navigation */}
            {(breadcrumb.length > 0 || (typeof navigation.level === 'number' && navigation.level > 1) || navigation.searchMode) && (
              <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateHome}
                  className="h-6 px-2"
                >
                  <Home className="h-3 w-3" />
                </Button>
                
                {((typeof navigation.level === 'number' && navigation.level > 1) || navigation.searchMode) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={navigateBack}
                    className="h-6 px-2"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </Button>
                )}

                {breadcrumb.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {breadcrumb.map((item, index) => (
                      <div key={index} className="flex items-center gap-1">
                        {index > 0 && <ChevronRight className="h-3 w-3" />}
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {navigation.searchMode && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Recherche
                  </Badge>
                )}
              </div>
            )}

            <CommandList>
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-6">
                  <Search className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucune catégorie trouvée
                  </p>
                  {navigation.searchQuery && (
                    <p className="text-xs text-muted-foreground">
                      Essayez avec un terme différent
                    </p>
                  )}
                </div>
              </CommandEmpty>

              {/* Résultats de recherche avec priorisation */}
              {navigation.searchMode && (
                <>
                  {searchResults.exact.length > 0 && (
                    <CommandGroup heading="Correspondances exactes">
                      {searchResults.exact.map((category) => (
                        <CommandItem
                          key={category.id}
                          value={category.name}
                          onSelect={() => handleSelect(category)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCategory?.id === category.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{category.name}</span>
                              <Badge variant="outline" className="text-xs">
                                Niveau 3
                              </Badge>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {vintedCatalogHierarchyService.getCategoryPath(category.id).join(' > ')}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {searchResults.suggestions.length > 0 && (
                    <CommandGroup heading="Suggestions">
                      {searchResults.suggestions.map((category) => (
                        <CommandItem
                          key={category.id}
                          value={category.name}
                          onSelect={() => handleSelect(category)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCategory?.id === category.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{category.name}</span>
                              <Badge variant="outline" className="text-xs">
                                Niveau 3
                              </Badge>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {vintedCatalogHierarchyService.getCategoryPath(category.id).join(' > ')}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {searchResults.popular.length > 0 && (
                    <CommandGroup heading="Catégories populaires">
                      {searchResults.popular.map((category) => (
                        <CommandItem
                          key={category.id}
                          value={category.name}
                          onSelect={() => handleSelect(category)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCategory?.id === category.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{category.name}</span>
                              <Badge variant="outline" className="text-xs">
                                Niveau 3
                              </Badge>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {vintedCatalogHierarchyService.getCategoryPath(category.id).join(' > ')}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}

              {/* Navigation hiérarchique */}
              {!navigation.searchMode && (
                <CommandGroup heading={displayData.title}>
                  {displayData.items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      onSelect={() => handleSelect(item)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {item.level === 3 ? (
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedCategory?.id === item.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            <Badge 
                              variant={item.level === 3 ? "default" : "secondary"} 
                              className="text-xs"
                            >
                              Niveau {item.level}
                            </Badge>
                            {item.level === 3 && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                          {item.level < 3 && (
                            <p className="text-xs text-muted-foreground">
                              Cliquez pour voir les sous-catégories
                            </p>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Validation en temps réel */}
      {validation && (
        <Alert variant={validation.isValid ? "default" : "destructive"}>
          {validation.isValid ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <p>{validation.message}</p>
              {!validation.isValid && validation.userAction && (
                <p className="text-sm font-medium">{validation.userAction}</p>
              )}
              {validation.suggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Suggestions :</p>
                  <div className="flex flex-wrap gap-1">
                    {validation.suggestions.slice(0, 3).map((suggestion) => (
                      <Badge
                        key={suggestion.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                        onClick={() => handleSelect(suggestion)}
                      >
                        {suggestion.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Informations sur la catégorie sélectionnée */}
      {selectedCategory && validation?.isValid && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-200">
              Catégorie validée
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{selectedCategory.name}</p>
            <p className="text-muted-foreground">
              {vintedCatalogHierarchyService.getCategoryPath(selectedCategory.id).join(' > ')}
            </p>
            {selectedCategory.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedCategory.keywords.slice(0, 4).map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
                {selectedCategory.keywords.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedCategory.keywords.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}