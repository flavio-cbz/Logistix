import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell } from "@/components/ui/table";
import { EditableCell } from "@/components/ui/editable-cell";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  MoreHorizontal,
  ExternalLink,
  Edit,
  Copy,
  Calculator,
  Trash2,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { Product } from "@/lib/shared/types/entities";
import { memo } from "react";
import type { ColumnVisibility } from "@/lib/hooks/use-product-table-config";

interface ProductRowProps {
  product: Product;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  columnVisibility: ColumnVisibility;
  cellPadding?: string;
  parcelleMap: Map<string, { superbuyId: string; name: string; pricePerGram?: number }>;
  onInlineUpdate: (id: string, field: string, value: string | number) => Promise<void>;
  onToggleVendu: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onDelete: (id: string) => void;
  onQuickSale: (product: Product) => void;
  isUpdatePending: boolean;
}

export const ProductRow = memo(function ProductRow({
  product,
  isSelected,
  onToggleSelect,
  columnVisibility,
  cellPadding,
  parcelleMap,
  onInlineUpdate,
  onToggleVendu,
  onEdit,
  onDuplicate,
  onDelete,
  onQuickSale,
  isUpdatePending,
}: ProductRowProps) {
  const { formatCurrency, formatWeight } = useFormatting();

  // Calculs des coûts
  const parcelle = product.parcelId ? parcelleMap.get(product.parcelId) : undefined;
  const estimatedLivraison = parcelle?.pricePerGram
    ? parcelle.pricePerGram * (product.poids || 0)
    : 0;
  const coutLivraison =
    product.coutLivraison && product.coutLivraison > 0
      ? product.coutLivraison
      : estimatedLivraison;
  const coutTotal = (product.price || 0) + coutLivraison;

  // Calcul du bénéfice
  const benefice = product.sellingPrice
    ? product.sellingPrice - coutTotal
    : product.benefices || null;

  // Statut du produit
  const isVendu = product.vendu === "1";
  const statusColor = isVendu
    ? "bg-success"
    : product.dateMiseEnLigne
    ? "bg-primary"
    : "bg-gray-400";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.tr
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className={`hover:bg-muted/50 ${isSelected ? "bg-muted/50" : ""}`}
        >
          {/* Checkbox */}
          <TableCell className={cellPadding}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(product.id)}
              aria-label={`Sélectionner ${product.name}`}
            />
          </TableCell>

          {/* Statut visuel */}
          <TableCell
            className={cn("text-center", cellPadding)}
            style={{ display: columnVisibility.status ? undefined : "none" }}
          >
            <div
              className={`w-3 h-3 rounded-full ${statusColor} mx-auto shadow-sm`}
              title={
                isVendu
                  ? "Vendu"
                  : product.dateMiseEnLigne
                  ? "En ligne"
                  : "Brouillon"
              }
            />
          </TableCell>

          {/* Nom du produit + infos secondaires */}
          <TableCell className={cellPadding}>
            <div className="flex flex-col gap-0.5">
              <EditableCell
                value={product.name}
                onSave={(val) => onInlineUpdate(product.id, "name", val)}
                displayClassName="font-medium"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {parcelle && (
                  <span title={`Parcelle: ${parcelle.name}`}>
                    📦 {parcelle.superbuyId}
                  </span>
                )}
              </div>
            </div>
          </TableCell>

          {/* Marque */}
          <TableCell
            className={cellPadding}
            style={{ display: columnVisibility.brand ? undefined : "none" }}
          >
            <EditableCell
              value={product.brand}
              placeholder="—"
              onSave={(val) => onInlineUpdate(product.id, "brand", val)}
              displayClassName="text-sm truncate max-w-[80px] block"
            />
          </TableCell>

          {/* Catégorie */}
          <TableCell
            className={cellPadding}
            style={{ display: columnVisibility.category ? undefined : "none" }}
          >
            <EditableCell
              value={product.category}
              placeholder="—"
              onSave={(val) => onInlineUpdate(product.id, "category", val)}
              displayClassName="text-sm"
            />
          </TableCell>

          {/* Taille */}
          <TableCell
            className={cellPadding}
            style={{ display: columnVisibility.size ? undefined : "none" }}
          >
            <EditableCell
              value={product.size}
              placeholder="—"
              onSave={(val) => onInlineUpdate(product.id, "size", val)}
              displayClassName="text-sm"
            />
          </TableCell>

          {/* Couleur */}
          <TableCell
            className={cellPadding}
            style={{ display: columnVisibility.color ? undefined : "none" }}
          >
            <EditableCell
              value={product.color}
              placeholder="—"
              onSave={(val) => onInlineUpdate(product.id, "color", val)}
              displayClassName="text-sm"
            />
          </TableCell>

          {/* Prix d'achat */}
          <TableCell
            className={cn("text-right", cellPadding)}
            style={{ display: columnVisibility.price ? undefined : "none" }}
          >
            <EditableCell
              type="number"
              value={product.price}
              min={0}
              step={0.01}
              onSave={(val) => onInlineUpdate(product.id, "price", val)}
              formatter={(val) => formatCurrency(Number(val || 0))}
              displayClassName="font-medium tabular-nums"
            />
          </TableCell>

          {/* Poids */}
          <TableCell
            className={cn("text-right", cellPadding)}
            style={{ display: columnVisibility.weight ? undefined : "none" }}
          >
            <EditableCell
              type="number"
              value={product.poids}
              min={0}
              step={1}
              onSave={(val) => onInlineUpdate(product.id, "poids", val)}
              formatter={(val) => (val ? formatWeight(Number(val)) : "—")}
              displayClassName="tabular-nums text-sm"
            />
          </TableCell>

          {/* Coût total (achat + livraison) */}
          <TableCell
            className={cn("text-right tabular-nums", cellPadding)}
            title={`Prix: ${formatCurrency(
              product.price
            )} + Livraison: ${formatCurrency(coutLivraison)}`}
            style={{ display: columnVisibility.totalCost ? undefined : "none" }}
          >
            <span className="font-semibold">{formatCurrency(coutTotal)}</span>
          </TableCell>

          {/* Prix de vente */}
          <TableCell
            className={cn("text-right tabular-nums", cellPadding)}
            style={{ display: columnVisibility.salePrice ? undefined : "none" }}
          >
            {product.sellingPrice ? (
              <span
                className={`font-semibold ${
                  isVendu ? "text-success" : "text-blue-500"
                }`}
              >
                {formatCurrency(product.sellingPrice)}
              </span>
            ) : (
              <span className="text-muted-foreground/40 text-xs">—</span>
            )}
          </TableCell>

          {/* Bénéfice */}
          <TableCell
            className={cn("text-right tabular-nums", cellPadding)}
            style={{ display: columnVisibility.profit ? undefined : "none" }}
          >
            {benefice !== null ? (
              <span
                className={`font-bold text-base ${
                  benefice >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {benefice >= 0 ? "+" : ""}
                {formatCurrency(benefice)}
              </span>
            ) : (
              <span className="text-muted-foreground/40 text-xs">—</span>
            )}
          </TableCell>

          {/* Plateforme (si vendu ou en ligne) */}
          <TableCell
            className={cn("hidden lg:table-cell", cellPadding)}
            style={{ display: columnVisibility.platform ? undefined : "none" }}
          >
            {product.plateforme ? (
              <span className="text-sm font-medium bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                {product.plateforme}
              </span>
            ) : (
              <span className="text-muted-foreground/40 text-xs">—</span>
            )}
          </TableCell>

          {/* Actions + Switch Vendu */}
          <TableCell className={cn("text-right", cellPadding)}>
            <div className="flex items-center justify-end gap-1">
              <Switch
                checked={isVendu}
                onCheckedChange={() => onToggleVendu(product)}
                disabled={isUpdatePending}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700"
                title={
                  isVendu ? "Marquer comme disponible" : "Marquer comme vendu"
                }
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Ouvrir menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  {product.url && (
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(product.url ?? undefined, "_blank")
                      }
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Voir sur Vinted
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(product)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(product)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      /* Placeholder */
                    }}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Détails Financiers
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(product.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TableCell>
        </motion.tr>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onEdit(product)}>
          <Edit className="mr-2 h-4 w-4" />
          Modifier
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate(product)}>
          <Copy className="mr-2 h-4 w-4" />
          Dupliquer
        </ContextMenuItem>
        {!isVendu && (
          <ContextMenuItem
            onClick={() => onQuickSale(product)}
            className="text-green-600"
          >
            <Banknote className="mr-2 h-4 w-4" />
            Vente rapide
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete(product.id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
