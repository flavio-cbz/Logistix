"use client"

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibility } from '@/lib/contexts/accessibility-context'
import { cn } from '@/lib/utils'
import { EnhancedChart, ChartExportOptions, ExportResult } from '@/lib/services/ai/enhanced-visualization-engine'
import { chartExportService } from '@/lib/services/ai/chart-export-service'

export interface ChartExportDialogProps {
  isOpen: boolean
  onClose: () => void
  charts: EnhancedChart[]
  selectedCharts?: string[]
  onExportComplete?: (result: ExportResult) => void
  onExportError?: (error: string) => void
}

interface ExportProgress {
  isExporting: boolean
  progress: number
  currentStep: string
  estimatedTimeRemaining?: number
}

export const ChartExportDialog: React.FC<ChartExportDialogProps> = ({
  isOpen,
  onClose,
  charts,
  selectedCharts,
  onExportComplete,
  onExportError
}) => {
  const { announceToScreenReader, preferences } = useAccessibility()
  const [exportOptions, setExportOptions] = useState<ChartExportOptions>({
    format: 'pdf',
    includeAnnotations: true,
    includeInsights: true,
    includeRawData: false,
    customization: {
      title: '',
      subtitle: '',
      branding: true,
      colorScheme: 'light'
    }
  })
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    progress: 0,
    currentStep: ''
  })
  const [previewMode, setPreviewMode] = useState(false)

  // Graphiques à exporter (sélectionnés ou tous)
  const chartsToExport = selectedCharts 
    ? charts.filter(chart => selectedCharts.includes(chart.id))
    : charts

  // Gestionnaire d'export
  const handleExport = useCallback(async () => {
    if (chartsToExport.length === 0) {
      onExportError?.('Aucun graphique sélectionné pour l\'export')
      return
    }

    setExportProgress({
      isExporting: true,
      progress: 0,
      currentStep: 'Préparation de l\'export...'
    })

    try {
      let result: ExportResult

      if (chartsToExport.length === 1) {
        // Export d'un seul graphique
        setExportProgress(prev => ({ ...prev, progress: 25, currentStep: 'Génération du graphique...' }))
        result = await chartExportService.exportChart(chartsToExport[0], exportOptions)
      } else {
        // Export multiple
        setExportProgress(prev => ({ ...prev, progress: 25, currentStep: 'Génération des graphiques...' }))
        result = await chartExportService.exportMultipleCharts(chartsToExport, exportOptions)
      }

      setExportProgress(prev => ({ ...prev, progress: 75, currentStep: 'Finalisation...' }))

      // Simuler un délai pour l'UX
      await new Promise(resolve => setTimeout(resolve, 500))

      setExportProgress(prev => ({ ...prev, progress: 100, currentStep: 'Export terminé!' }))

      if (result.success) {
        onExportComplete?.(result)
        announceToScreenReader('Export terminé avec succès')
        
        // Télécharger automatiquement
        if (result.downloadUrl) {
          const link = document.createElement('a')
          link.href = result.downloadUrl
          link.download = result.filePath || 'export'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
        
        // Fermer le dialog après un délai
        setTimeout(() => {
          onClose()
          setExportProgress({ isExporting: false, progress: 0, currentStep: '' })
        }, 1500)
      } else {
        throw new Error(result.error || 'Erreur inconnue lors de l\'export')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'export'
      onExportError?.(errorMessage)
      announceToScreenReader(`Erreur d'export: ${errorMessage}`)
      setExportProgress({ isExporting: false, progress: 0, currentStep: '' })
    }
  }, [chartsToExport, exportOptions, onExportComplete, onExportError, onClose, announceToScreenReader])

  // Gestionnaire de changement d'options
  const handleOptionChange = useCallback((key: keyof ChartExportOptions, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleCustomizationChange = useCallback((key: string, value: any) => {
    setExportOptions(prev => ({
      ...prev,
      customization: {
        ...prev.customization,
        [key]: value
      }
    }))
  }, [])

  // Estimation de la taille du fichier
  const estimateFileSize = useCallback(() => {
    const baseSize = chartsToExport.length * 50 // KB par graphique
    let multiplier = 1

    if (exportOptions.includeAnnotations) multiplier += 0.3
    if (exportOptions.includeInsights) multiplier += 0.2
    if (exportOptions.includeRawData) multiplier += 0.5

    switch (exportOptions.format) {
      case 'pdf': multiplier *= 2
        break
      case 'excel': multiplier *= 1.5
        break
      case 'png': multiplier *= 3
        break
      case 'svg': multiplier *= 0.8
        break
      case 'json': multiplier *= 0.5
        break
    }

    const estimatedSize = Math.round(baseSize * multiplier)
    return estimatedSize > 1024 ? `${(estimatedSize / 1024).toFixed(1)} MB` : `${estimatedSize} KB`
  }, [chartsToExport.length, exportOptions])

  // Rendu des options de format
  const renderFormatOptions = () => {
    const formats = [
      { key: 'pdf', label: 'PDF', description: 'Document portable avec mise en page', icon: '📄' },
      { key: 'excel', label: 'Excel', description: 'Données structurées et insights', icon: '📊' },
      { key: 'json', label: 'JSON', description: 'Données brutes pour intégration', icon: '🔧' },
      { key: 'png', label: 'PNG', description: 'Image haute qualité', icon: '🖼️' },
      { key: 'svg', label: 'SVG', description: 'Graphique vectoriel', icon: '🎨' }
    ]

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Format d'export</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {formats.map(format => (
            <label
              key={format.key}
              className={cn(
                'flex items-center p-3 border rounded-lg cursor-pointer transition-colors',
                exportOptions.format === format.key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <input
                type="radio"
                name="format"
                value={format.key}
                checked={exportOptions.format === format.key}
                onChange={(e) => handleOptionChange('format', e.target.value)}
                className="sr-only"
              />
              <span className="text-lg mr-3">{format.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{format.label}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {format.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    )
  }

  // Rendu des options d'inclusion
  const renderInclusionOptions = () => {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Contenu à inclure</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={exportOptions.includeAnnotations}
              onChange={(e) => handleOptionChange('includeAnnotations', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">
              Annotations IA ({chartsToExport.reduce((sum, chart) => sum + chart.aiAnnotations.length, 0)} total)
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={exportOptions.includeInsights}
              onChange={(e) => handleOptionChange('includeInsights', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Insights et recommandations IA</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={exportOptions.includeRawData}
              onChange={(e) => handleOptionChange('includeRawData', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Données brutes (augmente la taille du fichier)</span>
          </label>
        </div>
      </div>
    )
  }

  // Rendu des options de personnalisation
  const renderCustomizationOptions = () => {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Personnalisation</h4>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Titre personnalisé</label>
            <input
              type="text"
              value={exportOptions.customization?.title || ''}
              onChange={(e) => handleCustomizationChange('title', e.target.value)}
              placeholder="Laisser vide pour utiliser le titre par défaut"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Sous-titre</label>
            <input
              type="text"
              value={exportOptions.customization?.subtitle || ''}
              onChange={(e) => handleCustomizationChange('subtitle', e.target.value)}
              placeholder="Sous-titre optionnel"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Thème de couleur</label>
            <select
              value={exportOptions.customization?.colorScheme || 'light'}
              onChange={(e) => handleCustomizationChange('colorScheme', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            >
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
              <option value="custom">Personnalisé</option>
            </select>
          </div>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={exportOptions.customization?.branding ?? true}
              onChange={(e) => handleCustomizationChange('branding', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Inclure le branding</span>
          </label>
        </div>
      </div>
    )
  }

  // Rendu de la barre de progression
  const renderProgressBar = () => {
    if (!exportProgress.isExporting) return null

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Export en cours...</span>
          <span className="text-sm text-gray-600">{exportProgress.progress}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${exportProgress.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        
        <div className="text-sm text-gray-600 text-center">
          {exportProgress.currentStep}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Overlay */}
        <motion.div
          className="absolute inset-0 bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!exportProgress.isExporting ? onClose : undefined}
        />

        {/* Dialog */}
        <motion.div
          className={cn(
            'relative bg-white dark:bg-gray-800 rounded-lg shadow-xl',
            'w-full max-w-2xl max-h-[90vh] overflow-y-auto',
            'mx-4 p-6'
          )}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: preferences.reducedMotion ? 0 : 0.2 }}
        >
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Exporter les graphiques</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {chartsToExport.length} graphique{chartsToExport.length > 1 ? 's' : ''} sélectionné{chartsToExport.length > 1 ? 's' : ''}
              </p>
            </div>
            
            {!exportProgress.isExporting && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Fermer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Contenu */}
          <div className="space-y-6">
            {/* Liste des graphiques */}
            <div>
              <h4 className="font-medium text-sm mb-3">Graphiques à exporter</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {chartsToExport.map(chart => (
                  <div key={chart.id} className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm font-medium flex-1">{chart.title}</span>
                    <span className="text-xs text-gray-500">
                      {chart.aiAnnotations.length} annotations
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Options d'export */}
            {!exportProgress.isExporting && (
              <>
                {renderFormatOptions()}
                {renderInclusionOptions()}
                {renderCustomizationOptions()}
                
                {/* Informations sur l'export */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>Taille estimée:</span>
                    <span className="font-medium">{estimateFileSize()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span>Annotations incluses:</span>
                    <span className="font-medium">
                      {exportOptions.includeAnnotations 
                        ? chartsToExport.reduce((sum, chart) => sum + chart.aiAnnotations.length, 0)
                        : 0}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Barre de progression */}
            {renderProgressBar()}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {!exportProgress.isExporting ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleExport}
                  disabled={chartsToExport.length === 0}
                  className={cn(
                    'px-4 py-2 text-sm rounded-md text-white',
                    chartsToExport.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  Exporter ({exportOptions.format.toUpperCase()})
                </button>
              </>
            ) : (
              <div className="text-sm text-gray-600">
                Export en cours, veuillez patienter...
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ChartExportDialog