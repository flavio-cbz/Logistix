"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ValidationItem {
  id: string;
  title: string;
  description: string;
  category: "obligatoire" | "recommande" | "optionnel";
  status: "pending" | "approved" | "rejected" | "warning";
  checked: boolean;
  notes?: string;
}

interface ManualValidationChecklistProps {
  items?: ValidationItem[];
  onValidate?: (
    itemId: string,
    status: "approved" | "rejected" | "warning",
    notes?: string,
  ) => void;
  onSubmit?: (results: ValidationItem[]) => void;
  className?: string;
}

const defaultItems: ValidationItem[] = [
  {
    id: "1",
    title: "Vérification des photos produit",
    description:
      "Toutes les photos sont de bonne qualité et représentent fidèlement le produit",
    category: "obligatoire",
    status: "pending",
    checked: false,
  },
  {
    id: "2",
    title: "Description produit complète",
    description:
      "La description contient toutes les informations nécessaires (état, taille, marque, etc.)",
    category: "obligatoire",
    status: "pending",
    checked: false,
  },
  {
    id: "3",
    title: "Prix cohérent avec le marché",
    description:
      "Le prix est aligné avec les produits similaires sur la plateforme",
    category: "recommande",
    status: "pending",
    checked: false,
  },
  {
    id: "4",
    title: "Authentification de la marque",
    description: "La marque du produit a été vérifiée et est authentique",
    category: "obligatoire",
    status: "pending",
    checked: false,
  },
  {
    id: "5",
    title: "État du produit vérifié",
    description: "L'état décrit correspond à l'état réel du produit",
    category: "obligatoire",
    status: "pending",
    checked: false,
  },
  {
    id: "6",
    title: "Mots-clés optimisés",
    description:
      "Les mots-clés dans le titre et la description sont optimisés pour la recherche",
    category: "recommande",
    status: "pending",
    checked: false,
  },
  {
    id: "7",
    title: "Emballage adapté",
    description: "L'emballage prévu est adapté au produit pour l'expédition",
    category: "recommande",
    status: "pending",
    checked: false,
  },
  {
    id: "8",
    title: "Respect des conditions de vente",
    description: "Le produit respecte les conditions de vente de la plateforme",
    category: "obligatoire",
    status: "pending",
    checked: false,
  },
];

export function ManualValidationChecklist({
  items = defaultItems,
  onValidate,
  onSubmit,
  className,
}: ManualValidationChecklistProps) {
  const [validationItems, setValidationItems] =
    useState<ValidationItem[]>(items);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const getCategoryBadge = (
    category: "obligatoire" | "recommande" | "optionnel",
  ) => {
    const variants = {
      obligatoire: "destructive",
      recommande: "default",
      optionnel: "secondary",
    } as const;

    const labels = {
      obligatoire: "Obligatoire",
      recommande: "Recommandé",
      optionnel: "Optionnel",
    };

    return <Badge variant={variants[category]}>{labels[category]}</Badge>;
  };

  const getStatusIcon = (
    status: "pending" | "approved" | "rejected" | "warning",
  ) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const handleItemCheck = (itemId: string, checked: boolean) => {
    setValidationItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, checked, status: checked ? "approved" : "pending" }
          : item,
      ),
    );
  };

  const handleValidation = (
    itemId: string,
    status: "approved" | "rejected" | "warning",
  ) => {
    const updatedItems = validationItems.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status,
            notes: selectedItem === itemId ? notes : item.notes || "",
          }
        : item,
    );

    setValidationItems(updatedItems);
    onValidate?.(itemId, status, selectedItem === itemId ? notes : "");
    setSelectedItem(null);
    setNotes("");
  };

  const handleSubmit = () => {
    onSubmit?.(validationItems);
  };

  const getCompletionStats = () => {
    const total = validationItems.length;
    const approved = validationItems.filter(
      (item) => item.status === "approved",
    ).length;
    const rejected = validationItems.filter(
      (item) => item.status === "rejected",
    ).length;
    const warnings = validationItems.filter(
      (item) => item.status === "warning",
    ).length;
    const pending = total - approved - rejected - warnings;

    return { total, approved, rejected, warnings, pending };
  };

  const stats = getCompletionStats();
  const isComplete = stats.pending === 0;
  const hasObligatoireRejected = validationItems.some(
    (item) => item.category === "obligatoire" && item.status === "rejected",
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Validation Manuelle</CardTitle>
            <CardDescription>
              Checklist de vérification avant publication
            </CardDescription>
          </div>
        </div>

        {/* Statistiques */}
        <div className="flex space-x-4 pt-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">{stats.approved} validés</span>
          </div>
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm">{stats.rejected} rejetés</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">{stats.warnings} avertissements</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{stats.pending} en attente</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {validationItems.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={(checked) =>
                      handleItemCheck(item.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={item.id}
                    className="font-medium cursor-pointer"
                  >
                    {item.title}
                  </Label>
                  {getCategoryBadge(item.category)}
                  {getStatusIcon(item.status)}
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {item.description}
                </p>
                {item.notes && (
                  <div className="ml-6 p-2 bg-muted rounded text-sm">
                    <strong>Notes:</strong> {item.notes}
                  </div>
                )}
              </div>
            </div>

            {selectedItem === item.id && (
              <div className="ml-6 space-y-3 border-t pt-3">
                <div>
                  <Label htmlFor={`notes-${item.id}`}>Notes (optionnel)</Label>
                  <Textarea
                    id={`notes-${item.id}`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ajoutez des notes sur cette vérification..."
                    rows={2}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleValidation(item.id, "approved")}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleValidation(item.id, "warning")}
                  >
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Avertissement
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleValidation(item.id, "rejected")}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeter
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedItem(null);
                      setNotes("");
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {selectedItem !== item.id && item.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                className="ml-6"
                onClick={() => {
                  setSelectedItem(item.id);
                  setNotes(item.notes || "");
                }}
              >
                Valider cet élément
              </Button>
            )}
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isComplete
                ? hasObligatoireRejected
                  ? "❌ Validation incomplète : des éléments obligatoires sont rejetés"
                  : "✅ Validation terminée"
                : `${stats.pending} élément(s) restant(s) à vérifier`}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || hasObligatoireRejected}
            >
              Finaliser la validation
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ManualValidationChecklist;
