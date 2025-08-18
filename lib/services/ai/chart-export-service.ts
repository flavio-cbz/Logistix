import { EnhancedChart, ComparisonChart, ChartExportOptions, ExportResult } from './enhanced-visualization-engine'
import { VintedAnalysisResult } from '@/types/vinted-market-analysis'
import { AIAnalysisError } from './ai-errors'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

/**
 * Service d'export pour les graphiques enrichis avec insights IA
 */
export class ChartExportService {
  private static instance: ChartExportService

  public static getInstance(): ChartExportService {
    if (!ChartExportService.instance) {
      ChartExportService.instance = new ChartExportService()
    }
    return ChartExportService.instance
  }

  /**
   * Exporte un graphique enrichi dans le format spécifié
   */
  async exportChart(
    chart: EnhancedChart,
    options: ChartExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now()

    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportToPDF(chart, options)
        case 'excel':
          return await this.exportToExcel(chart, options)
        case 'json':
          return await this.exportToJSON(chart, options)
        case 'png':
          return await this.exportToPNG(chart, options)
        case 'svg':
          return await this.exportToSVG(chart, options)
        default:
          throw new AIAnalysisError(
            `Format d'export non supporté: ${options.format}`,
            'UNSUPPORTED_FORMAT' as any
          )
      }
    } catch (error) {
      throw new AIAnalysisError(
        `Erreur lors de l'export: ${error.message}`,
        'EXPORT_FAILED' as any,
        { retryable: true, cause: error }
      )
    }
  }

  /**
   * Exporte plusieurs graphiques dans un seul fichier
   */
  async exportMultipleCharts(
    charts: EnhancedChart[],
    options: ChartExportOptions
  ): Promise<ExportResult> {
    try {
      switch (options.format) {
        case 'pdf':
          return await this.exportMultipleToPDF(charts, options)
        case 'excel':
          return await this.exportMultipleToExcel(charts, options)
        case 'json':
          return await this.exportMultipleToJSON(charts, options)
        default:
          throw new AIAnalysisError(
            `Export multiple non supporté pour le format: ${options.format}`,
            'UNSUPPORTED_OPERATION' as any
          )
      }
    } catch (error) {
      throw new AIAnalysisError(
        `Erreur lors de l'export multiple: ${error.message}`,
        'EXPORT_FAILED' as any,
        { retryable: true, cause: error }
      )
    }
  }

  /**
   * Export PDF avec insights IA inclus
   */
  private async exportToPDF(
    chart: EnhancedChart,
    options: ChartExportOptions
  ): Promise<ExportResult> {
    const pdf = new jsPDF('landscape', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    let yPosition = 20

    // Titre personnalisé ou titre du graphique
    const title = options.customization?.title || chart.title
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 15

    // Sous-titre
    if (options.customization?.subtitle) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text(options.customization.subtitle, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10
    }

    // Description
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const descriptionLines = pdf.splitTextToSize(chart.description, pageWidth - 40)
    pdf.text(descriptionLines, 20, yPosition)
    yPosition += descriptionLines.length * 5 + 10

    // Métadonnées
    pdf.setFontSize(8)
    pdf.setTextColor(100)
    pdf.text(`Généré le: ${new Date(chart.metadata.generatedAt).toLocaleString()}`, 20, yPosition)
    pdf.text(`Confiance: ${(chart.metadata.confidence * 100).toFixed(0)}%`, 120, yPosition)
    pdf.text(`Qualité des données: ${(chart.metadata.dataQuality * 100).toFixed(0)}%`, 200, yPosition)
    yPosition += 15

    // Espace pour le graphique (placeholder - dans une vraie implémentation, on utiliserait html2canvas)
    pdf.setDrawColor(200)
    pdf.rect(20, yPosition, pageWidth - 40, 100)
    pdf.setFontSize(12)
    pdf.setTextColor(150)
    pdf.text('Graphique (nécessite html2canvas pour le rendu)', pageWidth / 2, yPosition + 50, { align: 'center' })
    yPosition += 110

    // Insights IA si inclus
    if (options.includeInsights) {
      yPosition = this.addInsightsToPDF(pdf, chart, yPosition, pageWidth)
    }

    // Annotations IA si incluses
    if (options.includeAnnotations && chart.aiAnnotations.length > 0) {
      yPosition = this.addAnnotationsToPDF(pdf, chart, yPosition, pageWidth)
    }

    // Données brutes si incluses
    if (options.includeRawData) {
      yPosition = this.addRawDataToPDF(pdf, chart, yPosition, pageWidth)
    }

    // Branding si activé
    if (options.customization?.branding) {
      pdf.setFontSize(8)
      pdf.setTextColor(150)
      pdf.text('Généré par l\'IA d\'analyse de marché', pageWidth - 20, pageHeight - 10, { align: 'right' })
    }

    const pdfBlob = pdf.output('blob')
    const fileName = `${this.sanitizeFileName(chart.title)}_${Date.now()}.pdf`
    
    return {
      success: true,
      filePath: fileName,
      downloadUrl: URL.createObjectURL(pdfBlob),
      metadata: {
        format: 'pdf',
        fileSize: pdfBlob.size,
        generatedAt: new Date().toISOString(),
        includesAI: options.includeAnnotations || options.includeInsights
      }
    }
  }

  /**
   * Export Excel avec données structurées et insights
   */
  private async exportToExcel(
    chart: EnhancedChart,
    options: ChartExportOptions
  ): Promise<ExportResult> {
    const workbook = XLSX.utils.book_new()

    // Feuille principale avec les données du graphique
    const mainData = this.prepareChartDataForExcel(chart)
    const mainSheet = XLSX.utils.json_to_sheet(mainData)
    XLSX.utils.book_append_sheet(workbook, mainSheet, 'Données')

    // Feuille des insights IA si inclus
    if (options.includeInsights) {
      const insightsData = this.prepareInsightsForExcel(chart)
      const insightsSheet = XLSX.utils.json_to_sheet(insightsData)
      XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Insights IA')
    }

    // Feuille des annotations si incluses
    if (options.includeAnnotations && chart.aiAnnotations.length > 0) {
      const annotationsData = chart.aiAnnotations.map(annotation => ({
        'ID': annotation.id,
        'Type': annotation.type,
        'Titre': annotation.title,
        'Description': annotation.description,
        'Position X': annotation.position.x,
        'Position Y': annotation.position.y,
        'Confiance': (annotation.confidence * 100).toFixed(1) + '%',
        'Priorité': annotation.priority,
        'Actionnable': annotation.actionable ? 'Oui' : 'Non'
      }))
      const annotationsSheet = XLSX.utils.json_to_sheet(annotationsData)
      XLSX.utils.book_append_sheet(workbook, annotationsSheet, 'Annotations')
    }

    // Feuille de métadonnées
    const metadataData = [{
      'Titre': chart.title,
      'Description': chart.description,
      'Type': chart.type,
      'Généré le': new Date(chart.metadata.generatedAt).toLocaleString(),
      'Confiance': (chart.metadata.confidence * 100).toFixed(1) + '%',
      'Qualité des données': (chart.metadata.dataQuality * 100).toFixed(1) + '%',
      'Temps de traitement': chart.metadata.processingTime + 'ms',
      'Nombre d\'annotations': chart.aiAnnotations.length
    }]
    const metadataSheet = XLSX.utils.json_to_sheet(metadataData)
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Métadonnées')

    // Générer le fichier
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const fileName = `${this.sanitizeFileName(chart.title)}_${Date.now()}.xlsx`

    return {
      success: true,
      filePath: fileName,
      downloadUrl: URL.createObjectURL(blob),
      metadata: {
        format: 'excel',
        fileSize: blob.size,
        generatedAt: new Date().toISOString(),
        includesAI: options.includeAnnotations || options.includeInsights
      }
    }
  }

  /**
   * Export JSON avec structure complète
   */
  private async exportToJSON(
    chart: EnhancedChart,
    options: ChartExportOptions
  ): Promise<ExportResult> {
    const exportData: any = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        options: options,
        version: '1.0'
      },
      chart: {
        id: chart.id,
        type: chart.type,
        title: options.customization?.title || chart.title,
        description: chart.description
      }
    }

    // Données du graphique
    exportData.chartData = chart.chartData

    // Insights si inclus
    if (options.includeInsights) {
      exportData.insights = chart.insights
    }

    // Annotations si incluses
    if (options.includeAnnotations) {
      exportData.annotations = chart.aiAnnotations
    }

    // Éléments interactifs
    exportData.interactiveElements = chart.interactiveElements

    // Métadonnées du graphique
    exportData.chartMetadata = chart.metadata

    // Données brutes si incluses
    if (options.includeRawData && chart.chartData) {
      exportData.rawData = chart.chartData
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const fileName = `${this.sanitizeFileName(chart.title)}_${Date.now()}.json`

    return {
      success: true,
      filePath: fileName,
      downloadUrl: URL.createObjectURL(blob),
      metadata: {
        format: 'json',
        fileSize: blob.size,
        generatedAt: new Date().toISOString(),
        includesAI: options.includeAnnotations || options.includeInsights
      }
    }
  }

  /**
   * Export PNG (nécessite html2canvas en production)
   */
  private async exportToPNG(
    chart: EnhancedChart,
    options: ChartExportOptions
  ): Promise<ExportResult> {
    // Dans une vraie implémentation, on utiliserait html2canvas pour capturer le DOM
    // Pour l'instant, on simule avec un canvas simple
    
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')!

    // Fond
    ctx.fillStyle = options.customization?.colorScheme === 'dark' ? '#1f2937' : '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Titre
    ctx.fillStyle = options.customization?.colorScheme === 'dark' ? '#ffffff' : '#000000'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(options.customization?.title || chart.title, canvas.width / 2, 40)

    // Placeholder pour le graphique
    ctx.strokeStyle = '#cccccc'
    ctx.strokeRect(50, 80, canvas.width - 100, canvas.height - 160)
    ctx.font = '16px Arial'
    ctx.fillText('Graphique (nécessite html2canvas)', canvas.width / 2, canvas.height / 2)

    // Annotations si incluses
    if (options.includeAnnotations) {
      ctx.font = '12px Arial'
      ctx.fillText(`${chart.aiAnnotations.length} annotations IA`, canvas.width / 2, canvas.height - 40)
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve({
            success: false,
            error: 'Erreur lors de la génération PNG',
            metadata: {
              format: 'png',
              fileSize: 0,
              generatedAt: new Date().toISOString(),
              includesAI: false
            }
          })
          return
        }

        const fileName = `${this.sanitizeFileName(chart.title)}_${Date.now()}.png`
        resolve({
          success: true,
          filePath: fileName,
          downloadUrl: URL.createObjectURL(blob),
          metadata: {
            format: 'png',
            fileSize: blob.size,
            generatedAt: new Date().toISOString(),
            includesAI: options.includeAnnotations || options.includeInsights
          }
        })
      }, 'image/png')
    })
  }

  /**
   * Export SVG
   */
  private async exportToSVG(
    chart: EnhancedChart,
    options: ChartExportOptions
  ): Promise<ExportResult> {
    const width = 800
    const height = 600

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`
    
    // Fond
    const bgColor = options.customization?.colorScheme === 'dark' ? '#1f2937' : '#ffffff'
    svg += `<rect width="100%" height="100%" fill="${bgColor}"/>`

    // Titre
    const textColor = options.customization?.colorScheme === 'dark' ? '#ffffff' : '#000000'
    svg += `<text x="${width/2}" y="40" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="${textColor}">`
    svg += options.customization?.title || chart.title
    svg += '</text>'

    // Placeholder pour le graphique
    svg += `<rect x="50" y="80" width="${width-100}" height="${height-160}" fill="none" stroke="#cccccc" stroke-width="2"/>`
    svg += `<text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="16" fill="${textColor}">Graphique SVG</text>`

    // Annotations si incluses
    if (options.includeAnnotations && chart.aiAnnotations.length > 0) {
      chart.aiAnnotations.forEach((annotation, index) => {
        const x = (annotation.position.x / 100) * (width - 100) + 50
        const y = (annotation.position.y / 100) * (height - 160) + 80
        
        // Point d'annotation
        svg += `<circle cx="${x}" cy="${y}" r="8" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>`
        
        // Texte d'annotation
        svg += `<text x="${x + 15}" y="${y + 5}" font-family="Arial" font-size="12" fill="${textColor}">`
        svg += annotation.title
        svg += '</text>'
      })
    }

    svg += '</svg>'

    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const fileName = `${this.sanitizeFileName(chart.title)}_${Date.now()}.svg`

    return {
      success: true,
      filePath: fileName,
      downloadUrl: URL.createObjectURL(blob),
      metadata: {
        format: 'svg',
        fileSize: blob.size,
        generatedAt: new Date().toISOString(),
        includesAI: options.includeAnnotations || options.includeInsights
      }
    }
  }

  /**
   * Export multiple de graphiques en PDF
   */
  private async exportMultipleToPDF(
    charts: EnhancedChart[],
    options: ChartExportOptions
  ): Promise<ExportResult> {
    const pdf = new jsPDF('landscape', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Page de titre
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Rapport d\'analyse de marché avec IA', pageWidth / 2, 50, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Généré le ${new Date().toLocaleString()}`, pageWidth / 2, 70, { align: 'center' })
    pdf.text(`${charts.length} graphiques inclus`, pageWidth / 2, 85, { align: 'center' })

    // Sommaire
    let yPos = 110
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Sommaire', 20, yPos)
    yPos += 15

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    charts.forEach((chart, index) => {
      pdf.text(`${index + 1}. ${chart.title}`, 25, yPos)
      yPos += 8
    })

    // Ajouter chaque graphique sur une nouvelle page
    charts.forEach((chart, index) => {
      pdf.addPage()
      this.addChartToPDF(pdf, chart, options, index + 1)
    })

    const pdfBlob = pdf.output('blob')
    const fileName = `rapport_analyse_marche_${Date.now()}.pdf`

    return {
      success: true,
      filePath: fileName,
      downloadUrl: URL.createObjectURL(pdfBlob),
      metadata: {
        format: 'pdf',
        fileSize: pdfBlob.size,
        generatedAt: new Date().toISOString(),
        includesAI: true
      }
    }
  }

  /**
   * Export multiple en Excel
   */
  private async exportMultipleToExcel(
    charts: EnhancedChart[],
    options: ChartExportOptions
  ): Promise<ExportResult> {
    const workbook = XLSX.utils.book_new()

    // Feuille de sommaire
    const summaryData = charts.map((chart, index) => ({
      'N°': index + 1,
      'Titre': chart.title,
      'Type': chart.type,
      'Annotations': chart.aiAnnotations.length,
      'Confiance': (chart.metadata.confidence * 100).toFixed(1) + '%',
      'Généré le': new Date(chart.metadata.generatedAt).toLocaleString()
    }))
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Sommaire')

    // Une feuille par graphique
    charts.forEach((chart, index) => {
      const chartData = this.prepareChartDataForExcel(chart)
      const chartSheet = XLSX.utils.json_to_sheet(chartData)
      const sheetName = `Graphique ${index + 1}`.substring(0, 31) // Limite Excel
      XLSX.utils.book_append_sheet(workbook, chartSheet, sheetName)

      // Feuille des annotations pour ce graphique
      if (options.includeAnnotations && chart.aiAnnotations.length > 0) {
        const annotationsData = chart.aiAnnotations.map(annotation => ({
          'Type': annotation.type,
          'Titre': annotation.title,
          'Description': annotation.description,
          'Confiance': (annotation.confidence * 100).toFixed(1) + '%',
          'Priorité': annotation.priority
        }))
        const annotationsSheet = XLSX.utils.json_to_sheet(annotationsData)
        const annotationSheetName = `Annotations ${index + 1}`.substring(0, 31)
        XLSX.utils.book_append_sheet(workbook, annotationsSheet, annotationSheetName)
      }
    })

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const fileName = `rapport_analyse_marche_${Date.now()}.xlsx`

    return {
      success: true,
      filePath: fileName,
      downloadUrl: URL.createObjectURL(blob),
      metadata: {
        format: 'excel',
        fileSize: blob.size,
        generatedAt: new Date().toISOString(),
        includesAI: options.includeAnnotations || options.includeInsights
      }
    }
  }

  /**
   * Export multiple en JSON
   */
  private async exportMultipleToJSON(
    charts: EnhancedChart[],
    options: ChartExportOptions
  ): Promise<ExportResult> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        chartCount: charts.length,
        options: options,
        version: '1.0'
      },
      charts: charts.map(chart => ({
        id: chart.id,
        type: chart.type,
        title: chart.title,
        description: chart.description,
        chartData: chart.chartData,
        insights: options.includeInsights ? chart.insights : undefined,
        annotations: options.includeAnnotations ? chart.aiAnnotations : undefined,
        interactiveElements: chart.interactiveElements,
        metadata: chart.metadata
      }))
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const fileName = `rapport_analyse_marche_${Date.now()}.json`

    return {
      success: true,
      filePath: fileName,
      downloadUrl: URL.createObjectURL(blob),
      metadata: {
        format: 'json',
        fileSize: blob.size,
        generatedAt: new Date().toISOString(),
        includesAI: options.includeAnnotations || options.includeInsights
      }
    }
  }

  // Méthodes utilitaires

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase()
  }

  private addInsightsToPDF(pdf: any, chart: EnhancedChart, yPosition: number, pageWidth: number): number {
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0)
    pdf.text('Insights IA', 20, yPosition)
    yPosition += 10

    // Résumé
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const summaryLines = pdf.splitTextToSize(chart.insights.summary, pageWidth - 40)
    pdf.text(summaryLines, 20, yPosition)
    yPosition += summaryLines.length * 5 + 5

    // Principales découvertes
    if (chart.insights.keyFindings.length > 0) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Principales découvertes:', 20, yPosition)
      yPosition += 7

      pdf.setFont('helvetica', 'normal')
      chart.insights.keyFindings.forEach(finding => {
        const findingLines = pdf.splitTextToSize(`• ${finding}`, pageWidth - 50)
        pdf.text(findingLines, 25, yPosition)
        yPosition += findingLines.length * 5 + 2
      })
      yPosition += 5
    }

    // Recommandations
    if (chart.insights.recommendations.length > 0) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Recommandations:', 20, yPosition)
      yPosition += 7

      pdf.setFont('helvetica', 'normal')
      chart.insights.recommendations.forEach(rec => {
        const recLines = pdf.splitTextToSize(`→ ${rec}`, pageWidth - 50)
        pdf.text(recLines, 25, yPosition)
        yPosition += recLines.length * 5 + 2
      })
      yPosition += 10
    }

    return yPosition
  }

  private addAnnotationsToPDF(pdf: any, chart: EnhancedChart, yPosition: number, pageWidth: number): number {
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(0)
    pdf.text('Annotations IA', 20, yPosition)
    yPosition += 10

    chart.aiAnnotations.forEach((annotation, index) => {
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${index + 1}. ${annotation.title}`, 20, yPosition)
      yPosition += 6

      pdf.setFont('helvetica', 'normal')
      const descLines = pdf.splitTextToSize(annotation.description, pageWidth - 50)
      pdf.text(descLines, 25, yPosition)
      yPosition += descLines.length * 5

      pdf.setFontSize(8)
      pdf.setTextColor(100)
      pdf.text(`Type: ${annotation.type} | Confiance: ${(annotation.confidence * 100).toFixed(0)}% | Priorité: ${annotation.priority}`, 25, yPosition)
      yPosition += 8
      pdf.setTextColor(0)
    })

    return yPosition
  }

  private addRawDataToPDF(pdf: any, chart: EnhancedChart, yPosition: number, pageWidth: number): number {
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Données brutes', 20, yPosition)
    yPosition += 10

    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    const dataString = JSON.stringify(chart.chartData, null, 2)
    const dataLines = pdf.splitTextToSize(dataString, pageWidth - 40)
    
    // Limiter à 50 lignes pour éviter un PDF trop long
    const limitedLines = dataLines.slice(0, 50)
    pdf.text(limitedLines, 20, yPosition)
    
    if (dataLines.length > 50) {
      yPosition += limitedLines.length * 3 + 5
      pdf.text('... (données tronquées)', 20, yPosition)
    }

    return yPosition + limitedLines.length * 3 + 10
  }

  private addChartToPDF(pdf: any, chart: EnhancedChart, options: ChartExportOptions, pageNumber: number): void {
    const pageWidth = pdf.internal.pageSize.getWidth()
    let yPosition = 20

    // Titre du graphique
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${pageNumber}. ${chart.title}`, 20, yPosition)
    yPosition += 15

    // Description
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const descLines = pdf.splitTextToSize(chart.description, pageWidth - 40)
    pdf.text(descLines, 20, yPosition)
    yPosition += descLines.length * 5 + 15

    // Espace pour le graphique
    pdf.setDrawColor(200)
    pdf.rect(20, yPosition, pageWidth - 40, 80)
    pdf.setFontSize(12)
    pdf.setTextColor(150)
    pdf.text('Graphique', pageWidth / 2, yPosition + 40, { align: 'center' })
    yPosition += 90

    // Ajouter les insights et annotations
    if (options.includeInsights) {
      yPosition = this.addInsightsToPDF(pdf, chart, yPosition, pageWidth)
    }

    if (options.includeAnnotations && chart.aiAnnotations.length > 0) {
      yPosition = this.addAnnotationsToPDF(pdf, chart, yPosition, pageWidth)
    }
  }

  private prepareChartDataForExcel(chart: EnhancedChart): any[] {
    // Adapter selon le type de graphique
    switch (chart.type) {
      case 'price-distribution':
        const { bins } = chart.chartData
        return bins?.map((bin: any, index: number) => ({
          'Tranche': `${bin.min.toFixed(2)}€ - ${bin.max.toFixed(2)}€`,
          'Nombre d\'articles': bin.count,
          'Pourcentage': bin.percentage.toFixed(1) + '%',
          'Prix moyen': ((bin.min + bin.max) / 2).toFixed(2) + '€'
        })) || []

      case 'trend-analysis':
        const { trendPoints } = chart.chartData
        return trendPoints?.map((point: any) => ({
          'Date': new Date(point.date).toLocaleDateString(),
          'Prix': point.price.toFixed(2) + '€',
          'Volume': point.volume
        })) || []

      case 'opportunity-map':
        const { opportunities } = chart.chartData
        return opportunities?.map((opp: any) => ({
          'Titre': opp.title,
          'Description': opp.description,
          'Potentiel': opp.potentialValue + '€',
          'Effort': opp.effort,
          'Délai': opp.timeframe,
          'Confiance': (opp.confidence * 100).toFixed(1) + '%'
        })) || []

      default:
        return [{ 'Données': 'Format non supporté pour Excel' }]
    }
  }

  private prepareInsightsForExcel(chart: EnhancedChart): any[] {
    const insights = []

    insights.push({
      'Type': 'Résumé',
      'Contenu': chart.insights.summary
    })

    chart.insights.keyFindings.forEach((finding, index) => {
      insights.push({
        'Type': 'Découverte',
        'N°': index + 1,
        'Contenu': finding
      })
    })

    chart.insights.recommendations.forEach((rec, index) => {
      insights.push({
        'Type': 'Recommandation',
        'N°': index + 1,
        'Contenu': rec
      })
    })

    return insights
  }
}

// Instance globale
export const chartExportService = ChartExportService.getInstance()