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
import { Checkbox } from "@/components/ui/checkbox";

interface FiltersCardProps {
  form: UseFormReturn<MarketAnalysisRequest>;
  isLoading?: boolean;
}

export default function FiltersCard({ form, isLoading = false }: FiltersCardProps) {
  const itemStateOptions = [
    { id: 1, label: "Vendus" },
    { id: 2, label: "En vente" },
  ];

  const toggleState = (stateId: number) => {
    const current = form.getValues("itemStates") || [];
    const exists = current.includes(stateId);
    const next = exists ? current.filter((s) => s !== stateId) : [...current, stateId];
    form.setValue("itemStates", next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Card role="region" aria-label="Filtres">
      <CardHeader>
        <CardTitle>Filtres</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={"dateFrom" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date (début)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isLoading} />
                </FormControl>
                <FormDescription>Début de la période d'analyse</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"dateTo" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date (fin)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isLoading} />
                </FormControl>
                <FormDescription>Fin de la période d'analyse</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={"minPrice" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prix min (€)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"maxPrice" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prix max (€)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <FormLabel className="mb-2">État des articles</FormLabel>
          <div className="flex flex-col gap-2">
            {itemStateOptions.map((opt) => {
              const selected = (form.getValues("itemStates") || []).includes(opt.id);
              return (
                <label key={opt.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleState(opt.id)}
                    disabled={isLoading}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}