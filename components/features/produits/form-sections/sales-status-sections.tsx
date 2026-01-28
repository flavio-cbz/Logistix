<<<<<<< HEAD

import {
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
import { Separator } from "@/components/ui/separator";
import { UseFormReturn } from "react-hook-form";
import { CreateProductFormData } from "@/lib/schemas/product";

interface StatusSectionProps {
    form: UseFormReturn<CreateProductFormData>;
}

export function StatusSection({ form }: StatusSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Statut du produit</h3>
                <Separator className="flex-1" />
            </div>

            <FormField
                control={form.control}
                name="vendu"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Statut</FormLabel>
                        <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Sélectionner le statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                            Disponible
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="1">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            Vendu
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}

import { Input } from "@/components/ui/input";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { PLATFORM_OPTIONS } from "@/lib/shared/constants";

interface SalesInfoSectionProps {
    form: UseFormReturn<CreateProductFormData>;
}

export function SalesInfoSection({ form }: SalesInfoSectionProps) {
    const { getCurrencySymbol } = useFormatting();

    return (
        <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                Informations de vente
            </h3>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="listedAt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date de mise en ligne</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    value={field.value ?? ""}
                                    className="h-10"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="soldAt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date de vente</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    value={field.value ?? ""}
                                    className="h-10"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Prix de vente et Plateforme */}
            <div className="grid grid-cols-2 gap-4">
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
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(e) =>
                                            field.onChange(
                                                e.target.value === ""
                                                    ? undefined
                                                    : Number(e.target.value)
                                            )
                                        }
                                        placeholder="25.00"
                                        className="h-10 pr-8"
                                        min="0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        {getCurrencySymbol()}
                                    </span>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="plateforme"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Plateforme</FormLabel>
                            <FormControl>
                                <Select
                                    onValueChange={(v) =>
                                        field.onChange(v === "" ? undefined : v)
                                    }
                                    value={field.value || ""}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Choisir" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PLATFORM_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}
=======

import {
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
import { Separator } from "@/components/ui/separator";
import { UseFormReturn } from "react-hook-form";
import { CreateProductFormData } from "@/lib/schemas/product";

interface StatusSectionProps {
    form: UseFormReturn<CreateProductFormData>;
}

export function StatusSection({ form }: StatusSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Statut du produit</h3>
                <Separator className="flex-1" />
            </div>

            <FormField
                control={form.control}
                name="vendu"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Statut</FormLabel>
                        <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Sélectionner le statut" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                            Disponible
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="1">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            Vendu
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}

import { Input } from "@/components/ui/input";
import { useFormatting } from "@/lib/hooks/use-formatting";
import { PLATFORM_OPTIONS } from "@/lib/shared/constants";

interface SalesInfoSectionProps {
    form: UseFormReturn<CreateProductFormData>;
}

export function SalesInfoSection({ form }: SalesInfoSectionProps) {
    const { getCurrencySymbol } = useFormatting();

    return (
        <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                Informations de vente
            </h3>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="listedAt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date de mise en ligne</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    value={field.value ?? ""}
                                    className="h-10"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="soldAt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date de vente</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    value={field.value ?? ""}
                                    className="h-10"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Prix de vente et Plateforme */}
            <div className="grid grid-cols-2 gap-4">
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
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(e) =>
                                            field.onChange(
                                                e.target.value === ""
                                                    ? undefined
                                                    : Number(e.target.value)
                                            )
                                        }
                                        placeholder="25.00"
                                        className="h-10 pr-8"
                                        min="0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        {getCurrencySymbol()}
                                    </span>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="plateforme"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Plateforme</FormLabel>
                            <FormControl>
                                <Select
                                    onValueChange={(v) =>
                                        field.onChange(v === "" ? undefined : v)
                                    }
                                    value={field.value || ""}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Choisir" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PLATFORM_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
