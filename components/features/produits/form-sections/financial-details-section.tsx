
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { UseFormReturn } from "react-hook-form";
import { CreateProductFormData } from "@/lib/schemas/product";
import { ProductMetricsDisplay } from "../product-metrics-display";
import { ParcelleSelect } from "../parcelle-select";
import { useFormatting } from "@/lib/hooks/use-formatting";
import type { Parcelle } from "@/lib/shared/types/entities";

interface FinancialDetailsSectionProps {
    form: UseFormReturn<CreateProductFormData>;
    metrics: import("@/lib/utils/product-calculations").ProductMetrics;
    hasMetrics: boolean;
    showProfitMetrics: boolean;
    parcelles: Parcelle[] | undefined;
    handleRefreshParcelles: () => Promise<void>;
    isFetchingParcelles: boolean;
}

export function FinancialDetailsSection({
    form,
    metrics,
    hasMetrics,
    showProfitMetrics,
    parcelles,
    handleRefreshParcelles,
    isFetchingParcelles,
}: FinancialDetailsSectionProps) {
    const { formatWeight, getCurrencySymbol } = useFormatting();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">
                    Détails financiers & logistiques
                </h3>
                <Separator className="flex-1" />
            </div>

            {/* Prix et Poids */}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Prix d'achat <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) =>
                                            field.onChange(
                                                e.target.value === ""
                                                    ? undefined
                                                    : Number(e.target.value)
                                            )
                                        }
                                        placeholder="12.50"
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
                    name="poids"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Poids <span className="text-destructive">*</span>
                            </FormLabel>
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
                                        placeholder="500"
                                        className="h-10 pr-8"
                                        min="0.01"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        g
                                    </span>
                                </div>
                            </FormControl>
                            <FormMessage />
                            {field.value && field.value > 0 && (
                                <FormDescription>
                                    {formatWeight(field.value)}
                                </FormDescription>
                            )}
                        </FormItem>
                    )}
                />
            </div>

            {/* Parcelle */}
            <FormField
                control={form.control}
                name="parcelleId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            Parcelle <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                            <ParcelleSelect
                                value={field.value}
                                onChange={field.onChange}
                                parcelles={parcelles}
                                onRefresh={handleRefreshParcelles}
                                isRefreshing={isFetchingParcelles}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Métriques financières */}
            {hasMetrics && (
                <div className="p-4 rounded-lg border bg-muted/30">
                    <ProductMetricsDisplay
                        metrics={metrics}
                        showProfit={showProfitMetrics}
                    />
                </div>
            )}
        </div>
    );
}
