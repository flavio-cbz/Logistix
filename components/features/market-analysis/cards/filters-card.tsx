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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import type { MarketAnalysisRequest } from "@/types/vinted-market-analysis";

// Données Vinted simplifiées pour le prototype
const VINTED_CATALOGS = [
  { id: 1, name: "Vêtements femme" },
  { id: 2, name: "Vêtements homme" },
  { id: 3, name: "Vêtements enfant" },
  { id: 4, name: "Chaussures" },
  { id: 5, name: "Accessoires" },
] as const;

interface FiltersCardProps {
  form: UseFormReturn<MarketAnalysisRequest>;
  isLoading?: boolean;
}

export function FiltersCard({ form, isLoading = false }: FiltersCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Filtres d'Analyse</CardTitle>
            <CardDescription>Affinez les critères de recherche</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="catalogId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catalogue ID</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={(value) => field.onChange(parseInt(value, 10))}
                value={field.value?.toString() || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un catalogue" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VINTED_CATALOGS.map((catalog) => (
                    <SelectItem key={catalog.id} value={catalog.id.toString()}>
                      {catalog.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de catégorie (optionnel)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Sneakers"
                  disabled={isLoading}
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e.target.value || undefined);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxProducts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre maximum de produits</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="100"
                  disabled={isLoading}
                  value={field.value?.toString() || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseInt(value, 10) : undefined);
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

export default FiltersCard;
