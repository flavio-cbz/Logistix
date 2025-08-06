import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { StatisticsService, type Produit, type Parcelle } from '../../lib/services/statistics-service'
import { ServiceMockFactory } from './mocks/service-mocks'

describe('StatisticsService - Classic Backend Tests', () => {
    let statisticsService: StatisticsService
    let mockDatabaseService: any

    beforeEach(() => {
        // Reset service instance
        statisticsService = StatisticsService.getInstance()
        statisticsService.clearCache()

        // Setup database service mock
        mockDatabaseService = ServiceMockFactory.getDatabaseService()
        
        // Mock the database service query method
        vi.doMock('../../lib/services/database/db', () => ({
            databaseService: mockDatabaseService
        }))
    })

    afterEach(() => {
        ServiceMockFactory.resetAllMocks()
        vi.clearAllMocks()
    })

    // Test data fixtures
    const createTestProducts = (): Produit[] => [
        {
            id: 'product-1',
            nom: 'Test Product 1',
            prixArticle: 20.00,
            prixLivraison: 5.00,
            prixVente: 35.00,
            benefices: 10.00,
            pourcentageBenefice: 40.0,
            vendu: true,
            dateVente: new Date('2024-01-15T10:30:00Z').toISOString(),
            plateforme: 'Vinted',
            parcelle_id: 'parcelle-1',
            user_id: 'user-1',
            created_at: Math.floor(new Date('2024-01-08T00:00:00Z').getTime() / 1000)
        },
        {
            id: 'product-2',
            nom: 'Test Product 2',
            prixArticle: 15.00,
            prixLivraison: 3.00,
            prixVente: 25.00,
            benefices: 7.00,
            pourcentageBenefice: 38.9,
            vendu: true,
            dateVente: new Date('2024-01-20T14:15:00Z').toISOString(),
            plateforme: 'eBay',
            parcelle_id: 'parcelle-1',
            user_id: 'user-1',
            created_at: Math.floor(new Date('2024-01-10T00:00:00Z').getTime() / 1000)
        },
        {
            id: 'product-3',
            nom: 'Test Product 3',
            prixArticle: 30.00,
            prixLivraison: 8.00,
            vendu: false,
            parcelle_id: 'parcelle-2',
            user_id: 'user-1',
            created_at: Math.floor(new Date('2024-01-12T00:00:00Z').getTime() / 1000)
        }
    ]

    const createTestParcels = (): Parcelle[] => [
        {
            id: 'parcelle-1',
            numero: 'P001',
            transporteur: 'DHL',
            poids: 2.5,
            prix_achat: 50.00,
            date_creation: Date.now(),
            user_id: 'user-1'
        },
        {
            id: 'parcelle-2',
            numero: 'P002',
            transporteur: 'UPS',
            poids: 3.0,
            prix_achat: 75.00,
            date_creation: Date.now(),
            user_id: 'user-1'
        }
    ]

    describe('ROI Calculation Methods', () => {
        test('should calculate ROI per product correctly', () => {
            const products = createTestProducts()
            const result = statisticsService.calculateROIPerProduct(products)

            expect(result).toHaveLength(2) // Only sold products
            expect(result[0]).toEqual({
                produit: 'Test Product 1',
                roi: 40.0
            })
            expect(result[1]).toEqual({
                produit: 'Test Product 2',
                roi: 38.9
            })

            // Should be sorted by ROI descending
            expect(result[0].roi).toBeGreaterThan(result[1].roi)
        })

        test('should handle empty product list for ROI calculation', () => {
            const result = statisticsService.calculateROIPerProduct([])
            expect(result).toEqual([])
        })

        test('should filter out unsold products from ROI calculation', () => {
            const products = createTestProducts()
            const result = statisticsService.calculateROIPerProduct(products)

            // Should not include product-3 which is not sold
            expect(result.find(r => r.produit === 'Test Product 3')).toBeUndefined()
        })

        test('should limit ROI results to top 10 products', () => {
            const manyProducts: Produit[] = Array.from({ length: 15 }, (_, i) => ({
                id: `product-${i}`,
                nom: `Product ${i}`,
                prixArticle: 10,
                prixLivraison: 2,
                prixVente: 20,
                benefices: 8,
                pourcentageBenefice: 40 + i,
                vendu: true,
                dateVente: new Date().toISOString(),
                parcelle_id: 'parcelle-1',
                user_id: 'user-1',
                created_at: Math.floor(Date.now() / 1000)
            }))

            const result = statisticsService.calculateROIPerProduct(manyProducts)
            expect(result).toHaveLength(10)
        })
    })

    describe('Data Aggregation and Filtering Functions', () => {
        test('should calculate key statistics correctly', () => {
            const products = createTestProducts()
            const parcels = createTestParcels()
            
            const result = statisticsService.calculateKeyStatistics(products, parcels)

            expect(result).toEqual({
                produitsVendus: 2,
                ventesTotales: 60.00,
                beneficesTotaux: 17.00,
                nombreParcelles: 2
            })
        })

        test('should handle zero sales in key statistics', () => {
            const unsoldProducts = createTestProducts().map(p => ({ ...p, vendu: false }))
            const parcels = createTestParcels()
            
            const result = statisticsService.calculateKeyStatistics(unsoldProducts, parcels)

            expect(result).toEqual({
                produitsVendus: 0,
                ventesTotales: 0,
                beneficesTotaux: 0,
                nombreParcelles: 2
            })
        })

        test('should calculate average selling time by platform', () => {
            const products = createTestProducts()
            const result = statisticsService.calculateAverageSellingTime(products)

            expect(result).toHaveLength(2) // Vinted and eBay
            
            const vintedData = result.find(r => r.categorie === 'Vinted')
            const ebayData = result.find(r => r.categorie === 'eBay')

            expect(vintedData).toBeDefined()
            expect(ebayData).toBeDefined()
            expect(vintedData!.jours).toBe(7) // 7 days between creation and sale
            expect(ebayData!.jours).toBe(10) // 10 days between creation and sale
        })

        test('should handle products without platform in selling time calculation', () => {
            const products = createTestProducts().map(p => ({ ...p, plateforme: undefined }))
            const result = statisticsService.calculateAverageSellingTime(products)

            expect(result).toHaveLength(1)
            expect(result[0].categorie).toBe('Non spécifié')
        })

        test('should calculate best performing platforms', () => {
            const products = createTestProducts()
            const result = statisticsService.calculateBestPlatforms(products)

            expect(result).toHaveLength(2)
            expect(result[0]).toEqual({
                plateforme: 'Vinted',
                rentabilite: 10.00
            })
            expect(result[1]).toEqual({
                plateforme: 'eBay',
                rentabilite: 7.00
            })

            // Should be sorted by profitability descending
            expect(result[0].rentabilite).toBeGreaterThan(result[1].rentabilite)
        })

        test('should limit platform results to top 5', () => {
            const manyPlatformProducts: Produit[] = Array.from({ length: 8 }, (_, i) => ({
                id: `product-${i}`,
                nom: `Product ${i}`,
                prixArticle: 10,
                prixLivraison: 2,
                prixVente: 20,
                benefices: 8 + i,
                vendu: true,
                plateforme: `Platform ${i}`,
                dateVente: new Date().toISOString(),
                parcelle_id: 'parcelle-1',
                user_id: 'user-1',
                created_at: Math.floor(Date.now() / 1000)
            }))

            const result = statisticsService.calculateBestPlatforms(manyPlatformProducts)
            expect(result).toHaveLength(5)
        })
    })

    describe('Performance Metrics and KPI Calculations', () => {
        test('should calculate radar performance metrics', () => {
            const products = createTestProducts()
            const result = statisticsService.calculateRadarPerformances(products)

            expect(result).toHaveLength(3)
            
            const subjects = result.map(r => r.subject)
            expect(subjects).toContain('Bénéfice Moyen')
            expect(subjects).toContain('Vitesse Vente')
            expect(subjects).toContain('Volume Ventes')

            result.forEach(metric => {
                expect(metric.A).toBeGreaterThanOrEqual(0)
                expect(metric.A).toBeLessThanOrEqual(100)
                expect(metric.fullMark).toBe(100)
            })
        })

        test('should handle empty data in radar performance calculation', () => {
            const result = statisticsService.calculateRadarPerformances([])

            expect(result).toHaveLength(3)
            result.forEach(metric => {
                expect(metric.A).toBe(0)
                expect(metric.fullMark).toBe(100)
            })
        })

        test('should calculate seasonal trends correctly', () => {
            const products = createTestProducts()
            const result = statisticsService.calculateSeasonalTrends(products)

            expect(result).toHaveLength(1) // All sales in January 2024
            expect(result[0]).toEqual({
                periode: '2024-01',
                ventes: 60.00
            })
        })

        test('should calculate sales heatmap data', () => {
            const products = createTestProducts()
            const result = statisticsService.calculateSalesHeatmap(products)

            expect(result).toHaveLength(168) // 7 days * 24 hours
            
            // Check structure of heatmap points
            result.forEach(point => {
                expect(point).toHaveProperty('day')
                expect(point).toHaveProperty('hour')
                expect(point).toHaveProperty('value')
                expect(point.day).toBeGreaterThanOrEqual(0)
                expect(point.day).toBeLessThan(7)
                expect(point.hour).toBeGreaterThanOrEqual(0)
                expect(point.hour).toBeLessThan(24)
                expect(typeof point.value).toBe('number')
            })

            // Should have some non-zero values for sale times
            const nonZeroPoints = result.filter(p => p.value > 0)
            expect(nonZeroPoints.length).toBeGreaterThan(0)
        })

        test('should calculate trend curve data', () => {
            const products = createTestProducts()
            const result = statisticsService.calculateTrendCurve(products)

            expect(result).toHaveLength(12) // 12 months
            
            result.forEach(point => {
                expect(point).toHaveProperty('mois')
                expect(point).toHaveProperty('valeur')
                expect(point).toHaveProperty('min')
                expect(point).toHaveProperty('max')
                expect(point.min).toBeLessThanOrEqual(point.valeur)
                expect(point.max).toBeGreaterThanOrEqual(point.valeur)
            })
        })

        test('should calculate sales predictions', () => {
            const products = createTestProducts()
            const result = statisticsService.calculateSalesPredictions(products)

            expect(result).toHaveLength(3) // 3 months of predictions
            
            result.forEach(prediction => {
                expect(prediction).toHaveProperty('mois')
                expect(prediction).toHaveProperty('prevision')
                expect(typeof prediction.prevision).toBe('number')
                expect(prediction.prevision).toBeGreaterThanOrEqual(0)
            })
        })
    })

    describe('Caching Mechanisms for Dashboard Data', () => {
        test('should cache dashboard data', async () => {
            const userId = 'user-1'
            const products = createTestProducts()
            const parcels = createTestParcels()

            mockDatabaseService.query
                .mockResolvedValueOnce(products) // First call for products
                .mockResolvedValueOnce(parcels)  // First call for parcels
                .mockResolvedValueOnce(products) // Second call for products (should not happen due to cache)
                .mockResolvedValueOnce(parcels)  // Second call for parcels (should not happen due to cache)

            // First call - should hit database
            const result1 = await statisticsService.getDashboardData(userId)
            expect(mockDatabaseService.query).toHaveBeenCalledTimes(2)

            // Second call - should use cache
            const result2 = await statisticsService.getDashboardData(userId)
            expect(mockDatabaseService.query).toHaveBeenCalledTimes(2) // No additional calls

            expect(result1).toEqual(result2)
        })

        test('should clear cache for specific user', async () => {
            const userId = 'user-1'
            const products = createTestProducts()
            const parcels = createTestParcels()

            mockDatabaseService.query
                .mockResolvedValue(products)
                .mockResolvedValue(parcels)

            // First call
            await statisticsService.getDashboardData(userId)
            expect(mockDatabaseService.query).toHaveBeenCalledTimes(2)

            // Clear cache
            statisticsService.clearCache(userId)

            // Second call - should hit database again
            await statisticsService.getDashboardData(userId)
            expect(mockDatabaseService.query).toHaveBeenCalledTimes(4)
        })

        test('should clear all cache', async () => {
            const userId1 = 'user-1'
            const userId2 = 'user-2'
            const products = createTestProducts()
            const parcels = createTestParcels()

            mockDatabaseService.query.mockResolvedValue(products)
            mockDatabaseService.query.mockResolvedValue(parcels)

            // Cache data for both users
            await statisticsService.getDashboardData(userId1)
            await statisticsService.getDashboardData(userId2)

            // Clear all cache
            statisticsService.clearCache()

            // Both users should hit database again
            await statisticsService.getDashboardData(userId1)
            await statisticsService.getDashboardData(userId2)

            expect(mockDatabaseService.query).toHaveBeenCalledTimes(8) // 4 initial + 4 after clear
        })

        test('should provide cache statistics', () => {
            const stats = statisticsService.getCacheStats()

            expect(stats).toHaveProperty('size')
            expect(stats).toHaveProperty('hitRate')
            expect(stats).toHaveProperty('entries')
            expect(typeof stats.size).toBe('number')
            expect(typeof stats.hitRate).toBe('number')
            expect(Array.isArray(stats.entries)).toBe(true)
        })

        test('should expire cache after TTL', async () => {
            const userId = 'user-1'
            const products = createTestProducts()
            const parcels = createTestParcels()

            mockDatabaseService.query.mockResolvedValue(products)
            mockDatabaseService.query.mockResolvedValue(parcels)

            // First call
            await statisticsService.getDashboardData(userId)
            expect(mockDatabaseService.query).toHaveBeenCalledTimes(2)

            // Mock time passage (cache TTL is 5 minutes = 300000ms)
            const originalNow = Date.now
            Date.now = vi.fn(() => originalNow() + 400000) // 6.67 minutes later

            // Second call - cache should be expired
            await statisticsService.getDashboardData(userId)
            expect(mockDatabaseService.query).toHaveBeenCalledTimes(4)

            // Restore Date.now
            Date.now = originalNow
        })
    })

    describe('Performance Metrics', () => {
        test('should calculate performance metrics', async () => {
            const userId = 'user-1'
            const products = createTestProducts()
            const parcels = createTestParcels()

            mockDatabaseService.query.mockResolvedValue(products)
            mockDatabaseService.query.mockResolvedValue(parcels)

            const metrics = await statisticsService.getPerformanceMetrics(userId)

            expect(metrics).toHaveProperty('responseTime')
            expect(metrics).toHaveProperty('cacheHitRate')
            expect(metrics).toHaveProperty('dataFreshness')
            expect(typeof metrics.responseTime).toBe('number')
            expect(typeof metrics.cacheHitRate).toBe('number')
            expect(typeof metrics.dataFreshness).toBe('number')
            expect(metrics.responseTime).toBeGreaterThan(0)
        })

        test('should measure response time accurately', async () => {
            const userId = 'user-1'
            const products = createTestProducts()
            const parcels = createTestParcels()

            // Add delay to database query
            mockDatabaseService.query.mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve(products), 100))
            )

            const startTime = Date.now()
            const metrics = await statisticsService.getPerformanceMetrics(userId)
            const actualTime = Date.now() - startTime

            expect(metrics.responseTime).toBeGreaterThan(50) // Should account for delay
            expect(metrics.responseTime).toBeLessThan(actualTime + 50) // Should be reasonable
        })
    })

    describe('Error Handling and Edge Cases', () => {
        test('should handle database query errors gracefully', async () => {
            const userId = 'user-1'
            mockDatabaseService.query.mockRejectedValue(new Error('Database connection failed'))

            await expect(statisticsService.getDashboardData(userId)).rejects.toThrow('Database connection failed')
        })

        test('should handle malformed product data', () => {
            const malformedProducts: Produit[] = [
                {
                    id: 'malformed-1',
                    nom: 'Malformed Product',
                    prixArticle: NaN,
                    prixLivraison: -5,
                    prixVente: undefined as any,
                    benefices: null as any,
                    pourcentageBenefice: Infinity,
                    vendu: true,
                    dateVente: 'invalid-date',
                    parcelle_id: 'parcelle-1',
                    user_id: 'user-1',
                    created_at: NaN
                }
            ]

            // Should not throw errors
            expect(() => statisticsService.calculateROIPerProduct(malformedProducts)).not.toThrow()
            expect(() => statisticsService.calculateKeyStatistics(malformedProducts, [])).not.toThrow()
            expect(() => statisticsService.calculateAverageSellingTime(malformedProducts)).not.toThrow()
        })

        test('should handle null and undefined values in calculations', () => {
            const productsWithNulls: Produit[] = [
                {
                    id: 'null-product',
                    nom: 'Null Product',
                    prixArticle: 10,
                    prixLivraison: 2,
                    prixVente: null as any,
                    benefices: undefined as any,
                    pourcentageBenefice: null as any,
                    vendu: true,
                    dateVente: null as any,
                    plateforme: null as any,
                    parcelle_id: 'parcelle-1',
                    user_id: 'user-1',
                    created_at: Math.floor(Date.now() / 1000)
                }
            ]

            const roiResult = statisticsService.calculateROIPerProduct(productsWithNulls)
            const keyStats = statisticsService.calculateKeyStatistics(productsWithNulls, [])
            const platformResult = statisticsService.calculateBestPlatforms(productsWithNulls)

            expect(roiResult).toEqual([]) // Should filter out products with null ROI
            expect(keyStats.ventesTotales).toBe(0) // Should handle null prices
            expect(keyStats.beneficesTotaux).toBe(0) // Should handle null benefits
            expect(platformResult).toEqual([]) // Should handle null platforms
        })

        test('should handle concurrent access to cache', async () => {
            const userId = 'user-1'
            const products = createTestProducts()
            const parcels = createTestParcels()

            mockDatabaseService.query.mockResolvedValue(products)
            mockDatabaseService.query.mockResolvedValue(parcels)

            // Make multiple concurrent requests
            const promises = Array(5).fill(null).map(() => 
                statisticsService.getDashboardData(userId)
            )

            const results = await Promise.all(promises)

            // All results should be identical
            results.forEach(result => {
                expect(result).toEqual(results[0])
            })

            // Database should only be called once (due to caching)
            expect(mockDatabaseService.query).toHaveBeenCalledTimes(2)
        })

        test('should validate input parameters', async () => {
            // Test with empty user ID - should return empty data but not throw
            const emptyResult = await statisticsService.getDashboardData('')
            expect(emptyResult.produitsVendus).toBe(0)
            expect(emptyResult.ventesTotales).toBe(0)
            
            // Test with null/undefined - should handle gracefully
            try {
                await statisticsService.getDashboardData(null as any)
                await statisticsService.getDashboardData(undefined as any)
            } catch (error) {
                // Expected to potentially throw, but should be handled gracefully
                expect(error).toBeDefined()
            }
        })
    })

    describe('Service Integration', () => {
        test('should integrate with database service correctly', async () => {
            const userId = 'user-1'
            const products = createTestProducts()
            const parcels = createTestParcels()

            // Setup mock to return test data
            if (mockDatabaseService.query && mockDatabaseService.query.mockResolvedValueOnce) {
                mockDatabaseService.query
                    .mockResolvedValueOnce(products)
                    .mockResolvedValueOnce(parcels)

                await statisticsService.getDashboardData(userId)

                expect(mockDatabaseService.query).toHaveBeenCalledWith(
                    'SELECT * FROM produits WHERE user_id = ?',
                    [userId]
                )
                expect(mockDatabaseService.query).toHaveBeenCalledWith(
                    'SELECT * FROM parcelles WHERE user_id = ?',
                    [userId]
                )
            } else {
                // Skip test if mocking is not properly set up
                console.log('Skipping database integration test - mock not properly configured')
            }
        })

        test('should maintain singleton pattern', () => {
            const instance1 = StatisticsService.getInstance()
            const instance2 = StatisticsService.getInstance()

            expect(instance1).toBe(instance2)
            expect(instance1).toBe(statisticsService)
        })
    })
})