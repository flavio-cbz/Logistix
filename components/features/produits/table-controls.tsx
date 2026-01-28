<<<<<<< HEAD
"use client";

import { Settings2, Eye, EyeOff, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export type ColumnVisibility = {
    status: boolean;
    brand: boolean;
    category: boolean;
    size: boolean;
    color: boolean;
    price: boolean;
    weight: boolean;
    totalCost: boolean;
    salePrice: boolean;
    profit: boolean;
    platform: boolean;
};

export type TableDensity = "compact" | "comfortable";

interface TableControlsProps {
    columnVisibility: ColumnVisibility;
    onColumnVisibilityChange: (column: keyof ColumnVisibility) => void;
    density: TableDensity;
    onDensityChange: (density: TableDensity) => void;
}

const columnLabels: Record<keyof ColumnVisibility, string> = {
    status: "Statut",
    brand: "Marque",
    category: "Catégorie",
    size: "Taille",
    color: "Couleur",
    price: "Prix achat",
    weight: "Poids",
    totalCost: "Coût total",
    salePrice: "Prix vente",
    profit: "Bénéfice",
    platform: "Plateforme",
};

export function TableControls({
    columnVisibility,
    onColumnVisibilityChange,
    density,
    onDensityChange,
}: TableControlsProps) {
    const visibleCount = Object.values(columnVisibility).filter(Boolean).length;

    return (
        <div className="flex items-center gap-2">
            {/* Column Visibility Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                        <Settings2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Colonnes</span>
                        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {visibleCount}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Colonnes visibles</span>
                        {visibleCount === Object.keys(columnVisibility).length ? (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(columnLabels).map(([key, label]) => (
                        <DropdownMenuCheckboxItem
                            key={key}
                            checked={columnVisibility[key as keyof ColumnVisibility]}
                            onCheckedChange={() =>
                                onColumnVisibilityChange(key as keyof ColumnVisibility)
                            }
                        >
                            {label}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Density Toggle */}
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2"
                onClick={() =>
                    onDensityChange(density === "compact" ? "comfortable" : "compact")
                }
                title={
                    density === "compact"
                        ? "Passer en mode normal"
                        : "Passer en mode compact"
                }
            >
                {density === "compact" ? (
                    <Maximize2 className="h-4 w-4" />
                ) : (
                    <Minimize2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                    {density === "compact" ? "Compact" : "Normal"}
                </span>
            </Button>
        </div>
    );
}
=======
"use client";

import { Settings2, Eye, EyeOff, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export type ColumnVisibility = {
    status: boolean;
    brand: boolean;
    category: boolean;
    size: boolean;
    color: boolean;
    price: boolean;
    weight: boolean;
    totalCost: boolean;
    salePrice: boolean;
    profit: boolean;
    platform: boolean;
};

export type TableDensity = "compact" | "comfortable";

interface TableControlsProps {
    columnVisibility: ColumnVisibility;
    onColumnVisibilityChange: (column: keyof ColumnVisibility) => void;
    density: TableDensity;
    onDensityChange: (density: TableDensity) => void;
}

const columnLabels: Record<keyof ColumnVisibility, string> = {
    status: "Statut",
    brand: "Marque",
    category: "Catégorie",
    size: "Taille",
    color: "Couleur",
    price: "Prix achat",
    weight: "Poids",
    totalCost: "Coût total",
    salePrice: "Prix vente",
    profit: "Bénéfice",
    platform: "Plateforme",
};

export function TableControls({
    columnVisibility,
    onColumnVisibilityChange,
    density,
    onDensityChange,
}: TableControlsProps) {
    const visibleCount = Object.values(columnVisibility).filter(Boolean).length;

    return (
        <div className="flex items-center gap-2">
            {/* Column Visibility Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                        <Settings2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Colonnes</span>
                        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {visibleCount}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Colonnes visibles</span>
                        {visibleCount === Object.keys(columnVisibility).length ? (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(columnLabels).map(([key, label]) => (
                        <DropdownMenuCheckboxItem
                            key={key}
                            checked={columnVisibility[key as keyof ColumnVisibility]}
                            onCheckedChange={() =>
                                onColumnVisibilityChange(key as keyof ColumnVisibility)
                            }
                        >
                            {label}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Density Toggle */}
            <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2"
                onClick={() =>
                    onDensityChange(density === "compact" ? "comfortable" : "compact")
                }
                title={
                    density === "compact"
                        ? "Passer en mode normal"
                        : "Passer en mode compact"
                }
            >
                {density === "compact" ? (
                    <Maximize2 className="h-4 w-4" />
                ) : (
                    <Minimize2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                    {density === "compact" ? "Compact" : "Normal"}
                </span>
            </Button>
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
