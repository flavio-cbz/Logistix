
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { CreateProductFormData } from "@/lib/schemas/product";
import { ImageUpload } from "@/components/ui/image-upload";

const cleanSubcategoryText = (text: string) => {
    if (!text) return "";
    // Remove "net weight:..." and other common raw junk if predictable
    // Simple heuristic: if it looks like a crude copy paste, try to take the first meaningful part
    // For now, let's just trim and remove potential JSON brackets if any
    let cleaned = text.trim();
    if (cleaned.startsWith('["') && cleaned.endsWith('"]')) {
        try {
            cleaned = JSON.parse(cleaned)[0];
        } catch (_e) {
            // Parsing failed - use original text as fallback
        }
    }
    // Remove common prefixes
    cleaned = cleaned.replace(/^category:/i, "").replace(/^catégorie:/i, "").trim();
    return cleaned;
};

interface BasicInfoSectionProps {
    form: UseFormReturn<CreateProductFormData>;
    isSubmitting: boolean;
}

export function BasicInfoSection({ form, isSubmitting }: BasicInfoSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Informations de base</h3>
                <Separator className="flex-1" />
            </div>

            {/* Nom */}
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            Nom du produit <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                            <Input
                                placeholder="ex: Robe Zara taille S"
                                {...field}
                                className="h-10"
                                autoComplete="off"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Marque et Catégorie */}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Marque</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="ex: Zara"
                                    {...field}
                                    value={field.value ?? ""}
                                    className="h-10"
                                    autoComplete="off"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Catégorie</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="ex: Vêtements"
                                    {...field}
                                    value={field.value ?? ""}
                                    className="h-10"
                                    autoComplete="off"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Sous-catégorie */}
            <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center justify-between">
                            <FormLabel>Sous-catégorie (optionnel)</FormLabel>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => {
                                    const current = field.value;
                                    if (current) {
                                        field.onChange(cleanSubcategoryText(current));
                                    }
                                }}
                            >
                                <Eraser className="w-3 h-3 mr-1" />
                                Nettoyer
                            </Button>
                        </div>
                        <FormControl>
                            <Textarea
                                placeholder="ex: Robes"
                                {...field}
                                value={field.value ?? ""}
                                className="min-h-[80px] resize-none"
                                autoComplete="off"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Photo du produit */}
            <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Photo du produit</FormLabel>
                        <FormControl>
                            <ImageUpload
                                value={field.value}
                                onChange={(url) => field.onChange(url)}
                                disabled={isSubmitting}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}
