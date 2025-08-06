import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import supertest from 'supertest'
import {
    setupTestServer,
    teardownTestServer,
    setupTestDatabase,
    teardownTestDatabase,
    cleanupTestDatabase,
    createApiClient
} from './setup'
import { createAuthHelpers, ApiAuthHelpers } from './auth-helpers'

describe('Search API - Direct HTTP Tests', () => {
    let apiClient: supertest.SuperTest<supertest.Test>
    let testDb: any
    let authHelpers: ApiAuthHelpers
    let testUser: any
    let sessionCookie: string

    beforeAll(async () => {
        await setupTestServer()
        testDb = await setupTestDatabase()
        apiClient = createApiClient()
        authHelpers = createAuthHelpers(apiClient, testDb)
    })

    afterAll(async () => {
        await teardownTestDatabase()
        await teardownTestServer()
    })

    beforeEach(async () => {
        await cleanupTestDatabase()
        
        // Create test user and session
        testUser = await authHelpers.createTestUser({
            email: 'search@example.com',
            username: 'searchuser'
        })
        const session = await authHelpers.createTestSession(testUser.id)
        sessionCookie = `session_id=${session.id}`

        // Create test data
        await createTestData()
    })

    afterEach(async () => {
        await authHelpers.cleanupTestUsers()
    })

    async function createTestData() {
        // Create test parcelles
        const parcelleInsert = testDb.prepare(`
            INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, user_id, date_creation)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `)

        parcelleInsert.run('parcelle-1', '12345', 'DHL Express', 500, 25.50, testUser.id, new Date().toISOString())
        parcelleInsert.run('parcelle-2', '67890', 'UPS Standard', 750, 35.00, testUser.id, new Date().toISOString())
        parcelleInsert.run('parcelle-3', '11111', 'FedEx Priority', 300, 15.75, testUser.id, new Date().toISOString())

        // Create test produits
        const produitInsert = testDb.prepare(`
            INSERT INTO produits (id, nom, prix, quantite, vendu, user_id, parcelle_id, date_creation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)

        produitInsert.run('produit-1', 'iPhone 13 Pro', 899.99, 1, false, testUser.id, 'parcelle-1', new Date().toISOString())
        produitInsert.run('produit-2', 'Samsung Galaxy S22', 749.99, 1, true, testUser.id, 'parcelle-2', new Date().toISOString())
        produitInsert.run('produit-3', 'MacBook Air M2', 1299.99, 1, false, testUser.id, 'parcelle-3', new Date().toISOString())
    }

    describe('GET /api/v1/search/global', () => {
        test('should perform global search successfully', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=iPhone')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                query: 'iPhone',
                page: 1,
                limit: 10
            })

            expect(response.body.results).toBeInstanceOf(Array)
            expect(response.body.total).toBeGreaterThan(0)
            
            // Should find the iPhone product
            const iphoneResult = response.body.results.find((r: any) => r.title.includes('iPhone'))
            expect(iphoneResult).toBeDefined()
            expect(iphoneResult.type).toBe('produit')
        })

        test('should search parcelles by numero', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=12345')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.results.length).toBeGreaterThan(0)
            
            const parcelleResult = response.body.results.find((r: any) => r.type === 'parcelle')
            expect(parcelleResult).toBeDefined()
            expect(parcelleResult.title).toContain('12345')
        })

        test('should search parcelles by transporteur', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=DHL')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.results.length).toBeGreaterThan(0)
            
            const parcelleResult = response.body.results.find((r: any) => r.type === 'parcelle')
            expect(parcelleResult).toBeDefined()
            expect(parcelleResult.description).toContain('DHL')
        })

        test('should search products by name', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=Samsung')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.results.length).toBeGreaterThan(0)
            
            const produitResult = response.body.results.find((r: any) => r.type === 'produit')
            expect(produitResult).toBeDefined()
            expect(produitResult.title).toContain('Samsung')
        })

        test('should search pages by name', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=Tableau')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.results.length).toBeGreaterThan(0)
            
            const pageResult = response.body.results.find((r: any) => r.type === 'page')
            expect(pageResult).toBeDefined()
            expect(pageResult.title).toContain('Tableau')
        })

        test('should filter search by type', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=test&type=produit')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            // All results should be products
            response.body.results.forEach((result: any) => {
                expect(['produit']).toContain(result.type)
            })
        })

        test('should handle pagination correctly', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=test&page=2&limit=1')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.page).toBe(2)
            expect(response.body.limit).toBe(1)
            expect(response.body.results.length).toBeLessThanOrEqual(1)
        })

        test('should limit results correctly', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=test&limit=2')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.results.length).toBeLessThanOrEqual(2)
        })

        test('should enforce maximum limit', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=test&limit=100')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.limit).toBe(50) // Should be capped at 50
        })

        test('should return empty results for no matches', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=nonexistentquery12345')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                results: [],
                total: 0,
                query: 'nonexistentquery12345'
            })
        })

        test('should return empty results for empty query', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                results: [],
                total: 0,
                query: ''
            })
        })

        test('should require authentication', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=test')
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })

        test('should handle invalid session', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=test')
                .set('Cookie', 'session_id=invalid-session')
                .expect(401)

            expect(response.body.success).toBe(false)
        })

        test('should sort results by relevance', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=Pro')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            if (response.body.results.length > 1) {
                // Results should be sorted by relevance (descending)
                for (let i = 0; i < response.body.results.length - 1; i++) {
                    expect(response.body.results[i].relevance).toBeGreaterThanOrEqual(
                        response.body.results[i + 1].relevance
                    )
                }
            }
        })

        test('should generate suggestions', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=iP')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.suggestions).toBeInstanceOf(Array)
        })

        test('should handle special characters in query', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=' + encodeURIComponent('test@#$%'))
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.results).toBeInstanceOf(Array)
        })

        test('should handle case insensitive search', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=IPHONE')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            const iphoneResult = response.body.results.find((r: any) => 
                r.title.toLowerCase().includes('iphone')
            )
            expect(iphoneResult).toBeDefined()
        })

        test('should handle database errors gracefully', async () => {
            // Close database connection to simulate error
            testDb.close()

            const response = await apiClient
                .get('/api/v1/search/global?q=test')
                .set('Cookie', sessionCookie)
                .expect(500)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Erreur lors de la recherche'
            })

            // Restore database connection
            testDb = await setupTestDatabase()
        })
    })

    describe('GET /api/v1/search/suggestions', () => {
        test('should get search suggestions successfully', async () => {
            const response = await apiClient
                .get('/api/v1/search/suggestions?q=DH')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                suggestions: expect.any(Array)
            })

            // Should find DHL suggestion
            const dhlSuggestion = response.body.suggestions.find((s: any) => 
                s.text.includes('DHL')
            )
            expect(dhlSuggestion).toBeDefined()
            expect(dhlSuggestion.type).toBe('parcelle')
        })

        test('should get product name suggestions', async () => {
            const response = await apiClient
                .get('/api/v1/search/suggestions?q=iP')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            const iphoneSuggestion = response.body.suggestions.find((s: any) => 
                s.text.toLowerCase().includes('iphone')
            )
            expect(iphoneSuggestion).toBeDefined()
            expect(iphoneSuggestion.type).toBe('produit')
        })

        test('should get page suggestions', async () => {
            const response = await apiClient
                .get('/api/v1/search/suggestions?q=Tab')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            const pageSuggestion = response.body.suggestions.find((s: any) => 
                s.text.includes('Tableau')
            )
            expect(pageSuggestion).toBeDefined()
            expect(pageSuggestion.type).toBe('page')
        })

        test('should limit suggestions correctly', async () => {
            const response = await apiClient
                .get('/api/v1/search/suggestions?q=test&limit=3')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.suggestions.length).toBeLessThanOrEqual(3)
        })

        test('should enforce maximum limit for suggestions', async () => {
            const response = await apiClient
                .get('/api/v1/search/suggestions?q=test&limit=20')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.suggestions.length).toBeLessThanOrEqual(10)
        })

        test('should return empty suggestions for empty query', async () => {
            const response = await apiClient
                .get('/api/v1/search/suggestions?q=')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                suggestions: []
            })
        })

        test('should require authentication for suggestions', async () => {
            const response = await apiClient
                .get('/api/v1/search/suggestions?q=test')
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })

        test('should include count for data suggestions', async () => {
            const response = await apiClient
                .get('/api/v1/search/suggestions?q=DH')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            const dataSuggestion = response.body.suggestions.find((s: any) => 
                s.type === 'parcelle' || s.type === 'produit'
            )
            
            if (dataSuggestion) {
                expect(dataSuggestion.count).toBeDefined()
                expect(typeof dataSuggestion.count).toBe('number')
            }
        })

        test('should handle case insensitive suggestions', async () => {
            const response = await apiClient
                .get('/api/v1/search/suggestions?q=dhl')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            const dhlSuggestion = response.body.suggestions.find((s: any) => 
                s.text.toLowerCase().includes('dhl')
            )
            expect(dhlSuggestion).toBeDefined()
        })
    })

    describe('Search Performance Tests', () => {
        beforeEach(async () => {
            // Create large dataset for performance testing
            await createLargeTestDataset()
        })

        async function createLargeTestDataset() {
            const parcelleInsert = testDb.prepare(`
                INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, user_id, date_creation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `)

            const produitInsert = testDb.prepare(`
                INSERT INTO produits (id, nom, prix, quantite, vendu, user_id, parcelle_id, date_creation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `)

            // Create 100 parcelles
            for (let i = 0; i < 100; i++) {
                parcelleInsert.run(
                    `perf-parcelle-${i}`,
                    `${10000 + i}`,
                    `Transporteur-${i % 10}`,
                    Math.floor(Math.random() * 1000) + 100,
                    Math.floor(Math.random() * 100) + 10,
                    testUser.id,
                    new Date().toISOString()
                )
            }

            // Create 200 produits
            for (let i = 0; i < 200; i++) {
                produitInsert.run(
                    `perf-produit-${i}`,
                    `Product-${i}`,
                    Math.floor(Math.random() * 1000) + 50,
                    1,
                    Math.random() > 0.5,
                    testUser.id,
                    `perf-parcelle-${i % 100}`,
                    new Date().toISOString()
                )
            }
        }

        test('should handle large dataset search within reasonable time', async () => {
            const startTime = Date.now()
            
            const response = await apiClient
                .get('/api/v1/search/global?q=Product&limit=20')
                .set('Cookie', sessionCookie)
                .expect(200)

            const endTime = Date.now()
            const responseTime = endTime - startTime

            expect(response.body.success).toBe(true)
            expect(response.body.results.length).toBeGreaterThan(0)
            
            // Should respond within 2 seconds
            expect(responseTime).toBeLessThan(2000)
        })

        test('should handle concurrent search requests', async () => {
            const searchPromises = Array(10).fill(null).map((_, index) =>
                apiClient
                    .get(`/api/v1/search/global?q=Product-${index}`)
                    .set('Cookie', sessionCookie)
            )

            const responses = await Promise.all(searchPromises)

            responses.forEach(response => {
                expect(response.status).toBe(200)
                expect(response.body.success).toBe(true)
            })
        })

        test('should maintain performance with complex queries', async () => {
            const complexQuery = 'Product Transporteur 100'
            const startTime = Date.now()
            
            const response = await apiClient
                .get(`/api/v1/search/global?q=${encodeURIComponent(complexQuery)}`)
                .set('Cookie', sessionCookie)
                .expect(200)

            const endTime = Date.now()
            const responseTime = endTime - startTime

            expect(response.body.success).toBe(true)
            expect(responseTime).toBeLessThan(3000) // 3 seconds for complex query
        })
    })

    describe('Search Result Ranking and Relevance', () => {
        test('should rank exact matches higher', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=iPhone 13 Pro')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            if (response.body.results.length > 0) {
                const exactMatch = response.body.results.find((r: any) => 
                    r.title === 'iPhone 13 Pro'
                )
                
                if (exactMatch) {
                    // Exact match should have highest relevance
                    expect(exactMatch.relevance).toBe(100)
                }
            }
        })

        test('should rank prefix matches higher than contains', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=iPhone')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            if (response.body.results.length > 1) {
                const prefixMatch = response.body.results.find((r: any) => 
                    r.title.startsWith('iPhone')
                )
                const containsMatch = response.body.results.find((r: any) => 
                    r.title.includes('iPhone') && !r.title.startsWith('iPhone')
                )
                
                if (prefixMatch && containsMatch) {
                    expect(prefixMatch.relevance).toBeGreaterThan(containsMatch.relevance)
                }
            }
        })

        test('should calculate relevance scores correctly', async () => {
            const response = await apiClient
                .get('/api/v1/search/global?q=Pro')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.success).toBe(true)
            
            response.body.results.forEach((result: any) => {
                expect(result.relevance).toBeGreaterThan(0)
                expect(result.relevance).toBeLessThanOrEqual(100)
            })
        })
    })
})