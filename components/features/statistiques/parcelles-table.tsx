"use client";

import { useState, useEffect } from "react";
import { MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

interface ColisStat {
  id: string;
  nom: string;
  surface: number;
  utilisation: number; // Pourcentage d'utilisation
  revenus: number;
  couts: number;
  benefice: number;
  rendementParM2: number;
  tendance: "up" | "down" | "stable";
  statut: "active" | "inactive" | "maintenance";
  derniereMaj: string;
}

interface ColisTableProps {
  data?: ColisStat[];
  colis?: any[]; // Support legacy prop
  loading?: boolean;
  className?: string;
}

export function ColisTable({
  data,
  colis = [],
  loading = false,
  className,
}: ColisTableProps) {
  const [sortedData, setSortedData] = useState<ColisStat[]>([]);

  // Use colis if provided, otherwise use data
  const inputData = colis && colis.length > 0 ? colis : (data || []);

  useEffect(() => {
    // Trier par bénéfice décroissant par défaut
    const sorted = [...inputData].sort(
      (a, b) => (b.benefice || 0) - (a.benefice || 0),
    );
    setSortedData(sorted);
  }, [inputData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "maintenance":
        return <Badge variant="secondary">Maintenance</Badge>;
      case "inactive":
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  const getTendanceIcon = (tendance: string) => {
    switch (tendance) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Performance des Colis</CardTitle>
            <CardDescription>
              Analyse de la rentabilité et utilisation de l'espace
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée de parcelle disponible
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcelle</TableHead>
                <TableHead className="text-right">Surface</TableHead>
                <TableHead className="text-right">Utilisation</TableHead>
                <TableHead className="text-right">Revenus</TableHead>
                <TableHead className="text-right">Coûts</TableHead>
                <TableHead className="text-right">Bénéfice</TableHead>
                <TableHead className="text-right">€/m²</TableHead>
                <TableHead className="text-center">Tendance</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-center">Dernière MAJ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((parcelle) => (
                <TableRow key={parcelle.id}>
                  <TableCell className="font-medium">{parcelle.nom}</TableCell>
                  <TableCell className="text-right">
                    {parcelle.surface?.toFixed(1)} m²
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        parcelle.utilisation >= 80 ? "default" : "outline"
                      }
                    >
                      {parcelle.utilisation?.toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-600">
                    {formatCurrency(parcelle.revenus || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {formatCurrency(parcelle.couts || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(parcelle.benefice || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(parcelle.rendementParM2 || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getTendanceIcon(parcelle.tendance)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatutBadge(parcelle.statut)}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {parcelle.derniereMaj
                      ? formatDate(parcelle.derniereMaj)
                      : "-"}
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

export default ColisTable;
