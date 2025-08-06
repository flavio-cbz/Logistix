import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { Page } from 'puppeteer'
import {
  setupPuppeteerTest,
  teardownPuppeteerTest,
  setupPuppeteerSuite,
  teardownPuppeteerSuite,
  PuppeteerTestUtils,
  TEST_CONFIG
} from './config'
import { LoginPage } from './page-objects/login-page'
import { ImportExportPage } from './page-objects/import-export-page'
import { captureScreenshotOnFailure } from './utils/screenshot-utils'
import { TestDataFactory } from '../fixtures/test-data'
import * as fs from 'fs'
import * as path from 'path'

describe('Import/Export Workflows - Puppeteer UI Tests', () => {
  let page: Page
  let loginPage: LoginPage
  let importExportPage: ImportExportPage

  // Test data files
  const testDataDir = path.join(__dirname, '../fixtures/import-export-files')
  const validJsonFile = path.join(testDataDir, 'valid-data.json')
  const validCsvFile = path.join(testDataDir, 'valid-data.csv')
  const invalidJsonFile = path.join(testDataDir, 'invalid-data.json')
  const largeDataFile = path.join(testDataDir, 'large-data.json')

  beforeAll(async () => {
    await setupPuppeteerSuite()
    
    // Create test data directory and files
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true })
    }
    
    // Create valid JSON test file
    const validData = {
      parcelles: [
        TestDataFactory.createParcelle(),
        TestDataFactory.createParcelle()
      ],
      produits: [
        TestDataFactory.createProduct(),
        TestDataFactory.createProduct()
      ],
      metadata: {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        userId: 'test-user'
      }
    }
    fs.writeFileSync(validJsonFile, JSON.stringify(validData, null, 2))

    // Create valid CSV test file
    const csvData = `numero,transporteur,poids,prix_achat,date_creation
TEST-001,Transport A,1.5,25.50,2024-01-01
TEST-002,Transport B,2.0,30.00,2024-01-02`
    fs.writeFileSync(validCsvFile, csvData)

    // Create invalid JSON test file
    const invalidData = '{ invalid json structure }'
    fs.writeFileSync(invalidJsonFile, invalidData)

    // Create large data file
    const largeData = {
      parcelles: Array.from({ length: 1000 }, () => TestDataFactory.createParcelle()),
      produits: Array.from({ length: 2000 }, () => TestDataFactory.createProduct()),
      metadata: { version: '1.0.0', exportDate: new Date().toISOString() }
    }
    fs.writeFileSync(largeDataFile, JSON.stringify(largeData, null, 2))
  })

  afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true })
    }
    
    await teardownPuppeteerSuite()
  })

  beforeEach(async () => {
    page = await setupPuppeteerTest('import-export-workflows')
    loginPage = new LoginPage(page, TEST_CONFIG.baseURL)
    importExportPage = new ImportExportPage(page, TEST_CONFIG.baseURL)

    // Mock API responses for import/export
    await page.route('/api/v1/export/complete*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            parcelles: [TestDataFactory.createParcelle()],
            produits: [TestDataFactory.createProduct()],
            metadata: {
              exportDate: new Date().toISOString(),
              version: '1.0.0',
              userId: 'test-user'
            }
          }
        })
      })
    })

    await page.route('/api/v1/import/data*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Données importées avec succès',
          imported: {
            parcelles: 2,
            produits: 2
          }
        })
      })
    })

    // Login before each test
    await loginPage.navigateToLogin()
    await loginPage.loginAsAdmin()
    await PuppeteerTestUtils.waitForLoadingToFinish(page)
  })

  afterEach(async () => {
    await captureScreenshotOnFailure(page, expect.getState())
    await teardownPuppeteerTest(page)
  })

  describe('Export Data Workflows', () => {
    test('should export complete data successfully', async () => {
      // Navigate to dashboard or main page where import/export is available
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      // Open import/export dialog
      await importExportPage.openImportExportDialog()
      expect(await importExportPage.isDialogOpen()).toBe(true)

      // Perform export
      const result = await importExportPage.performCompleteExport({
        format: 'json',
        includeStatistics: true
      })

      expect(result.completed).toBe(true)
      expect(result.successMessage).toContain('exporté')
      expect(result.errorMessage).toBe('')
    })

    test('should export data with date filtering', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()
      
      const result = await importExportPage.performCompleteExport({
        format: 'csv',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        includeStatistics: false
      })

      expect(result.completed).toBe(true)
      expect(result.hasDownloadLink).toBe(true)
    })

    test('should export data in different formats', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const formats: Array<'json' | 'csv' | 'xlsx'> = ['json', 'csv', 'xlsx']

      for (const format of formats) {
        await importExportPage.openImportExportDialog()
        
        const result = await importExportPage.performCompleteExport({ format })
        
        expect(result.completed).toBe(true)
        expect(result.errorMessage).toBe('')
        
        await importExportPage.closeImportExportDialog()
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait between exports
      }
    })

    test('should show export progress indication', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()
      await importExportPage.clickExportButton()
      await importExportPage.selectExportFormat('json')
      await importExportPage.confirmExport()

      // Check progress indication
      const hasProgressBar = await PuppeteerTestUtils.waitForSelector(
        page, 
        '[data-testid="export-progress"], .export-progress', 
        5000
      )
      expect(hasProgressBar).toBe(true)

      const progressText = await importExportPage.getExportProgressText()
      expect(progressText).toBeTruthy()

      await importExportPage.waitForExportCompletion()
    })

    test('should handle export errors gracefully', async () => {
      // Mock error response
      await page.route('/api/v1/export/complete*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Erreur lors de l\'exportation'
          })
        })
      })

      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const result = await importExportPage.performCompleteExport({ format: 'json' })

      expect(result.completed).toBe(false)
      expect(result.errorMessage).toContain('Erreur')
      expect(await importExportPage.hasErrorMessage()).toBe(true)
    })

    test('should download export file successfully', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()
      
      const result = await importExportPage.performCompleteExport({ format: 'json' })
      
      if (result.hasDownloadLink) {
        const downloadSuccess = await importExportPage.downloadExportFile()
        expect(downloadSuccess).toBe(true)
      }
    })
  })

  describe('Import Data Workflows', () => {
    test('should import valid JSON data successfully', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const result = await importExportPage.performCompleteImport(validJsonFile, {
        validatePreview: true
      })

      expect(result.completed).toBe(true)
      expect(result.successMessage).toContain('importé')
      expect(result.validationErrors).toHaveLength(0)
      expect(result.previewData).toBeDefined()
    })

    test('should import valid CSV data successfully', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const result = await importExportPage.performCompleteImport(validCsvFile, {
        validatePreview: true
      })

      expect(result.completed).toBe(true)
      expect(result.validationErrors).toHaveLength(0)
    })

    test('should show import preview before confirmation', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()
      await importExportPage.clickImportButton()
      await importExportPage.uploadImportFile(validJsonFile)

      // Wait for preview to load
      await PuppeteerTestUtils.waitForSelector(
        page, 
        '[data-testid="import-preview"], .import-preview', 
        10000
      )

      const previewData = await importExportPage.getImportPreview()
      expect(previewData).toBeDefined()
      expect(previewData.parcelles || previewData.produits).toBeTruthy()
    })

    test('should handle data validation errors', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const validation = await importExportPage.validateImportFile(invalidJsonFile)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    test('should show import progress indication', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()
      await importExportPage.clickImportButton()
      await importExportPage.uploadImportFile(validJsonFile)
      await PuppeteerTestUtils.waitForSelector(page, '[data-testid="import-preview"]', 10000)
      await importExportPage.confirmImport()

      // Check progress indication
      const hasProgressBar = await PuppeteerTestUtils.waitForSelector(
        page, 
        '[data-testid="import-progress"], .import-progress', 
        5000
      )
      expect(hasProgressBar).toBe(true)

      const progressText = await importExportPage.getImportProgressText()
      expect(progressText).toBeTruthy()

      await importExportPage.waitForImportCompletion()
    })

    test('should handle conflict resolution during import', async () => {
      // Mock response with conflicts
      await page.route('/api/v1/import/data*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Données importées avec conflits',
            imported: { parcelles: 1, produits: 2 },
            conflicts: {
              parcelles: [
                {
                  type: 'duplicate_numero',
                  field: 'numero',
                  existing: 'TEST-001',
                  incoming: 'TEST-001',
                  resolution: 'skip'
                }
              ]
            }
          })
        })
      })

      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const result = await importExportPage.performCompleteImport(validJsonFile, {
        conflictResolution: 'skip'
      })

      expect(result.completed).toBe(true)
      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.warningMessage).toContain('conflit')
    })

    test('should handle large file import with progress tracking', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const performanceResult = await importExportPage.measureImportPerformance(largeDataFile)

      expect(performanceResult.completed).toBe(true)
      expect(performanceResult.performance.totalTime).toBeGreaterThan(0)
    })

    test('should handle import errors gracefully', async () => {
      // Mock error response
      await page.route('/api/v1/import/data*', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Format de données invalide'
          })
        })
      })

      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const result = await importExportPage.performCompleteImport(validJsonFile)

      expect(result.completed).toBe(false)
      expect(result.errorMessage).toContain('invalide')
      expect(await importExportPage.hasErrorMessage()).toBe(true)
    })
  })

  describe('File Upload and Processing', () => {
    test('should support drag and drop file upload', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()
      await importExportPage.clickImportButton()

      // Test drag and drop functionality
      await importExportPage.dragAndDropFile(validJsonFile)

      const hasPreview = await PuppeteerTestUtils.waitForSelector(
        page, 
        '[data-testid="import-preview"]', 
        10000
      )
      expect(hasPreview).toBe(true)
    })

    test('should detect file format automatically', async () => {
      const formats = [
        { file: validJsonFile, expected: 'json' },
        { file: validCsvFile, expected: 'csv' }
      ]

      for (const { file, expected } of formats) {
        const detected = await importExportPage.detectFileFormat(file)
        expect(detected).toBe(expected)
      }
    })

    test('should validate file size limits', async () => {
      // This would test with an actual oversized file in a real scenario
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      // Mock oversized file error
      await page.route('/api/v1/import/data*', route => {
        route.fulfill({
          status: 413,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Fichier trop volumineux'
          })
        })
      })

      const result = await importExportPage.performCompleteImport(largeDataFile)

      expect(result.completed).toBe(false)
      expect(result.errorMessage).toContain('volumineux')
    })

    test('should handle unsupported file formats', async () => {
      // Create a test file with unsupported format
      const unsupportedFile = path.join(testDataDir, 'unsupported.txt')
      fs.writeFileSync(unsupportedFile, 'This is not a supported format')

      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      // Mock unsupported format error
      await page.route('/api/v1/import/data*', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Format de fichier non supporté'
          })
        })
      })

      const result = await importExportPage.performCompleteImport(unsupportedFile)

      expect(result.completed).toBe(false)
      expect(result.errorMessage).toContain('non supporté')

      // Cleanup
      fs.unlinkSync(unsupportedFile)
    })
  })

  describe('Data Preview and Confirmation', () => {
    test('should display data preview with correct structure', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()
      await importExportPage.clickImportButton()
      await importExportPage.uploadImportFile(validJsonFile)

      await PuppeteerTestUtils.waitForSelector(page, '[data-testid="import-preview"]', 10000)

      const previewData = await importExportPage.getImportPreview()
      expect(previewData).toBeDefined()

      // Verify preview structure matches expected data
      if (previewData.parcelles) {
        expect(previewData.parcelles.length).toBeGreaterThan(0)
      }
      if (previewData.produits) {
        expect(previewData.produits.length).toBeGreaterThan(0)
      }
    })

    test('should show validation errors in preview', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      // Mock validation errors
      await page.route('/api/v1/import/data*', route => {
        const url = new URL(route.request().url())
        if (url.searchParams.get('validate') === 'true') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: 'Erreurs de validation',
              errors: [
                { field: 'numero', message: 'Numéro requis' },
                { field: 'poids', message: 'Poids doit être positif' }
              ]
            })
          })
        } else {
          route.continue()
        }
      })

      const validation = await importExportPage.validateImportFile(validJsonFile)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    test('should allow confirmation after preview review', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()
      await importExportPage.clickImportButton()
      await importExportPage.uploadImportFile(validJsonFile)

      await PuppeteerTestUtils.waitForSelector(page, '[data-testid="import-preview"]', 10000)

      // Verify confirm button is available
      const confirmButtonVisible = await PuppeteerTestUtils.isElementVisible(
        page, 
        '[data-testid="import-confirm"], .import-confirm-btn'
      )
      expect(confirmButtonVisible).toBe(true)

      await importExportPage.confirmImport()
      const completed = await importExportPage.waitForImportCompletion()
      expect(completed).toBe(true)
    })
  })

  describe('Error Handling and User Feedback', () => {
    test('should display appropriate error messages', async () => {
      const errorScenarios = [
        {
          status: 400,
          message: 'Format de données invalide',
          expectedText: 'invalide'
        },
        {
          status: 413,
          message: 'Fichier trop volumineux',
          expectedText: 'volumineux'
        },
        {
          status: 500,
          message: 'Erreur serveur interne',
          expectedText: 'serveur'
        }
      ]

      for (const scenario of errorScenarios) {
        await page.route('/api/v1/import/data*', route => {
          route.fulfill({
            status: scenario.status,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              message: scenario.message
            })
          })
        })

        await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
        await PuppeteerTestUtils.waitForLoadingToFinish(page)

        const result = await importExportPage.performCompleteImport(validJsonFile)

        expect(result.completed).toBe(false)
        expect(result.errorMessage).toContain(scenario.expectedText)
      }
    })

    test('should show success messages with import results', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const result = await importExportPage.performCompleteImport(validJsonFile)

      expect(result.completed).toBe(true)
      expect(result.successMessage).toContain('succès')
      expect(result.results).toBeDefined()
    })

    test('should handle network errors gracefully', async () => {
      // Mock network failure
      await page.route('/api/v1/import/data*', route => {
        route.abort('failed')
      })

      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const result = await importExportPage.performCompleteImport(validJsonFile)

      expect(result.completed).toBe(false)
      expect(await importExportPage.hasErrorMessage()).toBe(true)
    })
  })

  describe('Performance and Large Data Handling', () => {
    test('should handle large dataset export efficiently', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const performanceResult = await importExportPage.measureExportPerformance({
        format: 'json',
        includeStatistics: true
      })

      expect(performanceResult.completed).toBe(true)
      expect(performanceResult.performance.totalTime).toBeLessThan(30000) // Should complete within 30 seconds
    })

    test('should show progress for long-running operations', async () => {
      // Mock slow response to test progress indication
      await page.route('/api/v1/export/complete*', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { parcelles: [], produits: [], metadata: {} }
            })
          })
        }, 3000) // 3 second delay
      })

      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()
      await importExportPage.clickExportButton()
      await importExportPage.confirmExport()

      // Verify progress indication appears
      const hasProgress = await PuppeteerTestUtils.waitForSelector(
        page, 
        '[data-testid="export-progress"], .export-progress', 
        5000
      )
      expect(hasProgress).toBe(true)

      await importExportPage.waitForExportCompletion(10000)
    })

    test('should handle memory-intensive operations', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      // Monitor memory usage during large import
      const initialMemory = await page.metrics()
      
      const result = await importExportPage.performCompleteImport(largeDataFile)
      
      const finalMemory = await page.metrics()

      expect(result.completed).toBe(true)
      
      // Memory usage should not increase excessively
      const memoryIncrease = finalMemory.JSHeapUsedSize - initialMemory.JSHeapUsedSize
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB increase
    })
  })

  describe('Accessibility and Usability', () => {
    test('should be accessible via keyboard navigation', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      // Navigate to import/export button using keyboard
      await page.keyboard.press('Tab')
      let focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      
      // Keep tabbing until we find the import/export button
      let attempts = 0
      while (focusedElement !== 'BUTTON' && attempts < 20) {
        await page.keyboard.press('Tab')
        focusedElement = await page.evaluate(() => document.activeElement?.tagName)
        attempts++
      }

      // Press Enter to open dialog
      await page.keyboard.press('Enter')
      
      const dialogOpen = await importExportPage.isDialogOpen()
      expect(dialogOpen).toBe(true)

      // Test accessibility features
      const accessibility = await importExportPage.checkAccessibility()
      expect(accessibility.dialog.hasRole).toBe(true)
      expect(accessibility.fileInput.hasLabel).toBe(true)
    })

    test('should work properly on mobile devices', async () => {
      await importExportPage.testMobileLayout()
      
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      // Test mobile import/export workflow
      await importExportPage.openImportExportDialog()
      
      const mobileOptimization = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        return {
          isVisible: !!dialog,
          fitsScreen: dialog ? dialog.getBoundingClientRect().width <= window.innerWidth : false
        }
      })

      expect(mobileOptimization.isVisible).toBe(true)
      expect(mobileOptimization.fitsScreen).toBe(true)
    })

    test('should provide clear user guidance', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      await importExportPage.openImportExportDialog()

      // Check for helpful descriptions and guidance
      const exportDescription = await PuppeteerTestUtils.getElementText(
        page, 
        '[data-testid="export-description"], .export-description'
      )
      expect(exportDescription).toBeTruthy()

      await importExportPage.clickImportButton()

      const importDescription = await PuppeteerTestUtils.getElementText(
        page, 
        '[data-testid="import-description"], .import-description'
      )
      expect(importDescription).toBeTruthy()
    })
  })

  describe('Cross-browser Compatibility', () => {
    test('should work consistently across different browsers', async () => {
      // This test would be expanded to run on different browsers in a real scenario
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      const result = await importExportPage.performCompleteExport({ format: 'json' })
      expect(result.completed).toBe(true)

      const importResult = await importExportPage.performCompleteImport(validJsonFile)
      expect(importResult.completed).toBe(true)
    })

    test('should handle different file system behaviors', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await PuppeteerTestUtils.waitForLoadingToFinish(page)

      // Test file upload behavior
      await importExportPage.openImportExportDialog()
      await importExportPage.clickImportButton()
      await importExportPage.uploadImportFile(validJsonFile)

      const hasPreview = await PuppeteerTestUtils.waitForSelector(
        page, 
        '[data-testid="import-preview"]', 
        10000
      )
      expect(hasPreview).toBe(true)
    })
  })
})