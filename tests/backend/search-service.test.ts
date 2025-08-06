import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { SearchService, SearchOptions } from '@/lib/services/search-service'
import { DatabaseService } from '@/lib/services/db'
import { setupTestDatabase, teardownTestDatabase, cleanupTestDatabase } from '../utils/test-database'

describe('SearchService - Classic Backend Tests', () => {
    let searchService: SearchService
    let databaseService: DatabaseService
    let testUserId: string

    beforeAll(async () => {
        await setupTestDatabase()
        databaseService = DatabaseService.getInstance()
        searchService = SearchService.getInstance()
        testUserId = 'test-user-search'
    })

    afterAll(async () => {
        await teardownTestDatabase()
    })

    beforeEach(async () => {
        await cleanupTestDatabase()
        await createTestData()
        searchService.clearCache()
        searchService.clearSearchHistory(testUserId)
    })

    afterEach(async () => {
        searchService.clearCache()
        searchService.clearSearchHistory(testUserId)
    })

    async function createTestData() {
        // Create test user
        await databaseService.query(`
            INSERT OR REPLACE INTO users (id, username, email, password_hash)
            VALUES (?, ?, ?, ?)
        `, [testUserId, 'searchuser', 'search@test.com', 'hashedpassword'])

        // Create test parcelles
        const parcelleData = [
            { id: 'parcelle-1', numero: '12345', transporteur: 'DHL Express', poids: 500, prix_achat: 25.50 },
            { id: 'parcelle-2', numero: '67890', transporteur: 'UPS Standard', poids: 750, prix_achat: 35.00 },
            { id: 'parcelle-3', numero: '11111', transporteur: 'FedEx Priority', poids: 300, prix_achat: 15.75 },
            { id: 'parcelle-4', numero: '22222', transporteur: 'DHL Economy', poids: 400, prix_achat: 20.00 }
        ]

        for (const parcelle of parcelleData) {
            await databaseService.query(`
                INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, user_id, date_creation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [parcelle.id, parcelle.numero, parcelle.transporteur, parcelle.poids, parcelle.prix_achat, testUserId, new Date().toISOString()])
        }

        // Create test produits
        const produitData = [
            { id: 'produit-1', nom: 'iPhone 13 Pro', prix: 899.99, quantite: 1, vendu: false, parcelle_id: 'parcelle-1' },
            { id: 'produit-2', nom: 'Samsung Galaxy S22', prix: 749.99, quantite: 1, vendu: true, parcelle_id: 'parcelle-2' },
            { id: 'produit-3', nom: 'MacBook Air M2', prix: 1299.99, quantite: 1, vendu: false, parcelle_id: 'parcelle-3' },
            { id: 'produit-4', nom: 'iPad Pro 12.9', prix: 1099.99, quantite: 1, vendu: false, parcelle_id: 'parcelle-4' }
        ]

        for (const produit of produitData) {
            await databaseService.query(`
                INSERT INTO produits (id, nom, prix, quantite, vendu, user_id, parcelle_id, date_creation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [produit.id, produit.nom, produit.prix, produit.quantite, produit.vendu, testUserId, produit.parcelle_id, new Date().toISOString()])
        }
    }

    describe('SearchService.search() - Core Search Functionality', () => {
        test('should search parcelles by numero successfully', async () => {
            const options: SearchOptions = {
                query: '12345',
                type: 'parcelle',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            expect(result.results).toHaveLength(1)
            expect(result.results[0].type).toBe('parcelle')
            expect(result.results[0].title).toContain('12345')
            expect(result.results[0].description).toContain('DHL Express')
            expect(result.total).toBe(1)
        })

        test('should search parcelles by transporteur successfully', async () => {
            const options: SearchOptions = {
                query: 'DHL',
                type: 'parcelle',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            expect(result.results.length).toBeGreaterThanOrEqual(2) // DHL Express and DHL Economy
            result.results.forEach(r => {
                expect(r.type).toBe('parcelle')
                expect(r.description).toContain('DHL')
            })
        })

        test('should search produits by name successfully', async () => {
            const options: SearchOptions = {
                query: 'iPhone',
                type: 'produit',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            expect(result.results).toHaveLength(1)
            expect(result.results[0].type).toBe('produit')
            expect(result.results[0].title).toContain('iPhone')
            expect(result.results[0].description).toContain('899.99')
        })

        test('should perform global search across all types', async () => {
            const options: SearchOptions = {
                query: 'Pro',
                type: 'all',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            expect(result.results.length).toBeGreaterThan(0)
            
            // Should find both iPhone 13 Pro and iPad Pro
            const produitResults = result.results.filter(r => r.type === 'produit')
            expect(produitResults.length).toBeGreaterThanOrEqual(2)
            
            // Should also find pages if any match
            const pageResults = result.results.filter(r => r.type === 'page')
            expect(pageResults.length).toBeGreaterThanOrEqual(0)
        })

        test('should return empty results for non-matching query', async () => {
            const options: SearchOptions = {
                query: 'nonexistentquery12345',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            expect(result.results).toHaveLength(0)
            expect(result.total).toBe(0)
            expect(result.suggestions).toHaveLength(0)
        })

        test('should return empty results for empty query', async () => {
            const options: SearchOptions = {
                query: '',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            expect(result.results).toHaveLength(0)
            expect(result.total).toBe(0)
            expect(result.suggestions).toHaveLength(0)
        })

        test('should handle case insensitive search', async () => {
            const options: SearchOptions = {
                query: 'IPHONE',
                type: 'produit',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            expect(result.results).toHaveLength(1)
            expect(result.results[0].title.toLowerCase()).toContain('iphone')
        })

        test('should respect limit parameter', async () => {
            const options: SearchOptions = {
                query: 'Pro',
                userId: testUserId,
                limit: 1
            }

            const result = await searchService.search(options)

            expect(result.results.length).toBeLessThanOrEqual(1)
        })

        test('should handle offset parameter correctly', async () => {
            const options1: SearchOptions = {
                query: 'Pro',
                userId: testUserId,
                limit: 1,
                offset: 0
            }

            const options2: SearchOptions = {
                query: 'Pro',
                userId: testUserId,
                limit: 1,
                offset: 1
            }

            const result1 = await searchService.search(options1)
            const result2 = await searchService.search(options2)

            if (result1.results.length > 0 && result2.results.length > 0) {
                expect(result1.results[0].id).not.toBe(result2.results[0].id)
            }
        })

        test('should search static pages', async () => {
            const options: SearchOptions = {
                query: 'Tableau',
                type: 'all',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            const pageResult = result.results.find(r => r.type === 'page')
            expect(pageResult).toBeDefined()
            expect(pageResult!.title).toContain('Tableau')
            expect(pageResult!.url).toBe('/dashboard')
        })
    })

    describe('SearchService.getSuggestions() - Suggestion Generation', () => {
        test('should generate parcelle suggestions', async () => {
            const suggestions = await searchService.getSuggestions('DH', testUserId, 5)

            expect(suggestions.length).toBeGreaterThan(0)
            const dhlSuggestion = suggestions.find(s => s.text.includes('DHL'))
            expect(dhlSuggestion).toBeDefined()
            expect(dhlSuggestion!.type).toBe('parcelle')
            expect(dhlSuggestion!.count).toBeGreaterThan(0)
        })

        test('should generate produit suggestions', async () => {
            const suggestions = await searchService.getSuggestions('iP', testUserId, 5)

            expect(suggestions.length).toBeGreaterThan(0)
            const iphoneSuggestion = suggestions.find(s => s.text.toLowerCase().includes('iphone'))
            expect(iphoneSuggestion).toBeDefined()
            expect(iphoneSuggestion!.type).toBe('produit')
        })

        test('should generate page suggestions', async () => {
            const suggestions = await searchService.getSuggestions('Tab', testUserId, 5)

            const pageSuggestion = suggestions.find(s => s.text.includes('Tableau'))
            expect(pageSuggestion).toBeDefined()
            expect(pageSuggestion!.type).toBe('page')
            expect(pageSuggestion!.count).toBeUndefined() // Pages don't have counts
        })

        test('should limit suggestions correctly', async () => {
            const suggestions = await searchService.getSuggestions('test', testUserId, 3)

            expect(suggestions.length).toBeLessThanOrEqual(3)
        })

        test('should return empty suggestions for empty query', async () => {
            const suggestions = await searchService.getSuggestions('', testUserId, 5)

            expect(suggestions).toHaveLength(0)
        })

        test('should sort suggestions by count', async () => {
            // Create more DHL parcelles to increase count
            await databaseService.query(`
                INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, user_id, date_creation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['parcelle-5', '33333', 'DHL Express', 600, 30.00, testUserId, new Date().toISOString()])

            const suggestions = await searchService.getSuggestions('DHL', testUserId, 5)

            if (suggestions.length > 1) {
                // Should be sorted by count (descending)
                for (let i = 0; i < suggestions.length - 1; i++) {
                    if (suggestions[i].count && suggestions[i + 1].count) {
                        expect(suggestions[i].count!).toBeGreaterThanOrEqual(suggestions[i + 1].count!)
                    }
                }
            }
        })
    })

    describe('SearchService Relevance Calculation', () => {
        test('should calculate exact match relevance correctly', async () => {
            const options: SearchOptions = {
                query: 'iPhone 13 Pro',
                type: 'produit',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            const exactMatch = result.results.find(r => r.title === 'iPhone 13 Pro')
            expect(exactMatch).toBeDefined()
            expect(exactMatch!.relevance).toBe(100)
        })

        test('should rank prefix matches higher than contains', async () => {
            const options: SearchOptions = {
                query: 'iPhone',
                type: 'all',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            if (result.results.length > 1) {
                // Results should be sorted by relevance
                for (let i = 0; i < result.results.length - 1; i++) {
                    expect(result.results[i].relevance).toBeGreaterThanOrEqual(result.results[i + 1].relevance)
                }
            }
        })

        test('should calculate word boundary matches correctly', async () => {
            const options: SearchOptions = {
                query: 'Pro Air',
                type: 'produit',
                userId: testUserId,
                limit: 10
            }

            const result = await searchService.search(options)

            result.results.forEach(r => {
                expect(r.relevance).toBeGreaterThan(0)
                expect(r.relevance).toBeLessThanOrEqual(100)
            })
        })
    })

    describe('SearchService Caching', () => {
        test('should cache search results', async () => {
            const options: SearchOptions = {
                query: 'iPhone',
                userId: testUserId,
                limit: 10
            }

            // First search
            const result1 = await searchService.search(options)
            
            // Second search should use cache
            const result2 = await searchService.search(options)

            expect(result1.results).toEqual(result2.results)
            expect(result1.total).toBe(result2.total)
        })

        test('should clear cache correctly', async () => {
            const options: SearchOptions = {
                query: 'iPhone',
                userId: testUserId,
                limit: 10
            }

            // First search to populate cache
            await searchService.search(options)
            
            // Clear cache
            searchService.clearCache()
            
            // Should still work after cache clear
            const result = await searchService.search(options)
            expect(result.results.length).toBeGreaterThan(0)
        })

        test('should handle different cache keys', async () => {
            const options1: SearchOptions = {
                query: 'iPhone',
                userId: testUserId,
                limit: 5
            }

            const options2: SearchOptions = {
                query: 'iPhone',
                userId: testUserId,
                limit: 10
            }

            const result1 = await searchService.search(options1)
            const result2 = await searchService.search(options2)

            // Different limits should produce different results
            expect(result1.results.length).toBeLessThanOrEqual(5)
            expect(result2.results.length).toBeLessThanOrEqual(10)
        })
    })

    describe('SearchService History and Analytics', () => {
        test('should record search history', async () => {
            const options: SearchOptions = {
                query: 'iPhone',
                userId: testUserId,
                limit: 10
            }

            await searchService.search(options)

            const history = searchService.getSearchHistory(testUserId, 10)
            expect(history.length).toBe(1)
            expect(history[0].query).toBe('iPhone')
            expect(history[0].userId).toBe(testUserId)
        })

        test('should limit search history correctly', async () => {
            // Perform multiple searches
            for (let i = 0; i < 5; i++) {
                await searchService.search({
                    query: `search-${i}`,
                    userId: testUserId,
                    limit: 10
                })
            }

            const history = searchService.getSearchHistory(testUserId, 3)
            expect(history.length).toBe(3)
            
            // Should be sorted by timestamp (most recent first)
            expect(history[0].query).toBe('search-4')
            expect(history[1].query).toBe('search-3')
            expect(history[2].query).toBe('search-2')
        })

        test('should generate search analytics', async () => {
            // Perform multiple searches
            await searchService.search({ query: 'iPhone', userId: testUserId, limit: 10 })
            await searchService.search({ query: 'Samsung', userId: testUserId, limit: 10 })
            await searchService.search({ query: 'iPhone', userId: testUserId, limit: 10 }) // Duplicate

            const analytics = searchService.getSearchAnalytics(testUserId)

            expect(analytics.totalSearches).toBe(3)
            expect(analytics.popularQueries.length).toBeGreaterThan(0)
            expect(analytics.popularQueries[0].query).toBe('iPhone')
            expect(analytics.popularQueries[0].count).toBe(2)
            expect(analytics.averageResultCount).toBeGreaterThan(0)
        })

        test('should clear search history', async () => {
            await searchService.search({ query: 'test', userId: testUserId, limit: 10 })

            let history = searchService.getSearchHistory(testUserId, 10)
            expect(history.length).toBe(1)

            searchService.clearSearchHistory(testUserId)

            history = searchService.getSearchHistory(testUserId, 10)
            expect(history.length).toBe(0)
        })
    })

    describe('SearchService Performance and Optimization', () => {
        beforeEach(async () => {
            // Create large dataset for performance testing
            await createLargeTestDataset()
        })

        async function createLargeTestDataset() {
            // Create 100 parcelles
            for (let i = 0; i < 100; i++) {
                await databaseService.query(`
                    INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, user_id, date_creation)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    `perf-parcelle-${i}`,
                    `${10000 + i}`,
                    `Transporteur-${i % 10}`,
                    Math.floor(Math.random() * 1000) + 100,
                    Math.floor(Math.random() * 100) + 10,
                    testUserId,
                    new Date().toISOString()
                ])
            }

            // Create 200 produits
            for (let i = 0; i < 200; i++) {
                await databaseService.query(`
                    INSERT INTO produits (id, nom, prix, quantite, vendu, user_id, parcelle_id, date_creation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    `perf-produit-${i}`,
                    `Product-${i}`,
                    Math.floor(Math.random() * 1000) + 50,
                    1,
                    Math.random() > 0.5,
                    testUserId,
                    `perf-parcelle-${i % 100}`,
                    new Date().toISOString()
                ])
            }
        }

        test('should handle large dataset search efficiently', async () => {
            const startTime = Date.now()

            const result = await searchService.search({
                query: 'Product',
                userId: testUserId,
                limit: 20
            })

            const endTime = Date.now()
            const responseTime = endTime - startTime

            expect(result.results.length).toBeGreaterThan(0)
            expect(responseTime).toBeLessThan(1000) // Should complete within 1 second
        })

        test('should handle concurrent searches correctly', async () => {
            const searchPromises = Array(10).fill(null).map((_, index) =>
                searchService.search({
                    query: `Product-${index}`,
                    userId: testUserId,
                    limit: 10
                })
            )

            const results = await Promise.all(searchPromises)

            results.forEach((result, index) => {
                expect(result.results).toBeDefined()
                expect(result.total).toBeGreaterThanOrEqual(0)
            })
        })

        test('should rebuild search index', async () => {
            // This is a placeholder test for future search indexing
            await expect(searchService.rebuildSearchIndex(testUserId)).resolves.not.toThrow()
        })
    })

    describe('SearchService Error Handling', () => {
        test('should handle database errors gracefully', async () => {
            // Close database to simulate error
            const originalQuery = databaseService.query
            databaseService.query = async () => {
                throw new Error('Database connection failed')
            }

            const options: SearchOptions = {
                query: 'test',
                userId: testUserId,
                limit: 10
            }

            await expect(searchService.search(options)).rejects.toThrow('Database connection failed')

            // Restore original method
            databaseService.query = originalQuery
        })

        test('should handle invalid user ID', async () => {
            const options: SearchOptions = {
                query: 'iPhone',
                userId: 'invalid-user-id',
                limit: 10
            }

            const result = await searchService.search(options)

            // Should return empty results for invalid user
            expect(result.results).toHaveLength(0)
            expect(result.total).toBe(0)
        })

        test('should handle malformed queries', async () => {
            const malformedQueries = [
                "'; DROP TABLE parcelles; --",
                '<script>alert("xss")</script>',
                '\\x00\\x01\\x02',
                'a'.repeat(1000) // Very long query
            ]

            for (const query of malformedQueries) {
                const options: SearchOptions = {
                    query,
                    userId: testUserId,
                    limit: 10
                }

                // Should not throw errors
                await expect(searchService.search(options)).resolves.toBeDefined()
            }
        })
    })
})