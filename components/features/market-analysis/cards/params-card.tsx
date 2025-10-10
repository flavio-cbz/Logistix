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
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import type { MarketAnalysisRequest } from "@/types/vinted-market-analysis";

interface ParamsCardProps {
  form: UseFormReturn<MarketAnalysisRequest>;
  isLoading?: boolean;
}

export function ParamsCard({ form, isLoading = false }: ParamsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Paramètres Avancés</CardTitle>
            <CardDescription>Configuration de l'analyse</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="maxProducts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre maximum de produits</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="10"
                  max="1000"
                  placeholder="100"
                  disabled={isLoading}
                  value={field.value || ""}
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

        <FormField
          control={form.control}
          name="itemStates"
          render={({ field }) => (
            <FormItem>
              <FormLabel>États des produits</FormLabel>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="state-new"
                    checked={field.value?.includes(1) || false}
                    onCheckedChange={(checked) => {
                      const current = field.value || [];
                      if (checked) {
                        field.onChange([...current.filter((s) => s !== 1), 1]);
                      } else {
                        field.onChange(current.filter((s) => s !== 1));
                      }
                    }}
                    disabled={isLoading}
                  />
                  <label htmlFor="state-new" className="text-sm">
                    Neuf avec étiquettes
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="state-very-good"
                    checked={field.value?.includes(2) || false}
                    onCheckedChange={(checked) => {
                      const current = field.value || [];
                      if (checked) {
                        field.onChange([...current.filter((s) => s !== 2), 2]);
                      } else {
                        field.onChange(current.filter((s) => s !== 2));
                      }
                    }}
                    disabled={isLoading}
                  />
                  <label htmlFor="state-very-good" className="text-sm">
                    Très bon état
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="state-good"
                    checked={field.value?.includes(3) || false}
                    onCheckedChange={(checked) => {
                      const current = field.value || [];
                      if (checked) {
                        field.onChange([...current.filter((s) => s !== 3), 3]);
                      } else {
                        field.onChange(current.filter((s) => s !== 3));
                      }
                    }}
                    disabled={isLoading}
                  />
                  <label htmlFor="state-good" className="text-sm">
                    Bon état
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="state-satisfying"
                    checked={field.value?.includes(4) || false}
                    onCheckedChange={(checked) => {
                      const current = field.value || [];
                      if (checked) {
                        field.onChange([...current.filter((s) => s !== 4), 4]);
                      } else {
                        field.onChange(current.filter((s) => s !== 4));
                      }
                    }}
                    disabled={isLoading}
                  />
                  <label htmlFor="state-satisfying" className="text-sm">
                    État satisfaisant
                  </label>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Paramètres d'analyse</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>• Analyse des tendances</div>
            <div>• Comparaison concurrentielle</div>
            <div>• Prédictions de prix</div>
            <div>• Recommandations IA</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ParamsCard;
