'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';


import { toast } from '@/components/ui/use-toast';
import { 
  Brain, 
  DollarSign, 
  Activity,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Star,
  Zap,
  Crown,
  Award
} from 'lucide-react';

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
    dailyTokenLimit: number;
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
  responseTime: number;
  efficiency: number;
  category: 'champion' | 'excellent' | 'good' | 'fast' | 'budget' | 'unknown';
  description: string;
  tested: boolean;
  recommended: boolean;
}

interface EndpointInfo {
  url: string;
  type: 'openai' | 'gemini' | 'anthropic' | 'nvidia' | 'custom';
  requiresAuth: boolean;
}

export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  
  // Nouveaux états pour la découverte de modèles
  const [discoveredModels, setDiscoveredModels] = useState<ModelRecommendation[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<ModelRecommendation[]>([]);
  const [discoveringModels, setDiscoveringModels] = useState(false);
  const [endpointInfo, setEndpointInfo] = useState<EndpointInfo | null>(null);
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');

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

  const discoverModels = async () => {
    if (!customEndpoint || !customApiKey) {
      toast({
        title: "Erreur",
        description: "URL d'endpoint et clé API requis",
        variant: "destructive"
      });
      return;
    }

    setDiscoveringModels(true);
    try {
      const response = await fetch('/api/admin/ai-models/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpointUrl: customEndpoint,
          apiKey: customApiKey
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDiscoveredModels(data.models);
        setEndpointInfo(data.endpointInfo);
        
        toast({
          title: "Succès",
          description: `${data.totalModels} modèles découverts (${data.recommendedModels} recommandés)`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erreur",
          description: error.message || "Erreur lors de la découverte",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la découverte:', error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive"
      });
    } finally {
      setDiscoveringModels(false);
    }
  };

  const selectModel = (model: ModelRecommendation) => {
    if (!settings) return;
    
    const newSettings = {
      ...settings,
      insights: {
        ...settings.insights,
        model: model.id
      },
      openai: {
        ...settings.openai,
        baseURL: customEndpoint || settings.openai.baseURL || '',
        apiKey: customApiKey || settings.openai.apiKey
      }
    };
    
    setSettings(newSettings);
    
    toast({
      title: "Modèle sélectionné",
      description: `${model.name} (Score: ${model.score}/100)`,
    });
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Paramètres AI sauvegardés avec succès",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erreur",
          description: error.message || "Erreur lors de la sauvegarde",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-settings/reset', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        toast({
          title: "Succès",
          description: "Paramètres réinitialisés aux valeurs par défaut",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Erreur lors de la réinitialisation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings?.openai.apiKey) {
      toast({
        title: "Erreur",
        description: "Clé API OpenAI requise",
        variant: "destructive"
      });
      return;
    }

    setTestingConnection(true);
    try {
      const response = await fetch('/api/admin/ai-test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: settings.openai.apiKey }),
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast({
          title: "Succès",
          description: "Connexion OpenAI réussie",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Erreur",
          description: "Échec de la connexion OpenAI",
          variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      console.error('Erreur lors du test de connexion:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du test de connexion",
        variant: "destructive"
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/admin/ai-cache/clear', {
        method: 'POST',
      });

      if (response.ok) {
        loadCacheStats();
        toast({
          title: "Succès",
          description: "Cache vidé avec succès",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Erreur lors du vidage du cache",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors du vidage du cache:', error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive"
      });
    }
  };

  const updateSettings = (path: string, value: any) => {
    if (!settings) return;
    
    const newSettings = { ...settings };
    const keys = path.split('.');
    let current: any = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key !== undefined) {
        current = current[key];
      }
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey !== undefined) {
      current[lastKey] = value;
    }
    setSettings(newSettings);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'champion': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'excellent': return <Award className="h-4 w-4 text-blue-500" />;
      case 'fast': return <Zap className="h-4 w-4 text-green-500" />;
      case 'good': return <Star className="h-4 w-4 text-purple-500" />;
      case 'budget': return <DollarSign className="h-4 w-4 text-orange-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'champion': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'excellent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fast': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'budget': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8" />
            Configuration AI
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez les paramètres de l'intelligence artificielle pour l'analyse de marché
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Statut global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Statut du système AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={settings.enabled ? "default" : "secondary"}>
                {settings.enabled ? "Activé" : "Désactivé"}
              </Badge>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSettings('enabled', checked)}
              />
            </div>
            
            {connectionStatus !== 'unknown' && (
              <div className="flex items-center gap-2">
                {connectionStatus === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <span className={connectionStatus === 'success' ? 'text-green-600' : 'text-red-600'}>
                  {connectionStatus === 'success' ? 'Connexion OK' : 'Connexion échouée'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="models">Modèles</TabsTrigger>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="costs">Coûts</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4">
            {/* Découverte de modèles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Découverte de modèles
                </CardTitle>
                <CardDescription>
                  Découvrez automatiquement les modèles disponibles sur votre endpoint
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customEndpoint">URL de l'endpoint</Label>
                    <Input
                      id="customEndpoint"
                      value={customEndpoint}
                      onChange={(e) => setCustomEndpoint(e.target.value)}
                      placeholder="https://api.openai.com/v1 ou https://generativelanguage.googleapis.com/v1beta"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customApiKey">Clé API</Label>
                    <Input
                      id="customApiKey"
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="Votre clé API"
                    />
                  </div>
                </div>
                
                <Button
                  onClick={discoverModels}
                  disabled={discoveringModels || !customEndpoint || !customApiKey}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {discoveringModels ? 'Découverte en cours...' : 'Découvrir les modèles'}
                </Button>

                {endpointInfo && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Endpoint détecté: {endpointInfo.type.toUpperCase()} - {discoveredModels.length} modèles trouvés
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Modèles recommandés */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Modèles recommandés (testés)
                </CardTitle>
                <CardDescription>
                  Modèles testés et classés pour l'analyse de marché français
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {recommendedModels.slice(0, 5).map((model) => (
                    <div
                      key={model.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        settings?.insights.model === model.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => selectModel(model)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(model.category)}
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-sm text-gray-600">{model.provider}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getCategoryColor(model.category)}>
                            {model.score}/100
                          </Badge>
                          {model.tested && (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              Testé
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {model.description}
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        <span>⏱️ {(model.responseTime / 1000).toFixed(1)}s</span>
                        <span>⚡ {model.efficiency.toFixed(1)} pts/s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Modèles découverts */}
            {discoveredModels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Modèles découverts ({discoveredModels.length})
                  </CardTitle>
                  <CardDescription>
                    Modèles disponibles sur votre endpoint (classés par score estimé)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {discoveredModels.map((model) => (
                      <div
                        key={model.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          settings?.insights.model === model.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => selectModel(model)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(model.category)}
                            <div>
                              <div className="font-medium text-sm">{model.name}</div>
                              <div className="text-xs text-gray-600">{model.provider}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getCategoryColor(model.category)} variant="outline">
                              {model.score}/100
                            </Badge>
                            {model.tested ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                Testé
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                                Estimé
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {model.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration OpenAI</CardTitle>
              <CardDescription>
                Paramètres de connexion à l'API OpenAI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Clé API OpenAI</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type="password"
                    value={settings.openai.apiKey}
                    onChange={(e) => updateSettings('openai.apiKey', e.target.value)}
                    placeholder="sk-..."
                  />
                  <Button
                    variant="outline"
                    onClick={testConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? 'Test...' : 'Tester'}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="baseURL">URL de base (optionnel)</Label>
                <Input
                  id="baseURL"
                  value={settings.openai.baseURL || ''}
                  onChange={(e) => updateSettings('openai.baseURL', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="organization">Organisation (optionnel)</Label>
                <Input
                  id="organization"
                  value={settings.openai.organization || ''}
                  onChange={(e) => updateSettings('openai.organization', e.target.value)}
                  placeholder="org-..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Insights de marché</CardTitle>
                <CardDescription>
                  Configuration du service d'analyse intelligente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="insights-enabled">Activé</Label>
                  <Switch
                    id="insights-enabled"
                    checked={settings.insights.enabled}
                    onCheckedChange={(checked) => updateSettings('insights.enabled', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="insights-model">Modèle</Label>
                  <select
                    id="insights-model"
                    className="w-full p-2 border rounded-md"
                    value={settings.insights.model}
                    onChange={(e) => updateSettings('insights.model', e.target.value)}
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="insights-temperature">Température ({settings.insights.temperature})</Label>
                  <input
                    id="insights-temperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.insights.temperature}
                    onChange={(e) => updateSettings('insights.temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="insights-timeout">Timeout (ms)</Label>
                  <Input
                    id="insights-timeout"
                    type="number"
                    value={settings.insights.timeout}
                    onChange={(e) => updateSettings('insights.timeout', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="insights-retries">Tentatives max</Label>
                  <Input
                    id="insights-retries"
                    type="number"
                    value={settings.insights.maxRetries}
                    onChange={(e) => updateSettings('insights.maxRetries', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommandations</CardTitle>
                <CardDescription>
                  Configuration du service de recommandations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recommendations-enabled">Activé</Label>
                  <Switch
                    id="recommendations-enabled"
                    checked={settings.recommendations.enabled}
                    onCheckedChange={(checked) => updateSettings('recommendations.enabled', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="recommendations-timeout">Timeout (ms)</Label>
                  <Input
                    id="recommendations-timeout"
                    type="number"
                    value={settings.recommendations.timeout}
                    onChange={(e) => updateSettings('recommendations.timeout', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="recommendations-retries">Tentatives max</Label>
                  <Input
                    id="recommendations-retries"
                    type="number"
                    value={settings.recommendations.maxRetries}
                    onChange={(e) => updateSettings('recommendations.maxRetries', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Qualité des données</CardTitle>
                <CardDescription>
                  Seuils de qualité pour l'analyse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="min-data-points">Points de données minimum</Label>
                  <Input
                    id="min-data-points"
                    type="number"
                    value={settings.quality.minDataPoints}
                    onChange={(e) => updateSettings('quality.minDataPoints', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="min-confidence">Confiance minimum ({settings.quality.minConfidence})</Label>
                  <input
                    id="min-confidence"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.quality.minConfidence}
                    onChange={(e) => updateSettings('quality.minConfidence', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-processing-time">Temps de traitement max (ms)</Label>
                  <Input
                    id="max-processing-time"
                    type="number"
                    value={settings.quality.maxProcessingTime}
                    onChange={(e) => updateSettings('quality.maxProcessingTime', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fallback</CardTitle>
                <CardDescription>
                  Configuration du système de secours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fallback-enabled">Activé</Label>
                  <Switch
                    id="fallback-enabled"
                    checked={settings.fallback.enabled}
                    onCheckedChange={(checked) => updateSettings('fallback.enabled', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fallback-timeout">Timeout (ms)</Label>
                  <Input
                    id="fallback-timeout"
                    type="number"
                    value={settings.fallback.timeout}
                    onChange={(e) => updateSettings('fallback.timeout', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Contrôle des coûts
              </CardTitle>
              <CardDescription>
                Limites pour contrôler les dépenses AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="max-tokens">Tokens max par requête</Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    value={settings.costs.maxTokensPerRequest}
                    onChange={(e) => updateSettings('costs.maxTokensPerRequest', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-cost">Coût max par requête ($)</Label>
                  <Input
                    id="max-cost"
                    type="number"
                    step="0.01"
                    value={settings.costs.maxCostPerRequest}
                    onChange={(e) => updateSettings('costs.maxCostPerRequest', parseFloat(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="daily-limit">Limite quotidienne (tokens)</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    value={settings.costs.dailyTokenLimit}
                    onChange={(e) => updateSettings('costs.dailyTokenLimit', parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Ces limites aident à contrôler les coûts. Le système utilisera le fallback si les limites sont atteintes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Configuration du cache</CardTitle>
                <CardDescription>
                  Paramètres du cache en mémoire
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cache-enabled">Cache activé</Label>
                  <Switch
                    id="cache-enabled"
                    checked={settings.caching.enabled}
                    onCheckedChange={(checked) => updateSettings('caching.enabled', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cache-ttl">Durée de vie (secondes)</Label>
                  <Input
                    id="cache-ttl"
                    type="number"
                    value={settings.caching.ttl}
                    onChange={(e) => updateSettings('caching.ttl', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cache-size">Taille maximum (entrées)</Label>
                  <Input
                    id="cache-size"
                    type="number"
                    value={settings.caching.maxSize}
                    onChange={(e) => updateSettings('caching.maxSize', parseInt(e.target.value))}
                  />
                </div>
                
                <Button
                  variant="outline"
                  onClick={clearCache}
                  className="w-full"
                >
                  Vider le cache
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistiques du cache</CardTitle>
                <CardDescription>
                  Performance actuelle du cache
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cacheStats ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Taux de réussite:</span>
                      <Badge variant={cacheStats.hitRate > 70 ? "default" : "secondary"}>
                        {cacheStats.hitRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Entrées:</span>
                      <span>{cacheStats.entries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hits:</span>
                      <span className="text-green-600">{cacheStats.hits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Misses:</span>
                      <span className="text-red-600">{cacheStats.misses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mémoire utilisée:</span>
                      <span>{formatBytes(cacheStats.memoryUsage)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Chargement des statistiques...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}