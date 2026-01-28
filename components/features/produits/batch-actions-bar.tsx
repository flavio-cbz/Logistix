"use client";

import { useProductBatchActions } from "@/lib/hooks/use-product-batch-actions";
import { useParcelles } from "@/lib/hooks/use-parcelles";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
    Trash2,
    Archive,
    Copy,
    Sparkles,
    MoreHorizontal,
    Package,
    CheckCircle,
    XCircle,
    Loader2
} from "lucide-react";
import { ProductStatus } from "@/lib/shared/types/entities";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface BatchActionsBarProps {
    selectedIds: Set<string>;
    onClearSelection: () => void;
    onSuccess?: () => void;
}

export function BatchActionsBar({ selectedIds, onClearSelection, onSuccess }: BatchActionsBarProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const { data: parcelles } = useParcelles();

    const {
        isLoading,
        deleteSelection,
        archiveSelection,
        duplicateSelection,
        enrichSelection,
        updateStatus,
        assignParcel
    } = useProductBatchActions({
        selectedIds,
        clearSelection: onClearSelection,
        onSuccess
    });

    if (selectedIds.size === 0) return null;

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 pr-4 bg-background/80 backdrop-blur-md shadow-2xl rounded-full border animate-in slide-in-from-bottom-4 duration-300">
                <span className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                    {selectedIds.size}
                </span>

                <div className="flex-1" />

                {/* Quick Actions */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateSelection()}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
                    Dupliquer
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enrichSelection()}
                    disabled={isLoading}
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Enrichir (IA)
                </Button>

                {/* More Actions Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isLoading}>
                            <MoreHorizontal className="h-4 w-4 mr-2" />
                            Actions
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Actions en lot</DropdownMenuLabel>

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Changer statut
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => updateStatus(ProductStatus.AVAILABLE)}>
                                    En stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(ProductStatus.DRAFT)}>
                                    Brouillon
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(ProductStatus.SOLD)}>
                                    Vendu
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Package className="h-4 w-4 mr-2" />
                                Assigner parcelle
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                                <DropdownMenuItem onClick={() => assignParcel(null)}>
                                    <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                                    Aucune (retirer)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {parcelles?.map(p => (
                                    <DropdownMenuItem key={p.id} onClick={() => assignParcel(p.id)}>
                                        {p.superbuyId} {p.name ? `(${p.name})` : ''}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => archiveSelection()}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archiver
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear selection */}
                <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={isLoading}>
                    <XCircle className="h-4 w-4" />
                </Button>
            </div>

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={deleteSelection}
                title={`Supprimer ${selectedIds.size} produit${selectedIds.size > 1 ? 's' : ''}`}
                description="Cette action est irréversible. Les produits seront supprimés définitivement."
            />
        </>
    );
}
