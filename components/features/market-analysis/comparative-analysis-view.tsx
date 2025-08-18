"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis"

interface ComparativeAnalysisViewProps {
  analysisA: VintedAnalysisResult;
  analysisB: VintedAnalysisResult;
}

const formatPrice = (price: number) => `${price.toFixed(2)} €`;

const MetricRow = ({ label, valueA, valueB }: { label: string, valueA: string | number, valueB: string | number }) => {
  const isNumeric = typeof valueA === 'number' && typeof valueB === 'number';
  let trendIcon = <Minus className="h-4 w-4 text-muted-foreground" />;
  if (isNumeric) {
    if (valueB > valueA) trendIcon = <TrendingUp className="h-4 w-4 text-green-500" />;
    if (valueB < valueA) trendIcon = <TrendingDown className="h-4 w-4 text-red-500" />;
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell>{valueA}</TableCell>
      <TableCell className="flex items-center gap-2">
        {trendIcon}
        {valueB}
      </TableCell>
    </TableRow>
  );
};

export default function ComparativeAnalysisView({ analysisA, analysisB }: ComparativeAnalysisViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          Analyse Comparative
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Métrique</TableHead>
              <TableHead>Analyse A ({new Date(analysisA.analysisDate).toLocaleDateString()})</TableHead>
              <TableHead>Analyse B ({new Date(analysisB.analysisDate).toLocaleDateString()})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <MetricRow label="Volume de ventes" valueA={analysisA.salesVolume} valueB={analysisB.salesVolume} />
            <MetricRow label="Prix moyen" valueA={formatPrice(analysisA.avgPrice)} valueB={formatPrice(analysisB.avgPrice)} />
            <MetricRow label="Prix minimum" valueA={formatPrice(analysisA.priceRange.min)} valueB={formatPrice(analysisB.priceRange.min)} />
            <MetricRow label="Prix maximum" valueA={formatPrice(analysisA.priceRange.max)} valueB={formatPrice(analysisB.priceRange.max)} />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}