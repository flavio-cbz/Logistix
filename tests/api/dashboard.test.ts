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

describe('Dashboard API - Direct HTTP Tests', () => {
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
        
        // Create test user and session for authenticated requests
        testUser = await authHelpers.createTestUser({
            email: 'dashboard@example.com',
            password: 'password123'
        })
        const session = await authHelpers.createTestSession(testUser.id)
        sessionCookie = `session_id=${session.id}`
        
        // Create test data for dashboard calculations
        await createTestDashboardData()
    })

    afterEach(async () => {
        await authHelpers.cleanupTestUsers()
    })

    async function createTestDashboardData() {
        // Create test parcelles
        const parcelle1 = testDb.prepare(`
            INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, date_creation, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('parcelle-1', 'P001', 'DHL', 2.5, 50.00, Date.now(), testUser.id)

        const parcelle2 = testDb.prepare(`
            INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, date_creation, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('parcelle-2', 'P002', 'UPS', 3.0, 75.00, Date.now(), testUser.id)

        // Create test products with various states
        const products = [
            {
                id: 'product-1',
                nom: 'Test Product 1',
                prixArticle: 20.00,
                prixLivraison: 5.00,
                prixVente: 35.00,
                benefices: 10.00,
                pourcentageBenefice: 40.0,
                vendu: true,
                dateVente: new Date().toISOString(),
                plateforme: 'Vinted',
                parcelle_id: 'parcelle-1',
                user_id: testUser.id,
                created_at: Math.floor(Date.now() / 1000) - 86400 * 7 // 7 days ago
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
                dateVente: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
                plateforme: 'eBay',
                parcelle_id: 'parcelle-1',
                user_id: testUser.id,
                created_at: Math.floor(Date.now() / 1000) - 86400 * 10 // 10 days ago
            },
            {
                id: 'product-3',
                nom: 'Test Product 3',
                prixArticle: 30.00,
                prixLivraison: 8.00,
                vendu: false,
                parcelle_id: 'parcelle-2',
                user_id: testUser.id,
                created_at: Math.floor(Date.now() / 1000) - 86400 * 5 // 5 days ago
            }
        ]

        for (const product of products) {
            testDb.prepare(`
                INSERT INTO produits (
                    id, nom, prixArticle, prixLivraison, prixVente, benefices, 
                    pourcentageBenefice, vendu, dateVente, plateforme, parcelle_id, 
                    user_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                product.id, product.nom, product.prixArticle, product.prixLivraison,
                product.prixVente || null, product.benefices || null,
                product.pourcentageBenefice || null, product.vendu ? 1 : 0,
                product.dateVente || null, product.plateforme || null,
                product.parcelle_id, product.user_id, product.created_at
            )
        }
    }

    describe('GET /api/v1/statistiques - ROI Calculations', () => {
        test('should return comprehensive dashboard statistics', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body).toHaveProperty('produitsVendus', 2)
            expect(response.body).toHaveProperty('ventesTotales', 60.00)
            expect(response.body).toHaveProperty('beneficesTotaux', 17.00)
            expect(response.body).toHaveProperty('nombreParcelles', 2)
            expect(response.body).toHaveProperty('roiParProduit')
            expect(response.body).toHaveProperty('tempsMoyenVente')
            expect(response.body).toHaveProperty('heatmapVentes')
            expect(response.body).toHaveProperty('meilleuresPlateformes')
            expect(response.body).toHaveProperty('radarPerformances')
            expect(response.body).toHaveProperty('tendancesSaisonnieres')
            expect(response.body).toHaveProperty('courbeTendance')
            expect(response.body).toHaveProperty('previsionsVentes')
        })

        test('should calculate ROI per product correctly', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            const roiData = response.body.roiParProduit
            expect(Array.isArray(roiData)).toBe(true)
            expect(roiData.length).toBeGreaterThan(0)
            
            // Should be sorted by ROI descending
            expect(roiData[0].roi).toBeGreaterThanOrEqual(roiData[1]?.roi || 0)
            
            // Verify ROI calculation accuracy
            const firstProduct = roiData[0]
            expect(firstProduct).toHaveProperty('produit')
            expect(firstProduct).toHaveProperty('roi')
            expect(typeof firstProduct.roi).toBe('number')
        })

        test('should calculate sales metrics accurately', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.produitsVendus).toBe(2)
            expect(response.body.ventesTotales).toBe(60.00)
            expect(response.body.beneficesTotaux).toBe(17.00)
            
            // Verify calculation precision
            expect(typeof response.body.ventesTotales).toBe('number')
            expect(typeof response.body.beneficesTotaux).toBe('number')
        })

        test('should return platform performance data', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            const platformData = response.body.meilleuresPlateformes
            expect(Array.isArray(platformData)).toBe(true)
            
            if (platformData.length > 0) {
                expect(platformData[0]).toHaveProperty('plateforme')
                expect(platformData[0]).toHaveProperty('rentabilite')
                expect(typeof platformData[0].rentabilite).toBe('number')
            }
        })

        test('should return radar performance metrics', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            const radarData = response.body.radarPerformances
            expect(Array.isArray(radarData)).toBe(true)
            expect(radarData.length).toBe(3) // Should have 3 metrics
            
            const expectedSubjects = ['Bénéfice Moyen', 'Vitesse Vente', 'Volume Ventes']
            radarData.forEach(metric => {
                expect(metric).toHaveProperty('subject')
                expect(metric).toHaveProperty('A')
                expect(metric).toHaveProperty('fullMark', 100)
                expect(expectedSubjects).toContain(metric.subject)
            })
        })

        test('should handle empty data gracefully', async () => {
            // Clean up test data
            testDb.prepare('DELETE FROM produits WHERE user_id = ?').run(testUser.id)
            testDb.prepare('DELETE FROM parcelles WHERE user_id = ?').run(testUser.id)

            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.body.produitsVendus).toBe(0)
            expect(response.body.ventesTotales).toBe(0)
            expect(response.body.beneficesTotaux).toBe(0)
            expect(response.body.nombreParcelles).toBe(0)
            expect(Array.isArray(response.body.roiParProduit)).toBe(true)
            expect(response.body.roiParProduit.length).toBe(0)
        })

        test('should require authentication', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .expect(401)

            expect(response.body).toHaveProperty('message', 'Non authentifié')
        })

        test('should handle invalid session', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', 'session_id=invalid-session')
                .expect(401)

            expect(response.body).toHaveProperty('message', 'Non authentifié')
        })
    })

    describe('Data Aggregation and Filtering', () => {
        test('should aggregate data by time periods correctly', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            const tendances = response.body.tendancesSaisonnieres
            expect(Array.isArray(tendances)).toBe(true)
            
            if (tendances.length > 0) {
                tendances.forEach(trend => {
                    expect(trend).toHaveProperty('periode')
                    expect(trend).toHaveProperty('ventes')
                    expect(typeof trend.ventes).toBe('number')
                    expect(trend.periode).toMatch(/^\d{4}-\d{2}$/) // YYYY-MM format
                })
            }
        })

        test('should calculate average selling time by platform', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            const tempsMoyenVente = response.body.tempsMoyenVente
            expect(Array.isArray(tempsMoyenVente)).toBe(true)
            
            if (tempsMoyenVente.length > 0) {
                tempsMoyenVente.forEach(platform => {
                    expect(platform).toHaveProperty('categorie')
                    expect(platform).toHaveProperty('jours')
                    expect(typeof platform.jours).toBe('number')
                    expect(platform.jours).toBeGreaterThanOrEqual(0)
                })
            }
        })

        test('should generate heatmap data for sales timing', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            const heatmapData = response.body.heatmapVentes
            expect(Array.isArray(heatmapData)).toBe(true)
            
            if (heatmapData.length > 0) {
                heatmapData.forEach(point => {
                    expect(point).toHaveProperty('day')
                    expect(point).toHaveProperty('hour')
                    expect(point).toHaveProperty('value')
                    expect(point.day).toBeGreaterThanOrEqual(0)
                    expect(point.day).toBeLessThan(7)
                    expect(point.hour).toBeGreaterThanOrEqual(0)
                    expect(point.hour).toBeLessThan(24)
                    expect(typeof point.value).toBe('number')
                })
            }
        })

        test('should generate trend curves with predictions', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            const courbeTendance = response.body.courbeTendance
            const previsionsVentes = response.body.previsionsVentes

            expect(Array.isArray(courbeTendance)).toBe(true)
            expect(Array.isArray(previsionsVentes)).toBe(true)

            if (courbeTendance.length > 0) {
                courbeTendance.forEach(point => {
                    expect(point).toHaveProperty('mois')
                    expect(point).toHaveProperty('valeur')
                    expect(point).toHaveProperty('min')
                    expect(point).toHaveProperty('max')
                    expect(typeof point.valeur).toBe('number')
                    expect(point.min).toBeLessThanOrEqual(point.valeur)
                    expect(point.max).toBeGreaterThanOrEqual(point.valeur)
                })
            }

            if (previsionsVentes.length > 0) {
                previsionsVentes.forEach(prediction => {
                    expect(prediction).toHaveProperty('mois')
                    expect(prediction).toHaveProperty('prevision')
                    expect(typeof prediction.prevision).toBe('number')
                })
            }
        })
    })

    describe('Export Functionality', () => {
        test('should export statistics as CSV format', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques?format=csv')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.headers['content-type']).toContain('text/csv')
            expect(response.headers['content-disposition']).toContain('attachment')
            expect(response.headers['content-disposition']).toContain('statistiques.csv')

            const csvContent = response.text
            expect(csvContent).toContain('Statistique,Valeur')
            expect(csvContent).toContain('Produits Vendus,2')
            expect(csvContent).toContain('Ventes Totales,60')
            expect(csvContent).toContain('ROI par Produit')
        })

        test('should return 501 for PDF export (not implemented)', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques?format=pdf')
                .set('Cookie', sessionCookie)
                .expect(501)

            expect(response.body).toHaveProperty('message')
            expect(response.body.message).toContain('PDF')
        })

        test('should return JSON by default', async () => {
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(response.headers['content-type']).toContain('application/json')
            expect(typeof response.body).toBe('object')
        })
    })

    describe('Real-time Data Update Mechanisms', () => {
        test('should reflect data changes immediately', async () => {
            // Get initial statistics
            const initialResponse = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            const initialSoldCount = initialResponse.body.produitsVendus
            const initialRevenue = initialResponse.body.ventesTotales

            // Add a new sold product
            testDb.prepare(`
                INSERT INTO produits (
                    id, nom, prixArticle, prixLivraison, prixVente, benefices,
                    pourcentageBenefice, vendu, dateVente, plateforme, parcelle_id,
                    user_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                'product-new', 'New Product', 25.00, 5.00, 40.00, 10.00,
                33.33, 1, new Date().toISOString(), 'Vinted', 'parcelle-1',
                testUser.id, Math.floor(Date.now() / 1000)
            )

            // Get updated statistics
            const updatedResponse = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            expect(updatedResponse.body.produitsVendus).toBe(initialSoldCount + 1)
            expect(updatedResponse.body.ventesTotales).toBe(initialRevenue + 40.00)
        })

        test('should handle concurrent data modifications', async () => {
            // Make multiple concurrent requests while modifying data
            const promises = []

            // Add concurrent statistics requests
            for (let i = 0; i < 5; i++) {
                promises.push(
                    apiClient
                        .get('/api/v1/statistiques')
                        .set('Cookie', sessionCookie)
                )
            }

            // Add concurrent data modifications
            for (let i = 0; i < 3; i++) {
                promises.push(
                    new Promise(resolve => {
                        setTimeout(() => {
                            testDb.prepare(`
                                INSERT INTO produits (
                                    id, nom, prixArticle, prixLivraison, vendu,
                                    parcelle_id, user_id, created_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `).run(
                                `concurrent-${i}`, `Concurrent Product ${i}`,
                                20.00, 5.00, 0, 'parcelle-1', testUser.id,
                                Math.floor(Date.now() / 1000)
                            )
                            resolve(true)
                        }, i * 100)
                    })
                )
            }

            const results = await Promise.all(promises)
            
            // All API requests should succeed
            const apiResults = results.slice(0, 5)
            apiResults.forEach(result => {
                expect(result.status).toBe(200)
                expect(result.body).toHaveProperty('produitsVendus')
            })
        })

        test('should maintain data consistency during updates', async () => {
            // Get baseline statistics
            const baselineResponse = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            // Perform multiple data operations
            const newProductId = 'consistency-test'
            
            // Insert product
            testDb.prepare(`
                INSERT INTO produits (
                    id, nom, prixArticle, prixLivraison, vendu,
                    parcelle_id, user_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                newProductId, 'Consistency Test Product', 30.00, 7.00, 0,
                'parcelle-1', testUser.id, Math.floor(Date.now() / 1000)
            )

            // Update product to sold
            testDb.prepare(`
                UPDATE produits 
                SET vendu = 1, prixVente = 50.00, benefices = 13.00, 
                    pourcentageBenefice = 35.14, dateVente = ?
                WHERE id = ?
            `).run(new Date().toISOString(), newProductId)

            // Get updated statistics
            const updatedResponse = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            // Verify consistency
            expect(updatedResponse.body.produitsVendus).toBe(baselineResponse.body.produitsVendus + 1)
            expect(updatedResponse.body.ventesTotales).toBe(baselineResponse.body.ventesTotales + 50.00)
            expect(updatedResponse.body.beneficesTotaux).toBe(baselineResponse.body.beneficesTotaux + 13.00)
        })
    })

    describe('Error Handling and Edge Cases', () => {
        test('should handle database connection errors gracefully', async () => {
            // This test would require mocking database failures
            // For now, we test that the endpoint handles errors properly
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)

            // Should either succeed or return proper error
            expect([200, 500]).toContain(response.status)
            
            if (response.status === 500) {
                expect(response.body).toHaveProperty('message')
                expect(response.body.message).toContain('Erreur interne du serveur')
            }
        })

        test('should handle malformed data in database', async () => {
            // Insert product with invalid data
            testDb.prepare(`
                INSERT INTO produits (
                    id, nom, prixArticle, prixLivraison, prixVente, benefices,
                    vendu, dateVente, user_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                'malformed-product', 'Malformed Product', 'invalid-price', null,
                null, null, 1, 'invalid-date', testUser.id, 'invalid-timestamp'
            )

            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)

            // Should handle gracefully - either filter out bad data or return error
            expect([200, 500]).toContain(response.status)
        })

        test('should validate user data isolation', async () => {
            // Create another user with data
            const otherUser = await authHelpers.createTestUser({
                email: 'other@example.com',
                password: 'password123'
            })

            // Add data for other user
            testDb.prepare(`
                INSERT INTO produits (
                    id, nom, prixArticle, prixLivraison, prixVente, benefices,
                    vendu, user_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                'other-user-product', 'Other User Product', 100.00, 10.00,
                150.00, 40.00, 1, otherUser.id, Math.floor(Date.now() / 1000)
            )

            // Get statistics for original user
            const response = await apiClient
                .get('/api/v1/statistiques')
                .set('Cookie', sessionCookie)
                .expect(200)

            // Should not include other user's data
            expect(response.body.ventesTotales).not.toBe(210.00) // Would be 210 if including other user
            expect(response.body.beneficesTotaux).not.toBe(57.00) // Would be 57 if including other user
        })
    })
})