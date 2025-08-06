import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { ServiceMockFactory } from './mocks/service-mocks'
import { TestDataFactory } from '../fixtures/test-data'
import { createMockDatabase } from './setup'

// Mock import/export services
const createImportServiceMock = () => ({
  // Data processing methods
  processJsonData: vi.fn(),
  processCsvData: vi.fn(),
  processExcelData: vi.fn(),
  validateDataFormat: vi.fn(),
  validateDataIntegrity: vi.fn(),
  
  // Import operations
  importParcelles: vi.fn(),
  importProducts: vi.fn(),
  importUsers: vi.fn(),
  importComplete: vi.fn(),
  
  // Conflict resolution
  detectConflicts: vi.fn(),
  resolveConflicts: vi.fn(),
  mergeData: vi.fn(),
  
  // Progress tracking
  trackProgress: vi.fn(),
  getImportStatus: vi.fn(),
  
  // Validation
  validateImportData: vi.fn(),
  sanitizeData: vi.fn(),
  checkDataConstraints: vi.fn()
})

const createExportServiceMock = () => ({
  // File generation methods
  generateJsonExport: vi.fn(),
  generateCsvExport: vi.fn(),
  generateExcelExport: vi.fn(),
  generatePdfExport: vi.fn(),
  
  // Data collection
  collectUserData: vi.fn(),
  collectParcelles: vi.fn(),
  collectProducts: vi.fn(),
  collectStatistics: vi.fn(),
  
  // Filtering and processing
  filterDataByDate: vi.fn(),
  filterDataByType: vi.fn(),
  processLargeDataset: vi.fn(),
  streamData: vi.fn(),
  
  // Compression and metadata
  compressData: vi.fn(),
  addMetadata: vi.fn(),
  generateChecksum: vi.fn(),
  
  // Format conversion
  convertToFormat: vi.fn(),
  validateExportFormat: vi.fn()
})

describe('Import/Export Services - Classic Backend Tests', () => {
  let mockDatabase: any
  let importService: ReturnType<typeof createImportServiceMock>
  let exportService: ReturnType<typeof createExportServiceMock>

  beforeEach(() => {
    mockDatabase = createMockDatabase()
    importService = ServiceMockFactory.createMock('import', createImportServiceMock)
    exportService = ServiceMockFactory.createMock('export', createExportServiceMock)
  })

  afterEach(() => {
    ServiceMockFactory.resetAllMocks()
  })

  describe('ImportService Data Processing Methods', () => {
    test('should process JSON data correctly', async () => {
      const testData = {
        parcelles: [TestDataFactory.createParcelle()],
        produits: [TestDataFactory.createProduct()],
        metadata: { version: '1.0.0', exportDate: new Date().toISOString() }
      }

      importService.processJsonData.mockResolvedValue({
        success: true,
        data: testData,
        recordCount: {
          parcelles: 1,
          produits: 1
        }
      })

      const result = await importService.processJsonData(JSON.stringify(testData))

      expect(importService.processJsonData).toHaveBeenCalledWith(JSON.stringify(testData))
      expect(result).toMatchObject({
        success: true,
        data: expect.objectContaining({
          parcelles: expect.arrayContaining([expect.any(Object)]),
          produits: expect.arrayContaining([expect.any(Object)])
        }),
        recordCount: {
          parcelles: 1,
          produits: 1
        }
      })
    })

    test('should handle malformed JSON data', async () => {
      const malformedJson = '{ invalid json }'

      importService.processJsonData.mockRejectedValue(new Error('Invalid JSON format'))

      await expect(importService.processJsonData(malformedJson)).rejects.toThrow('Invalid JSON format')
      expect(importService.processJsonData).toHaveBeenCalledWith(malformedJson)
    })

    test('should process CSV data with proper parsing', async () => {
      const csvData = `numero,transporteur,poids,prix_achat
TEST-001,Transport A,1.5,25.50
TEST-002,Transport B,2.0,30.00`

      const expectedParsedData = [
        { numero: 'TEST-001', transporteur: 'Transport A', poids: 1.5, prix_achat: 25.50 },
        { numero: 'TEST-002', transporteur: 'Transport B', poids: 2.0, prix_achat: 30.00 }
      ]

      importService.processCsvData.mockResolvedValue({
        success: true,
        data: { parcelles: expectedParsedData },
        recordCount: { parcelles: 2 }
      })

      const result = await importService.processCsvData(csvData)

      expect(importService.processCsvData).toHaveBeenCalledWith(csvData)
      expect(result.success).toBe(true)
      expect(result.data.parcelles).toHaveLength(2)
      expect(result.recordCount.parcelles).toBe(2)
    })

    test('should handle CSV parsing errors', async () => {
      const invalidCsvData = `numero,transporteur,poids,prix_achat
TEST-001,Transport A,invalid_weight,25.50`

      importService.processCsvData.mockRejectedValue(new Error('CSV parsing error: invalid weight format'))

      await expect(importService.processCsvData(invalidCsvData)).rejects.toThrow('CSV parsing error')
      expect(importService.processCsvData).toHaveBeenCalledWith(invalidCsvData)
    })

    test('should process Excel data with multiple sheets', async () => {
      const mockExcelBuffer = Buffer.from('mock excel data')

      importService.processExcelData.mockResolvedValue({
        success: true,
        data: {
          parcelles: [TestDataFactory.createParcelle()],
          produits: [TestDataFactory.createProduct()]
        },
        sheets: ['Parcelles', 'Produits'],
        recordCount: { parcelles: 1, produits: 1 }
      })

      const result = await importService.processExcelData(mockExcelBuffer)

      expect(importService.processExcelData).toHaveBeenCalledWith(mockExcelBuffer)
      expect(result.success).toBe(true)
      expect(result.sheets).toContain('Parcelles')
      expect(result.sheets).toContain('Produits')
    })

    test('should validate data format before processing', async () => {
      const testData = { parcelles: [], produits: [] }

      importService.validateDataFormat.mockReturnValue({
        isValid: true,
        errors: []
      })

      const result = importService.validateDataFormat(testData)

      expect(importService.validateDataFormat).toHaveBeenCalledWith(testData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should detect format validation errors', async () => {
      const invalidData = { invalid: 'structure' }

      importService.validateDataFormat.mockReturnValue({
        isValid: false,
        errors: [
          { field: 'parcelles', message: 'Required field missing' },
          { field: 'produits', message: 'Required field missing' }
        ]
      })

      const result = importService.validateDataFormat(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0]).toMatchObject({
        field: 'parcelles',
        message: 'Required field missing'
      })
    })

    test('should validate data integrity constraints', async () => {
      const testData = {
        parcelles: [TestDataFactory.createParcelle()],
        produits: [TestDataFactory.createProduct()]
      }

      importService.validateDataIntegrity.mockResolvedValue({
        isValid: true,
        violations: [],
        warnings: []
      })

      const result = await importService.validateDataIntegrity(testData)

      expect(importService.validateDataIntegrity).toHaveBeenCalledWith(testData)
      expect(result.isValid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    test('should detect data integrity violations', async () => {
      const invalidData = {
        parcelles: [
          { ...TestDataFactory.createParcelle(), poids: -1 }, // Invalid weight
          { ...TestDataFactory.createParcelle(), prix_achat: 0 } // Invalid price
        ],
        produits: []
      }

      importService.validateDataIntegrity.mockResolvedValue({
        isValid: false,
        violations: [
          { record: 'parcelles[0]', field: 'poids', message: 'Weight must be positive' },
          { record: 'parcelles[1]', field: 'prix_achat', message: 'Price must be greater than 0' }
        ],
        warnings: []
      })

      const result = await importService.validateDataIntegrity(invalidData)

      expect(result.isValid).toBe(false)
      expect(result.violations).toHaveLength(2)
    })
  })

  describe('ImportService Import Operations', () => {
    test('should import parcelles successfully', async () => {
      const testParcelles = [
        TestDataFactory.createParcelle(),
        TestDataFactory.createParcelle()
      ]

      importService.importParcelles.mockResolvedValue({
        success: true,
        imported: 2,
        skipped: 0,
        errors: []
      })

      const result = await importService.importParcelles(testParcelles, 'user-123')

      expect(importService.importParcelles).toHaveBeenCalledWith(testParcelles, 'user-123')
      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(result.skipped).toBe(0)
    })

    test('should import products with parcelle associations', async () => {
      const testProducts = [TestDataFactory.createProduct()]

      importService.importProducts.mockResolvedValue({
        success: true,
        imported: 1,
        skipped: 0,
        errors: []
      })

      const result = await importService.importProducts(testProducts, 'user-123')

      expect(importService.importProducts).toHaveBeenCalledWith(testProducts, 'user-123')
      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
    })

    test('should handle import errors gracefully', async () => {
      const testParcelles = [TestDataFactory.createParcelle()]

      importService.importParcelles.mockResolvedValue({
        success: false,
        imported: 0,
        skipped: 1,
        errors: [
          { record: 'parcelles[0]', error: 'Duplicate numero constraint violation' }
        ]
      })

      const result = await importService.importParcelles(testParcelles, 'user-123')

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toMatchObject({
        record: 'parcelles[0]',
        error: expect.stringContaining('Duplicate numero')
      })
    })

    test('should perform complete import with transaction handling', async () => {
      const testData = {
        parcelles: [TestDataFactory.createParcelle()],
        produits: [TestDataFactory.createProduct()]
      }

      importService.importComplete.mockResolvedValue({
        success: true,
        results: {
          parcelles: { imported: 1, skipped: 0 },
          produits: { imported: 1, skipped: 0 }
        },
        transactionId: 'tx-123'
      })

      const result = await importService.importComplete(testData, 'user-123')

      expect(importService.importComplete).toHaveBeenCalledWith(testData, 'user-123')
      expect(result.success).toBe(true)
      expect(result.results.parcelles.imported).toBe(1)
      expect(result.results.produits.imported).toBe(1)
      expect(result.transactionId).toBe('tx-123')
    })

    test('should rollback transaction on import failure', async () => {
      const testData = {
        parcelles: [TestDataFactory.createParcelle()],
        produits: [TestDataFactory.createProduct()]
      }

      importService.importComplete.mockRejectedValue(new Error('Database constraint violation'))

      await expect(importService.importComplete(testData, 'user-123')).rejects.toThrow('Database constraint violation')
      expect(importService.importComplete).toHaveBeenCalledWith(testData, 'user-123')
    })
  })

  describe('ImportService Conflict Resolution', () => {
    test('should detect data conflicts', async () => {
      const existingData = [TestDataFactory.createParcelle({ numero: 'EXISTING-001' })]
      const newData = [TestDataFactory.createParcelle({ numero: 'EXISTING-001' })]

      importService.detectConflicts.mockResolvedValue({
        hasConflicts: true,
        conflicts: [
          {
            type: 'duplicate_numero',
            existing: existingData[0],
            incoming: newData[0],
            field: 'numero'
          }
        ]
      })

      const result = await importService.detectConflicts(newData, 'user-123')

      expect(importService.detectConflicts).toHaveBeenCalledWith(newData, 'user-123')
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].type).toBe('duplicate_numero')
    })

    test('should resolve conflicts with skip strategy', async () => {
      const conflicts = [
        {
          type: 'duplicate_numero',
          existing: TestDataFactory.createParcelle(),
          incoming: TestDataFactory.createParcelle(),
          field: 'numero'
        }
      ]

      importService.resolveConflicts.mockResolvedValue({
        strategy: 'skip',
        resolved: 1,
        actions: [
          { action: 'skip', record: conflicts[0].incoming, reason: 'Duplicate numero' }
        ]
      })

      const result = await importService.resolveConflicts(conflicts, 'skip')

      expect(importService.resolveConflicts).toHaveBeenCalledWith(conflicts, 'skip')
      expect(result.strategy).toBe('skip')
      expect(result.resolved).toBe(1)
      expect(result.actions[0].action).toBe('skip')
    })

    test('should resolve conflicts with merge strategy', async () => {
      const conflicts = [
        {
          type: 'duplicate_numero',
          existing: TestDataFactory.createParcelle({ poids: 1.0 }),
          incoming: TestDataFactory.createParcelle({ poids: 2.0 }),
          field: 'numero'
        }
      ]

      importService.resolveConflicts.mockResolvedValue({
        strategy: 'merge',
        resolved: 1,
        actions: [
          { 
            action: 'merge', 
            record: { ...conflicts[0].existing, poids: 2.0 }, 
            reason: 'Merged with incoming data' 
          }
        ]
      })

      const result = await importService.resolveConflicts(conflicts, 'merge')

      expect(result.strategy).toBe('merge')
      expect(result.actions[0].action).toBe('merge')
      expect(result.actions[0].record.poids).toBe(2.0)
    })

    test('should merge data with custom merge logic', async () => {
      const existingRecord = TestDataFactory.createParcelle({ 
        poids: 1.0, 
        prix_achat: 25.0,
        date_creation: '2023-01-01'
      })
      const incomingRecord = TestDataFactory.createParcelle({ 
        poids: 2.0, 
        prix_achat: 30.0,
        date_creation: '2024-01-01'
      })

      importService.mergeData.mockReturnValue({
        ...existingRecord,
        poids: incomingRecord.poids, // Use newer weight
        prix_achat: incomingRecord.prix_achat, // Use newer price
        date_modification: new Date().toISOString()
      })

      const result = importService.mergeData(existingRecord, incomingRecord)

      expect(importService.mergeData).toHaveBeenCalledWith(existingRecord, incomingRecord)
      expect(result.poids).toBe(2.0)
      expect(result.prix_achat).toBe(30.0)
      expect(result.date_modification).toBeDefined()
    })
  })

  describe('ExportService File Generation Methods', () => {
    test('should generate JSON export with proper formatting', async () => {
      const testData = {
        parcelles: [TestDataFactory.createParcelle()],
        produits: [TestDataFactory.createProduct()],
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          userId: 'user-123'
        }
      }

      exportService.generateJsonExport.mockResolvedValue({
        success: true,
        data: JSON.stringify(testData, null, 2),
        size: 1024,
        checksum: 'abc123'
      })

      const result = await exportService.generateJsonExport(testData)

      expect(exportService.generateJsonExport).toHaveBeenCalledWith(testData)
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.size).toBe(1024)
      expect(result.checksum).toBe('abc123')
    })

    test('should generate CSV export with proper headers', async () => {
      const testParcelles = [
        TestDataFactory.createParcelle(),
        TestDataFactory.createParcelle()
      ]

      const expectedCsv = `numero,transporteur,poids,prix_achat,date_creation
${testParcelles[0].numero},${testParcelles[0].transporteur},${testParcelles[0].poids},${testParcelles[0].prix_achat},${testParcelles[0].date_creation}
${testParcelles[1].numero},${testParcelles[1].transporteur},${testParcelles[1].poids},${testParcelles[1].prix_achat},${testParcelles[1].date_creation}`

      exportService.generateCsvExport.mockResolvedValue({
        success: true,
        data: expectedCsv,
        headers: ['numero', 'transporteur', 'poids', 'prix_achat', 'date_creation'],
        rowCount: 2
      })

      const result = await exportService.generateCsvExport(testParcelles, 'parcelles')

      expect(exportService.generateCsvExport).toHaveBeenCalledWith(testParcelles, 'parcelles')
      expect(result.success).toBe(true)
      expect(result.data).toContain('numero,transporteur,poids')
      expect(result.rowCount).toBe(2)
    })

    test('should generate Excel export with multiple sheets', async () => {
      const testData = {
        parcelles: [TestDataFactory.createParcelle()],
        produits: [TestDataFactory.createProduct()]
      }

      exportService.generateExcelExport.mockResolvedValue({
        success: true,
        buffer: Buffer.from('mock excel data'),
        sheets: ['Parcelles', 'Produits'],
        size: 2048
      })

      const result = await exportService.generateExcelExport(testData)

      expect(exportService.generateExcelExport).toHaveBeenCalledWith(testData)
      expect(result.success).toBe(true)
      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.sheets).toContain('Parcelles')
      expect(result.sheets).toContain('Produits')
    })

    test('should generate PDF export with formatting', async () => {
      const testData = {
        parcelles: [TestDataFactory.createParcelle()],
        statistics: { totalParcelles: 1, totalValue: 25.50 }
      }

      exportService.generatePdfExport.mockResolvedValue({
        success: true,
        buffer: Buffer.from('mock pdf data'),
        pages: 2,
        size: 4096
      })

      const result = await exportService.generatePdfExport(testData)

      expect(exportService.generatePdfExport).toHaveBeenCalledWith(testData)
      expect(result.success).toBe(true)
      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.pages).toBe(2)
    })
  })

  describe('ExportService Data Collection', () => {
    test('should collect user data with proper filtering', async () => {
      const userId = 'user-123'
      const expectedData = {
        parcelles: [TestDataFactory.createParcelle()],
        produits: [TestDataFactory.createProduct()],
        statistics: { totalParcelles: 1, totalProducts: 1 }
      }

      exportService.collectUserData.mockResolvedValue(expectedData)

      const result = await exportService.collectUserData(userId)

      expect(exportService.collectUserData).toHaveBeenCalledWith(userId)
      expect(result).toMatchObject({
        parcelles: expect.any(Array),
        produits: expect.any(Array),
        statistics: expect.any(Object)
      })
    })

    test('should collect parcelles with date filtering', async () => {
      const userId = 'user-123'
      const dateFrom = '2024-01-01'
      const dateTo = '2024-12-31'

      const filteredParcelles = [TestDataFactory.createParcelle({ date_creation: '2024-06-01' })]

      exportService.collectParcelles.mockResolvedValue(filteredParcelles)

      const result = await exportService.collectParcelles(userId, { dateFrom, dateTo })

      expect(exportService.collectParcelles).toHaveBeenCalledWith(userId, { dateFrom, dateTo })
      expect(result).toHaveLength(1)
      expect(result[0].date_creation).toBe('2024-06-01')
    })

    test('should collect products with status filtering', async () => {
      const userId = 'user-123'
      const filters = { status: 'sold' }

      const soldProducts = [TestDataFactory.createProduct({ status: 'sold' })]

      exportService.collectProducts.mockResolvedValue(soldProducts)

      const result = await exportService.collectProducts(userId, filters)

      expect(exportService.collectProducts).toHaveBeenCalledWith(userId, filters)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('sold')
    })

    test('should collect statistics with calculations', async () => {
      const userId = 'user-123'

      const statistics = {
        totalParcelles: 10,
        totalProducts: 25,
        totalRevenue: 1250.50,
        totalProfit: 350.25,
        averageROI: 28.5
      }

      exportService.collectStatistics.mockResolvedValue(statistics)

      const result = await exportService.collectStatistics(userId)

      expect(exportService.collectStatistics).toHaveBeenCalledWith(userId)
      expect(result).toMatchObject({
        totalParcelles: 10,
        totalProducts: 25,
        totalRevenue: 1250.50,
        totalProfit: 350.25,
        averageROI: 28.5
      })
    })
  })

  describe('ExportService Compression and Metadata', () => {
    test('should compress large export data', async () => {
      const largeData = {
        parcelles: Array.from({ length: 1000 }, () => TestDataFactory.createParcelle()),
        produits: Array.from({ length: 2000 }, () => TestDataFactory.createProduct())
      }

      exportService.compressData.mockResolvedValue({
        compressed: Buffer.from('compressed data'),
        originalSize: 1024000,
        compressedSize: 256000,
        compressionRatio: 0.25
      })

      const result = await exportService.compressData(largeData)

      expect(exportService.compressData).toHaveBeenCalledWith(largeData)
      expect(result.compressed).toBeInstanceOf(Buffer)
      expect(result.compressionRatio).toBe(0.25)
      expect(result.compressedSize).toBeLessThan(result.originalSize)
    })

    test('should add comprehensive metadata to export', async () => {
      const exportData = {
        parcelles: [TestDataFactory.createParcelle()],
        produits: [TestDataFactory.createProduct()]
      }

      const metadata = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        userId: 'user-123',
        recordCounts: {
          parcelles: 1,
          produits: 1
        },
        checksum: 'abc123def456',
        exportSettings: {
          format: 'json',
          compression: true,
          includeStatistics: true
        }
      }

      exportService.addMetadata.mockReturnValue({
        ...exportData,
        metadata
      })

      const result = exportService.addMetadata(exportData, 'user-123', { format: 'json' })

      expect(exportService.addMetadata).toHaveBeenCalledWith(exportData, 'user-123', { format: 'json' })
      expect(result.metadata).toMatchObject({
        exportDate: expect.any(String),
        version: expect.any(String),
        userId: 'user-123',
        recordCounts: expect.any(Object)
      })
    })

    test('should generate checksum for data integrity', async () => {
      const testData = { parcelles: [], produits: [] }

      exportService.generateChecksum.mockReturnValue('sha256:abc123def456')

      const result = exportService.generateChecksum(testData)

      expect(exportService.generateChecksum).toHaveBeenCalledWith(testData)
      expect(result).toBe('sha256:abc123def456')
    })
  })

  describe('ExportService Format Conversion and Validation', () => {
    test('should convert data to different formats', async () => {
      const testData = {
        parcelles: [TestDataFactory.createParcelle()],
        produits: [TestDataFactory.createProduct()]
      }

      exportService.convertToFormat.mockResolvedValue({
        success: true,
        format: 'csv',
        data: 'numero,transporteur,poids\nTEST-001,Transport A,1.5',
        size: 45
      })

      const result = await exportService.convertToFormat(testData, 'csv')

      expect(exportService.convertToFormat).toHaveBeenCalledWith(testData, 'csv')
      expect(result.success).toBe(true)
      expect(result.format).toBe('csv')
      expect(result.data).toContain('numero,transporteur,poids')
    })

    test('should validate export format support', async () => {
      exportService.validateExportFormat.mockReturnValue({
        isSupported: true,
        format: 'json',
        capabilities: ['compression', 'metadata', 'streaming']
      })

      const result = exportService.validateExportFormat('json')

      expect(exportService.validateExportFormat).toHaveBeenCalledWith('json')
      expect(result.isSupported).toBe(true)
      expect(result.capabilities).toContain('compression')
    })

    test('should reject unsupported export formats', async () => {
      exportService.validateExportFormat.mockReturnValue({
        isSupported: false,
        format: 'unsupported',
        error: 'Format not supported'
      })

      const result = exportService.validateExportFormat('unsupported')

      expect(result.isSupported).toBe(false)
      expect(result.error).toBe('Format not supported')
    })

    test('should handle large dataset processing with streaming', async () => {
      const largeDataset = Array.from({ length: 10000 }, () => TestDataFactory.createParcelle())

      exportService.processLargeDataset.mockResolvedValue({
        success: true,
        processed: 10000,
        batches: 100,
        processingTime: 5000
      })

      const result = await exportService.processLargeDataset(largeDataset, { batchSize: 100 })

      expect(exportService.processLargeDataset).toHaveBeenCalledWith(largeDataset, { batchSize: 100 })
      expect(result.success).toBe(true)
      expect(result.processed).toBe(10000)
      expect(result.batches).toBe(100)
    })

    test('should stream data for memory efficiency', async () => {
      const streamOptions = {
        batchSize: 1000,
        format: 'json',
        compression: true
      }

      exportService.streamData.mockResolvedValue({
        success: true,
        streamId: 'stream-123',
        totalBatches: 10,
        estimatedSize: 1024000
      })

      const result = await exportService.streamData('user-123', streamOptions)

      expect(exportService.streamData).toHaveBeenCalledWith('user-123', streamOptions)
      expect(result.success).toBe(true)
      expect(result.streamId).toBe('stream-123')
      expect(result.totalBatches).toBe(10)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors during import', async () => {
      const testData = { parcelles: [], produits: [] }

      importService.importComplete.mockRejectedValue(new Error('Database connection lost'))

      await expect(importService.importComplete(testData, 'user-123')).rejects.toThrow('Database connection lost')
    })

    test('should handle memory limits during export', async () => {
      const largeData = Array.from({ length: 100000 }, () => TestDataFactory.createParcelle())

      exportService.generateJsonExport.mockRejectedValue(new Error('Memory limit exceeded'))

      await expect(exportService.generateJsonExport(largeData)).rejects.toThrow('Memory limit exceeded')
    })

    test('should handle file system errors during export', async () => {
      const testData = { parcelles: [], produits: [] }

      exportService.generateExcelExport.mockRejectedValue(new Error('Disk space insufficient'))

      await expect(exportService.generateExcelExport(testData)).rejects.toThrow('Disk space insufficient')
    })

    test('should handle data sanitization during import', async () => {
      const unsafeData = {
        parcelles: [
          {
            ...TestDataFactory.createParcelle(),
            description: '<script>alert("xss")</script>',
            transporteur: 'Transport & Co'
          }
        ]
      }

      importService.sanitizeData.mockReturnValue({
        parcelles: [
          {
            ...unsafeData.parcelles[0],
            description: 'alert("xss")', // Script tags removed
            transporteur: 'Transport &amp; Co' // HTML entities escaped
          }
        ]
      })

      const result = importService.sanitizeData(unsafeData)

      expect(importService.sanitizeData).toHaveBeenCalledWith(unsafeData)
      expect(result.parcelles[0].description).not.toContain('<script>')
      expect(result.parcelles[0].transporteur).toContain('&amp;')
    })

    test('should validate data constraints during import', async () => {
      const invalidData = {
        parcelles: [
          {
            ...TestDataFactory.createParcelle(),
            poids: -1, // Invalid weight
            prix_achat: 0 // Invalid price
          }
        ]
      }

      importService.checkDataConstraints.mockResolvedValue({
        isValid: false,
        violations: [
          { field: 'poids', value: -1, constraint: 'must be positive' },
          { field: 'prix_achat', value: 0, constraint: 'must be greater than 0' }
        ]
      })

      const result = await importService.checkDataConstraints(invalidData)

      expect(importService.checkDataConstraints).toHaveBeenCalledWith(invalidData)
      expect(result.isValid).toBe(false)
      expect(result.violations).toHaveLength(2)
    })
  })
})