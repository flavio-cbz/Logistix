"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Euro, 
  BarChart3,
  Calendar,
  Tag,
  Loader2
} from "lucide-react"
import { type ResultsDashboardProps } from "@/types/vinted-market-analysis"

export default function ResultsDashboard({ 
  analysis, 
  onRefresh, 
  isRefreshing = false 
}: ResultsDashboardProps) {
  
  const formatPrice = (price: number) => `${price.toFixed(2)} €`
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calcul des métriques dérivées
  const priceRange = analysis.priceRange.max - analysis.priceRange.min
  const averageVsMin = ((analysis.avgPrice - analysis.priceRange.min) / analysis.priceRange.min * 100)
  const averageVsMax = ((analysis.priceRange.max - analysis.avgPrice) / analysis.priceRange.max * 100)

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et bouton refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Résultats de l'analyse</h3>
          <p className="text-sm text-muted-foreground">
            Analysé le {formatDate(analysis.analysisDate)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Actualiser
        </Button>
      </div>

      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume de ventes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.salesVolume}</div>
            <p className="text-xs text-muted-foreground">
              articles vendus analysés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prix moyen</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(analysis.avgPrice)}</div>
            <p className="text-xs text-muted-foreground">
              prix de vente moyen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prix minimum</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(analysis.priceRange.min)}
            </div>
            <p className="text-xs text-muted-foreground">
              prix le plus bas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prix maximum</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPrice(analysis.priceRange.max)}
            </div>
            <p className="text-xs text-muted-foreground">
              prix le plus élevé
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informations détaillées */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Analyse des prix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analyse des prix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Fourchette de prix</span>
                <Badge variant="outline">
                  {formatPrice(priceRange)} d'écart
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Position du prix moyen</span>
                <div className="flex gap-2">
                  <Badge variant={averageVsMin < 50 ? "default" : "secondary"}>
                    +{averageVsMin.toFixed(0)}% vs min
                  </Badge>
                  <Badge variant={averageVsMax < 50 ? "default" : "secondary"}>
                    -{averageVsMax.toFixed(0)}% vs max
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recommandation de prix</h4>
              <div className="text-sm text-muted-foreground">
                {analysis.avgPrice < (analysis.priceRange.min + analysis.priceRange.max) / 2 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    Prix moyen plutôt bas, potentiel d'augmentation
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-orange-600">
                    <TrendingDown className="h-4 w-4" />
                    Prix moyen élevé, marché compétitif
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations sur le produit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Informations produit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Catégorie</span>
                <p className="text-sm text-muted-foreground">
                  ID {analysis.catalogInfo.id}
                  {analysis.catalogInfo.name !== 'Unknown' && ` - ${analysis.catalogInfo.name}`}
                </p>
              </div>

              {analysis.brandInfo && (
                <div>
                  <span className="text-sm font-medium">Marque détectée</span>
                  <p className="text-sm text-muted-foreground">
                    {analysis.brandInfo.name} (ID: {analysis.brandInfo.id})
                  </p>
                </div>
              )}

              <div>
                <span className="text-sm font-medium">Échantillon analysé</span>
                <p className="text-sm text-muted-foreground">
                  {analysis.rawItems.length} articles sur les dernières ventes
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Qualité de l'analyse</h4>
              <div className="flex items-center gap-2">
                {analysis.salesVolume >= 50 ? (
                  <Badge className="bg-green-100 text-green-800">
                    Excellente ({analysis.salesVolume} ventes)
                  </Badge>
                ) : analysis.salesVolume >= 20 ? (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Bonne ({analysis.salesVolume} ventes)
                  </Badge>
                ) : (
                  <Badge className="bg-orange-100 text-orange-800">
                    Limitée ({analysis.salesVolume} ventes)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Plus il y a de ventes analysées, plus les résultats sont fiables
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conseils et actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Prochaines étapes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recommandations</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Surveillez les tendances sur 2-3 semaines</li>
                <li>• Comparez avec d'autres catégories similaires</li>
                <li>• Analysez la saisonnalité du produit</li>
                {analysis.salesVolume < 20 && (
                  <li>• Essayez des mots-clés plus génériques pour plus de données</li>
                )}
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Actions possibles</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  Exporter les données
                </Button>
                <Button variant="outline" size="sm">
                  Programmer un suivi
                </Button>
                <Button variant="outline" size="sm">
                  Analyser une variante
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}