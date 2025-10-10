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
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface PlateformeData {
  id: string;
  nom: string;
  logo?: string;
  totalVentes: number;
  chiffreAffaires: number;
  commission: number;
  beneficeNet: number;
  roi: number;
  tempsVenteMoyen: number; // en jours
  tauxReussite: number; // pourcentage
  tendance: "up" | "down" | "stable";
  popularite: "haute" | "moyenne" | "basse";
  recommandee: boolean;
}

interface PlateformesRentabiliteTableProps {
  data?: PlateformeData[];
  loading?: boolean;
  className?: string;
}

export function PlateformesRentabiliteTable({
  data = [],
  loading = false,
  className,
}: PlateformesRentabiliteTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatJours = (jours: number) => {
    if (jours < 1) {
      return `${(jours * 24).toFixed(0)}h`;
    } else if (jours < 7) {
      return `${jours.toFixed(1)}j`;
    } else {
      const semaines = (jours / 7).toFixed(1);
      return `${semaines}sem`;
    }
  };

  const getROIBadge = (roi: number) => {
    if (roi >= 30) return "default";
    if (roi >= 15) return "secondary";
    if (roi >= 0) return "outline";
    return "destructive";
  };

  const getPopulariteBadge = (popularite: "haute" | "moyenne" | "basse") => {
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

    return <Badge variant={variants[popularite]}>{labels[popularite]}</Badge>;
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

  const getRecommandationBadge = (recommandee: boolean) => {
    return recommandee ? (
      <Badge
        variant="default"
        className="bg-green-100 text-green-800 border-green-200"
      >
        ⭐ Recommandée
      </Badge>
    ) : null;
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
          <DollarSign className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Rentabilité par Plateforme</CardTitle>
            <CardDescription>
              Comparaison des performances de vente par marketplace
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée de plateforme disponible
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plateforme</TableHead>
                <TableHead className="text-right">Ventes</TableHead>
                <TableHead className="text-right">CA</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Bénéfice net</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">Temps vente</TableHead>
                <TableHead className="text-right">Taux réussite</TableHead>
                <TableHead className="text-center">Popularité</TableHead>
                <TableHead className="text-center">Tendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((plateforme) => (
                <TableRow key={plateforme.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      {plateforme.logo && (
                        <img
                          src={plateforme.logo}
                          alt={plateforme.nom}
                          className="w-6 h-6 rounded"
                        />
                      )}
                      <div>
                        <div>{plateforme.nom}</div>
                        {getRecommandationBadge(plateforme.recommandee)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{plateforme.totalVentes}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(plateforme.chiffreAffaires)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    -{formatCurrency(plateforme.commission)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(plateforme.beneficeNet)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getROIBadge(plateforme.roi)}>
                      {formatPercentage(plateforme.roi)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatJours(plateforme.tempsVenteMoyen)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        plateforme.tauxReussite >= 80 ? "default" : "outline"
                      }
                    >
                      {formatPercentage(plateforme.tauxReussite)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {getPopulariteBadge(plateforme.popularite)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getTrendIcon(plateforme.tendance)}
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

export default PlateformesRentabiliteTable;
