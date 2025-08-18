import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

type PricePrediction = {
  predictedPrice: number;
  predictionDate: string;
  trend: 'up' | 'down' | 'stable';
};

type RegressionInfo = {
  slope: number;
  yIntercept: number;
  equation: string;
};

interface PricePredictionUIProps {
  prediction: PricePrediction | null;
  regression: RegressionInfo | null;
  isLoading?: boolean;
}

const getTrendIcon = (trend: PricePrediction['trend']) => {
  if (trend === 'up') return <ArrowUpRight className="text-green-600 h-6 w-6" />;
  if (trend === 'down') return <ArrowDownRight className="text-red-600 h-6 w-6" />;
  return <Minus className="text-gray-400 h-6 w-6" />;
};

const getTrendLabel = (trend: PricePrediction['trend']) => {
  if (trend === 'up') return 'Hausse attendue';
  if (trend === 'down') return 'Baisse attendue';
  return 'Prix stable';
};

const PricePredictionUI: React.FC<PricePredictionUIProps> = ({ prediction, regression, isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calcul de la prévision...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction || !regression) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aucune prévision disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Les données historiques sont insuffisantes pour calculer une prévision.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prévision du prix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          {getTrendIcon(prediction.trend)}
          <div>
            <div className="text-2xl font-bold">
              {prediction.predictedPrice.toFixed(2)} €
            </div>
            <div className="text-sm text-muted-foreground">
              au {new Date(prediction.predictionDate).toLocaleDateString('fr-FR')}
            </div>
            <div className="text-sm font-medium mt-1">
              {getTrendLabel(prediction.trend)}
            </div>
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          <span className="font-semibold">Équation de régression :</span> {regression.equation}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Slope&nbsp;: {regression.slope.toFixed(4)} | Intercept&nbsp;: {regression.yIntercept.toFixed(2)}
        </div>
      </CardContent>
    </Card>
  );
};

export default PricePredictionUI;