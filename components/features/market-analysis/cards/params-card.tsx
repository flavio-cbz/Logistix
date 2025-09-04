// import React from "react"; // inutile en React 18+
import type { UseFormReturn } from "react-hook-form";
import type { MarketAnalysisRequest } from '@/types/vinted-market-analysis';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ParamsCardProps {
  form: UseFormReturn<MarketAnalysisRequest>;
  isLoading?: boolean;
}

export default function ParamsCard({ form, isLoading = false }: ParamsCardProps) {
  return (
    <Card role="region" aria-label="Paramètres avancés">
      <CardHeader>
        <CardTitle>Paramètres</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="maxProducts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de produits à analyser</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={field.value ?? 100}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isNaN(v)) {
                      field.onChange(undefined);
                      return;
                    }
                    field.onChange(Math.max(1, Math.min(500, Math.trunc(v))));
                  }}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>Définissez combien d'annonces seront incluses (défaut : 100)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}