"use client";

import { UseFormReturn } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Package2 } from "lucide-react";
import type { MarketAnalysisRequest } from "@/types/vinted-market-analysis";

interface ProductInfoCardProps {
  form: UseFormReturn<MarketAnalysisRequest>;
  isLoading?: boolean;
}

export function ProductInfoCard({
  form,
  isLoading = false,
}: ProductInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Package2 className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Informations Produit</CardTitle>
            <CardDescription>Définissez le produit à analyser</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="productName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du produit</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Nike Air Max 90"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catégorie</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Chaussures de sport"
                  disabled={isLoading}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brandId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID Marque (optionnel)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Ex: 123"
                  disabled={isLoading}
                  value={field.value?.toString() || ""}
                  onChange={(e) => {
                    const value = e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined;
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

export default ProductInfoCard;
