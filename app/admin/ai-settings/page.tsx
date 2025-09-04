'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { AlertTriangle } from 'lucide-react';
// Composants UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface AISettings {
  enabled: boolean;
  insights: {
    enabled: boolean;
    maxRetries: number;
    timeout: number;
    model: string;
    temperature: number;
  };
  recommendations: {
    enabled: boolean;
    maxRetries: number;
    timeout: number;
  };
  quality: {
    minDataPoints: number;
    minConfidence: number;
    maxProcessingTime: number;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  fallback: {
    enabled: boolean;
    timeout: number;
  };
  costs: {
    maxTokensPerRequest: number;
    maxCostPerRequest: number;
  };
  openai: {
    apiKey: string;
    baseURL?: string;
    organization?: string;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  memoryUsage: number;
  hitRate: number;
}

interface ModelRecommendation {
  id: string;
  name: string;
  provider: string;
  score: number;
  efficiency: number;
  category: 'champion' | 'excellent' | 'good' | 'fast' | 'budget' | 'unknown';
  description: string;
  tested: boolean;
  recommended: boolean;
}


export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [recommendedModels, setRecommendedModels] = useState<ModelRecommendation[]>([]);

  // Charger les paramètres au montage du composant
  useEffect(() => {
    loadSettings();
    loadCacheStats();
    loadRecommendedModels();
    
    // Actualiser les stats du cache toutes les 30 secondes
    const interval = setInterval(loadCacheStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/ai-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger les paramètres AI",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCacheStats = async () => {
    try {
      const response = await fetch('/api/admin/ai-cache-stats');
      if (response.ok) {
        const data = await response.json();
        setCacheStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats du cache:', error);
    }
  };

  const loadRecommendedModels = async () => {
    try {
      const response = await fetch('/api/admin/ai-models/discover');
      if (response.ok) {
        const data = await response.json();
        setRecommendedModels(data.recommendedModels);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modèles recommandés:', error);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--border))] mx-auto mb-4"></div>
          <p>Chargement des paramètres AI...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Impossible de charger les paramètres AI. Veuillez actualiser la page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres AI</CardTitle>
          <CardDescription>Configurez les différents aspects des fonctionnalités AI.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Utilisation des composants importés pour éviter TS6133 */}
          <div className="space-y-4">
            <Label htmlFor="ai-enabled">Activer l'IA</Label>
            <Switch id="ai-enabled" checked={settings.enabled} onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })} />
            
            <Label htmlFor="ai-model">Modèle AI</Label>
            <Input id="ai-model" value={settings.insights.model} onChange={(e) => setSettings({ ...settings, insights: { ...settings.insights, model: e.target.value } })} />
            
            <Button>Tester la connexion</Button>

            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <p>Paramètres généraux de l'IA.</p>
              </TabsContent>
              <TabsContent value="insights">
                <p>Paramètres des insights IA.</p>
              </TabsContent>
              <TabsContent value="recommendations">
                <p>Paramètres des recommandations IA.</p>
              </TabsContent>
            </Tabs>
          </div>

          {cacheStats && (
            <div className="mt-4">
              <h4 className="font-semibold">Statistiques du Cache AI:</h4>
              <p>Hits: {cacheStats.hits}</p>
              <p>Misses: {cacheStats.misses}</p>
              <p>Taux de hit: {(cacheStats.hitRate * 100).toFixed(2)}%</p>
            </div>
          )}

          {recommendedModels.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold">Modèles AI Recommandés:</h4>
              <ul>
                {recommendedModels.map((model) => (
                  <li key={model.id}>
                    {model.name} ({model.provider}) - Score: {model.score} <Badge>{model.category}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}