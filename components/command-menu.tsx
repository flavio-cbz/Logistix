// components/command-menu.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search } from 'lucide-react';

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex h-9 w-9 items-center justify-center p-0 md:h-10 md:w-60 md:justify-start md:px-4 md:py-2">
          <Search className="h-4 w-4 md:mr-2" />
          <span className="hidden text-sm text-muted-foreground md:inline-flex">Rechercher...</span>
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="p-4">
          <DialogTitle>Recherche rapide</DialogTitle>
          <DialogDescription>
            Recherchez des commandes, des pages ou des informations.
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Tapez une commande ou une recherche..." />
          <CommandList>
            <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                <span>Tableau de bord</span>
              </CommandItem>
              <CommandItem>
                <span>Analyse de marché</span>
              </CommandItem>
              <CommandItem>
                <span>Produits</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}