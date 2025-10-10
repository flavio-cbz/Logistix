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
import { CalendarIcon, TrendingUp, TrendingDown } from "lucide-react";

interface TendanceSaisonniere {
  id: string;
  periode: {
    nom: string;
    debut: string; // Format ISO date
    fin: string;
    type: "trimestre" | "mois" | "saison" | "fete";
  };
  produits: {
    category: string;
    evolution: number; // pourcentage d'évolution
    volumeVentes: number;
    chiffreAffaires: number;
  }[];
  tendanceGlobale: {
    direction: "hausse" | "baisse" | "stable";
    force: "faible" | "moyenne" | "forte";
    pourcentage: number;
  };
  facteurs: {
    meteo?: string;
    evenements?: string[];
    promotions?: boolean;
    stock?: "optimal" | "excessif" | "limite";
  };
  recommandations: string[];
}

interface TendancesSaisonnieresTableProps {
  data?: TendanceSaisonniere[];
  loading?: boolean;
  className?: string;
  annee?: number;
}

export function TendancesSaisonnieresTable({
  data = [],
  loading = false,
  className,
  annee = new Date().getFullYear(),
}: TendancesSaisonnieresTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("fr-FR", {
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  };

  const getPeriodeTypeIcon = (type: string) => {
    switch (type) {
      case "saison":
        return "🌸";
      case "fete":
        return "🎉";
      case "trimestre":
        return "📅";
      default:
        return "📊";
    }
  };

  const getTendanceBadge = (
    direction: "hausse" | "baisse" | "stable",
    force: "faible" | "moyenne" | "forte",
  ) => {
    const directionColors = {
      hausse: "bg-green-100 text-green-800 border-green-200",
      baisse: "bg-red-100 text-red-800 border-red-200",
      stable: "bg-blue-100 text-blue-800 border-blue-200",
    };

    const forceLabels = {
      faible: "Légère",
      moyenne: "Modérée",
      forte: "Forte",
    };

    return (
      <Badge className={directionColors[direction]}>
        {forceLabels[force]} {direction}
      </Badge>
    );
  };

  const getTendanceIcon = (direction: "hausse" | "baisse" | "stable") => {
    switch (direction) {
      case "hausse":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "baisse":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 border-2 border-current rounded-full" />;
    }
  };

  const getStockBadge = (stock: "optimal" | "excessif" | "limite") => {
    const variants = {
      optimal: "default",
      excessif: "secondary",
      limite: "destructive",
    } as const;

    const labels = {
      optimal: "Optimal",
      excessif: "Excessif",
      limite: "Limite",
    };

    return <Badge variant={variants[stock]}>{labels[stock]}</Badge>;
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
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Tendances Saisonnières</CardTitle>
            <CardDescription>
              Analyse des variations saisonnières pour {annee}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée saisonnière disponible</p>
            <p className="text-sm">
              Les tendances apparaîtront avec plus d'historique
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead className="text-center">Tendance</TableHead>
                <TableHead className="text-right">Volume ventes</TableHead>
                <TableHead className="text-right">CA moyen</TableHead>
                <TableHead className="text-center">Catégories phares</TableHead>
                <TableHead className="text-center">Facteurs</TableHead>
                <TableHead className="text-center">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tendance) => (
                <TableRow key={tendance.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {getPeriodeTypeIcon(tendance.periode.type)}
                      </span>
                      <div>
                        <div className="font-medium">
                          {tendance.periode.nom}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(tendance.periode.debut)} -{" "}
                          {formatDate(tendance.periode.fin)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {getTendanceIcon(tendance.tendanceGlobale.direction)}
                      <div className="text-center">
                        {getTendanceBadge(
                          tendance.tendanceGlobale.direction,
                          tendance.tendanceGlobale.force,
                        )}
                        <div className="text-xs font-mono mt-1">
                          {tendance.tendanceGlobale.pourcentage > 0 ? "+" : ""}
                          {tendance.tendanceGlobale.pourcentage}%
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-center">
                      <div className="font-mono font-semibold">
                        {tendance.produits.reduce(
                          (sum, p) => sum + p.volumeVentes,
                          0,
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tendance.produits.length} catégories
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      tendance.produits.reduce(
                        (sum, p) => sum + p.chiffreAffaires,
                        0,
                      ) / tendance.produits.length,
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      {tendance.produits
                        .sort((a, b) => b.evolution - a.evolution)
                        .slice(0, 2)
                        .map((produit, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="truncate">{produit.category}</span>
                            <Badge
                              variant={
                                produit.evolution > 0 ? "default" : "outline"
                              }
                              className="ml-2 text-xs"
                            >
                              {produit.evolution > 0 ? "+" : ""}
                              {produit.evolution}%
                            </Badge>
                          </div>
                        ))}
                      {tendance.produits.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{tendance.produits.length - 2} autres
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1 text-xs">
                      {tendance.facteurs.meteo && (
                        <div className="flex items-center justify-center space-x-1">
                          <span>🌤️</span>
                          <span>{tendance.facteurs.meteo}</span>
                        </div>
                      )}
                      {tendance.facteurs.evenements &&
                        tendance.facteurs.evenements.length > 0 && (
                          <div className="flex items-center justify-center space-x-1">
                            <span>🎯</span>
                            <span>{tendance.facteurs.evenements[0]}</span>
                          </div>
                        )}
                      {tendance.facteurs.promotions && (
                        <div className="flex items-center justify-center space-x-1">
                          <span>💰</span>
                          <span>Promos actives</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {tendance.facteurs.stock &&
                      getStockBadge(tendance.facteurs.stock)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Recommandations globales */}
        {data.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center space-x-2">
              <span>💡</span>
              <span>Recommandations Saisonnières</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {data
                .flatMap((t) => t.recommandations)
                .slice(0, 4)
                .map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TendancesSaisonnieresTable;
