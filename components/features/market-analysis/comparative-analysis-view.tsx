"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis";

interface ComparativeAnalysisViewProps {
  analysisA: VintedAnalysisResult;
  analysisB: VintedAnalysisResult;
}

// Formatters (module-level singletons for performance)
const EURO_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});
const NUMBER_FORMATTER = new Intl.NumberFormat("fr-FR");

const formatEuro = (value: number | null | undefined): string => {
  return typeof value === "number" && Number.isFinite(value)
    ? EURO_FORMATTER.format(value)
    : "—";
};

const formatNumber = (value: number | null | undefined): string => {
  return typeof value === "number" && Number.isFinite(value)
    ? NUMBER_FORMATTER.format(value)
    : "—";
};

const formatDate = (value: string | number | Date): string => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
};

type MetricRowProps = {
  label: string;
  a: number | null | undefined;
  b: number | null | undefined;
  formatter?: (v: number | null | undefined) => string;
};

const MetricRow = memo(function MetricRow({
  label,
  a,
  b,
  formatter = formatNumber,
}: MetricRowProps) {
  const aIsNumber = typeof a === "number" && Number.isFinite(a);
  const bIsNumber = typeof b === "number" && Number.isFinite(b);

  let icon = (
    <Minus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  );
  let srText = "Pas de variation";

  if (aIsNumber && bIsNumber) {
    if ((b as number) > (a as number)) {
      icon = (
        <TrendingUp
          className="h-4 w-4 text-[hsl(var(--success-foreground))]"
          aria-hidden="true"
        />
      );
      srText = "Hausse";
    } else if ((b as number) < (a as number)) {
      icon = (
        <TrendingDown
          className="h-4 w-4 text-[hsl(var(--destructive-foreground))]"
          aria-hidden="true"
        />
      );
      srText = "Baisse";
    }
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell>{formatter(a)}</TableCell>
      <TableCell className="flex items-center gap-2">
        {icon}
        <span className="sr-only">{srText}</span>
        {formatter(b)}
      </TableCell>
    </TableRow>
  );
});

export default function ComparativeAnalysisView({
  analysisA,
  analysisB,
}: ComparativeAnalysisViewProps): JSX.Element {
  const dateA = useMemo(
    () => formatDate(analysisA.analysisDate),
    [analysisA.analysisDate],
  );
  const dateB = useMemo(
    () => formatDate(analysisB.analysisDate),
    [analysisB.analysisDate],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          Analyse comparative
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table aria-label="Tableau comparatif des analyses de marché">
          <caption className="sr-only">
            Comparaison des métriques clés entre deux analyses de marché
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Métrique</TableHead>
              <TableHead scope="col">Analyse A ({dateA})</TableHead>
              <TableHead scope="col">Analyse B ({dateB})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <MetricRow
              label="Volume de ventes"
              a={analysisA.salesVolume}
              b={analysisB.salesVolume}
              formatter={formatNumber}
            />
            <MetricRow
              label="Prix moyen"
              a={analysisA.avgPrice}
              b={analysisB.avgPrice}
              formatter={formatEuro}
            />
            <MetricRow
              label="Prix minimum"
              a={analysisA.priceRange?.min}
              b={analysisB.priceRange?.min}
              formatter={formatEuro}
            />
            <MetricRow
              label="Prix maximum"
              a={analysisA.priceRange?.max}
              b={analysisB.priceRange?.max}
              formatter={formatEuro}
            />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
