"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, Copy, Check, Save } from "lucide-react";
import { Product } from "@/lib/shared/types/entities";
import { toast } from "sonner";
import { useUpdateProduct } from "@/lib/hooks/use-products";
import { cn } from "@/lib/utils";

interface GenerateDescriptionButtonProps {
    product: Product;
    variant?: "default" | "ghost" | "outline" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    showLabel?: boolean;
}

export function GenerateDescriptionButton({
    product,
    variant = "ghost",
    size = "sm",
    className,
    showLabel = true,
}: GenerateDescriptionButtonProps) {
    const [open, setOpen] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [generatedData, setGeneratedData] = React.useState<{
        description: string;
        hashtags: string[];
    } | null>(null);
    const [copied, setCopied] = React.useState(false);
    const updateProduct = useUpdateProduct();

    const handleGenerate = React.useCallback(async () => {
        setIsGenerating(true);
        setGeneratedData(null);

        try {
            const response = await fetch(`/api/v1/produits/${product.id}/generate-description`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Échec de la génération");
            }

            const data = await response.json();
            setGeneratedData({
                description: data.data.description,
                hashtags: data.data.hashtags || [],
            });
        } catch (error) {
            toast.error("Erreur", {
                description: error instanceof Error ? error.message : "Impossible de générer la description",
            });
            setOpen(false);
        } finally {
            setIsGenerating(false);
        }
    }, [product.id]);

    const handleCopy = React.useCallback(() => {
        if (!generatedData) return;

        const fullText = [
            generatedData.description,
            "",
            generatedData.hashtags.map((h) => `#${h}`).join(" "),
        ].join("\n");

        navigator.clipboard.writeText(fullText);
        setCopied(true);
        toast.success("Copié !", { description: "Description copiée dans le presse-papier" });
        setTimeout(() => setCopied(false), 2000);
    }, [generatedData]);

    const handleSave = React.useCallback(() => {
        if (!generatedData) return;

        updateProduct.mutate(
            { id: product.id, data: { description: generatedData.description } },
            {
                onSuccess: () => {
                    toast.success("Sauvegardé !", { description: "Description enregistrée sur le produit" });
                    setOpen(false);
                },
                onError: (error) => {
                    toast.error("Erreur", { description: error.message });
                },
            }
        );
    }, [generatedData, product.id, updateProduct]);

    // Trigger generation when dialog opens
    React.useEffect(() => {
        if (open && !generatedData && !isGenerating) {
            handleGenerate();
        }
    }, [open, generatedData, isGenerating, handleGenerate]);

    // Reset when dialog closes
    React.useEffect(() => {
        if (!open) {
            setGeneratedData(null);
            setCopied(false);
        }
    }, [open]);

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={cn("gap-1", className)}
                onClick={() => setOpen(true)}
            >
                <Sparkles className="h-4 w-4" />
                {showLabel && <span>Générer description</span>}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            Description générée par IA
                        </DialogTitle>
                        <DialogDescription>
                            Description pour &quot;{product.name}&quot;
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                <p className="text-sm text-muted-foreground">Génération en cours...</p>
                            </div>
                        ) : generatedData ? (
                            <>
                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <div className="p-4 bg-muted/50 rounded-lg border">
                                        <p className="text-sm whitespace-pre-wrap">{generatedData.description}</p>
                                    </div>
                                </div>

                                {/* Hashtags */}
                                {generatedData.hashtags.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Hashtags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {generatedData.hashtags.map((hashtag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium"
                                                >
                                                    #{hashtag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        {generatedData && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Régénérer
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCopy}
                                    className={cn(copied && "bg-green-100 dark:bg-green-900/30")}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4 text-green-600" />
                                            Copié
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copier
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={updateProduct.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {updateProduct.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Sauvegarder
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
