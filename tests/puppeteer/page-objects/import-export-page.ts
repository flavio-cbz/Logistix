import { Page } from 'puppeteer'
import { BasePage } from './base-page'

export interface ImportExportData {
  parcelles?: any[]
  produits?: any[]
  metadata?: {
    version: string
    exportDate: string
    userId?: string
  }
}

export class ImportExportPage extends BasePage {
  // Selectors
  private selectors = {
    // Main import/export dialog
    importExportButton: '[data-testid="import-export-button"], .import-export-btn, button:contains("Gestion des données")',
    importExportDialog: '[data-testid="import-export-dialog"], .import-export-dialog, [role="dialog"]',
    dialogTitle: '[data-testid="dialog-title"], .dialog-title, h2',
    dialogDescription: '[data-testid="dialog-description"], .dialog-description',
    closeDialogButton: '[data-testid="close-dialog"], .close-dialog, button[aria-label="Close"]',

    // Export functionality
    exportButton: '[data-testid="export-button"], .export-btn, button:contains("Exporter")',
    exportDescription: '[data-testid="export-description"], .export-description',
    exportFormatSelect: '[data-testid="export-format"], select[name="exportFormat"], .export-format-select',
    exportDateFromInput: '[data-testid="export-date-from"], input[name="dateFrom"]',
    exportDateToInput: '[data-testid="export-date-to"], input[name="dateTo"]',
    exportIncludeStatistics: '[data-testid="export-include-stats"], input[name="includeStatistics"]',
    exportCompression: '[data-testid="export-compression"], input[name="compression"]',
    exportConfirmButton: '[data-testid="export-confirm"], .export-confirm-btn',
    exportProgressBar: '[data-testid="export-progress"], .export-progress, .progress-bar',
    exportProgressText: '[data-testid="export-progress-text"], .export-progress-text',
    exportDownloadLink: '[data-testid="export-download"], .export-download-link, a[download]',

    // Import functionality
    importButton: '[data-testid="import-button"], .import-btn, button:contains("Importer")',
    importDescription: '[data-testid="import-description"], .import-description',
    importFileInput: '[data-testid="import-file"], input[type="file"], #import-file',
    importFileLabel: '[data-testid="import-file-label"], label[for="import-file"], .import-file-label',
    importDropZone: '[data-testid="import-drop-zone"], .import-drop-zone, .file-drop-zone',
    importPreviewArea: '[data-testid="import-preview"], .import-preview',
    importPreviewTable: '[data-testid="import-preview-table"], .import-preview-table, table',
    importConflictResolution: '[data-testid="conflict-resolution"], select[name="conflictResolution"]',
    importValidationErrors: '[data-testid="validation-errors"], .validation-errors',
    importConfirmButton: '[data-testid="import-confirm"], .import-confirm-btn',
    importProgressBar: '[data-testid="import-progress"], .import-progress, .progress-bar',
    importProgressText: '[data-testid="import-progress-text"], .import-progress-text',

    // Results and feedback
    successMessage: '[data-testid="success-message"], .success-message, .alert-success',
    errorMessage: '[data-testid="error-message"], .error-message, .alert-error',
    warningMessage: '[data-testid="warning-message"], .warning-message, .alert-warning',
    resultsDialog: '[data-testid="results-dialog"], .results-dialog',
    resultsTable: '[data-testid="results-table"], .results-table, table',
    conflictsTable: '[data-testid="conflicts-table"], .conflicts-table',

    // Loading states
    loadingSpinner: '[data-testid="loading"], .loading, .spinner',
    processingIndicator: '[data-testid="processing"], .processing-indicator',

    // File format indicators
    jsonFormatIcon: '[data-testid="json-format"], .json-format-icon',
    csvFormatIcon: '[data-testid="csv-format"], .csv-format-icon',
    excelFormatIcon: '[data-testid="excel-format"], .excel-format-icon',

    // Data preview elements
    previewParcelles: '[data-testid="preview-parcelles"], .preview-parcelles',
    previewProducts: '[data-testid="preview-products"], .preview-products',
    previewStatistics: '[data-testid="preview-statistics"], .preview-statistics',
    previewMetadata: '[data-testid="preview-metadata"], .preview-metadata'
  }

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl)
  }

  getPageIdentifier(): string {
    return 'import-export-page'
  }

  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.selectors.importExportButton)
  }

  // Dialog management
  async openImportExportDialog() {
    await this.click(this.selectors.importExportButton)
    await this.waitForSelector(this.selectors.importExportDialog)
    await this.waitForPageLoad()
  }

  async closeImportExportDialog() {
    if (await this.isVisible(this.selectors.closeDialogButton)) {
      await this.click(this.selectors.closeDialogButton)
      await this.waitForSelector(this.selectors.importExportDialog, 5000, true) // Wait for hidden
    }
  }

  async isDialogOpen(): Promise<boolean> {
    return this.isVisible(this.selectors.importExportDialog)
  }

  // Export functionality
  async clickExportButton() {
    await this.click(this.selectors.exportButton)
    await this.waitForPageLoad()
  }

  async selectExportFormat(format: 'json' | 'csv' | 'xlsx' | 'pdf') {
    if (await this.isVisible(this.selectors.exportFormatSelect)) {
      await this.select(this.selectors.exportFormatSelect, format)
    }
  }

  async setExportDateRange(dateFrom?: string, dateTo?: string) {
    if (dateFrom && await this.isVisible(this.selectors.exportDateFromInput)) {
      await this.type(this.selectors.exportDateFromInput, dateFrom)
    }
    if (dateTo && await this.isVisible(this.selectors.exportDateToInput)) {
      await this.type(this.selectors.exportDateToInput, dateTo)
    }
  }

  async toggleExportStatistics(include: boolean) {
    if (await this.isVisible(this.selectors.exportIncludeStatistics)) {
      const isChecked = await this.isChecked(this.selectors.exportIncludeStatistics)
      if (isChecked !== include) {
        await this.click(this.selectors.exportIncludeStatistics)
      }
    }
  }

  async toggleExportCompression(enable: boolean) {
    if (await this.isVisible(this.selectors.exportCompression)) {
      const isChecked = await this.isChecked(this.selectors.exportCompression)
      if (isChecked !== enable) {
        await this.click(this.selectors.exportCompression)
      }
    }
  }

  async confirmExport() {
    await this.click(this.selectors.exportConfirmButton)
    await this.waitForPageLoad()
  }

  async waitForExportCompletion(timeout = 30000): Promise<boolean> {
    try {
      // Wait for progress bar to appear
      await this.waitForSelector(this.selectors.exportProgressBar, 5000)
      
      // Wait for progress to complete (progress bar disappears or download link appears)
      await Promise.race([
        this.waitForSelector(this.selectors.exportProgressBar, timeout, true), // Wait for hidden
        this.waitForSelector(this.selectors.exportDownloadLink, timeout)
      ])
      
      return true
    } catch (error) {
      return false
    }
  }

  async getExportProgress(): Promise<number> {
    if (await this.isVisible(this.selectors.exportProgressBar)) {
      return this.page.evaluate((selector) => {
        const progressBar = document.querySelector(selector) as HTMLProgressElement
        return progressBar ? progressBar.value : 0
      }, this.selectors.exportProgressBar)
    }
    return 0
  }

  async getExportProgressText(): Promise<string> {
    if (await this.isVisible(this.selectors.exportProgressText)) {
      return this.getText(this.selectors.exportProgressText)
    }
    return ''
  }

  async downloadExportFile(): Promise<boolean> {
    if (await this.isVisible(this.selectors.exportDownloadLink)) {
      // Set up download handling
      const downloadPromise = this.page.waitForEvent ? 
        this.page.waitForEvent('download') : 
        new Promise((resolve) => {
          this.page.on('response', (response) => {
            if (response.headers()['content-disposition']?.includes('attachment')) {
              resolve(response)
            }
          })
        })

      await this.click(this.selectors.exportDownloadLink)
      
      try {
        await downloadPromise
        return true
      } catch (error) {
        return false
      }
    }
    return false
  }

  // Import functionality
  async clickImportButton() {
    await this.click(this.selectors.importButton)
    await this.waitForPageLoad()
  }

  async uploadImportFile(filePath: string) {
    const fileInput = await this.page.$(this.selectors.importFileInput)
    if (fileInput) {
      await fileInput.uploadFile(filePath)
      await this.waitForPageLoad()
    }
  }

  async dragAndDropFile(filePath: string) {
    if (await this.isVisible(this.selectors.importDropZone)) {
      // Simulate drag and drop
      const dropZone = await this.page.$(this.selectors.importDropZone)
      if (dropZone) {
        // Create a file input and upload file
        await this.uploadImportFile(filePath)
      }
    }
  }

  async selectConflictResolution(strategy: 'skip' | 'merge' | 'replace') {
    if (await this.isVisible(this.selectors.importConflictResolution)) {
      await this.select(this.selectors.importConflictResolution, strategy)
    }
  }

  async getImportPreview(): Promise<ImportExportData> {
    if (await this.isVisible(this.selectors.importPreviewArea)) {
      return this.page.evaluate((selectors) => {
        const previewData: ImportExportData = {}
        
        // Extract parcelles preview
        const parcellesElement = document.querySelector(selectors.previewParcelles)
        if (parcellesElement) {
          previewData.parcelles = Array.from(parcellesElement.querySelectorAll('tr')).map(row => {
            const cells = Array.from(row.querySelectorAll('td'))
            return cells.reduce((obj, cell, index) => {
              const header = parcellesElement.querySelector(`th:nth-child(${index + 1})`)?.textContent
              if (header) {
                obj[header] = cell.textContent
              }
              return obj
            }, {} as any)
          })
        }

        // Extract products preview
        const productsElement = document.querySelector(selectors.previewProducts)
        if (productsElement) {
          previewData.produits = Array.from(productsElement.querySelectorAll('tr')).map(row => {
            const cells = Array.from(row.querySelectorAll('td'))
            return cells.reduce((obj, cell, index) => {
              const header = productsElement.querySelector(`th:nth-child(${index + 1})`)?.textContent
              if (header) {
                obj[header] = cell.textContent
              }
              return obj
            }, {} as any)
          })
        }

        return previewData
      }, this.selectors)
    }
    return {}
  }

  async getValidationErrors(): Promise<string[]> {
    if (await this.isVisible(this.selectors.importValidationErrors)) {
      return this.page.evaluate((selector) => {
        const errorsElement = document.querySelector(selector)
        if (errorsElement) {
          return Array.from(errorsElement.querySelectorAll('li, .error-item')).map(
            item => item.textContent?.trim() || ''
          )
        }
        return []
      }, this.selectors.importValidationErrors)
    }
    return []
  }

  async confirmImport() {
    await this.click(this.selectors.importConfirmButton)
    await this.waitForPageLoad()
  }

  async waitForImportCompletion(timeout = 30000): Promise<boolean> {
    try {
      // Wait for progress bar to appear
      await this.waitForSelector(this.selectors.importProgressBar, 5000)
      
      // Wait for progress to complete
      await this.waitForSelector(this.selectors.importProgressBar, timeout, true) // Wait for hidden
      
      return true
    } catch (error) {
      return false
    }
  }

  async getImportProgress(): Promise<number> {
    if (await this.isVisible(this.selectors.importProgressBar)) {
      return this.page.evaluate((selector) => {
        const progressBar = document.querySelector(selector) as HTMLProgressElement
        return progressBar ? progressBar.value : 0
      }, this.selectors.importProgressBar)
    }
    return 0
  }

  async getImportProgressText(): Promise<string> {
    if (await this.isVisible(this.selectors.importProgressText)) {
      return this.getText(this.selectors.importProgressText)
    }
    return ''
  }

  // Results and feedback
  async getSuccessMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.successMessage)) {
      return this.getText(this.selectors.successMessage)
    }
    return ''
  }

  async getErrorMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.errorMessage)) {
      return this.getText(this.selectors.errorMessage)
    }
    return ''
  }

  async getWarningMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.warningMessage)) {
      return this.getText(this.selectors.warningMessage)
    }
    return ''
  }

  async hasSuccessMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.successMessage)
  }

  async hasErrorMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.errorMessage)
  }

  async hasWarningMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.warningMessage)
  }

  async getImportResults(): Promise<any> {
    if (await this.isVisible(this.selectors.resultsDialog)) {
      return this.page.evaluate((selectors) => {
        const resultsTable = document.querySelector(selectors.resultsTable)
        if (resultsTable) {
          const rows = Array.from(resultsTable.querySelectorAll('tbody tr'))
          return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'))
            return {
              type: cells[0]?.textContent?.trim(),
              imported: parseInt(cells[1]?.textContent?.trim() || '0'),
              skipped: parseInt(cells[2]?.textContent?.trim() || '0'),
              errors: parseInt(cells[3]?.textContent?.trim() || '0')
            }
          })
        }
        return []
      }, this.selectors)
    }
    return []
  }

  async getConflicts(): Promise<any[]> {
    if (await this.isVisible(this.selectors.conflictsTable)) {
      return this.page.evaluate((selector) => {
        const conflictsTable = document.querySelector(selector)
        if (conflictsTable) {
          const rows = Array.from(conflictsTable.querySelectorAll('tbody tr'))
          return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'))
            return {
              type: cells[0]?.textContent?.trim(),
              field: cells[1]?.textContent?.trim(),
              existing: cells[2]?.textContent?.trim(),
              incoming: cells[3]?.textContent?.trim(),
              resolution: cells[4]?.textContent?.trim()
            }
          })
        }
        return []
      }, this.selectors.conflictsTable)
    }
    return []
  }

  // Complete workflows
  async performCompleteExport(options: {
    format?: 'json' | 'csv' | 'xlsx' | 'pdf'
    dateFrom?: string
    dateTo?: string
    includeStatistics?: boolean
    compression?: boolean
  } = {}) {
    await this.openImportExportDialog()
    await this.clickExportButton()

    if (options.format) {
      await this.selectExportFormat(options.format)
    }

    if (options.dateFrom || options.dateTo) {
      await this.setExportDateRange(options.dateFrom, options.dateTo)
    }

    if (options.includeStatistics !== undefined) {
      await this.toggleExportStatistics(options.includeStatistics)
    }

    if (options.compression !== undefined) {
      await this.toggleExportCompression(options.compression)
    }

    await this.confirmExport()
    const completed = await this.waitForExportCompletion()

    return {
      completed,
      hasDownloadLink: await this.isVisible(this.selectors.exportDownloadLink),
      successMessage: await this.getSuccessMessage(),
      errorMessage: await this.getErrorMessage()
    }
  }

  async performCompleteImport(filePath: string, options: {
    conflictResolution?: 'skip' | 'merge' | 'replace'
    validatePreview?: boolean
  } = {}) {
    await this.openImportExportDialog()
    await this.clickImportButton()
    await this.uploadImportFile(filePath)

    // Wait for preview to load
    await this.waitForSelector(this.selectors.importPreviewArea, 10000)

    let previewData = {}
    let validationErrors: string[] = []

    if (options.validatePreview) {
      previewData = await this.getImportPreview()
      validationErrors = await this.getValidationErrors()
    }

    if (options.conflictResolution) {
      await this.selectConflictResolution(options.conflictResolution)
    }

    await this.confirmImport()
    const completed = await this.waitForImportCompletion()

    return {
      completed,
      previewData,
      validationErrors,
      results: await this.getImportResults(),
      conflicts: await this.getConflicts(),
      successMessage: await this.getSuccessMessage(),
      errorMessage: await this.getErrorMessage(),
      warningMessage: await this.getWarningMessage()
    }
  }

  // File format detection
  async detectFileFormat(fileName: string): Promise<string> {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'json': return 'json'
      case 'csv': return 'csv'
      case 'xlsx': case 'xls': return 'excel'
      case 'pdf': return 'pdf'
      default: return 'unknown'
    }
  }

  // Error handling and validation
  async validateImportFile(filePath: string): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    await this.uploadImportFile(filePath)
    await this.waitForSelector(this.selectors.importPreviewArea, 10000)

    const errors = await this.getValidationErrors()
    const hasErrorMessage = await this.hasErrorMessage()
    const hasWarningMessage = await this.hasWarningMessage()

    return {
      isValid: errors.length === 0 && !hasErrorMessage,
      errors: hasErrorMessage ? [await this.getErrorMessage()] : errors,
      warnings: hasWarningMessage ? [await this.getWarningMessage()] : []
    }
  }

  // Performance monitoring
  async measureExportPerformance(options: any = {}) {
    const startTime = Date.now()
    
    const result = await this.performCompleteExport(options)
    
    const endTime = Date.now()
    const totalTime = endTime - startTime

    const performanceMetrics = await this.measurePerformance()

    return {
      ...result,
      performance: {
        totalTime,
        ...performanceMetrics
      }
    }
  }

  async measureImportPerformance(filePath: string, options: any = {}) {
    const startTime = Date.now()
    
    const result = await this.performCompleteImport(filePath, options)
    
    const endTime = Date.now()
    const totalTime = endTime - startTime

    const performanceMetrics = await this.measurePerformance()

    return {
      ...result,
      performance: {
        totalTime,
        ...performanceMetrics
      }
    }
  }

  // Accessibility testing
  async checkAccessibility() {
    const dialogAccessibility = await this.page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      return {
        hasRole: !!dialog,
        hasAriaLabel: !!dialog?.getAttribute('aria-label'),
        hasAriaLabelledBy: !!dialog?.getAttribute('aria-labelledby'),
        hasFocusTrap: !!dialog?.querySelector('[tabindex]')
      }
    })

    const buttonAccessibility = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      return buttons.map(button => ({
        hasAccessibleName: !!(button.textContent?.trim() || button.getAttribute('aria-label')),
        hasRole: button.getAttribute('role') !== null || button.tagName === 'BUTTON',
        isKeyboardAccessible: button.tabIndex >= 0
      }))
    })

    const fileInputAccessibility = await this.page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]')
      return {
        hasLabel: !!fileInput?.labels?.length || !!fileInput?.getAttribute('aria-label'),
        hasDescription: !!fileInput?.getAttribute('aria-describedby'),
        isKeyboardAccessible: fileInput?.tabIndex !== -1
      }
    })

    return {
      dialog: dialogAccessibility,
      buttons: buttonAccessibility,
      fileInput: fileInputAccessibility
    }
  }

  // Mobile responsiveness
  async testMobileLayout() {
    await this.emulateDevice('mobile')
    await this.reload()

    const mobileOptimization = await this.page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      const viewport = window.innerWidth
      
      return {
        viewport,
        dialogWidth: dialog ? dialog.getBoundingClientRect().width : 0,
        isResponsive: dialog ? dialog.getBoundingClientRect().width <= viewport * 0.95 : false,
        hasScrollableContent: dialog ? dialog.scrollHeight > dialog.clientHeight : false
      }
    })

    return mobileOptimization
  }
}