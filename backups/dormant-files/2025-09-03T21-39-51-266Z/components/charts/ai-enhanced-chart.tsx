'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Scatter, ScatterChart, ZAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScreenReaderOnly } from '@/components/accessibility/screen-reader';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info, Lightbulb, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logging/logger';

import { useAccessibility } from '@/lib/contexts/accessibility-context';

// Définitions d'interfaces (simplifiées pour l'exemple)
interface ChartDataPoint {
  date: string;
  value: number;
  annotation?: string;
  isAnomaly?: boolean;
  prediction?: number;
  confidence?: number;
  metadata?: any;
}

interface ChartAccessibility {
  title: string;
  description?: string;
  summary?: string;
}

interface TrendPrediction {
  timeframe: string;
  predictions: { date: string; value: number }[];
  scenarios: { name: string; data: { date: string; value: number }[] }[];
}

interface Anomaly {
  date: string;
  value: number;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

interface EnhancedChartProps {
  data: ChartDataPoint[];
  title: string;
  description?: string; // Corrected from _description
  chartType?: 'line' | 'bar' | 'scatter';
  aiAnnotations?: string[];
  anomalies?: Anomaly[];
  trendPredictions?: TrendPrediction;
  accessibility: ChartAccessibility;
  className?: string;
  // Options d'affichage
  showAIInsights?: boolean;
  showAnomalies?: boolean;
  showPredictions?: boolean;
  interactive?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <Card>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
          <CardDescription>Valeur: {dataPoint.value}</CardDescription>
        </CardHeader>
        <CardContent>
          {dataPoint.annotation && <p>Annotation AI: {dataPoint.annotation}</p>}
          {dataPoint.isAnomaly && <p className="text-destructive">Anomalie détectée!</p>}
          {dataPoint.prediction && <p>Prédiction: {dataPoint.prediction}</p>}
          {dataPoint.confidence && <p>Confiance: {dataPoint.confidence.toFixed(2)}</p>}
          {dataPoint.metadata && Object.entries(dataPoint.metadata).map(([key, value]) => (
            <p key={key} className="text-xs text-muted-foreground">{key}: {JSON.stringify(value)}</p>
          ))}
        </CardContent>
      </Card>
    );
  }
  return null;
};

export const AIChart = ({
  data,
  title,
  description, // Corrected from _description
  chartType = 'line',
  aiAnnotations,
  anomalies,
  trendPredictions,
  accessibility,
  className,
  showAIInsights: initialShowAIInsights = true,
  showAnomalies: initialShowAnomalies = true,
  showPredictions: initialShowPredictions = true,
  interactive = true,
}: EnhancedChartProps) => {
  const [showAIInsights, setShowAIInsights] = useState(initialShowAIInsights);
  const [showAnomalies, setShowAnomalies] = useState(initialShowAnomalies);
  const [showPredictions, setShowPredictions] = useState(initialShowPredictions);
  const [predictionHorizon, setPredictionHorizon] = useState(30); // Jours
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const chartRef = useRef<HTMLDivElement>(null);
  const { announceToScreenReader } = useAccessibility();

  // Annonce les changements importants pour les lecteurs d'écran
  useEffect(() => {
    if (showAIInsights) {
      announceToScreenReader('Affichage des aperçus IA activé.');
    } else {
      announceToScreenReader('Affichage des aperçus IA désactivé.');
    }
  }, [showAIInsights, announceToScreenReader]);

  useEffect(() => {
    if (showAnomalies) {
      announceToScreenReader('Affichage des anomalies activé.');
    } else {
      announceToScreenReader('Affichage des anomalies désactivé.');
    }
  }, [showAnomalies, announceToScreenReader]);

  useEffect(() => {
    if (showPredictions) {
      announceToScreenReader('Affichage des prédictions activé.');
    } else {
      announceToScreenReader('Affichage des prédictions désactivé.');
    }
  }, [showPredictions, announceToScreenReader]);

  // Filtrer les données d'anomalie basées sur le seuil de confiance
  const filteredAnomalies = anomalies?.filter(
    (a) => a.severity === 'high' || a.severity === 'medium'
  );

  // Préparer les données pour l'affichage (incluant les prédictions)
  const chartDataWithPredictions = React.useMemo(() => {
    let combinedData = [...data];

    if (showPredictions && trendPredictions) {
      // Assurez-vous que les prédictions commencent après la dernière date des données réelles
      const lastRealDate = data.length > 0 ? new Date(data[data.length - 1].date).getTime() : 0;
      const validPredictions = trendPredictions.predictions.filter(
        (p) => new Date(p.date).getTime() > lastRealDate
      );
      combinedData = [...combinedData, ...validPredictions];
    }

    return combinedData;
  }, [data, showPredictions, trendPredictions]);

  // Gestion des événements interactifs (ex: focus)
  const handleChartFocus = useCallback(() => {
    announceToScreenReader(`Graphique ${title} : ${accessibility.summary || description || 'Données disponibles.'}`);
  }, [title, accessibility.summary, description, announceToScreenReader]);


  logger.info(`Rendering AIChart: ${title}`, {
    dataLength: data.length,
    anomaliesCount: anomalies?.length,
    predictionsAvailable: !!trendPredictions,
    showAIInsights,
    showAnomalies,
    showPredictions,
  });

  return (
    <Card className={cn("w-full h-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center">
          {title}
          {showAIInsights && <Lightbulb className="ml-2 h-5 w-5 text-yellow-500" aria-label="AI Insights activés" />}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {aiAnnotations && showAIInsights && aiAnnotations.length > 0 && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Aperçus IA :</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {aiAnnotations.map((annotation, index) => (
                  <li key={index}>{annotation}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {filteredAnomalies && showAnomalies && filteredAnomalies.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Anomalies détectées :</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {filteredAnomalies.map((anomaly, index) => (
                  <li key={index}>
                    <span className="font-semibold">{anomaly.date}:</span> {anomaly.reason} (Gravité: {anomaly.severity})
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {trendPredictions && showPredictions && (
          <Alert className="mb-4">
            <TrendingUp className="h-4 w-4" />
            <AlertTitle>Prédictions de tendance :</AlertTitle>
            <AlertDescription>
              <p>Horizon de prédiction: {trendPredictions.timeframe}</p>
              <ul className="list-disc pl-5">
                {trendPredictions.predictions.map((prediction, index) => (
                  <li key={index}>{prediction.date}: {prediction.value.toFixed(2)}</li>
                ))}
              </ul>
              {trendPredictions.scenarios && trendPredictions.scenarios.length > 0 && (
                <p className="mt-2">Scénarios :</p>
              )}
              <ul className="list-disc pl-5">
                {trendPredictions.scenarios?.map((scenario, index) => (
                  <li key={index}>{scenario.name}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div 
          ref={chartRef} 
          onFocus={handleChartFocus} 
          tabIndex={0} 
          role="region" 
          aria-label={accessibility.title + (accessibility.summary ? `: ${accessibility.summary}` : '')}
          aria-describedby={undefined} 
        >
          <ResponsiveContainer width="100%" height={300}>
            <>
              {chartType === 'line' && (
                <LineChart data={chartDataWithPredictions} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
                  {showAnomalies && filteredAnomalies && filteredAnomalies.map((anomaly, index) => (
                    <Scatter 
                      key={`anomaly-${index}`} 
                      data={[{ x: anomaly.date, y: anomaly.value, isAnomaly: true, severity: anomaly.severity, reason: anomaly.reason }]} 
                      fill="red" 
                      shape="star" 
                      isAnimationActive={false}
                    />
                  ))}
                  {showPredictions && trendPredictions && trendPredictions.predictions.map((prediction, index) => (
                    <Scatter 
                      key={`prediction-${index}`} 
                      data={[{ x: prediction.date, y: prediction.value, prediction: prediction.value, isPrediction: true }]} 
                      fill="green" 
                      shape="triangle" 
                      isAnimationActive={false}
                    />
                  ))}
                  {aiAnnotations && showAIInsights && aiAnnotations.map((annotation, index) => (
                    <ReferenceLine 
                      key={`annotation-${index}`} 
                      x={data[Math.floor(data.length / (aiAnnotations.length + 1)) * (index + 1)]?.date} 
                      stroke="purple" 
                      strokeDasharray="3 3" 
                      label={{ value: annotation, position: 'top', fill: 'purple' }} 
                    />
                  ))}
                </LineChart>
              )}
              {chartType === 'scatter' && (
                <ScatterChart data={chartDataWithPredictions} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="value" name="Value" unit="" />
                  <YAxis type="number" dataKey="value" name="Value" unit="" />
                  <ZAxis dataKey="value" range={[60, 400]} name="Value" unit="" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                  <Scatter name={title} dataKey="value" fill="#8884d8" />
                </ScatterChart>
              )}
            </>
          </ResponsiveContainer>
        </div>

        {accessibility.summary && (
          <ScreenReaderOnly>
            {accessibility.summary}
          </ScreenReaderOnly>
        )}

        {interactive && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-ai-insights"
                checked={showAIInsights}
                onCheckedChange={setShowAIInsights}
              />
              <Label htmlFor="show-ai-insights">Afficher les aperçus IA</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-anomalies"
                checked={showAnomalies}
                onCheckedChange={setShowAnomalies}
              />
              <Label htmlFor="show-anomalies">Afficher les anomalies</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-predictions"
                checked={showPredictions}
                onCheckedChange={setShowPredictions}
              />
              <Label htmlFor="show-predictions">Afficher les prédictions</Label>
            </div>

            {showPredictions && (
              <div className="space-y-2">
                <Label htmlFor="prediction-horizon">Horizon de prédiction ({predictionHorizon} jours)</Label>
                <Slider
                  id="prediction-horizon"
                  min={7}
                  max={90}
                  step={1}
                  value={[predictionHorizon]}
                  onValueChange={(val) => setPredictionHorizon(val[0]!)}
                />
              </div>
            )}

            {showAIInsights && (
              <div className="space-y-2">
                <Label htmlFor="confidence-threshold">Seuil de confiance AI ({confidenceThreshold.toFixed(2)})</Label>
                <Slider
                  id="confidence-threshold"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={[confidenceThreshold]}
                  onValueChange={(val) => setConfidenceThreshold(val[0]!)}
                />
              </div>
            )}
            
            {/* Simulation de feedback utilisateur */}
            <Button onClick={() => announceToScreenReader("Le graphique a été mis à jour avec les nouvelles options.", "polite")}>
              Mettre à jour le graphique
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Export alias pour compatibilité avec l'index
export const AIEnhancedChart = AIChart;