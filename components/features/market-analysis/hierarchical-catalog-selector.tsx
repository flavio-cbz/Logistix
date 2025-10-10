// Sélecteur hiérarchique de catégories Vinted — version améliorée (accessibilité, perfs, typage strict)
"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

type ReadonlyArrayDeep<T> = readonly T[];

// Types stricts pour les catégories (immutables côté lecture)
interface VintedCategory {
  readonly id: number;
  readonly title: string;
  readonly catalogs?: ReadonlyArrayDeep<VintedCategory>;
}

interface CategoriesApiResponse {
  readonly categories?: ReadonlyArrayDeep<VintedCategory>;
}

interface CatalogSelectorProps {
  readonly value?: number;
  readonly onValueChange: (
    categoryId: number,
    category: VintedCategory,
  ) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

// Utils purs, hors composant (pas de dépendance à l'état React)
function findCategoryById(
  categories: ReadonlyArrayDeep<VintedCategory>,
  id: number,
): VintedCategory | null {
  for (const category of categories) {
    if (category.id === id) return category;
    if (category.catalogs?.length) {
      const found = findCategoryById(category.catalogs, id);
      if (found) return found;
    }
  }
  return null;
}

const MIN_SEARCH_LEN = 2;

export function CatalogSelector({
  value,
  onValueChange,
  placeholder = "Sélectionner une catégorie...",
  disabled = false,
}: CatalogSelectorProps) {
  const [open, setOpen] = useState(false);
  const [allCategories, setAllCategories] = useState<
    ReadonlyArrayDeep<VintedCategory>
  >([]);
  const [currentCategories, setCurrentCategories] = useState<
    ReadonlyArrayDeep<VintedCategory>
  >([]);
  const [history, setHistory] = useState<ReadonlyArrayDeep<VintedCategory>[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selected, setSelected] = useState<VintedCategory | null>(null);

  // a11y: liaisons bouton/listbox
  const buttonId = useId();
  const listboxId = `${buttonId}-listbox`;
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Chargement des catégories (avec AbortController + cleanup)
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/v1/vinted/categories", {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CategoriesApiResponse = await res.json();
        const categories = data.categories ?? [];
        if (!mounted) return;
        setAllCategories(categories);
        setCurrentCategories(categories);
      } catch (err) {
        // Ne jamais throw dans un effet; journaliser proprement
        console.error(
          "[CatalogSelector] Échec du chargement des catégories:",
          err,
        );
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  // Synchroniser la catégorie sélectionnée quand `value` ou `allCategories` changent
  useEffect(() => {
    if (typeof value === "number") {
      const cat = findCategoryById(allCategories, value);
      setSelected(cat ?? null);
    } else {
      setSelected(null);
    }
  }, [value, allCategories]);

  // Handlers mémorisés pour éviter des recréations inutiles
  const openToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      // Focus input lorsque l’on ouvre
      if (!prev && inputRef.current) {
        // microtask pour laisser le DOM peindre
        queueMicrotask(() => inputRef.current?.focus());
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (cat: VintedCategory) => {
      if (cat.catalogs && cat.catalogs.length > 0) {
        setHistory((prev: ReadonlyArrayDeep<VintedCategory>[]) => [
          ...prev,
          currentCategories,
        ]);
        setCurrentCategories(cat.catalogs);
      } else {
        setSelected(cat);
        onValueChange(cat.id, cat);
        setOpen(false);
      }
    },
    [currentCategories, onValueChange],
  );

  const handleBack = useCallback(() => {
    setHistory((prev: ReadonlyArrayDeep<VintedCategory>[]) => {
      if (prev.length === 0) return prev;
      const previousCategories = prev[prev.length - 1]!!; // garanti non-undefined si length > 0
      setCurrentCategories(previousCategories);
      return prev.slice(0, -1);
    });
  }, []);

  // Filtrage performant (useMemo + deferred value)
  const filtered = useMemo(() => {
    const source = currentCategories;
    const q = (deferredSearch ?? "").trim().toLowerCase();

    if (q.length < MIN_SEARCH_LEN) {
      // Tri alpha pour lisibilité cohérente
      return [...source].sort((a, b) => a.title.localeCompare(b.title));
    }

    const result = source.filter((c) => c.title?.toLowerCase().includes(q));
    return result.sort((a, b) => a.title.localeCompare(b.title));
  }, [currentCategories, deferredSearch]);

  // Infos d’état a11y
  const isRoot = history.length === 0;
  const hasChildren = (c: VintedCategory) =>
    Boolean(c.catalogs && c.catalogs.length > 0);

  return (
    <div className="space-y-2">
      <Button
        id={buttonId}
        variant="outline"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className="w-full justify-between"
        disabled={disabled}
        onClick={openToggle!}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          {selected ? (
            <span className="truncate">{selected.title}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <Search
          className="ml-2 h-4 w-4 shrink-0 opacity-50"
          aria-hidden="true"
        />
      </Button>

      {open && (
        <Command aria-labelledby={buttonId} aria-busy={isLoading || undefined}>
          <div className="flex items-center border-b px-3">
            <Search
              className="mr-2 h-4 w-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
            <CommandInput
              ref={inputRef}
              placeholder="Rechercher une catégorie..."
              value={search}
              onValueChange={setSearch!}
              className="flex h-11"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={true}
              aria-describedby={isLoading ? `${listboxId}-status` : undefined}
            />
          </div>

          <CommandList id={listboxId} role="listbox">
            <CommandEmpty>
              {isLoading ? "Chargement..." : "Aucune catégorie trouvée."}
            </CommandEmpty>

            <CommandGroup heading={isRoot ? "Catégories" : "Sous-catégories"}>
              {!isRoot && (
                <CommandItem
                  value="__back"
                  onSelect={handleBack!}
                  className="cursor-pointer"
                  aria-label="Revenir en arrière"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Retour
                </CommandItem>
              )}

              {filtered.map((cat) => (
                <CommandItem
                  key={cat.id}
                  value={cat.title}
                  onSelect={() => handleSelect(cat)}
                  role="option"
                  aria-selected={selected?.id === cat.id}
                >
                  <span className="flex-1">{cat.title}</span>
                  {hasChildren(cat) ? (
                    <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Badge variant="outline" className="text-2xs">
                      ID: {cat.id}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <span
              id={`${listboxId}-status`}
              className="sr-only"
              aria-live="polite"
            >
              {isLoading
                ? "Chargement des catégories"
                : `${filtered.length} résultat(s)`}
            </span>
          </CommandList>
        </Command>
      )}

      {/* Informations sur la catégorie sélectionnée (résumé accessible) */}
      {selected && (
        <div className="p-3 bg-muted/50 rounded-lg" aria-live="polite">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{selected.title}</span>
            <Badge variant="outline">ID: {selected.id}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
