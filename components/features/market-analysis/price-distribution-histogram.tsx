import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceDistributionHistogramProps {
  prices: number[];
  isLoading?: boolean;
}

function getHistogramData(prices: number[], binCount = 10) {
  if (!prices.length) return [];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const binSize = (max - min) / binCount || 1;
  const bins = Array(binCount).fill(0);

  prices.forEach(price => {
    const bin = Math.min(Math.floor((price - min) / binSize), binCount - 1);
    bins[bin]++;
  });

  return bins.map((count, i) => ({
    range: `${(min + i * binSize).toFixed(2)} - ${(min + (i + 1) * binSize).toFixed(2)}`,
    count,
  }));
}

const PriceDistributionHistogram: React.FC<PriceDistributionHistogramProps> = ({ prices, isLoading }) => {
  const data = getHistogramData(prices);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chargement de la distribution des prix...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prices.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aucune donnée de prix</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Impossible d'afficher la distribution des prix : aucune donnée disponible.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution des prix (histogramme)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" name="Nombre d'annonces" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PriceDistributionHistogram;