"use client"
import { useState, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  History, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  ShoppingCart,
  Euro,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { type HistoricalDataViewProps, type MarketAnalysisHistoryItem } from "@/types/vinted-market-analysis"


export default function HistoricalDataView({
  analyses,
  onLoadMore,
  hasMore,
  isLoading = false,
  onReload
}: HistoricalDataViewProps & { onReload?: () => void }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([])
  const deletionTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const { toast } = useToast()

  const handleUndo = (id: string) => {
    const timer = deletionTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      deletionTimers.current.delete(id)
    }
    setPendingDeletions(prev => prev.filter(pendingId => pendingId !== id))
  }

  const handleDelete = (id: string) => {
    setPendingDeletions(prev => [...prev, id])

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/market-analysis?id=${id}`, { method: "DELETE" })
        if (res.ok) {
          toast({
            title: "Analyse supprimée",
            description: "L'article a été supprimé avec succès.",
            variant: "default"
          })
          if (onReload) onReload()
        } else {
          handleUndo(id)
          toast({
            title: "Erreur",
            description: "Erreur lors de la suppression.",
            variant: "destructive"
          })
        }
      } catch (e) {
        handleUndo(id)
        toast({
          title: "Erreur réseau",
          description: "Impossible de supprimer l'analyse.",
          variant: "destructive"
        })
      }
      deletionTimers.current.delete(id)
    }, 5000)

    deletionTimers.current.set(id, timer)
  }

  const filteredAnalyses = analyses
    .filter(analysis => {
      const matchesSearch = analysis.productName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || analysis.status === statusFilter
      return matchesSearch && matchesStatus
    })

  const formatPrice = (price: number) => `${price.toFixed(2)} €`
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: MarketAnalysisHistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En cours</Badge>
      case 'failed':
        return <Badge variant="destructive">Échec</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="h-4 w-4 text-muted-foreground" />
    
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    } else {
      return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const calculateTrendPercentage = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null
    const change = ((current - previous) / previous) * 100
    return change.toFixed(1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique des analyses
        </CardTitle>
        <CardDescription>
          Consultez vos analyses précédentes et suivez l'évolution des prix
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Animation CSS globale */}
        <style jsx global>{`
          @keyframes progressBar {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="pending">En cours</SelectItem>
                <SelectItem value="failed">Échec</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistiques rapides */}
        {analyses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{analyses.length}</p>
                <p className="text-xs text-muted-foreground">Analyses totales</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {analyses.filter(a => a.status === 'completed').length}
                </p>
                <p className="text-xs text-muted-foreground">Analyses réussies</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Euro className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {formatPrice(
                    analyses
                      .filter(a => a.status === 'completed')
                      .reduce((sum, a) => sum + a.avgPrice, 0) / 
                    Math.max(analyses.filter(a => a.status === 'completed').length, 1)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Prix moyen global</p>
              </div>
            </div>
          </div>
        )}

        {/* Table des analyses */}
        {filteredAnalyses.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm || statusFilter !== "all" 
                ? "Aucun résultat trouvé" 
                : "Aucune analyse disponible"
              }
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Essayez de modifier vos critères de recherche"
                : "Commencez par créer votre première analyse de marché"
              }
            </p>
            {(searchTerm || statusFilter !== "all") && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                }}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Prix moyen</TableHead>
                  <TableHead>Tendance</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnalyses.map((analysis, index) => {
                  const previousAnalysis = filteredAnalyses[index + 1]
                  const trendPercentage = calculateTrendPercentage(
                    analysis.avgPrice,
                    previousAnalysis?.avgPrice
                  )
                
                  const isPending = pendingDeletions.includes(analysis.id)
                
                  return (
                    <TableRow
                      key={analysis.id}
                      className={`cursor-pointer hover:bg-muted/50 transition-all duration-500 ${
                        isPending ? "opacity-50 relative" : ""
                      }`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{analysis.productName}</p>
                          {analysis.error && (
                            <p className="text-xs text-red-600 mt-1">{analysis.error}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(analysis.status)}
                      </TableCell>
                      <TableCell>
                        {analysis.status === 'completed' ? (
                          <div className="flex items-center gap-1">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            {analysis.salesVolume}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {analysis.status === 'completed' ? (
                          <div className="flex items-center gap-1">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            {formatPrice(analysis.avgPrice)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {analysis.status === 'completed' ? (
                          <div className="flex items-center gap-1">
                            {getTrendIcon(analysis.avgPrice, previousAnalysis?.avgPrice)}
                            {trendPercentage && (
                              <span className={`text-xs ${
                                parseFloat(trendPercentage) > 0
                                  ? 'text-green-600'
                                  : parseFloat(trendPercentage) < 0
                                    ? 'text-red-600'
                                    : 'text-muted-foreground'
                              }`}>
                                {parseFloat(trendPercentage) > 0 ? '+' : ''}{trendPercentage}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(analysis.createdAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {!analysis.id.startsWith("temp-") && !isPending && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(analysis.id)}
                          >
                            Supprimer
                          </Button>
                        )}
                        {isPending && (
                          <div className="flex items-center gap-2">
                            <div className="relative w-20 h-2 bg-muted rounded overflow-hidden mr-2">
                              <div
                                className="absolute left-0 top-0 h-2 bg-red-400 animate-progress"
                                style={{
                                  animation: "progressBar 5s linear forwards"
                                }}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUndo(analysis.id)}
                            >
                              Annuler
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Bouton charger plus */}
        {hasMore && filteredAnalyses.length > 0 && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Charger plus d'analyses
                </>
              )}
            </Button>
          </div>
        )}

        {/* Message si pas plus de données */}
        {!hasMore && filteredAnalyses.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Toutes les analyses ont été chargées
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}