"use client"

import React, { useState, useCallback, useRef } from 'react'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { EnhancedChart, AIAnnotation } from '@/lib/services/ai/enhanced-visualization-engine'
import { 
  Download, 
  FileImage, 
  FileText, 
  Database, 
  Share2,
  Settings,
  Check,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'

export interface ChartExportUtilityProps {
  enhancedChart: EnhancedChart
  onExport?: (config: ExportConfig) => Promise<void>
  onShare?: (config: ShareConfig) => Promise<void>
  className?: string
}

export interface ExportConfig {
  format: 'png' | 'svg' | 'pdf' | 'json' | 'csv' | 'excel'
  quality: 'low' | 'medium' | 'high'
  includeAnnotations: boolean
  includeInsights: boolean
  includeMetadata: boolean
  includeDataTable: boolean
  customTitle?: string
  customDescription?: string
  dimensions?: {
    width: number
    height: number
  }
  theme: 'light' | 'dark' | 'auto'
}

export interface ShareConfig {
  platform: 'email' | 'link' | 'embed' | 'social'
  includeData: boolean
  accessLevel: 'public' | 'private' | 'restricted'
  expirationDays?: number
}

const exportFormats = [
  { 
    value: 'png', 
    label: 'PNG Image', 
    icon: FileImage, 
    description: 'Image haute qualité pour présentations',
    size: 'Moyen'
  },
  { 
    value: 'svg', 
    label: 'SVG Vector', 
    icon: FileImage, 
    description: 'Format vectoriel redimensionnable',
    size: 'Petit'
  },
  { 
    value: 'pdf', 
    label: 'PDF Document', 
    icon: FileText, 
    description: 'Document complet avec insights',
    size: 'Grand'
  },
  { 
    value: 'json', 
    label: 'JSON Data', 
    icon: Database, 
    description: 'Données brutes et annotations',
    size: 'Petit'
  },
  { 
    value: 'csv', 
    label: 'CSV Data', 
    icon: Database, 
    description: 'Données tabulaires pour Excel',
    size: 'Petit'
  },
  { 
    value: 'excel', 
    label: 'Excel Workbook', 
    icon: Database, 
    description: 'Classeur avec graphiques et données',
    size: 'Moyen'
  }
]

const qualityOptions = [
  { value: 'low', label: 'Basse (72 DPI)', description: 'Rapide, fichier léger' },
  { value: 'medium', label: 'Moyenne (150 DPI)', description: 'Équilibre qualité/taille' },
  { value: 'high', label: 'Haute (300 DPI)', description: 'Impression professionnelle' }
]

const shareOptions = [
  { 
    value: 'email', 
    label: 'Email', 
    description: 'Envoyer par email avec pièce jointe' 
  },
  { 
    value: 'link', 
    label: 'Lien partageable', 
    description: 'Générer un lien de partage' 
  },
  { 
    value: 'embed', 
    label: 'Code d\'intégration', 
    description: 'Code HTML pour intégrer le graphique' 
  },
  { 
    value: 'social', 
    label: 'Réseaux sociaux', 
    description: 'Partager sur les réseaux sociaux' 
  }
]

export const ChartExportUtility: React.FC<ChartExportUtilityProps> = ({
  enhancedChart,
  onExport,
  onShare,
  className
}) => {
  const { announceToScreenReader } = useAccessibility()
  const [activeTab, setActiveTab] = useState<'export' | 'share'>('export')
  const [isExporting, setIsExporting] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [exportError, setExportError] = useState<string | null>(null)

  // Configuration d'export par défaut
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'png',
    quality: 'medium',
    includeAnnotations: true,
    includeInsights: true,
    includeMetadata: false,
    includeDataTable: false,
    theme: 'auto',
    dimensions: {
      width: 1200,
      height: 800
    }
  })

  // Configuration de partage par défaut
  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    platform: 'link',
    includeData: false,
    accessLevel: 'private',
    expirationDays: 30
  })

  // Gestionnaire d'export
  const handleExport = useCallback(async () => {
    if (!onExport) return

    setIsExporting(true)
    setExportProgress(0)
    setExportStatus('idle')
    setExportError(null)

    try {
      // Simulation du progrès
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      await onExport(exportConfig)

      clearInterval(progressInterval)
      setExportProgress(100)
      setExportStatus('success')
      
      announceToScreenReader(
        `Export ${exportConfig.format.toUpperCase()} terminé avec succès`
      )
    } catch (error) {
      setExportStatus('error')
      setExportError(error instanceof Error ? error.message : 'Erreur d\'export inconnue')
      
      announceToScreenReader(
        `Erreur lors de l'export: ${exportError}`
      )
    } finally {
      setIsExporting(false)
      setTimeout(() => {
        setExportProgress(0)
        setExportStatus('idle')
      }, 3000)
    }
  }, [onExport, exportConfig, exportError, announceToScreenReader])

  // Gestionnaire de partage
  const handleShare = useCallback(async () => {
    if (!onShare) return

    setIsSharing(true)
    
    try {
      await onShare(shareConfig)
      announceToScreenReader(
        `Partage configuré pour ${shareConfig.platform}`
      )
    } catch (error) {
      announceToScreenReader(
        `Erreur lors du partage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      )
    } finally {
      setIsSharing(false)
    }
  }, [onShare, shareConfig, announceToScreenReader])

  // Estimation de la taille du fichier
  const estimateFileSize = useCallback(() => {
    const baseSize = enhancedChart.aiAnnotations.length * 0.1 // KB par annotation
    const dataSize = enhancedChart.chartData ? 0.5 : 0 // KB pour les données
    
    let multiplier = 1
    switch (exportConfig.format) {
      case 'png':
        multiplier = exportConfig.quality === 'high' ? 3 : 
                    exportConfig.quality === 'medium' ? 2 : 1
        break
      case 'svg':
        multiplier = 0.3
        break
      case 'pdf':
        multiplier = 2.5
        break
      case 'json':
        multiplier = 0.2
        break
      case 'csv':
        multiplier = 0.1
        break
      case 'excel':
        multiplier = 1.5
        break
    }

    const totalSize = (baseSize + dataSize) * multiplier
    return totalSize < 1 ? `${Math.round(totalSize * 1000)} B` :
           totalSize < 1000 ? `${Math.round(totalSize)} KB` :
           `${Math.round(totalSize / 1000)} MB`
  }, [enhancedChart, exportConfig])

  // Rendu de l'onglet export
  const renderExportTab = () => (
    <div className="space-y-6">
      {/* Sélection du format */}
      <div>
        <Label className="text-base font-medium mb-3 block">Format d'export</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exportFormats.map((format) => {
            const Icon = format.icon
            const isSelected = exportConfig.format === format.value
            
            return (
              <Card
                key={format.value}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                )}
                onClick={() => setExportConfig(prev => ({ ...prev, format: format.value as any }))}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={cn(
                      'h-5 w-5 mt-0.5',
                      isSelected ? 'text-blue-600' : 'text-gray-500'
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium">{format.label}</h4>
                        <Badge variant="outline" className="text-xs">
                          {format.size}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Options de qualité (pour les formats image) */}
      {['png', 'pdf'].includes(exportConfig.format) && (
        <div>
          <Label className="text-base font-medium mb-3 block">Qualité</Label>
          <Select
            value={exportConfig.quality}
            onValueChange={(value) => setExportConfig(prev => ({ ...prev, quality: value as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {qualityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dimensions personnalisées */}
      {['png', 'svg', 'pdf'].includes(exportConfig.format) && (
        <div>
          <Label className="text-base font-medium mb-3 block">Dimensions</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width" className="text-sm">Largeur (px)</Label>
              <Input
                id="width"
                type="number"
                value={exportConfig.dimensions?.width || 1200}
                onChange={(e) => setExportConfig(prev => ({
                  ...prev,
                  dimensions: {
                    ...prev.dimensions!,
                    width: parseInt(e.target.value) || 1200
                  }
                }))}
                min={400}
                max={4000}
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-sm">Hauteur (px)</Label>
              <Input
                id="height"
                type="number"
                value={exportConfig.dimensions?.height || 800}
                onChange={(e) => setExportConfig(prev => ({
                  ...prev,
                  dimensions: {
                    ...prev.dimensions!,
                    height: parseInt(e.target.value) || 800
                  }
                }))}
                min={300}
                max={3000}
              />
            </div>
          </div>
        </div>
      )}

      {/* Options d'inclusion */}
      <div>
        <Label className="text-base font-medium mb-3 block">Contenu à inclure</Label>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="annotations"
              checked={exportConfig.includeAnnotations}
              onCheckedChange={(checked) => 
                setExportConfig(prev => ({ ...prev, includeAnnotations: !!checked }))
              }
            />
            <Label htmlFor="annotations" className="text-sm">
              Annotations IA ({enhancedChart.aiAnnotations.length})
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="insights"
              checked={exportConfig.includeInsights}
              onCheckedChange={(checked) => 
                setExportConfig(prev => ({ ...prev, includeInsights: !!checked }))
              }
            />
            <Label htmlFor="insights" className="text-sm">
              Insights et recommandations
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="metadata"
              checked={exportConfig.includeMetadata}
              onCheckedChange={(checked) => 
                setExportConfig(prev => ({ ...prev, includeMetadata: !!checked }))
              }
            />
            <Label htmlFor="metadata" className="text-sm">
              Métadonnées techniques
            </Label>
          </div>
          
          {['pdf', 'excel'].includes(exportConfig.format) && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dataTable"
                checked={exportConfig.includeDataTable}
                onCheckedChange={(checked) => 
                  setExportConfig(prev => ({ ...prev, includeDataTable: !!checked }))
                }
              />
              <Label htmlFor="dataTable" className="text-sm">
                Table de données
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* Thème */}
      <div>
        <Label className="text-base font-medium mb-3 block">Thème</Label>
        <Select
          value={exportConfig.theme}
          onValueChange={(value) => setExportConfig(prev => ({ ...prev, theme: value as any }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Clair</SelectItem>
            <SelectItem value="dark">Sombre</SelectItem>
            <SelectItem value="auto">Automatique</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Informations sur l'export */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Taille estimée:</span>
            <span className="font-medium">{estimateFileSize()}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span>Annotations incluses:</span>
            <span className="font-medium">
              {exportConfig.includeAnnotations ? enhancedChart.aiAnnotations.length : 0}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Bouton d'export */}
      <div className="space-y-3">
        {isExporting && (
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Export en cours...</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </div>
        )}
        
        {exportStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <Check className="h-4 w-4" />
            Export terminé avec succès
          </div>
        )}
        
        {exportStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            {exportError}
          </div>
        )}
        
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exporter en {exportConfig.format.toUpperCase()}
            </>
          )}
        </Button>
      </div>
    </div>
  )

  // Rendu de l'onglet partage
  const renderShareTab = () => (
    <div className="space-y-6">
      {/* Sélection de la plateforme */}
      <div>
        <Label className="text-base font-medium mb-3 block">Plateforme de partage</Label>
        <div className="space-y-2">
          {shareOptions.map((option) => (
            <Card
              key={option.value}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                shareConfig.platform === option.value && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
              )}
              onClick={() => setShareConfig(prev => ({ ...prev, platform: option.value as any }))}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{option.label}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                  {shareConfig.platform === option.value && (
                    <Check className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Options de partage */}
      <div>
        <Label className="text-base font-medium mb-3 block">Options de partage</Label>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeData"
              checked={shareConfig.includeData}
              onCheckedChange={(checked) => 
                setShareConfig(prev => ({ ...prev, includeData: !!checked }))
              }
            />
            <Label htmlFor="includeData" className="text-sm">
              Inclure les données brutes
            </Label>
          </div>
        </div>
      </div>

      {/* Niveau d'accès */}
      <div>
        <Label className="text-base font-medium mb-3 block">Niveau d'accès</Label>
        <Select
          value={shareConfig.accessLevel}
          onValueChange={(value) => setShareConfig(prev => ({ ...prev, accessLevel: value as any }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public - Accessible à tous</SelectItem>
            <SelectItem value="private">Privé - Lien requis</SelectItem>
            <SelectItem value="restricted">Restreint - Authentification requise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expiration */}
      {shareConfig.platform === 'link' && (
        <div>
          <Label className="text-base font-medium mb-3 block">Expiration du lien</Label>
          <Select
            value={shareConfig.expirationDays?.toString() || '30'}
            onValueChange={(value) => setShareConfig(prev => ({ 
              ...prev, 
              expirationDays: parseInt(value) 
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
              <SelectItem value="365">1 an</SelectItem>
              <SelectItem value="0">Jamais</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bouton de partage */}
      <Button
        onClick={handleShare}
        disabled={isSharing}
        className="w-full"
        size="lg"
      >
        {isSharing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Partage en cours...
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 mr-2" />
            Partager via {shareOptions.find(o => o.value === shareConfig.platform)?.label}
          </>
        )}
      </Button>
    </div>
  )

  return (
    <Card className={cn('chart-export-utility', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Export et partage
        </CardTitle>
        
        {/* Onglets */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('export')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'export' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Export
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'share' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Partage
          </button>
        </div>
      </CardHeader>
      
      <CardContent>
        {activeTab === 'export' ? renderExportTab() : renderShareTab()}
      </CardContent>
    </Card>
  )
}

export default ChartExportUtility