<<<<<<< HEAD
"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Banknote, CheckCircle } from "lucide-react";
import { Product, Platform, ProductStatus } from "@/lib/shared/types/entities";
import { toast } from "sonner";
import { useUpdateProduct } from "@/lib/hooks/use-products";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { cn } from "@/lib/utils";
import { PLATFORM_OPTIONS } from "@/lib/shared/constants";

interface QuickSaleDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const quickSaleSchema = z.object({
    sellingPrice: z.coerce.number().min(0.01, "Le prix de vente est requis"),
    soldAt: z.string().min(1, "La date est requise"),
    platform: z.nativeEnum(Platform),
});

type QuickSaleFormValues = z.infer<typeof quickSaleSchema>;

export function QuickSaleDialog({
    product,
    open,
    onOpenChange,
    onSuccess,
}: QuickSaleDialogProps) {
    const { getCurrencySymbol, formatCurrency } = useFormatting();
    const updateProduct = useUpdateProduct();
    const [showSuccess, setShowSuccess] = useState(false);

    const form = useForm<QuickSaleFormValues>({
        resolver: zodResolver(quickSaleSchema),
        defaultValues: {
            sellingPrice: 0,
            soldAt: new Date().toISOString().split("T")[0],
            platform: Platform.LEBONCOIN,
        },
    });

    // Reset form when dialog opens
    useEffect(() => {
        if (open && product) {
            // Safe access to potential extra fields in enrichmentData
            const enrichmentData = product.enrichmentData as unknown as { suggestedPrice?: number } | null;
            const suggestedPrice = product.sellingPrice || (enrichmentData?.suggestedPrice || 0);

            form.reset({
                sellingPrice: suggestedPrice,
                soldAt: new Date().toISOString().split("T")[0],
                platform: (product.plateforme as Platform) || Platform.LEBONCOIN,
            });
            setShowSuccess(false);
        }
    }, [open, product, form]);

    const onSubmit = async (data: QuickSaleFormValues) => {
        if (!product) return;

        const updateData: Partial<Product> = {
            vendu: "1",
            sellingPrice: data.sellingPrice,
            soldAt: data.soldAt,
            listedAt: product.listedAt || data.soldAt,
            plateforme: data.platform,
            status: ProductStatus.SOLD,
        };

        updateProduct.mutate(
            { id: product.id, data: updateData },
            {
                onSuccess: () => {
                    setShowSuccess(true);
                    setTimeout(() => {
                        toast.success("💰 Vente enregistrée !", {
                            description: `${product.name} vendu à ${formatCurrency(data.sellingPrice)}`,
                        });
                        onOpenChange(false);
                        onSuccess?.();
                    }, 800);
                },
                onError: (error) => {
                    toast.error("Erreur", {
                        description: error.message,
                    });
                },
            }
        );
    };

    // Calculate estimated profit
    const sellingPrice = form.watch("sellingPrice");
    const estimatedProfit = useMemo(() => {
        if (!product || !sellingPrice) return null;
        const totalCost = (product.price || 0) + (product.coutLivraison || 0);
        return sellingPrice - totalCost;
    }, [product, sellingPrice]);


    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-green-600" />
                        Vente rapide
                    </DialogTitle>
                    <DialogDescription>
                        Félicitations pour la vente de {product.name} !
                    </DialogDescription>
                </DialogHeader>

                {showSuccess ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 animate-in zoom-in-50">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <p className="text-lg font-medium text-green-600">Vente enregistrée !</p>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {/* Product preview card */}
                            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg border border-dashed">
                                {product.photoUrl && (
                                    <div className="w-12 h-12 rounded-md overflow-hidden border flex-shrink-0">
                                        <img
                                            src={product.photoUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className="font-medium text-sm truncate">{product.name}</p>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                        <span>Achat: {formatCurrency(product.price || 0)}</span>
                                        {/* Show margin indicator if price entered */}
                                        {estimatedProfit !== null && (
                                            <span className={cn(
                                                "font-medium",
                                                estimatedProfit >= 0 ? "text-green-600" : "text-red-500"
                                            )}>
                                                • Marge: {formatCurrency(estimatedProfit)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {/* Selling Price */}
                                <FormField
                                    control={form.control}
                                    name="sellingPrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prix de vente</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        className="pl-8 text-lg font-semibold"
                                                        {...field}
                                                    />
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                        {getCurrencySymbol()}
                                                    </span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="soldAt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="platform"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Plateforme</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Choisir" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {PLATFORM_OPTIONS.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={updateProduct.isPending}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={updateProduct.isPending || !sellingPrice}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {updateProduct.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Confirmer la vente
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
=======
"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Banknote, CheckCircle, Percent } from "lucide-react";
import { Product, Platform } from "@/lib/shared/types/entities";
import { toast } from "sonner";
import { useUpdateProduct } from "@/lib/hooks/use-products";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { cn } from "@/lib/utils";
import { PLATFORM_OPTIONS } from "@/lib/shared/constants";

interface QuickSaleDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const quickSaleSchema = z.object({
    sellingPrice: z.coerce.number().min(0.01, "Le prix de vente est requis"),
    soldAt: z.string().min(1, "La date est requise"),
    platform: z.nativeEnum(Platform),
});

type QuickSaleFormValues = z.infer<typeof quickSaleSchema>;

export function QuickSaleDialog({
    product,
    open,
    onOpenChange,
    onSuccess,
}: QuickSaleDialogProps) {
    const { getCurrencySymbol, formatCurrency } = useFormatting();
    const updateProduct = useUpdateProduct();
    const [showSuccess, setShowSuccess] = useState(false);

    const form = useForm<QuickSaleFormValues>({
        resolver: zodResolver(quickSaleSchema),
        defaultValues: {
            sellingPrice: 0,
            soldAt: new Date().toISOString().split("T")[0],
            platform: Platform.LEBONCOIN,
        },
    });

    // Reset form when dialog opens
    useEffect(() => {
        if (open && product) {
            const suggestedPrice = product.sellingPrice || (product.enrichmentData as any)?.suggestedPrice || 0;
            form.reset({
                sellingPrice: suggestedPrice,
                soldAt: new Date().toISOString().split("T")[0],
                platform: (product.plateforme as Platform) || Platform.LEBONCOIN,
            });
            setShowSuccess(false);
        }
    }, [open, product, form]);

    const onSubmit = async (data: QuickSaleFormValues) => {
        if (!product) return;

        const updateData = {
            vendu: "1" as const,
            sellingPrice: data.sellingPrice,
            soldAt: data.soldAt,
            listedAt: product.listedAt || data.soldAt,
            plateforme: data.platform,
            status: ProductStatus.SOLD, // Using strict typing if available, or 'sold' if loose
        };

        updateProduct.mutate(
            { id: product.id, data: updateData as any },
            {
                onSuccess: () => {
                    setShowSuccess(true);
                    setTimeout(() => {
                        toast.success("💰 Vente enregistrée !", {
                            description: `${product.name} vendu à ${formatCurrency(data.sellingPrice)}`,
                        });
                        onOpenChange(false);
                        onSuccess?.();
                    }, 800);
                },
                onError: (error) => {
                    toast.error("Erreur", {
                        description: error.message,
                    });
                },
            }
        );
    };

    // Calculate estimated profit
    const sellingPrice = form.watch("sellingPrice");
    const estimatedProfit = useMemo(() => {
        if (!product || !sellingPrice) return null;
        const totalCost = (product.price || 0) + (product.coutLivraison || 0);
        return sellingPrice - totalCost;
    }, [product, sellingPrice]);

    // Calculate ROI
    const roi = useMemo(() => {
        if (!product || !sellingPrice || !estimatedProfit) return null;
        const totalCost = (product.price || 0) + (product.coutLivraison || 0);
        if (totalCost === 0) return 0;
        return (estimatedProfit / totalCost) * 100;
    }, [estimatedProfit, product]);

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-green-600" />
                        Vente rapide
                    </DialogTitle>
                    <DialogDescription>
                        Félicitations pour la vente de {product.name} !
                    </DialogDescription>
                </DialogHeader>

                {showSuccess ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 animate-in zoom-in-50">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <p className="text-lg font-medium text-green-600">Vente enregistrée !</p>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {/* Product preview card */}
                            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg border border-dashed">
                                {product.photoUrl && (
                                    <div className="w-12 h-12 rounded-md overflow-hidden border flex-shrink-0">
                                        <img
                                            src={product.photoUrl}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className="font-medium text-sm truncate">{product.name}</p>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                        <span>Achat: {formatCurrency(product.price || 0)}</span>
                                        {/* Show margin indicator if price entered */}
                                        {estimatedProfit !== null && (
                                            <span className={cn(
                                                "font-medium",
                                                estimatedProfit >= 0 ? "text-green-600" : "text-red-500"
                                            )}>
                                                • Marge: {formatCurrency(estimatedProfit)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {/* Selling Price */}
                                <FormField
                                    control={form.control}
                                    name="sellingPrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prix de vente</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        className="pl-8 text-lg font-semibold"
                                                        {...field}
                                                    />
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                        {getCurrencySymbol()}
                                                    </span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="soldAt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="platform"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Plateforme</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Choisir" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {PLATFORM_OPTIONS.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={updateProduct.isPending}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={updateProduct.isPending || !sellingPrice}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {updateProduct.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    Confirmer la vente
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
