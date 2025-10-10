"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Calculator } from "lucide-react";

interface ROIData {
  id: string;
  nom: string;
  investissement: number;
  retour: number;
  roi: number;
  roiPeriode: number; // ROI sur la période (mois)
  dureeRecuperationMois: number;
  tendance: "up" | "down" | "stable";
  statut: "profitable" | "breakeven" | "loss";
  categorie: "produit" | "parcelle" | "equipement" | "autre";
}

interface ROITableProps {
  data?: ROIData[];
  loading?: boolean;
  className?: string;
}

export function ROITable({
  data = [],
  loading = false,
  className,
}: ROITableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDuree = (mois: number) => {
    if (mois < 12) {
      return `${mois.toFixed(1)} mois`;
    } else {
      const annees = (mois / 12).toFixed(1);
      return `${annees} an${parseFloat(annees) > 1 ? "s" : ""}`;
    }
  };

  const getROIBadge = (roi: number) => {
    if (roi >= 20) return "default";
    if (roi >= 10) return "secondary";
    if (roi >= 0) return "outline";
    return "destructive";
  };

  const getStatutBadge = (statut: "profitable" | "breakeven" | "loss") => {
    switch (statut) {
      case "profitable":
        return <Badge variant="default">Profitable</Badge>;
      case "breakeven":
        return <Badge variant="secondary">Équilibre</Badge>;
      case "loss":
        return <Badge variant="destructive">Perte</Badge>;
    }
  };

  const getCategorieBadge = (
    categorie: "produit" | "parcelle" | "equipement" | "autre",
  ) => {
    const variants = {
      produit: "default",
      parcelle: "secondary",
      equipement: "outline",
      autre: "outline",
    } as const;

    return (
      <Badge variant={variants[categorie] || "outline"}>{categorie}</Badge>
    );
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => b.roi - a.roi);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Analyse ROI</CardTitle>
            <CardDescription>
              Retour sur investissement par catégorie d'actifs
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée ROI disponible
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Investissement</TableHead>
                <TableHead className="text-right">Retour</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">Récupération</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-center">Tendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nom}</TableCell>
                  <TableCell>{getCategorieBadge(item.categorie)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.investissement)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.retour)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getROIBadge(item.roi)}>
                      {formatPercentage(item.roi)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {item.dureeRecuperationMois > 0
                      ? formatDuree(item.dureeRecuperationMois)
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatutBadge(item.statut)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getTrendIcon(item.tendance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default ROITable;
