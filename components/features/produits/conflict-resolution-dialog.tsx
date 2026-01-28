"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Edit2, ExternalLink, Sparkles } from "lucide-react";
import { Product, EnrichmentCandidate } from "@/lib/shared/types/entities";
import { toast } from "sonner";

interface ConflictResolutionDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResolved?: () => void;
}

export function ConflictResolutionDialog({
    product,
    open,
    onOpenChange,
    onResolved,
}: ConflictResolutionDialogProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [showManualInput, setShowManualInput] = React.useState(false);
    const [manualName, setManualName] = React.useState("");
    const [manualBrand, setManualBrand] = React.useState("");
    const [manualCategory, setManualCategory] = React.useState("");

    const enrichmentData = product?.enrichmentData as {
        candidates?: EnrichmentCandidate[];
        confidence?: number;
    } | null;

    const candidates = enrichmentData?.candidates || [];

    const handleSelectCandidate = async (candidate: EnrichmentCandidate) => {
        if (!product) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/v1/produits/${product.id}/resolve-conflict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateId: candidate.id,
                    name: candidate.name,
                    brand: candidate.brand,
                    category: candidate.category,
                    url: candidate.url,
                    description: candidate.description,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("✓ Conflit résolu", {
                    description: `Le produit a été identifié comme "${candidate.name}"`,
                });
                onOpenChange(false);
                onResolved?.();
            } else {
                throw new Error(data.error?.message || "Échec de la résolution");
            }
        } catch (error) {
            toast.error("Erreur", {
                description: error instanceof Error ? error.message : "Erreur inconnue",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!product || !manualName.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/v1/produits/${product.id}/resolve-conflict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateId: "manual",
                    name: manualName.trim(),
                    brand: manualBrand.trim() || undefined,
                    category: manualCategory.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("✓ Produit identifié manuellement", {
                    description: `Le produit a été nommé "${manualName.trim()}"`,
                });
                onOpenChange(false);
                onResolved?.();
            } else {
                throw new Error(data.error?.message || "Échec de la mise à jour");
            }
        } catch (error) {
            toast.error("Erreur", {
                description: error instanceof Error ? error.message : "Erreur inconnue",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = async () => {
        if (!product) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/v1/produits/${product.id}/resolve-conflict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    skip: true,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.info("Conflit ignoré", {
                    description: "Le produit restera avec son nom actuel.",
                });
                onOpenChange(false);
                onResolved?.();
            } else {
                throw new Error(data.error?.message || "Échec");
            }
        } catch (error) {
            toast.error("Erreur", {
                description: error instanceof Error ? error.message : "Erreur inconnue",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset state when dialog opens
    React.useEffect(() => {
        if (open) {
            setShowManualInput(false);
            setManualName("");
            setManualBrand("");
            setManualCategory("");
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        Résolution de conflit d'identification
                    </DialogTitle>
                    <DialogDescription>
                        L'IA n'a pas pu identifier ce produit avec certitude. Veuillez choisir la bonne identification ou entrer les informations manuellement.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    {/* Product Preview */}
                    <div className="flex gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                        {product?.photoUrl && (
                            <div className="w-24 h-24 rounded-lg overflow-hidden border flex-shrink-0">

                                <img
                                    src={product.photoUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    style={{ imageOrientation: 'from-image' }}
                                />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product?.name}</p>
                            <p className="text-sm text-muted-foreground">
                                Confiance IA: {Math.round((enrichmentData?.confidence || 0) * 100)}%
                            </p>
                            {product?.brand && (
                                <Badge variant="outline" className="mt-1">{product.brand}</Badge>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="h-[300px] pr-4">
                        {!showManualInput ? (
                            <div className="space-y-3">
                                {candidates.length > 0 && (
                                    <>
                                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            Suggestion de l'IA
                                        </p>

                                        {candidates.map((candidate) => (
                                            <div
                                                key={candidate.id}
                                                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{candidate.name}</p>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {candidate.brand && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {candidate.brand}
                                                            </Badge>
                                                        )}
                                                        {candidate.category && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {candidate.category}
                                                            </Badge>
                                                        )}
                                                        <Badge variant="outline" className="text-xs">
                                                            {Math.round(candidate.confidence * 100)}% confiance
                                                        </Badge>
                                                    </div>
                                                    {candidate.url && (
                                                        <a
                                                            href={candidate.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            Voir le produit
                                                        </a>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSelectCandidate(candidate)}
                                                    disabled={isSubmitting}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Choisir
                                                </Button>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Manual Input Option */}
                                <div
                                    className="flex items-center justify-between p-3 border rounded-lg border-dashed hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => setShowManualInput(true)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Entrer manuellement les informations</span>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        Modifier
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="manualName">Nom du produit *</Label>
                                    <Input
                                        id="manualName"
                                        value={manualName}
                                        onChange={(e) => setManualName(e.target.value)}
                                        placeholder="Ex: Nike Air Force 1 Low White"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manualBrand">Marque</Label>
                                    <Input
                                        id="manualBrand"
                                        value={manualBrand}
                                        onChange={(e) => setManualBrand(e.target.value)}
                                        placeholder="Ex: Nike"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="manualCategory">Catégorie</Label>
                                    <Input
                                        id="manualCategory"
                                        value={manualCategory}
                                        onChange={(e) => setManualCategory(e.target.value)}
                                        placeholder="Ex: Sneakers"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowManualInput(false)}
                                        disabled={isSubmitting}
                                    >
                                        Retour
                                    </Button>
                                    <Button
                                        onClick={handleManualSubmit}
                                        disabled={isSubmitting || !manualName.trim()}
                                    >
                                        Confirmer
                                    </Button>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                    <Button
                        variant="ghost"
                        onClick={handleSkip}
                        disabled={isSubmitting}
                    >
                        Ignorer
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
