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
import { Clock, TrendingUp, TrendingDown } from "lucide-react";

interface TempsMoyenVenteData {
  id: string;
  nom: string;
  categorie: string;
  tempsMoyenJours: number;
  nombreVentes: number;
  tempsMinimum: number;
  tempsMaximum: number;
  tendance: "up" | "down" | "stable";
  saisonalite: "haute" | "moyenne" | "basse";
  performance: "excellent" | "bon" | "moyen" | "lent";
}

interface TempsMoyenVenteTableProps {
  data?: TempsMoyenVenteData[];
  loading?: boolean;
  className?: string;
}

export function TempsMoyenVenteTable({
  data = [],
  loading = false,
  className,
}: TempsMoyenVenteTableProps) {
  const formatJours = (jours: number) => {
    if (jours < 1) {
      return `${(jours * 24).toFixed(0)}h`;
    } else if (jours < 7) {
      return `${jours.toFixed(1)} jour${jours > 1 ? "s" : ""}`;
    } else if (jours < 30) {
      const semaines = (jours / 7).toFixed(1);
      return `${semaines} sem.`;
    } else {
      const mois = (jours / 30).toFixed(1);
      return `${mois} mois`;
    }
  };

  const getPerformanceBadge = (
    performance: "excellent" | "bon" | "moyen" | "lent",
  ) => {
    const variants = {
      excellent: "default",
      bon: "secondary",
      moyen: "outline",
      lent: "destructive",
    } as const;

    const labels = {
      excellent: "Excellent",
      bon: "Bon",
      moyen: "Moyen",
      lent: "Lent",
    };

    return <Badge variant={variants[performance]}>{labels[performance]}</Badge>;
  };

  const getSaisonaliteBadge = (saisonalite: "haute" | "moyenne" | "basse") => {
    const variants = {
      haute: "default",
      moyenne: "secondary",
      basse: "outline",
    } as const;

    const labels = {
      haute: "Haute",
      moyenne: "Moyenne",
      basse: "Basse",
    };

    return <Badge variant={variants[saisonalite]}>{labels[saisonalite]}</Badge>;
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />;
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

  const sortedData = [...data].sort(
    (a, b) => a.tempsMoyenJours - b.tempsMoyenJours,
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Temps Moyen de Vente</CardTitle>
            <CardDescription>
              Analyse de la vitesse d'écoulement par produit
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée de temps de vente disponible
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Temps moyen</TableHead>
                <TableHead className="text-right">Min - Max</TableHead>
                <TableHead className="text-right">Ventes</TableHead>
                <TableHead className="text-center">Performance</TableHead>
                <TableHead className="text-center">Saisonnalité</TableHead>
                <TableHead className="text-center">Tendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nom}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.categorie}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className="font-semibold">
                      {formatJours(item.tempsMoyenJours)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatJours(item.tempsMinimum)} -{" "}
                    {formatJours(item.tempsMaximum)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{item.nombreVentes}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {getPerformanceBadge(item.performance)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getSaisonaliteBadge(item.saisonalite)}
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

export default TempsMoyenVenteTable;
