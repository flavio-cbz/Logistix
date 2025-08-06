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

describe('Products API - Direct HTTP Tests', () => {
    let apiClient: supertest.SuperTest<supertest.Test>
    let testDb: any
    let authHelpers: ApiAuthHelpers
    let testUser: any
    let testSession: any

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
            email: 'test@example.com',
            password: 'password123'
        })
        testSession = await authHelpers.createTestSession(testUser.id)
    })

    afterEach(async () => {
        await authHelpers.cleanupTestUsers()
    })

    describe('GET /api/v1/produits - List Products', () => {
        test('should return empty array when no products exist', async () => {
            const response = await apiClient
                .get('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(200)

            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body).toHaveLength(0)
        })

        test('should return user products only', async () => {
            // Create products for test user
            const testProduct1 = {
                nom: 'Test Product 1',
                prixArticle: 10.50,
                prixLivraison: 2.50,
                poids: 100,
                commandeId: 'cmd-001',
                parcelleId: 'parcelle-001'
            }

            const testProduct2 = {
                nom: 'Test Product 2',
                prixArticle: 15.00,
                prixLivraison: 3.00,
                poids: 150,
                commandeId: 'cmd-002'
            }

            // Create products via API
            await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(testProduct1)
                .expect(201)

            await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(testProduct2)
                .expect(201)

            // Create another user with products
            const otherUser = await authHelpers.createTestUser({
                email: 'other@example.com',
                password: 'password123'
            })
            const otherSession = await authHelpers.createTestSession(otherUser.id)

            await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${otherSession.id}`)
                .send({
                    nom: 'Other User Product',
                    prixArticle: 20.00,
                    prixLivraison: 4.00,
                    poids: 200,
                    commandeId: 'cmd-other'
                })
                .expect(201)

            // Get products for test user
            const response = await apiClient
                .get('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(200)

            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body).toHaveLength(2)
            
            // Verify all products belong to test user
            response.body.forEach((product: any) => {
                expect(product.user_id).toBe(testUser.id)
            })

            // Verify product data
            const productNames = response.body.map((p: any) => p.nom)
            expect(productNames).toContain('Test Product 1')
            expect(productNames).toContain('Test Product 2')
        })

        test('should require authentication', async () => {
            const response = await apiClient
                .get('/api/v1/produits')
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })

        test('should handle invalid session', async () => {
            const response = await apiClient
                .get('/api/v1/produits')
                .set('Cookie', 'session_id=invalid-session')
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })
    })

    describe('POST /api/v1/produits - Create Product', () => {
        test('should create product with valid data', async () => {
            const productData = {
                nom: 'Test Product',
                prixArticle: 25.50,
                prixLivraison: 5.00,
                poids: 250,
                commandeId: 'cmd-123',
                parcelleId: 'parcelle-456',
                details: 'Product description',
                prixArticleTTC: 30.60
            }

            const response = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            expect(response.body).toMatchObject({
                success: true,
                produit: expect.objectContaining({
                    id: expect.any(String),
                    nom: productData.nom,
                    prixArticle: productData.prixArticle,
                    prixLivraison: productData.prixLivraison,
                    poids: productData.poids,
                    commandeId: productData.commandeId,
                    parcelleId: productData.parcelleId,
                    details: productData.details,
                    prixArticleTTC: productData.prixArticleTTC,
                    user_id: testUser.id,
                    vendu: false,
                    benefices: null,
                    pourcentageBenefice: null,
                    created_at: expect.any(Number),
                    updated_at: expect.any(Number)
                })
            })

            // Verify product was saved to database
            const savedProduct = testDb.prepare('SELECT * FROM produits WHERE id = ?').get(response.body.produit.id)
            expect(savedProduct).toBeDefined()
            expect(savedProduct.nom).toBe(productData.nom)
            expect(savedProduct.user_id).toBe(testUser.id)
        })

        test('should create product with minimal required data', async () => {
            const productData = {
                nom: 'Minimal Product',
                prixArticle: 10.00,
                prixLivraison: 2.00,
                poids: 100,
                commandeId: 'cmd-minimal'
            }

            const response = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            expect(response.body.success).toBe(true)
            expect(response.body.produit).toMatchObject({
                nom: productData.nom,
                prixArticle: productData.prixArticle,
                prixLivraison: productData.prixLivraison,
                poids: productData.poids,
                commandeId: productData.commandeId,
                parcelleId: null,
                details: null,
                vendu: false
            })
        })

        test('should calculate benefits when product is sold', async () => {
            const productData = {
                nom: 'Sold Product',
                prixArticle: 20.00,
                prixLivraison: 5.00,
                poids: 200,
                commandeId: 'cmd-sold',
                vendu: true,
                prixVente: 35.00,
                dateVente: '2024-01-15',
                plateforme: 'Vinted'
            }

            const response = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            const expectedBenefits = 35.00 - (20.00 + 5.00) // 10.00
            const expectedPercentage = (10.00 / 25.00) * 100 // 40%

            expect(response.body.produit).toMatchObject({
                vendu: true,
                prixVente: 35.00,
                benefices: expectedBenefits,
                pourcentageBenefice: expectedPercentage,
                dateVente: '2024-01-15',
                plateforme: 'Vinted'
            })
        })

        test('should validate required fields', async () => {
            const invalidData = {
                // Missing required fields
                prixArticle: 10.00
            }

            const response = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(invalidData)
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Erreur de validation',
                errors: expect.any(Array)
            })

            // Check specific validation errors
            const errorMessages = response.body.errors.map((e: any) => e.message || e.code)
            expect(errorMessages.some((msg: string) => msg.includes('nom') || msg.includes('Required'))).toBe(true)
        })

        test('should validate data types', async () => {
            const invalidData = {
                nom: 'Test Product',
                prixArticle: 'invalid-price', // Should be number
                prixLivraison: 5.00,
                poids: 'invalid-weight', // Should be number
                commandeId: 'cmd-123'
            }

            const response = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(invalidData)
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Erreur de validation'
            })
        })

        test('should require authentication', async () => {
            const productData = {
                nom: 'Unauthorized Product',
                prixArticle: 10.00,
                prixLivraison: 2.00,
                poids: 100,
                commandeId: 'cmd-unauth'
            }

            const response = await apiClient
                .post('/api/v1/produits')
                .send(productData)
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })

        test('should handle database errors gracefully', async () => {
            // Create product with extremely long string to trigger database error
            const productData = {
                nom: 'A'.repeat(10000), // Extremely long name
                prixArticle: 10.00,
                prixLivraison: 2.00,
                poids: 100,
                commandeId: 'cmd-error'
            }

            const response = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)

            // Should handle error gracefully (either 400 or 500)
            expect([400, 500]).toContain(response.status)
            expect(response.body.success).toBe(false)
        })
    })

    describe('GET /api/v1/produits/[id] - Get Single Product', () => {
        test('should get product by ID', async () => {
            // Create a test product
            const productData = {
                nom: 'Test Product',
                prixArticle: 15.00,
                prixLivraison: 3.00,
                poids: 150,
                commandeId: 'cmd-get-test'
            }

            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            const productId = createResponse.body.produit.id

            // Get the product
            const response = await apiClient
                .get(`/api/v1/produits/${productId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(200)

            expect(response.body).toMatchObject({
                id: productId,
                nom: productData.nom,
                prixArticle: productData.prixArticle,
                prixLivraison: productData.prixLivraison,
                poids: productData.poids,
                commandeId: productData.commandeId,
                user_id: testUser.id
            })
        })

        test('should return 404 for non-existent product', async () => {
            const response = await apiClient
                .get('/api/v1/produits/non-existent-id')
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Produit non trouvé'
            })
        })

        test('should not allow access to other user products', async () => {
            // Create product with another user
            const otherUser = await authHelpers.createTestUser({
                email: 'other@example.com',
                password: 'password123'
            })
            const otherSession = await authHelpers.createTestSession(otherUser.id)

            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${otherSession.id}`)
                .send({
                    nom: 'Other User Product',
                    prixArticle: 20.00,
                    prixLivraison: 4.00,
                    poids: 200,
                    commandeId: 'cmd-other'
                })
                .expect(201)

            const productId = createResponse.body.produit.id

            // Try to access with test user session
            const response = await apiClient
                .get(`/api/v1/produits/${productId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Produit non trouvé'
            })
        })

        test('should require authentication', async () => {
            const response = await apiClient
                .get('/api/v1/produits/some-id')
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })
    })

    describe('PUT /api/v1/produits/[id] - Update Product', () => {
        let testProductId: string

        beforeEach(async () => {
            // Create a test product for updates
            const productData = {
                nom: 'Original Product',
                prixArticle: 20.00,
                prixLivraison: 4.00,
                poids: 200,
                commandeId: 'cmd-update-test',
                details: 'Original description'
            }

            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            testProductId = createResponse.body.produit.id
        })

        test('should update product with valid data', async () => {
            const updateData = {
                nom: 'Updated Product',
                prixArticle: 25.00,
                prixLivraison: 5.00,
                details: 'Updated description',
                vendu: true,
                prixVente: 40.00,
                dateVente: '2024-01-20',
                plateforme: 'Vinted'
            }

            const response = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(updateData)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                produit: expect.objectContaining({
                    id: testProductId,
                    nom: updateData.nom,
                    prixArticle: updateData.prixArticle,
                    prixLivraison: updateData.prixLivraison,
                    details: updateData.details,
                    vendu: true,
                    prixVente: updateData.prixVente,
                    dateVente: updateData.dateVente,
                    plateforme: updateData.plateforme,
                    benefices: 10.00, // 40 - (25 + 5)
                    pourcentageBenefice: expect.closeTo(33.33, 1) // (10/30) * 100
                })
            })

            // Verify update in database
            const updatedProduct = testDb.prepare('SELECT * FROM produits WHERE id = ?').get(testProductId)
            expect(updatedProduct.nom).toBe(updateData.nom)
            expect(updatedProduct.vendu).toBe(1) // SQLite stores boolean as integer
        })

        test('should update partial data', async () => {
            const partialUpdate = {
                nom: 'Partially Updated Product',
                details: 'New description only'
            }

            const response = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(partialUpdate)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.produit).toMatchObject({
                nom: partialUpdate.nom,
                details: partialUpdate.details,
                // Original values should be preserved
                prixArticle: 20.00,
                prixLivraison: 4.00,
                poids: 200
            })
        })

        test('should recalculate benefits on price update', async () => {
            // First mark as sold
            await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send({
                    vendu: true,
                    prixVente: 30.00
                })
                .expect(200)

            // Update prices
            const priceUpdate = {
                prixArticle: 15.00, // Reduced from 20.00
                prixLivraison: 3.00  // Reduced from 4.00
            }

            const response = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(priceUpdate)
                .expect(200)

            // Benefits should be recalculated: 30 - (15 + 3) = 12
            // Percentage: (12 / 18) * 100 = 66.67%
            expect(response.body.produit).toMatchObject({
                prixArticle: 15.00,
                prixLivraison: 3.00,
                prixVente: 30.00,
                benefices: 12.00,
                pourcentageBenefice: expect.closeTo(66.67, 1)
            })
        })

        test('should handle product status transitions', async () => {
            // Mark as sold
            const soldUpdate = {
                vendu: true,
                prixVente: 35.00,
                dateVente: '2024-01-15',
                tempsEnLigne: '7 days',
                plateforme: 'Vinted'
            }

            const soldResponse = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(soldUpdate)
                .expect(200)

            expect(soldResponse.body.produit).toMatchObject({
                vendu: true,
                prixVente: 35.00,
                dateVente: '2024-01-15',
                tempsEnLigne: '7 days',
                plateforme: 'Vinted',
                benefices: 11.00, // 35 - (20 + 4)
                pourcentageBenefice: expect.closeTo(45.83, 1)
            })

            // Mark as unsold again
            const unsoldUpdate = {
                vendu: false,
                prixVente: null,
                dateVente: null,
                plateforme: null
            }

            const unsoldResponse = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(unsoldUpdate)
                .expect(200)

            expect(unsoldResponse.body.produit).toMatchObject({
                vendu: false,
                prixVente: null,
                dateVente: null,
                plateforme: null,
                benefices: null,
                pourcentageBenefice: null
            })
        })

        test('should return 404 for non-existent product', async () => {
            const response = await apiClient
                .put('/api/v1/produits/non-existent-id')
                .set('Cookie', `session_id=${testSession.id}`)
                .send({ nom: 'Updated Name' })
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Produit non trouvé ou non autorisé'
            })
        })

        test('should not allow updating other user products', async () => {
            // Create product with another user
            const otherUser = await authHelpers.createTestUser({
                email: 'other@example.com',
                password: 'password123'
            })
            const otherSession = await authHelpers.createTestSession(otherUser.id)

            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${otherSession.id}`)
                .send({
                    nom: 'Other User Product',
                    prixArticle: 20.00,
                    prixLivraison: 4.00,
                    poids: 200,
                    commandeId: 'cmd-other'
                })
                .expect(201)

            const otherProductId = createResponse.body.produit.id

            // Try to update with test user session
            const response = await apiClient
                .put(`/api/v1/produits/${otherProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send({ nom: 'Hacked Name' })
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Produit non trouvé ou non autorisé'
            })
        })

        test('should validate update data', async () => {
            const invalidUpdate = {
                prixArticle: 'invalid-price',
                poids: -100 // Negative weight
            }

            const response = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(invalidUpdate)
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Erreur de validation'
            })
        })

        test('should require authentication', async () => {
            const response = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .send({ nom: 'Unauthorized Update' })
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })
    })

    describe('DELETE /api/v1/produits/[id] - Delete Product', () => {
        let testProductId: string

        beforeEach(async () => {
            // Create a test product for deletion
            const productData = {
                nom: 'Product to Delete',
                prixArticle: 10.00,
                prixLivraison: 2.00,
                poids: 100,
                commandeId: 'cmd-delete-test'
            }

            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            testProductId = createResponse.body.produit.id
        })

        test('should delete product successfully', async () => {
            const response = await apiClient
                .delete(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(204)

            // Verify product is deleted from database
            const deletedProduct = testDb.prepare('SELECT * FROM produits WHERE id = ?').get(testProductId)
            expect(deletedProduct).toBeUndefined()
        })

        test('should return 404 for non-existent product', async () => {
            const response = await apiClient
                .delete('/api/v1/produits/non-existent-id')
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Produit non trouvé ou non autorisé'
            })
        })

        test('should not allow deleting other user products', async () => {
            // Create product with another user
            const otherUser = await authHelpers.createTestUser({
                email: 'other@example.com',
                password: 'password123'
            })
            const otherSession = await authHelpers.createTestSession(otherUser.id)

            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${otherSession.id}`)
                .send({
                    nom: 'Other User Product',
                    prixArticle: 20.00,
                    prixLivraison: 4.00,
                    poids: 200,
                    commandeId: 'cmd-other'
                })
                .expect(201)

            const otherProductId = createResponse.body.produit.id

            // Try to delete with test user session
            const response = await apiClient
                .delete(`/api/v1/produits/${otherProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Produit non trouvé ou non autorisé'
            })

            // Verify product still exists
            const stillExists = testDb.prepare('SELECT * FROM produits WHERE id = ?').get(otherProductId)
            expect(stillExists).toBeDefined()
        })

        test('should require authentication', async () => {
            const response = await apiClient
                .delete(`/api/v1/produits/${testProductId}`)
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })

            // Verify product still exists
            const stillExists = testDb.prepare('SELECT * FROM produits WHERE id = ?').get(testProductId)
            expect(stillExists).toBeDefined()
        })

        test('should handle missing product ID', async () => {
            const response = await apiClient
                .delete('/api/v1/produits/')
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(404) // Route not found

            // Alternative: if the API handles empty ID
            // expect(response.body).toMatchObject({
            //     success: false,
            //     message: 'ID de produit manquant'
            // })
        })
    })

    describe('Sales Recording and Profit Calculations', () => {
        test('should record sale with accurate profit calculations', async () => {
            const productData = {
                nom: 'Profit Test Product',
                prixArticle: 50.00,
                prixLivraison: 10.00,
                poids: 500,
                commandeId: 'cmd-profit-test'
            }

            // Create product
            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            const productId = createResponse.body.produit.id

            // Record sale
            const saleData = {
                vendu: true,
                prixVente: 85.00,
                dateVente: '2024-01-20',
                tempsEnLigne: '5 days',
                plateforme: 'Vinted'
            }

            const saleResponse = await apiClient
                .put(`/api/v1/produits/${productId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(saleData)
                .expect(200)

            const expectedBenefits = 85.00 - (50.00 + 10.00) // 25.00
            const expectedPercentage = (25.00 / 60.00) * 100 // 41.67%

            expect(saleResponse.body.produit).toMatchObject({
                vendu: true,
                prixVente: 85.00,
                benefices: expectedBenefits,
                pourcentageBenefice: expect.closeTo(expectedPercentage, 2),
                dateVente: '2024-01-20',
                tempsEnLigne: '5 days',
                plateforme: 'Vinted'
            })
        })

        test('should handle loss scenarios', async () => {
            const productData = {
                nom: 'Loss Test Product',
                prixArticle: 40.00,
                prixLivraison: 8.00,
                poids: 300,
                commandeId: 'cmd-loss-test'
            }

            // Create product
            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            const productId = createResponse.body.produit.id

            // Record sale at loss
            const saleData = {
                vendu: true,
                prixVente: 35.00, // Less than cost (48.00)
                dateVente: '2024-01-20',
                plateforme: 'Vinted'
            }

            const saleResponse = await apiClient
                .put(`/api/v1/produits/${productId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(saleData)
                .expect(200)

            const expectedLoss = 35.00 - (40.00 + 8.00) // -13.00
            const expectedPercentage = (-13.00 / 48.00) * 100 // -27.08%

            expect(saleResponse.body.produit).toMatchObject({
                benefices: expectedLoss,
                pourcentageBenefice: expect.closeTo(expectedPercentage, 2)
            })
        })

        test('should handle zero profit scenarios', async () => {
            const productData = {
                nom: 'Break Even Product',
                prixArticle: 30.00,
                prixLivraison: 5.00,
                poids: 250,
                commandeId: 'cmd-break-even'
            }

            // Create product
            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            const productId = createResponse.body.produit.id

            // Record sale at break-even
            const saleData = {
                vendu: true,
                prixVente: 35.00, // Exactly the cost
                dateVente: '2024-01-20'
            }

            const saleResponse = await apiClient
                .put(`/api/v1/produits/${productId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(saleData)
                .expect(200)

            expect(saleResponse.body.produit).toMatchObject({
                benefices: 0.00,
                pourcentageBenefice: 0.00
            })
        })
    })

    describe('Product Status Transitions and History', () => {
        let testProductId: string

        beforeEach(async () => {
            const productData = {
                nom: 'Status Test Product',
                prixArticle: 25.00,
                prixLivraison: 5.00,
                poids: 200,
                commandeId: 'cmd-status-test'
            }

            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .send(productData)
                .expect(201)

            testProductId = createResponse.body.produit.id
        })

        test('should transition from available to sold', async () => {
            // Initial state should be available (not sold)
            const initialResponse = await apiClient
                .get(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(200)

            expect(initialResponse.body.vendu).toBe(false)
            expect(initialResponse.body.benefices).toBeNull()

            // Transition to sold
            const saleUpdate = {
                vendu: true,
                prixVente: 45.00,
                dateVente: '2024-01-20',
                plateforme: 'Vinted'
            }

            const soldResponse = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(saleUpdate)
                .expect(200)

            expect(soldResponse.body.produit).toMatchObject({
                vendu: true,
                prixVente: 45.00,
                benefices: 15.00, // 45 - (25 + 5)
                pourcentageBenefice: 50.00,
                dateVente: '2024-01-20',
                plateforme: 'Vinted'
            })
        })

        test('should transition from sold back to available', async () => {
            // First mark as sold
            await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send({
                    vendu: true,
                    prixVente: 40.00,
                    dateVente: '2024-01-20'
                })
                .expect(200)

            // Then mark as available again
            const availableUpdate = {
                vendu: false,
                prixVente: null,
                dateVente: null,
                plateforme: null
            }

            const availableResponse = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(availableUpdate)
                .expect(200)

            expect(availableResponse.body.produit).toMatchObject({
                vendu: false,
                prixVente: null,
                benefices: null,
                pourcentageBenefice: null,
                dateVente: null,
                plateforme: null
            })
        })

        test('should update sale details while maintaining sold status', async () => {
            // Mark as sold
            await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send({
                    vendu: true,
                    prixVente: 40.00,
                    dateVente: '2024-01-20',
                    plateforme: 'Vinted'
                })
                .expect(200)

            // Update sale details
            const updateSale = {
                prixVente: 42.00, // Increased price
                dateVente: '2024-01-21', // Updated date
                plateforme: 'Leboncoin', // Changed platform
                tempsEnLigne: '3 days'
            }

            const updatedResponse = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send(updateSale)
                .expect(200)

            expect(updatedResponse.body.produit).toMatchObject({
                vendu: true, // Should remain sold
                prixVente: 42.00,
                benefices: 12.00, // 42 - (25 + 5)
                pourcentageBenefice: 40.00,
                dateVente: '2024-01-21',
                plateforme: 'Leboncoin',
                tempsEnLigne: '3 days'
            })
        })

        test('should handle multiple price updates correctly', async () => {
            // Update 1: Mark as sold
            const update1 = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send({
                    vendu: true,
                    prixVente: 35.00
                })
                .expect(200)

            expect(update1.body.produit.benefices).toBe(5.00) // 35 - 30

            // Update 2: Change sale price
            const update2 = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send({
                    prixVente: 50.00
                })
                .expect(200)

            expect(update2.body.produit.benefices).toBe(20.00) // 50 - 30

            // Update 3: Change cost prices
            const update3 = await apiClient
                .put(`/api/v1/produits/${testProductId}`)
                .set('Cookie', `session_id=${testSession.id}`)
                .send({
                    prixArticle: 20.00, // Reduced from 25
                    prixLivraison: 3.00  // Reduced from 5
                })
                .expect(200)

            expect(update3.body.produit.benefices).toBe(27.00) // 50 - (20 + 3)
            expect(update3.body.produit.pourcentageBenefice).toBeCloseTo(117.39, 1) // (27/23) * 100
        })
    })

    describe('Complex Filtering and Search', () => {
        beforeEach(async () => {
            // Create multiple test products with different characteristics
            const products = [
                {
                    nom: 'Expensive Product',
                    prixArticle: 100.00,
                    prixLivraison: 10.00,
                    poids: 1000,
                    commandeId: 'cmd-expensive',
                    vendu: true,
                    prixVente: 150.00,
                    plateforme: 'Vinted'
                },
                {
                    nom: 'Cheap Product',
                    prixArticle: 5.00,
                    prixLivraison: 2.00,
                    poids: 50,
                    commandeId: 'cmd-cheap',
                    vendu: false
                },
                {
                    nom: 'Medium Product',
                    prixArticle: 25.00,
                    prixLivraison: 5.00,
                    poids: 250,
                    commandeId: 'cmd-medium',
                    vendu: true,
                    prixVente: 35.00,
                    plateforme: 'Leboncoin'
                }
            ]

            for (const product of products) {
                await apiClient
                    .post('/api/v1/produits')
                    .set('Cookie', `session_id=${testSession.id}`)
                    .send(product)
                    .expect(201)
            }
        })

        test('should return all products without filters', async () => {
            const response = await apiClient
                .get('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(200)

            expect(response.body).toHaveLength(3)
        })

        // Note: The current API doesn't implement filtering, but these tests
        // demonstrate what should be tested when filtering is implemented
        test('should filter by sold status (when implemented)', async () => {
            // This test would work when filtering is implemented
            // const response = await apiClient
            //     .get('/api/v1/produits?vendu=true')
            //     .set('Cookie', `session_id=${testSession.id}`)
            //     .expect(200)

            // expect(response.body).toHaveLength(2)
            // response.body.forEach((product: any) => {
            //     expect(product.vendu).toBe(true)
            // })

            // For now, we can verify the data structure supports filtering
            const response = await apiClient
                .get('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(200)

            const soldProducts = response.body.filter((p: any) => p.vendu)
            const unsoldProducts = response.body.filter((p: any) => !p.vendu)

            expect(soldProducts).toHaveLength(2)
            expect(unsoldProducts).toHaveLength(1)
        })

        test('should support price range filtering (when implemented)', async () => {
            // This demonstrates the expected behavior for price filtering
            const response = await apiClient
                .get('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(200)

            // Simulate client-side filtering to verify data structure
            const expensiveProducts = response.body.filter((p: any) => p.prixArticle >= 50)
            const cheapProducts = response.body.filter((p: any) => p.prixArticle < 20)

            expect(expensiveProducts).toHaveLength(1)
            expect(cheapProducts).toHaveLength(1)
        })

        test('should support platform filtering (when implemented)', async () => {
            const response = await apiClient
                .get('/api/v1/produits')
                .set('Cookie', `session_id=${testSession.id}`)
                .expect(200)

            // Simulate platform filtering
            const vintedProducts = response.body.filter((p: any) => p.plateforme === 'Vinted')
            const leboncoinProducts = response.body.filter((p: any) => p.plateforme === 'Leboncoin')

            expect(vintedProducts).toHaveLength(1)
            expect(leboncoinProducts).toHaveLength(1)
        })
    })
})