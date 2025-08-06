"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, BarChart3, TrendingUp } from "lucide-react"

// Loading state pour le formulaire d'analyse
export function AnalysisFormLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Nouvelle Analyse de Marché
        </CardTitle>
        <CardDescription>
          Analysez les prix et volumes de vente d'un produit sur Vinted
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  )
}

// Loading state pour l'analyse en cours
export function AnalysisInProgressLoading({ 
  progress = 0, 
  currentStep = "Initialisation...",
  productName 
}: { 
  progress?: number
  currentStep?: string
  productName?: string 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Analyse en cours
        </CardTitle>
        <CardDescription>
          {productName ? `Analyse de "${productName}"` : "Traitement de votre demande"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{currentStep}</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Étapes de l'analyse :</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={progress > 0 ? "default" : "outline"}>1</Badge>
              <span className="text-sm">Recherche de la marque</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={progress > 30 ? "default" : "outline"}>2</Badge>
              <span className="text-sm">Récupération des ventes</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={progress > 70 ? "default" : "outline"}>3</Badge>
              <span className="text-sm">Calcul des métriques</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={progress >= 100 ? "default" : "outline"}>4</Badge>
              <span className="text-sm">Finalisation</span>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Cette opération peut prendre quelques secondes selon le volume de données...
        </div>
      </CardContent>
    </Card>
  )
}

// Loading state pour le dashboard de résultats
export function ResultsDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informations détaillées */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Loading state pour les données historiques
export function HistoricalDataLoading() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Historique des analyses
        </CardTitle>
        <CardDescription>
          Consultez vos analyses précédentes et suivez l'évolution des prix
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Skeleton className="h-5 w-5" />
              <div>
                <Skeleton className="h-4 w-8 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <div className="grid grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-16" />
              ))}
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 border-b last:border-b-0">
              <div className="grid grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Loading state pour les graphiques
export function ChartsLoading() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Loading state générique pour les cartes
export function CardLoading({ 
  title, 
  description, 
  contentHeight = "h-32" 
}: { 
  title?: string
  description?: string
  contentHeight?: string 
}) {
  return (
    <Card>
      <CardHeader>
        {title ? (
          <CardTitle>{title}</CardTitle>
        ) : (
          <Skeleton className="h-6 w-48" />
        )}
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : (
          <Skeleton className="h-4 w-64" />
        )}
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full ${contentHeight}`} />
      </CardContent>
    </Card>
  )
}

// Loading state pour les métriques
export function MetricsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}