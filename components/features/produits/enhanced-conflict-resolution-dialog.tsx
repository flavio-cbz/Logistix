<<<<<<< HEAD
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    AlertTriangle,
    CheckCircle,
    Edit2,
    ExternalLink,
    Sparkles,
    Combine,
    Keyboard,
    Image as ImageIcon,
    ArrowLeft,
    ArrowRight,
    Check,
    X,
} from "lucide-react";
import { Product, EnrichmentCandidate } from "@/lib/shared/types/entities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useResolveConflict } from "@/lib/hooks/use-resolve-conflict";

interface EnhancedConflictResolutionDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResolved?: () => void;
}

interface MergedData {
    name: string;
    brand: string;
    category: string;
    description: string;
    url: string;
}

export function EnhancedConflictResolutionDialog({
    product,
    open,
    onOpenChange,
    onResolved,
}: EnhancedConflictResolutionDialogProps) {
    const resolveConflictMutation = useResolveConflict();
    const [activeTab, setActiveTab] = React.useState("candidates");
    const [selectedCandidateIndex, setSelectedCandidateIndex] = React.useState(0);
    const [mergedData, setMergedData] = React.useState<MergedData>({
        name: "",
        brand: "",
        category: "",
        description: "",
        url: "",
    });

    const enrichmentData = product?.enrichmentData as {
        candidates?: EnrichmentCandidate[];
        confidence?: number;
    } | null;

    const candidates = React.useMemo(() => enrichmentData?.candidates || [], [enrichmentData]);
    const selectedCandidate = candidates[selectedCandidateIndex];

    // Initialize merged data when product changes
    React.useEffect(() => {
        if (product) {
            setMergedData({
                name: product.name || "",
                brand: product.brand || "",
                category: product.category || "",
                description: product.description || "",
                url: "",
            });
        }
    }, [product]);

    const handleSelectCandidate = React.useCallback(async (candidate: EnrichmentCandidate) => {
        if (!product) return;

        resolveConflictMutation.mutate(
            {
                productId: product.id,
                candidateId: candidate.id,
                name: candidate.name,
                brand: candidate.brand,
                category: candidate.category,
                url: candidate.url,
                description: candidate.description,
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    onResolved?.();
                },
            }
        );
    }, [product, resolveConflictMutation, onOpenChange, onResolved]);

    const handleSkip = React.useCallback(async () => {
        if (!product) return;

        resolveConflictMutation.mutate(
            {
                productId: product.id,
                skip: true,
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    onResolved?.();
                },
            }
        );
    }, [product, resolveConflictMutation, onOpenChange, onResolved]);

    const handleMergeSubmit = React.useCallback(async () => {
        if (!product || !mergedData.name.trim()) return;

        resolveConflictMutation.mutate(
            {
                productId: product.id,
                candidateId: "merged",
                ...mergedData,
                name: mergedData.name.trim(),
                brand: mergedData.brand.trim() || undefined,
                category: mergedData.category.trim() || undefined,
                description: mergedData.description.trim() || undefined,
            },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    onResolved?.();
                },
            }
        );
    }, [product, mergedData, resolveConflictMutation, onOpenChange, onResolved]);

    // Keyboard shortcuts
    React.useEffect(() => {
        if (open) {
            const handleKeyDown = (e: KeyboardEvent) => {
                // Don't handle shortcuts when typing in inputs
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                    return;
                }

                switch (e.key) {
                    case "ArrowLeft":
                        e.preventDefault();
                        setSelectedCandidateIndex((i) => Math.max(0, i - 1));
                        break;
                    case "ArrowRight":
                        e.preventDefault();
                        setSelectedCandidateIndex((i) => Math.min(candidates.length - 1, i + 1));
                        break;
                    case "1":
                    case "2":
                    case "3":
                    case "4":
                    case "5":
                        e.preventDefault();
                        const idx = parseInt(e.key) - 1;
                        if (idx < candidates.length) {
                            setSelectedCandidateIndex(idx);
                        }
                        break;
                    case "Enter":
                        if (!e.shiftKey && selectedCandidate) {
                            e.preventDefault();
                            handleSelectCandidate(selectedCandidate);
                        }
                        break;
                    case "Escape":
                        e.preventDefault();
                        onOpenChange(false);
                        break;
                    case "s":
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            handleSkip();
                        }
                        break;
                    case "m":
                        e.preventDefault();
                        setActiveTab("merge");
                        break;
                }
            };

            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
        return undefined;
    }, [open, candidates, selectedCandidate, selectedCandidateIndex, onOpenChange, handleSelectCandidate, handleSkip]);

    // Apply field from candidate to merged data
    const applyField = (field: keyof MergedData, value: string | undefined) => {
        if (value) {
            setMergedData((prev) => ({ ...prev, [field]: value }));
            toast.success(`${field} mis à jour`);
        }
    };

    // Reset state when dialog opens
    React.useEffect(() => {
        if (open) {
            setActiveTab("candidates");
            setSelectedCandidateIndex(0);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        Résolution de conflit d'identification
                    </DialogTitle>
                    <DialogDescription className="flex items-center justify-between">
                        <span>
                            L'IA a trouvé {candidates.length} correspondance{candidates.length > 1 ? "s" : ""} possible{candidates.length > 1 ? "s" : ""}.
                        </span>
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Keyboard className="h-3 w-3" />
                            ← → 1-5 Enter M
                        </Badge>
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="candidates" className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Suggestions ({candidates.length})
                        </TabsTrigger>
                        <TabsTrigger value="compare" className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Comparer
                        </TabsTrigger>
                        <TabsTrigger value="merge" className="flex items-center gap-2">
                            <Combine className="h-4 w-4" />
                            Fusionner
                        </TabsTrigger>
                    </TabsList>

                    {/* Candidates Tab */}
                    <TabsContent value="candidates" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-3">
                                {candidates.map((candidate, idx) => (
                                    <div
                                        key={candidate.id}
                                        className={cn(
                                            "flex items-center gap-3 p-4 border rounded-lg transition-colors cursor-pointer",
                                            selectedCandidateIndex === idx
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "hover:bg-muted/50"
                                        )}
                                        onClick={() => setSelectedCandidateIndex(idx)}
                                    >
                                        {/* Thumbnail */}
                                        {candidate.imageUrl && (
                                            <div className="w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0">
                                                <img
                                                    src={candidate.imageUrl}
                                                    alt={candidate.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {idx + 1}
                                                </Badge>
                                                <p className="font-medium truncate">{candidate.name}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {candidate.brand && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {candidate.brand}
                                                    </Badge>
                                                )}
                                                {candidate.category && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {candidate.category}
                                                    </Badge>
                                                )}
                                                <Badge
                                                    variant={candidate.confidence > 0.7 ? "default" : "secondary"}
                                                    className="text-xs"
                                                >
                                                    {Math.round(candidate.confidence * 100)}%
                                                </Badge>
                                            </div>
                                            {candidate.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {candidate.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {candidate.url && (
                                                <a
                                                    href={candidate.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectCandidate(candidate);
                                                }}
                                                disabled={resolveConflictMutation.isPending}
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {/* Manual option */}
                                <div
                                    className="flex items-center justify-between p-4 border rounded-lg border-dashed hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => setActiveTab("merge")}
                                >
                                    <div className="flex items-center gap-2">
                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Saisir manuellement ou fusionner</span>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        <Combine className="h-4 w-4 mr-2" />
                                        Fusionner
                                    </Button>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* Compare Tab - Side by Side */}
                    <TabsContent value="compare" className="flex-1 overflow-hidden mt-4">
                        <div className="grid grid-cols-2 gap-4 h-[400px]">
                            {/* Product Image */}
                            <div className="flex flex-col">
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Badge variant="secondary">Votre produit</Badge>
                                </h4>
                                <div className="flex-1 border rounded-lg overflow-hidden bg-muted/20">
                                    {product?.photoUrl ? (
                                        <img
                                            src={product.photoUrl}
                                            alt={product.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <ImageIcon className="h-12 w-12" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 space-y-1 text-sm">
                                    <p className="font-medium truncate">{product?.name}</p>
                                    {product?.brand && (
                                        <Badge variant="outline" className="text-xs">
                                            {product.brand}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Candidate Image */}
                            <div className="flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Badge>Suggestion {selectedCandidateIndex + 1}/{candidates.length}</Badge>
                                    </h4>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => setSelectedCandidateIndex((i) => Math.max(0, i - 1))}
                                            disabled={selectedCandidateIndex === 0}
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => setSelectedCandidateIndex((i) => Math.min(candidates.length - 1, i + 1))}
                                            disabled={selectedCandidateIndex === candidates.length - 1}
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 border rounded-lg overflow-hidden bg-muted/20">
                                    {selectedCandidate?.imageUrl ? (
                                        <img
                                            src={selectedCandidate.imageUrl}
                                            alt={selectedCandidate.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <ImageIcon className="h-12 w-12" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 space-y-1 text-sm">
                                    <p className="font-medium truncate">{selectedCandidate?.name}</p>
                                    <div className="flex gap-2">
                                        {selectedCandidate?.brand && (
                                            <Badge variant="outline" className="text-xs">
                                                {selectedCandidate.brand}
                                            </Badge>
                                        )}
                                        <Badge variant={selectedCandidate?.confidence && selectedCandidate.confidence > 0.7 ? "default" : "secondary"} className="text-xs">
                                            {selectedCandidate ? Math.round(selectedCandidate.confidence * 100) : 0}%
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div className="flex justify-center gap-4 mt-4">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleSkip}
                                disabled={resolveConflictMutation.isPending}
                            >
                                <X className="h-5 w-5 mr-2" />
                                Ignorer
                            </Button>
                            <Button
                                size="lg"
                                onClick={() => selectedCandidate && handleSelectCandidate(selectedCandidate)}
                                disabled={resolveConflictMutation.isPending || !selectedCandidate}
                            >
                                <Check className="h-5 w-5 mr-2" />
                                Accepter cette suggestion
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Merge Tab */}
                    <TabsContent value="merge" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Cliquez sur les valeurs suggérées pour les appliquer, ou saisissez manuellement.
                                </p>

                                {/* Name */}
                                <div className="space-y-2">
                                    <Label>Nom du produit *</Label>
                                    <Input
                                        value={mergedData.name}
                                        onChange={(e) => setMergedData((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="Nom du produit"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {product?.name && (
                                            <Badge
                                                variant="outline"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("name", product.name)}
                                            >
                                                {product.name.slice(0, 30)}...
                                            </Badge>
                                        )}
                                        {candidates.map((c, idx) => c.name && (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("name", c.name)}
                                            >
                                                {idx + 1}: {c.name.slice(0, 25)}...
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Brand */}
                                <div className="space-y-2">
                                    <Label>Marque</Label>
                                    <Input
                                        value={mergedData.brand}
                                        onChange={(e) => setMergedData((prev) => ({ ...prev, brand: e.target.value }))}
                                        placeholder="Marque"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {product?.brand && (
                                            <Badge
                                                variant="outline"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("brand", product.brand || "")}
                                            >
                                                {product.brand}
                                            </Badge>
                                        )}
                                        {candidates.map((c, idx) => c.brand && (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("brand", c.brand)}
                                            >
                                                {idx + 1}: {c.brand}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <Label>Catégorie</Label>
                                    <Input
                                        value={mergedData.category}
                                        onChange={(e) => setMergedData((prev) => ({ ...prev, category: e.target.value }))}
                                        placeholder="Catégorie"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {product?.category && (
                                            <Badge
                                                variant="outline"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("category", product.category || "")}
                                            >
                                                {product.category}
                                            </Badge>
                                        )}
                                        {candidates.map((c, idx) => c.category && (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("category", c.category)}
                                            >
                                                {idx + 1}: {c.category}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input
                                        value={mergedData.description}
                                        onChange={(e) => setMergedData((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Description"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {candidates.filter(c => c.description).slice(0, 3).map((c, idx) => (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground max-w-[200px] truncate"
                                                onClick={() => applyField("description", c.description)}
                                            >
                                                {idx + 1}: {c.description?.slice(0, 40)}...
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <Button
                                    className="w-full"
                                    onClick={handleMergeSubmit}
                                    disabled={resolveConflictMutation.isPending || !mergedData.name.trim()}
                                >
                                    <Combine className="h-4 w-4 mr-2" />
                                    Appliquer les données fusionnées
                                </Button>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                    <Button variant="ghost" onClick={handleSkip} disabled={resolveConflictMutation.isPending}>
                        Ignorer (Ctrl+S)
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={resolveConflictMutation.isPending}>
                        Fermer (Esc)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
=======
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    AlertTriangle,
    CheckCircle,
    Edit2,
    ExternalLink,
    Sparkles,
    Combine,
    Keyboard,
    Image as ImageIcon,
    ArrowLeft,
    ArrowRight,
    Check,
    X,
} from "lucide-react";
import { Product, EnrichmentCandidate } from "@/lib/shared/types/entities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EnhancedConflictResolutionDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onResolved?: () => void;
}

interface MergedData {
    name: string;
    brand: string;
    category: string;
    description: string;
    url: string;
}

export function EnhancedConflictResolutionDialog({
    product,
    open,
    onOpenChange,
    onResolved,
}: EnhancedConflictResolutionDialogProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState("candidates");
    const [selectedCandidateIndex, setSelectedCandidateIndex] = React.useState(0);
    const [mergedData, setMergedData] = React.useState<MergedData>({
        name: "",
        brand: "",
        category: "",
        description: "",
        url: "",
    });

    const enrichmentData = product?.enrichmentData as {
        candidates?: EnrichmentCandidate[];
        confidence?: number;
    } | null;

    const candidates = enrichmentData?.candidates || [];
    const selectedCandidate = candidates[selectedCandidateIndex];

    // Initialize merged data when product changes
    React.useEffect(() => {
        if (product) {
            setMergedData({
                name: product.name || "",
                brand: product.brand || "",
                category: product.category || "",
                description: product.description || "",
                url: "",
            });
        }
    }, [product]);

    // Keyboard shortcuts
    React.useEffect(() => {
        if (open) {
            const handleKeyDown = (e: KeyboardEvent) => {
                // Don't handle shortcuts when typing in inputs
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                    return;
                }

                switch (e.key) {
                    case "ArrowLeft":
                        e.preventDefault();
                        setSelectedCandidateIndex((i) => Math.max(0, i - 1));
                        break;
                    case "ArrowRight":
                        e.preventDefault();
                        setSelectedCandidateIndex((i) => Math.min(candidates.length - 1, i + 1));
                        break;
                    case "1":
                    case "2":
                    case "3":
                    case "4":
                    case "5":
                        e.preventDefault();
                        const idx = parseInt(e.key) - 1;
                        if (idx < candidates.length) {
                            setSelectedCandidateIndex(idx);
                        }
                        break;
                    case "Enter":
                        if (!e.shiftKey && selectedCandidate) {
                            e.preventDefault();
                            handleSelectCandidate(selectedCandidate);
                        }
                        break;
                    case "Escape":
                        e.preventDefault();
                        onOpenChange(false);
                        break;
                    case "s":
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            handleSkip();
                        }
                        break;
                    case "m":
                        e.preventDefault();
                        setActiveTab("merge");
                        break;
                }
            };

            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
        return undefined;
    }, [open, candidates, selectedCandidate, selectedCandidateIndex, onOpenChange]);

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

    const handleMergeSubmit = async () => {
        if (!product || !mergedData.name.trim()) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/v1/produits/${product.id}/resolve-conflict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidateId: "merged",
                    ...mergedData,
                    name: mergedData.name.trim(),
                    brand: mergedData.brand.trim() || undefined,
                    category: mergedData.category.trim() || undefined,
                    description: mergedData.description.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success("✓ Données fusionnées", {
                    description: "Le produit a été mis à jour avec les informations combinées",
                });
                onOpenChange(false);
                onResolved?.();
            } else {
                throw new Error(data.error?.message || "Échec de la fusion");
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
                body: JSON.stringify({ skip: true }),
            });

            const data = await response.json();

            if (data.success) {
                toast.info("Conflit ignoré");
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

    // Apply field from candidate to merged data
    const applyField = (field: keyof MergedData, value: string | undefined) => {
        if (value) {
            setMergedData((prev) => ({ ...prev, [field]: value }));
            toast.success(`${field} mis à jour`);
        }
    };

    // Reset state when dialog opens
    React.useEffect(() => {
        if (open) {
            setActiveTab("candidates");
            setSelectedCandidateIndex(0);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        Résolution de conflit d'identification
                    </DialogTitle>
                    <DialogDescription className="flex items-center justify-between">
                        <span>
                            L'IA a trouvé {candidates.length} correspondance{candidates.length > 1 ? "s" : ""} possible{candidates.length > 1 ? "s" : ""}.
                        </span>
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Keyboard className="h-3 w-3" />
                            ← → 1-5 Enter M
                        </Badge>
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="candidates" className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Suggestions ({candidates.length})
                        </TabsTrigger>
                        <TabsTrigger value="compare" className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Comparer
                        </TabsTrigger>
                        <TabsTrigger value="merge" className="flex items-center gap-2">
                            <Combine className="h-4 w-4" />
                            Fusionner
                        </TabsTrigger>
                    </TabsList>

                    {/* Candidates Tab */}
                    <TabsContent value="candidates" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-3">
                                {candidates.map((candidate, idx) => (
                                    <div
                                        key={candidate.id}
                                        className={cn(
                                            "flex items-center gap-3 p-4 border rounded-lg transition-colors cursor-pointer",
                                            selectedCandidateIndex === idx
                                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                : "hover:bg-muted/50"
                                        )}
                                        onClick={() => setSelectedCandidateIndex(idx)}
                                    >
                                        {/* Thumbnail */}
                                        {candidate.imageUrl && (
                                            <div className="w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0">
                                                <img
                                                    src={candidate.imageUrl}
                                                    alt={candidate.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {idx + 1}
                                                </Badge>
                                                <p className="font-medium truncate">{candidate.name}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {candidate.brand && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {candidate.brand}
                                                    </Badge>
                                                )}
                                                {candidate.category && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {candidate.category}
                                                    </Badge>
                                                )}
                                                <Badge
                                                    variant={candidate.confidence > 0.7 ? "default" : "secondary"}
                                                    className="text-xs"
                                                >
                                                    {Math.round(candidate.confidence * 100)}%
                                                </Badge>
                                            </div>
                                            {candidate.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {candidate.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {candidate.url && (
                                                <a
                                                    href={candidate.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectCandidate(candidate);
                                                }}
                                                disabled={isSubmitting}
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {/* Manual option */}
                                <div
                                    className="flex items-center justify-between p-4 border rounded-lg border-dashed hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => setActiveTab("merge")}
                                >
                                    <div className="flex items-center gap-2">
                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Saisir manuellement ou fusionner</span>
                                    </div>
                                    <Button variant="outline" size="sm">
                                        <Combine className="h-4 w-4 mr-2" />
                                        Fusionner
                                    </Button>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* Compare Tab - Side by Side */}
                    <TabsContent value="compare" className="flex-1 overflow-hidden mt-4">
                        <div className="grid grid-cols-2 gap-4 h-[400px]">
                            {/* Product Image */}
                            <div className="flex flex-col">
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Badge variant="secondary">Votre produit</Badge>
                                </h4>
                                <div className="flex-1 border rounded-lg overflow-hidden bg-muted/20">
                                    {product?.photoUrl ? (
                                        <img
                                            src={product.photoUrl}
                                            alt={product.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <ImageIcon className="h-12 w-12" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 space-y-1 text-sm">
                                    <p className="font-medium truncate">{product?.name}</p>
                                    {product?.brand && (
                                        <Badge variant="outline" className="text-xs">
                                            {product.brand}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Candidate Image */}
                            <div className="flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Badge>Suggestion {selectedCandidateIndex + 1}/{candidates.length}</Badge>
                                    </h4>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => setSelectedCandidateIndex((i) => Math.max(0, i - 1))}
                                            disabled={selectedCandidateIndex === 0}
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={() => setSelectedCandidateIndex((i) => Math.min(candidates.length - 1, i + 1))}
                                            disabled={selectedCandidateIndex === candidates.length - 1}
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 border rounded-lg overflow-hidden bg-muted/20">
                                    {selectedCandidate?.imageUrl ? (
                                        <img
                                            src={selectedCandidate.imageUrl}
                                            alt={selectedCandidate.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <ImageIcon className="h-12 w-12" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 space-y-1 text-sm">
                                    <p className="font-medium truncate">{selectedCandidate?.name}</p>
                                    <div className="flex gap-2">
                                        {selectedCandidate?.brand && (
                                            <Badge variant="outline" className="text-xs">
                                                {selectedCandidate.brand}
                                            </Badge>
                                        )}
                                        <Badge variant={selectedCandidate?.confidence && selectedCandidate.confidence > 0.7 ? "default" : "secondary"} className="text-xs">
                                            {selectedCandidate ? Math.round(selectedCandidate.confidence * 100) : 0}%
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div className="flex justify-center gap-4 mt-4">
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleSkip}
                                disabled={isSubmitting}
                            >
                                <X className="h-5 w-5 mr-2" />
                                Ignorer
                            </Button>
                            <Button
                                size="lg"
                                onClick={() => selectedCandidate && handleSelectCandidate(selectedCandidate)}
                                disabled={isSubmitting || !selectedCandidate}
                            >
                                <Check className="h-5 w-5 mr-2" />
                                Accepter cette suggestion
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Merge Tab */}
                    <TabsContent value="merge" className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground mb-4">
                                    Cliquez sur les valeurs suggérées pour les appliquer, ou saisissez manuellement.
                                </p>

                                {/* Name */}
                                <div className="space-y-2">
                                    <Label>Nom du produit *</Label>
                                    <Input
                                        value={mergedData.name}
                                        onChange={(e) => setMergedData((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="Nom du produit"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {product?.name && (
                                            <Badge
                                                variant="outline"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("name", product.name)}
                                            >
                                                {product.name.slice(0, 30)}...
                                            </Badge>
                                        )}
                                        {candidates.map((c, idx) => c.name && (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("name", c.name)}
                                            >
                                                {idx + 1}: {c.name.slice(0, 25)}...
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Brand */}
                                <div className="space-y-2">
                                    <Label>Marque</Label>
                                    <Input
                                        value={mergedData.brand}
                                        onChange={(e) => setMergedData((prev) => ({ ...prev, brand: e.target.value }))}
                                        placeholder="Marque"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {product?.brand && (
                                            <Badge
                                                variant="outline"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("brand", product.brand || "")}
                                            >
                                                {product.brand}
                                            </Badge>
                                        )}
                                        {candidates.map((c, idx) => c.brand && (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("brand", c.brand)}
                                            >
                                                {idx + 1}: {c.brand}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <Label>Catégorie</Label>
                                    <Input
                                        value={mergedData.category}
                                        onChange={(e) => setMergedData((prev) => ({ ...prev, category: e.target.value }))}
                                        placeholder="Catégorie"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {product?.category && (
                                            <Badge
                                                variant="outline"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("category", product.category || "")}
                                            >
                                                {product.category}
                                            </Badge>
                                        )}
                                        {candidates.map((c, idx) => c.category && (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                onClick={() => applyField("category", c.category)}
                                            >
                                                {idx + 1}: {c.category}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input
                                        value={mergedData.description}
                                        onChange={(e) => setMergedData((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Description"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {candidates.filter(c => c.description).slice(0, 3).map((c, idx) => (
                                            <Badge
                                                key={idx}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground max-w-[200px] truncate"
                                                onClick={() => applyField("description", c.description)}
                                            >
                                                {idx + 1}: {c.description?.slice(0, 40)}...
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <Button
                                    className="w-full"
                                    onClick={handleMergeSubmit}
                                    disabled={isSubmitting || !mergedData.name.trim()}
                                >
                                    <Combine className="h-4 w-4 mr-2" />
                                    Appliquer les données fusionnées
                                </Button>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                    <Button variant="ghost" onClick={handleSkip} disabled={isSubmitting}>
                        Ignorer (Ctrl+S)
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Fermer (Esc)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
