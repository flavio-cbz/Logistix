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
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, Target } from "lucide-react";

interface PrevisionVente {
  id: string;
  produit: {
    nom: string;
    category: string;
    prix: number;
    image?: string;
  };
  periode: {
    mois: string;
    annee: number;
    semaine?: number;
  };
  previsions: {
    quantiteEstimee: number;
    chiffreAffaireEstime: number;
    probabiliteVente: number; // 0-100
    confiance: "faible" | "moyenne" | "elevee";
  };
  tendance: {
    direction: "hausse" | "baisse" | "stable";
    pourcentage: number;
  };
  facteurs: {
    saisonnalite: number; // impact 0-100
    demande: number;
    stock: number;
    concurrence: number;
  };
  historique: {
    derniereVente?: string;
    moyenneVentesPassees: number;
    performancePassee: "excellent" | "bon" | "moyen" | "faible";
  };
}

interface PrevisionsVentesTableProps {
  data?: PrevisionVente[];
  loading?: boolean;
  className?: string;
  periode?: string;
}

export function PrevisionsVentesTable({
  data = [],
  loading = false,
  className,
  periode = "Mois prochain",
}: PrevisionsVentesTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getConfidenceBadge = (confiance: "faible" | "moyenne" | "elevee") => {
    const variants = {
      faible: "destructive",
      moyenne: "secondary",
      elevee: "default",
    } as const;

    const labels = {
      faible: "Faible",
      moyenne: "Moyenne",
      elevee: "Élevée",
    };

    return <Badge variant={variants[confiance]}>{labels[confiance]}</Badge>;
  };

  const getTendanceIcon = (direction: "hausse" | "baisse" | "stable") => {
    switch (direction) {
      case "hausse":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "baisse":
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return <div className="h-4 w-4 border-2 border-current rounded-full" />;
    }
  };

  const getPerformanceBadge = (
    performance: "excellent" | "bon" | "moyen" | "faible",
  ) => {
    const variants = {
      excellent: "default",
      bon: "secondary",
      moyen: "outline",
      faible: "destructive",
    } as const;

    const labels = {
      excellent: "Excellent",
      bon: "Bon",
      moyen: "Moyen",
      faible: "Faible",
    };

    return (
      <Badge variant={variants[performance]} className="text-xs">
        {labels[performance]}
      </Badge>
    );
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
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort(
    (a, b) =>
      b.previsions.chiffreAffaireEstime - a.previsions.chiffreAffaireEstime,
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Prévisions de Ventes</CardTitle>
            <CardDescription>
              Estimations pour {periode} basées sur l'IA et l'historique
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune prévision disponible</p>
            <p className="text-sm">
              Ajoutez des produits pour voir les prévisions
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Qté prévue</TableHead>
                <TableHead className="text-right">CA estimé</TableHead>
                <TableHead className="text-center">Probabilité</TableHead>
                <TableHead className="text-center">Confiance</TableHead>
                <TableHead className="text-center">Tendance</TableHead>
                <TableHead className="text-center">Facteurs clés</TableHead>
                <TableHead className="text-center">Historique</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((prevision) => (
                <TableRow key={prevision.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {prevision.produit.image && (
                        <img
                          src={prevision.produit.image}
                          alt={prevision.produit.nom}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">
                          {prevision.produit.nom}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {prevision.produit.category} •{" "}
                          {formatCurrency(prevision.produit.prix)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="font-mono">
                      {prevision.previsions.quantiteEstimee}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(prevision.previsions.chiffreAffaireEstime)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <Progress
                        value={prevision.previsions.probabiliteVente}
                        className="w-16 mx-auto"
                      />
                      <span className="text-xs font-mono">
                        {prevision.previsions.probabiliteVente}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getConfidenceBadge(prevision.previsions.confiance)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {getTendanceIcon(prevision.tendance.direction)}
                      <span className="text-sm font-mono">
                        {prevision.tendance.pourcentage > 0 ? "+" : ""}
                        {prevision.tendance.pourcentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Saison:</span>
                        <span className="font-mono">
                          {prevision.facteurs.saisonnalite}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Demande:</span>
                        <span className="font-mono">
                          {prevision.facteurs.demande}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Stock:</span>
                        <span className="font-mono">
                          {prevision.facteurs.stock}%
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      {getPerformanceBadge(
                        prevision.historique.performancePassee,
                      )}
                      <div className="text-xs text-muted-foreground">
                        Moy: {prevision.historique.moyenneVentesPassees}/mois
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Résumé des prévisions */}
        {sortedData.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total CA estimé</p>
              <p className="font-mono font-bold text-lg">
                {formatCurrency(
                  sortedData.reduce(
                    (sum, p) => sum + p.previsions.chiffreAffaireEstime,
                    0,
                  ),
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Nb produits</p>
              <p className="font-mono font-bold text-lg">{sortedData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Confiance moyenne</p>
              <p className="font-mono font-bold text-lg">
                {(
                  sortedData.reduce(
                    (sum, p) => sum + p.previsions.probabiliteVente,
                    0,
                  ) / sortedData.length
                ).toFixed(0)}
                %
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PrevisionsVentesTable;
