"use client";

import { useState, useEffect } from "react";
import { Package2, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

interface ProduitStat {
  id: string;
  nom: string;
  totalVendu: number;
  chiffreAffaires: number;
  benefice: number;
  roi: number;
  tendance: "up" | "down" | "stable";
  derniereMaj: string;
}

interface ProduitsTableProps {
  data?: ProduitStat[];
  produits?: any[]; // Support legacy prop
  loading?: boolean;
  className?: string;
}

export function ProduitsTable({
  data = [],
  produits = [],
  loading = false,
  className,
}: ProduitsTableProps) {
  const [sortedData, setSortedData] = useState<ProduitStat[]>([]);

  // Use produits if provided, otherwise use data
  const inputData = produits.length > 0 ? produits : data;

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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBadgeVariant = (roi: number) => {
    if (roi >= 20) return "default";
    if (roi >= 10) return "secondary";
    if (roi >= 0) return "outline";
    return "destructive";
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
          <Package2 className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Performance des Produits</CardTitle>
            <CardDescription>
              Analyse des ventes et rentabilité par produit
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée de vente disponible
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Unités vendues</TableHead>
                <TableHead className="text-right">CA</TableHead>
                <TableHead className="text-right">Bénéfice</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-center">Tendance</TableHead>
                <TableHead>Dernière MAJ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((produit) => (
                <TableRow key={produit.id}>
                  <TableCell className="font-medium">{produit.nom}</TableCell>
                  <TableCell className="text-right">
                    {produit.totalVendu}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(produit.chiffreAffaires)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(produit.benefice)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getBadgeVariant(produit.roi)}>
                      {formatPercentage(produit.roi)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {getTrendIcon(produit.tendance)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(produit.derniereMaj).toLocaleDateString("fr-FR")}
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

export default ProduitsTable;
