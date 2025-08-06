"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Settings, TrendingUp, History, BarChart3 } from "lucide-react"
import {
  AnalysisForm,
  ResultsDashboard,
  HistoricalDataView,
  MarketAnalysisChart,
  MarketTrends,
  SalesVolumeChart
} from "@/components/features/market-analysis"
import MarketAnalysisErrorBoundary from "@/components/features/market-analysis/error-boundary"
import {
  type VintedAnalysisResult,
  type MarketAnalysisHistoryItem,
  type MarketAnalysisRequest,
  type MarketAnalysisState
} from "@/types/vinted-market-analysis"

// Étendre le type MarketAnalysisState pour inclure brandSuggestionMissing
type ExtendedMarketAnalysisState = MarketAnalysisState & { brandSuggestionMissing?: boolean }

export default function AnalyseMarchePage() {
  const [state, setState] = useState<ExtendedMarketAnalysisState>({
    currentAnalysis: null,
    historicalData: [],
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      totalPages: 1,
      hasMore: false,
    },
    brandSuggestionMissing: false,
  })

  const [tokenConfigured, setTokenConfigured] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState("analysis")

  // Vérifier le statut du token au chargement
  useEffect(() => {
    checkTokenStatus()
    loadHistoricalData()
  }, [])

  const checkTokenStatus = async () => {
    try {
      const response = await fetch('/api/v1/market-analysis/token')
      const data = await response.json()
      setTokenConfigured(data.configured && data.valid)
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error)
      setTokenConfigured(false)
    }
  }

  const loadHistoricalData = async (page = 1) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))

      const response = await fetch(`/api/v1/market-analysis?page=${page}&limit=10`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données historiques')
      }

      const data = await response.json()

      // Transformer les données pour correspondre au type MarketAnalysisHistoryItem
      const transformedAnalyses: MarketAnalysisHistoryItem[] = data.analyses.map((analysis: any): MarketAnalysisHistoryItem => {
        const item: MarketAnalysisHistoryItem = {
          id: analysis.id || `temp-${Date.now()}-${Math.random()}`,
          productName: analysis.productName || 'Produit inconnu',
          salesVolume: analysis.result?.salesVolume || 0,
          avgPrice: analysis.result?.avgPrice || 0,
          createdAt: analysis.createdAt || new Date().toISOString(),
          status: (analysis.status as 'completed' | 'pending' | 'failed') || 'pending',
        };

        if (analysis.error) {
          item.error = analysis.error;
        }

        return item;
      })

      setState(prev => ({
        ...prev,
        historicalData: page === 1 ? transformedAnalyses : [...prev.historicalData, ...transformedAnalyses] as MarketAnalysisHistoryItem[],
        pagination: {
          page: data.page,
          totalPages: data.totalPages,
          hasMore: data.page < data.totalPages,
        },
        isLoading: false,
      }))
    } catch (error) {
      console.error('Erreur lors du chargement des données historiques:', error)
      setState(prev => ({
        ...prev,
        error: 'Impossible de charger les données historiques',
        isLoading: false,
      }))
    }
  }

  const handleAnalysisSubmit = async (request: MarketAnalysisRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    console.log("Submitting analysis request:", request);

    if (!request.catalogId || typeof request.catalogId !== 'number') {
        const errorMsg = "Veuillez sélectionner une catégorie valide.";
        console.error(errorMsg, "catalogId:", request.catalogId);
        setState(prev => ({ ...prev, error: errorMsg, isLoading: false }));
        return;
    }

    try {
      const response = await fetch('/api/v1/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const responseBody = await response.text();
      console.log("API Response Status:", response.status);
      console.log("API Response Body:", responseBody);

      if (!response.ok) {
        let errorData;
        try {
            errorData = JSON.parse(responseBody);
        } catch(e) {
            throw new Error(`Erreur serveur non-JSON: ${response.statusText}`);
        }
        // Vérifier le code d'erreur spécifique pour le token expiré
        if (errorData.error?.code === 'VINTED_TOKEN_EXPIRED') {
            setTokenConfigured(false); // Cela affichera la bannière de configuration
            setState(prev => ({ ...prev, isLoading: false, error: null }));
            return;
        }
        throw new Error(errorData.error?.message || 'Erreur lors de l\'analyse')
      }

      const analysisResult = JSON.parse(responseBody);

      // Construire l'objet VintedAnalysisResult complet
      const fullResult: VintedAnalysisResult = {
        salesVolume: analysisResult.salesVolume,
        avgPrice: analysisResult.avgPrice,
        priceRange: analysisResult.priceRange || {
          min: analysisResult.avgPrice * 0.7,
          max: analysisResult.avgPrice * 1.3
        },
        brandInfo: analysisResult.brandInfo || null,
        catalogInfo: {
          id: request.catalogId || 0,
          name: request.categoryName || 'Unknown'
        },
        rawItems: [],
        analysisDate: analysisResult.analysisDate || new Date().toISOString(),
      }

      setState(prev => ({
        ...prev,
        currentAnalysis: fullResult,
        isLoading: false,
      }))

      // Recharger les données historiques
      await loadHistoricalData()

      // Basculer vers l'onglet des résultats
      setActiveTab("results")

    } catch (error: any) {
      console.error("Caught error during analysis submission:", error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false,
      }))
    }
  }

  const handleRefreshAnalysis = async () => {
    if (!state.currentAnalysis) return

    // Pour l'instant, on simule un refresh en rechargeant les données historiques
    await loadHistoricalData()
  }

  const handleLoadMoreHistory = async () => {
    if (state.pagination.hasMore && !state.isLoading) {
      await loadHistoricalData(state.pagination.page + 1)
    }
  }

  // Affichage de la configuration du token si nécessaire
  if (tokenConfigured === false) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Analyse de Marché Vinted</h3>
          <p className="text-sm text-muted-foreground">
            Configuration requise pour accéder aux données Vinted
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration Vinted requise
            </CardTitle>
            <CardDescription>
              Un cookie de session Vinted est requis pour effectuer des analyses de marché
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Vous devez configurer votre cookie de session Vinted pour utiliser cette fonctionnalité.
                Rendez-vous dans votre profil pour configurer l'accès à Vinted.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Comment configurer :</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Allez dans votre <strong>Profil</strong> via le menu de navigation</li>
                <li>Trouvez la section <strong>"Configuration Vinted"</strong></li>
                <li>Suivez les instructions pour obtenir votre cookie de session</li>
                <li>Testez et enregistrez votre configuration</li>
              </ol>
            </div>

            <Button onClick={() => window.location.href = '/profile'}>
              Aller au Profil
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <MarketAnalysisErrorBoundary>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Analyse de Marché Vinted</h3>
          <p className="text-sm text-muted-foreground">
            Analysez les prix et volumes de vente des produits sur Vinted
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Nouvelle Analyse
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!state.currentAnalysis}>
              <BarChart3 className="h-4 w-4" />
              Résultats
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="charts" disabled={!state.currentAnalysis}>
              <BarChart3 className="h-4 w-4" />
              Graphiques
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-6">
            <AnalysisForm
              onSubmit={handleAnalysisSubmit}
              isLoading={state.isLoading}
              error={state.error}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {state.brandSuggestionMissing && (
              <Alert variant="default" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aucune marque suggérée n'a été trouvée pour le produit analysé. Les résultats peuvent être moins précis.
                </AlertDescription>
              </Alert>
            )}
            {state.currentAnalysis ? (
              <ResultsDashboard
                analysis={state.currentAnalysis}
                onRefresh={handleRefreshAnalysis}
                isRefreshing={state.isLoading}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Aucune analyse disponible</h3>
                    <p className="text-muted-foreground mb-4">
                      Effectuez une nouvelle analyse pour voir les résultats ici
                    </p>
                    <Button onClick={() => setActiveTab("analysis")}>
                      Nouvelle Analyse
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <HistoricalDataView
              analyses={state.historicalData as MarketAnalysisHistoryItem[]}
              onLoadMore={handleLoadMoreHistory}
              hasMore={state.pagination.hasMore}
              isLoading={state.isLoading}
              onReload={() => loadHistoricalData()}
            />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            {state.currentAnalysis ? (
              <div className="space-y-6">
                <MarketAnalysisChart
                  currentAnalysis={state.currentAnalysis}
                  historicalData={state.historicalData as MarketAnalysisHistoryItem[]}
                />

                <div className="grid gap-6 lg:grid-cols-2">
                  <MarketTrends
                    currentAnalysis={state.currentAnalysis}
                    historicalData={state.historicalData as MarketAnalysisHistoryItem[]}
                  />
                  <SalesVolumeChart analysis={state.currentAnalysis} />
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Aucune donnée à afficher</h3>
                    <p className="text-muted-foreground mb-4">
                      Effectuez une analyse pour voir les graphiques et tendances
                    </p>
                    <Button onClick={() => setActiveTab("analysis")}>
                      Nouvelle Analyse
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MarketAnalysisErrorBoundary>
  )
}