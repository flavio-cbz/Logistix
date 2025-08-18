"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "components/ui/use-toast";

const checklistItems = [
  { id: "access-interface", label: "Accès à l'interface d'analyse de marché" },
  { id: "start-analysis", label: "Lancement d'une nouvelle analyse" },
  { id: "check-results", label: "Consultation des résultats" },
  { id: "test-features", label: "Test des fonctionnalités annexes" },
];

export function ManualValidationChecklist() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleCheckboxChange = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allChecked = checklistItems.every((item) => checkedItems[item.id]);

  const handleConfirmValidation = async () => {
    if (allChecked) {
      try {
        const response = await fetch("/api/v1/validation/market-analysis/confirm", {
          method: "POST",
        });

        if (response.ok) {
          toast({
            title: "Validation confirmée",
            description: "La validation manuelle a été enregistrée avec succès.",
          });
        } else {
          throw new Error("Échec de la confirmation de la validation");
        }
      } catch (error) {
        console.error("Erreur lors de la confirmation:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer la confirmation de la validation.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Validation incomplète",
        description: "Veuillez cocher tous les éléments de la checklist avant de confirmer.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de Validation Manuelle</CardTitle>
        <CardDescription>
          Suivez ces étapes et cochez chaque point pour valider l'intégration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklistItems.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox
              id={item.id}
              checked={checkedItems[item.id] || false}
              onCheckedChange={() => handleCheckboxChange(item.id)}
            />
            <Label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {item.label}
            </Label>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button onClick={handleConfirmValidation} disabled={!allChecked}>
          Confirmer la validation
        </Button>
      </CardFooter>
    </Card>
  );
}