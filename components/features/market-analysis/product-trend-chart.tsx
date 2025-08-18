import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart } from 'recharts';

type TrendDataPoint = {
  snapshotDate: string;
  avgPrice: number;
  salesVolume: number;
};

interface ProductTrendChartProps {
  data: TrendDataPoint[];
  productName?: string;
  isLoading?: boolean;
}

const ProductTrendChart: React.FC<ProductTrendChartProps> = ({ data, productName, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chargement des tendances...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aucune donnée de tendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Aucune donnée historique disponible pour ce produit.</p>
        </CardContent>
      </Card>
    );
  }

  // Format date for X axis
  const formattedData = data.map(point => ({
    ...point,
    date: new Date(point.snapshotDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Historique des prix et volume{productName ? ` — ${productName}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" label={{ value: 'Prix (€)', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Volume', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="avgPrice" stroke="#3b82f6" name="Prix moyen" dot={false} />
            <Bar yAxisId="right" dataKey="salesVolume" fill="#10b981" name="Volume de ventes" barSize={18} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProductTrendChart;