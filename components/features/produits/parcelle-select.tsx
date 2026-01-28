/**
 * Composant de sélection de parcelle optimisé
 * Affiche une liste searchable de parcelles avec possibilité de refresh
 */

import { useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import type { Parcelle } from "@/lib/shared/types/entities";
import { cn } from "@/lib/shared/utils";
import { useFormatting } from "@/lib/hooks/use-formatting";

interface ParcelleSelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  parcelles: Parcelle[] | undefined;
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ParcelleSelect({
  value,
  onChange,
  parcelles,
  onRefresh,
  isRefreshing = false,
  disabled = false,
  className,
}: ParcelleSelectProps) {
  const [open, setOpen] = useState(false);
  const { formatCurrency } = useFormatting();


  const selectedParcelle = (parcelles ?? []).find((p) => p.id === value);

  const handleRefresh = async () => {
    try {
      await onRefresh();
      toast.success("Parcelles rafraîchies", {
        description: "La liste a été mise à jour avec succès.",
      });
    } catch (_error) {
      toast.error("Erreur", {
        description: "Impossible de rafraîchir les parcelles.",
      });
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-11"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 truncate">
              <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selectedParcelle ? (
                <span className="truncate">
                  #{selectedParcelle.superbuyId} - {selectedParcelle.carrier}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({selectedParcelle.pricePerGram ? formatCurrency(selectedParcelle.pricePerGram) : "N/A"}/g)
                  </span>
                </span>
              ) : value ? (
                <span className="truncate text-muted-foreground">
                  Parcelle ({String(value).slice(0, 8)}...)
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Sélectionnez une parcelle
                </span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher une parcelle..." />
            <CommandEmpty>
              <div className="flex flex-col items-center gap-3 py-6 px-4">
                <Package className="h-8 w-8 text-muted-foreground" />
                {/* if (isError) return <div className="text-red-500">Erreur de chargement</div>; */}
                <p className="text-sm font-medium">Aucune parcelle trouvée</p>
                <p className="text-xs text-muted-foreground">
                  Créez votre première parcelle pour commencer
                </p>
              </div>
              <Link href="/parcelles" onClick={() => setOpen(false)}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                >
                  <Plus className="h-3 w-3" />
                  Créer une parcelle
                </Button>
              </Link>
            </CommandEmpty>
            <CommandList>
              {parcelles &&
                parcelles.map((parcelle) => (
                  <CommandItem
                    key={parcelle.id}
                    value={`${parcelle.superbuyId} ${parcelle.carrier} ${parcelle.id}`}
                    onSelect={() => {
                      onChange(parcelle.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            #{parcelle.superbuyId} - {parcelle.carrier}
                          </div>
                          {parcelle.name && (
                            <div className="text-xs text-muted-foreground">
                              {parcelle.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {parcelle.pricePerGram ? formatCurrency(parcelle.pricePerGram) : "N/A"}/g
                      </div>
                    </div>
                  </CommandItem>
                ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 shrink-0"
        onClick={handleRefresh}
        disabled={isRefreshing || disabled}
        aria-label="Rafraîchir les parcelles"
        title="Rafraîchir les parcelles"
      >
        <RefreshCw
          className={cn("h-4 w-4", isRefreshing && "animate-spin")}
        />
      </Button>
    </div>
  );
}
