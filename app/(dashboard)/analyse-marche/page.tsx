"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  RefreshCw, 
  Target,
  BarChart3,
  Users,
  DollarSign,
  Trash
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { MarketAnalysisChart } from "@/components/market-analysis/market-analysis-chart"
import { PriceDistributionChart } from "@/components/market-analysis/price-distribution-chart"
import { CompetitorAnalysis } from "@/components/market-analysis/competitor-analysis"
import { PriceRecommendation } from "@/components/market-analysis/price-recommendation"
import { MarketTrends } from "@/components/market-analysis/market-trends"

interface MarketData {
  id: string
  productName: string
  currentPrice: number
  minPrice: number
  maxPrice: number
  avgPrice: number
  salesVolume: number
  competitorCount: number
  trend: 'up' | 'down' | 'stable' // Cette propriété n'est plus utilisée pour l'icône/couleur, mais peut rester pour d'autres usages
  trendPercentage: number
  lastUpdated: string
  recommendedPrice: number
  marketShare: number
  demandLevel: 'low' | 'medium' | 'high'
}

export default function AnalyseMarchePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [updateInterval, setUpdateInterval] = useState("60")
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [selectedProduct, setSelectedProduct] = useState<MarketData | null>(null)
  const { toast } = useToast()

  // Charger les données d'analyse de marché depuis l'API au chargement de la page
  useEffect(() => {
    const loadAnalyses = async () => {
      try {
        const response = await fetch("/api/v1/market-analysis")
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des analyses de marché")
        }
        const analyses = await response.json() as MarketData[]
        setMarketData(analyses)
        if (analyses.length > 0) {
          setSelectedProduct(analyses[0]) // Sélectionner le premier produit par défaut
        }
      } catch (error) {
        console.error("Erreur lors du chargement des analyses de marché:", error)
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: "Impossible de charger les analyses de marché."
        })
      }
    }
    loadAnalyses()
  }, [toast])

  const generateMarketData = (productName: string): MarketData => {
    const basePrice = Math.random() * 100 + 20
    const variation = basePrice * 0.3
    const minPrice = parseFloat((basePrice - variation).toFixed(2))
    const maxPrice = parseFloat((basePrice + variation).toFixed(2))
    const avgPrice = parseFloat(((minPrice + maxPrice) / 2).toFixed(2))
    const salesVolume = Math.floor(Math.random() * 1000) + 100
    const competitorCount = Math.floor(Math.random() * 20) + 5
    const trends = ['up', 'down', 'stable'] as const 
    const trend = trends[Math.floor(Math.random() * trends.length)] 
    const trendPercentage = parseFloat((Math.random() * 20 - 10).toFixed(1))
    const demandLevels = ['low', 'medium', 'high'] as const
    const demandLevel = demandLevels[Math.floor(Math.random() * demandLevels.length)]
    
    // Placeholder for recommendedPrice, will be updated by historical data
    const recommendedPrice = avgPrice 

    return {
      id: crypto.randomUUID(), 
      productName,
      currentPrice: parseFloat(basePrice.toFixed(2)),
      minPrice,
      maxPrice,
      avgPrice,
      salesVolume,
      competitorCount,
      trend, 
      trendPercentage,
      lastUpdated: new Date().toISOString(),
      recommendedPrice,
      marketShare: parseFloat((Math.random() * 15 + 2).toFixed(1)),
      demandLevel
    }
  }

  const saveMarketAnalysis = async (data: MarketData) => {
    try {
      const response = await fetch("/api/v1/market-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error("Erreur lors de la sauvegarde de l'analyse de marché")
      }
      const result = await response.json()
      return result.id || data.id 
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'analyse de marché:", error)
      toast({
        variant: "destructive",
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder l'analyse de marché."
      })
      throw error
    }
  }

  const saveHistoricalData = async (productName: string, price: number, salesVolume: number) => {
    try {
      const response = await fetch("/api/v1/historical-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productName, price, salesVolume }),
      })
      if (!response.ok) {
        throw new Error("Erreur lors de l'enregistrement des données historiques")
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des données historiques:", error)
      toast({
        variant: "destructive",
        title: "Erreur historique",
        description: "Impossible d'enregistrer les données historiques."
      })
    }
  }

  const getRecommendedPriceFromAPI = async (productName: string): Promise<number | null> => {
    try {
      const response = await fetch(`/api/v1/historical-prices?productName=${encodeURIComponent(productName)}`)
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération du prix recommandé")
      }
      const data = await response.json()
      return data.recommendedPrice
    } catch (error) {
      console.error("Erreur lors de la récupération du prix recommandé:", error)
      toast({
        variant: "destructive",
        title: "Erreur de recommandation",
        description: "Impossible de récupérer le prix recommandé."
      })
      return null
    }
  }

  const deleteMarketAnalysisFromDB = async (productId: string) => {
    try {
      const response = await fetch("/api/v1/market-analysis", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: productId }),
      })
      if (!response.ok) {
        throw new Error("Erreur lors de la suppression de l'analyse de marché")
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'analyse de marché:", error)
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description: "Impossible de supprimer l'analyse de marché."
      })
      throw error
    }
  }

  const analyzeProduct = async () => {
    if (!searchTerm.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez entrer un nom de produit à analyser"
      })
      return
    }

    setIsAnalyzing(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    let newMarketData = generateMarketData(searchTerm)
    
    try {
      // Enregistrer les données actuelles comme données historiques
      await saveHistoricalData(newMarketData.productName, newMarketData.currentPrice, newMarketData.salesVolume)

      // Récupérer le prix recommandé basé sur les données historiques
      const recommendedPrice = await getRecommendedPriceFromAPI(newMarketData.productName)
      if (recommendedPrice !== null) {
        newMarketData = { ...newMarketData, recommendedPrice }
      }

      const savedId = await saveMarketAnalysis(newMarketData)
      newMarketData.id = savedId; 

      setMarketData(prev => {
        const existingIndex = prev.findIndex(item => item.productName.toLowerCase() === searchTerm.toLowerCase())
        if (existingIndex !== -1) {
          const updatedPrev = [...prev]
          updatedPrev[existingIndex] = { ...newMarketData, id: prev[existingIndex].id } 
          return updatedPrev
        }
        return [...prev, newMarketData]
      })
      
      setSelectedProduct(newMarketData)
      setSearchTerm("")
      
      toast({
        title: "Analyse terminée",
        description: `L'analyse de marché pour "${newMarketData.productName}" a été mise à jour`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Échec de l'analyse et de la sauvegarde du produit."
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const refreshAnalysis = async (productId: string) => {
    const product = marketData.find(p => p.id === productId)
    if (!product) return

    setIsAnalyzing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    let updatedData = generateMarketData(product.productName)
    updatedData.id = productId; 

    try {
      // Enregistrer les données actuelles comme données historiques
      await saveHistoricalData(updatedData.productName, updatedData.currentPrice, updatedData.salesVolume)

      // Récupérer le prix recommandé basé sur les données historiques
      const recommendedPrice = await getRecommendedPriceFromAPI(updatedData.productName)
      if (recommendedPrice !== null) {
        updatedData = { ...updatedData, recommendedPrice }
      }

      await saveMarketAnalysis(updatedData)

      setMarketData(prev => prev.map(item => 
        item.id === productId 
          ? updatedData
          : item
      ))
      
      if (selectedProduct?.id === productId) {
        setSelectedProduct(updatedData)
      }
      
      toast({
        title: "Données mises à jour",
        description: `L'analyse pour "${product.productName}" a été actualisée`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Échec de l'actualisation du produit."
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const deleteProduct = async (productId: string) => {
    try {
      await deleteMarketAnalysisFromDB(productId)

      setMarketData(prev => prev.filter(item => item.id !== productId))
      if (selectedProduct?.id === productId) {
        setSelectedProduct(null)
      }
      toast({
        title: "Produit supprimé",
        description: "Le produit a été retiré de la liste des analyses"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Échec de la suppression du produit."
      })
    }
  }

  const exportToCSV = () => {
    if (marketData.length === 0) {
      toast({
        variant: "destructive",
        title: "Aucune donnée",
        description: "Aucune analyse à exporter"
      })
      return
    }

    const headers = [
      'Produit',
      'Prix Actuel (€)',
      'Prix Min (€)',
      'Prix Max (€)',
      'Volume Ventes',
      'Concurrents',
      'Tendance',
      'Variation (%)',
      'Prix Recommandé (€)',
      'Part de Marché (%)',
      'Niveau Demande',
      'Dernière MAJ'
    ]

    const csvContent = [
      headers.join(','),
      ...marketData.map(item => [
        `"${item.productName}"`,
        item.currentPrice,
        item.minPrice,
        item.maxPrice,
        item.salesVolume,
        item.competitorCount,
        item.trend,
        item.trendPercentage,
        item.recommendedPrice,
        item.marketShare,
        item.demandLevel,
        `"${new Date(item.lastUpdated).toLocaleString()}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `analyse-marche-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export réussi",
      description: "Les données ont été exportées en CSV"
    })
  }

  useEffect(() => {
    if (!autoUpdate || marketData.length === 0) return

    const interval = setInterval(() => {
      marketData.forEach(product => {
        refreshAnalysis(product.id)
      })
    }, parseInt(updateInterval) * 60 * 1000)

    return () => clearInterval(interval)
  }, [autoUpdate, updateInterval, marketData])

  const getTrendIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (percentage < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <BarChart3 className="h-4 w-4 text-gray-500" />
  }

  const getDemandBadge = (level: string) => {
    const variants = {
      low: "destructive",
      medium: "secondary", 
      high: "default"
    } as const
    
    return (
      <Badge variant={variants[level as keyof typeof variants]}>
        {level === 'low' ? 'Faible' : level === 'medium' ? 'Moyenne' : 'Forte'}
      </Badge>
    )
  }

  return (
    <motion.div 
      className="space-y-6" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-lg font-medium">Analyse de Marché</h3>
        <p className="text-sm text-muted-foreground">
          Analysez les prix du marché, la concurrence et obtenez des recommandations de prix optimaux
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Analyser un Produit
          </CardTitle>
          <CardDescription>
            Entrez le nom d'un produit pour analyser son marché
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="product-search">Nom du produit</Label>
              <Input
                id="product-search"
                placeholder="Ex: Nike Air Max, iPhone 15, etc."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && analyzeProduct()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={analyzeProduct} 
                disabled={isAnalyzing}
                className="w-32"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Analyser
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-update"
                  checked={autoUpdate}
                  onCheckedChange={setAutoUpdate}
                />
                <Label htmlFor="auto-update">Mise à jour automatique</Label>
              </div>
              {autoUpdate && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="update-interval">Intervalle (min):</Label>
                  <Select value={updateInterval} onValueChange={setUpdateInterval}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="60">60</SelectItem>
                      <SelectItem value="120">120</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={exportToCSV} disabled={marketData.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {marketData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats d'Analyse</CardTitle>
            <CardDescription>
              Cliquez sur un produit pour voir l'analyse détaillée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Concurrents</TableHead>
                    <TableHead>Tendance</TableHead>
                    <TableHead>Demande</TableHead>
                    <TableHead>Prix Recommandé</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketData.map((item) => (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedProduct(item)}
                    >
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.salesVolume.toLocaleString()}</TableCell>
                      <TableCell>{item.competitorCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(item.trendPercentage)}
                          <span className={`text-sm ${
                            item.trendPercentage > 0 ? 'text-green-600' : 
                            item.trendPercentage < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {item.trendPercentage > 0 ? '+' : ''}{item.trendPercentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getDemandBadge(item.demandLevel)}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        {item.recommendedPrice.toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              refreshAnalysis(item.id)
                            }}
                            disabled={isAnalyzing}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteProduct(item.id)
                            }}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProduct && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="competition">Concurrence</TabsTrigger>
            <TabsTrigger value="trends">Tendances</TabsTrigger>
            <TabsTrigger value="recommendation">Recommandation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prix Moyen Marché</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedProduct.avgPrice.toFixed(2)} €</div>
                  <p className="text-xs text-muted-foreground">
                    Min: {selectedProduct.minPrice.toFixed(2)} € - Max: {selectedProduct.maxPrice.toFixed(2)} €
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Volume des Ventes</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedProduct.salesVolume.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Unités vendues (30 derniers jours)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Concurrents Actifs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedProduct.competitorCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Vendeurs sur le marché
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Part de Marché</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedProduct.marketShare}%</div>
                  <p className="text-xs text-muted-foreground">
                    Estimation basée sur les ventes
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MarketAnalysisChart product={selectedProduct} />
              <PriceDistributionChart product={selectedProduct} />
            </div>
          </TabsContent>

          <TabsContent value="competition">
            <CompetitorAnalysis product={selectedProduct} />
          </TabsContent>

          <TabsContent value="trends">
            <MarketTrends product={selectedProduct} />
          </TabsContent>

          <TabsContent value="recommendation">
            <PriceRecommendation product={selectedProduct} />
          </TabsContent>
        </Tabs>
      )}

      {marketData.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune analyse disponible</h3>
            <p className="text-muted-foreground text-center">
              Commencez par analyser un produit en utilisant le formulaire ci-dessus
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}