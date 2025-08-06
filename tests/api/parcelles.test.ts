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
import { Parcelle } from '@/types/database'

describe('Parcelles API - Direct HTTP Tests', () => {
    let apiClient: supertest.SuperTest<supertest.Test>
    let testDb: any
    let authHelpers: ApiAuthHelpers

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
    })

    afterEach(async () => {
        await authHelpers.cleanupTestUsers()
    })

    describe('GET /api/v1/parcelles', () => {
        test('should get all parcelles for authenticated user', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create test parcelles
            const parcelle1 = await createTestParcelle(testUser.id, {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 1.5,
                prixAchat: 25.50
            })
            const parcelle2 = await createTestParcelle(testUser.id, {
                numero: 'P002',
                transporteur: 'UPS',
                poids: 2.0,
                prixAchat: 30.00
            })

            const response = await apiClient
                .get('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .expect(200)

            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body).toHaveLength(2)
            
            const parcelles = response.body as Parcelle[]
            expect(parcelles.find(p => p.numero === 'P001')).toBeDefined()
            expect(parcelles.find(p => p.numero === 'P002')).toBeDefined()
        })

        test('should return empty array when user has no parcelles', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const response = await apiClient
                .get('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .expect(200)

            expect(Array.isArray(response.body)).toBe(true)
            expect(response.body).toHaveLength(0)
        })

        test('should only return parcelles for authenticated user', async () => {
            const testUser1 = await authHelpers.createTestUser({ email: 'user1@example.com' })
            const testUser2 = await authHelpers.createTestUser({ email: 'user2@example.com' })
            const session1 = await authHelpers.createTestSession(testUser1.id)

            // Create parcelles for both users
            await createTestParcelle(testUser1.id, { numero: 'P001' })
            await createTestParcelle(testUser2.id, { numero: 'P002' })

            const response = await apiClient
                .get('/api/v1/parcelles')
                .set('Cookie', `session_id=${session1.id}`)
                .expect(200)

            expect(response.body).toHaveLength(1)
            expect(response.body[0].numero).toBe('P001')
        })

        test('should require authentication', async () => {
            const response = await apiClient
                .get('/api/v1/parcelles')
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })

        test('should handle invalid session', async () => {
            const response = await apiClient
                .get('/api/v1/parcelles')
                .set('Cookie', 'session_id=invalid-session')
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })

        test('should include calculated fields in response', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            await createTestParcelle(testUser.id, {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 2.0,
                prixAchat: 40.00
            })

            const response = await apiClient
                .get('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .expect(200)

            const parcelle = response.body[0]
            expect(parcelle).toHaveProperty('prixTotal', 40.00)
            expect(parcelle).toHaveProperty('prixParGramme', 20.00) // 40.00 / 2.0
            expect(parcelle).toHaveProperty('created_at')
            expect(parcelle).toHaveProperty('updated_at')
        })
    })

    describe('POST /api/v1/parcelles', () => {
        test('should create new parcelle with valid data', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const parcelleData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 1.5,
                prixAchat: 25.50
            }

            const response = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(parcelleData)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                parcelle: {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prixAchat: 25.50,
                    prixTotal: 25.50,
                    prixParGramme: 17.00, // 25.50 / 1.5
                    user_id: testUser.id
                }
            })

            expect(response.body.parcelle).toHaveProperty('id')
            expect(response.body.parcelle).toHaveProperty('created_at')
            expect(response.body.parcelle).toHaveProperty('updated_at')

            // Verify in database
            const dbParcelle = testDb.prepare('SELECT * FROM parcelles WHERE numero = ?').get('P001')
            expect(dbParcelle).toBeDefined()
            expect(dbParcelle.user_id).toBe(testUser.id)
        })

        test('should calculate price per gram correctly', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const testCases = [
                { poids: 1.0, prixAchat: 10.00, expectedPrixParGramme: 10.00 },
                { poids: 2.5, prixAchat: 50.00, expectedPrixParGramme: 20.00 },
                { poids: 0.5, prixAchat: 7.50, expectedPrixParGramme: 15.00 },
                { poids: 3.333, prixAchat: 99.99, expectedPrixParGramme: 30.00 } // Rounded
            ]

            for (const testCase of testCases) {
                const parcelleData = {
                    numero: `P${Math.random().toString(36).substr(2, 9)}`,
                    transporteur: 'DHL',
                    poids: testCase.poids,
                    prixAchat: testCase.prixAchat
                }

                const response = await apiClient
                    .post('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send(parcelleData)
                    .expect(200)

                const actualPrixParGramme = response.body.parcelle.prixParGramme
                expect(Math.abs(actualPrixParGramme - testCase.expectedPrixParGramme)).toBeLessThan(0.01)
            }
        })

        test('should require authentication', async () => {
            const parcelleData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 1.5,
                prixAchat: 25.50
            }

            const response = await apiClient
                .post('/api/v1/parcelles')
                .send(parcelleData)
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })

        test('should validate required fields', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const invalidData = [
                {}, // Missing all fields
                { numero: 'P001' }, // Missing transporteur, poids, prixAchat
                { numero: 'P001', transporteur: 'DHL' }, // Missing poids, prixAchat
                { numero: 'P001', transporteur: 'DHL', poids: 1.5 }, // Missing prixAchat
                { transporteur: 'DHL', poids: 1.5, prixAchat: 25.50 }, // Missing numero
            ]

            for (const data of invalidData) {
                const response = await apiClient
                    .post('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send(data)

                expect(response.status).toBeGreaterThanOrEqual(400)
                expect(response.body.success).toBe(false)
            }
        })

        test('should validate numeric fields', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const invalidNumericData = [
                {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 'invalid',
                    prixAchat: 25.50
                },
                {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prixAchat: 'invalid'
                },
                {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: -1.5, // Negative weight
                    prixAchat: 25.50
                },
                {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prixAchat: -25.50 // Negative price
                },
                {
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 0, // Zero weight would cause division by zero
                    prixAchat: 25.50
                }
            ]

            for (const data of invalidNumericData) {
                const response = await apiClient
                    .post('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send(data)

                expect(response.status).toBeGreaterThanOrEqual(400)
                expect(response.body.success).toBe(false)
            }
        })

        test('should handle duplicate numero gracefully', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const parcelleData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 1.5,
                prixAchat: 25.50
            }

            // Create first parcelle
            await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(parcelleData)
                .expect(200)

            // Try to create duplicate
            const response = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(parcelleData)

            expect(response.status).toBeGreaterThanOrEqual(400)
            expect(response.body.success).toBe(false)
        })

        test('should handle large numeric values', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const parcelleData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 999999.99,
                prixAchat: 999999.99
            }

            const response = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(parcelleData)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.parcelle.prixParGramme).toBeCloseTo(1.0, 2)
        })
    })

    describe('PUT /api/v1/parcelles', () => {
        test('should update existing parcelle with valid data', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create initial parcelle
            const initialData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 1.5,
                prixAchat: 25.50
            }

            const createResponse = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(initialData)
                .expect(200)

            const parcelleId = createResponse.body.parcelle.id

            // Update parcelle
            const updateData = {
                id: parcelleId,
                numero: 'P001-UPDATED',
                transporteur: 'UPS',
                poids: 2.0,
                prixAchat: 40.00
            }

            const response = await apiClient
                .put('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(updateData)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                parcelle: {
                    id: parcelleId,
                    numero: 'P001-UPDATED',
                    transporteur: 'UPS',
                    poids: 2.0,
                    prixAchat: 40.00,
                    prixTotal: 40.00,
                    prixParGramme: 20.00 // 40.00 / 2.0
                }
            })

            expect(response.body.parcelle).toHaveProperty('updated_at')

            // Verify in database
            const dbParcelle = testDb.prepare('SELECT * FROM parcelles WHERE id = ?').get(parcelleId)
            expect(dbParcelle.numero).toBe('P001-UPDATED')
            expect(dbParcelle.transporteur).toBe('UPS')
        })

        test('should recalculate price per gram on update', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const parcelle = await createTestParcelle(testUser.id, {
                numero: 'P001',
                poids: 1.0,
                prixAchat: 10.00
            })

            const updateData = {
                id: parcelle.id,
                numero: 'P001',
                transporteur: 'DHL',
                poids: 2.0, // Changed weight
                prixAchat: 30.00 // Changed price
            }

            const response = await apiClient
                .put('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(updateData)
                .expect(200)

            expect(response.body.parcelle.prixParGramme).toBe(15.00) // 30.00 / 2.0
        })

        test('should require parcelle ID', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const updateData = {
                numero: 'P001',
                transporteur: 'UPS',
                poids: 2.0,
                prixAchat: 40.00
            }

            const response = await apiClient
                .put('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(updateData)
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: 'ID de parcelle manquant'
            })
        })

        test('should only allow user to update their own parcelles', async () => {
            const testUser1 = await authHelpers.createTestUser({ email: 'user1@example.com' })
            const testUser2 = await authHelpers.createTestUser({ email: 'user2@example.com' })
            const session2 = await authHelpers.createTestSession(testUser2.id)

            // Create parcelle for user1
            const parcelle = await createTestParcelle(testUser1.id, { numero: 'P001' })

            // Try to update as user2
            const updateData = {
                id: parcelle.id,
                numero: 'P001-HACKED',
                transporteur: 'UPS',
                poids: 2.0,
                prixAchat: 40.00
            }

            const response = await apiClient
                .put('/api/v1/parcelles')
                .set('Cookie', `session_id=${session2.id}`)
                .send(updateData)
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Parcelle non trouvée ou non autorisée'
            })

            // Verify parcelle was not updated
            const dbParcelle = testDb.prepare('SELECT * FROM parcelles WHERE id = ?').get(parcelle.id)
            expect(dbParcelle.numero).toBe('P001')
        })

        test('should handle non-existent parcelle ID', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const updateData = {
                id: 'non-existent-id',
                numero: 'P001',
                transporteur: 'UPS',
                poids: 2.0,
                prixAchat: 40.00
            }

            const response = await apiClient
                .put('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(updateData)
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Parcelle non trouvée ou non autorisée'
            })
        })

        test('should require authentication', async () => {
            const updateData = {
                id: 'some-id',
                numero: 'P001',
                transporteur: 'UPS',
                poids: 2.0,
                prixAchat: 40.00
            }

            const response = await apiClient
                .put('/api/v1/parcelles')
                .send(updateData)
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })
    })

    describe('DELETE /api/v1/parcelles', () => {
        test('should delete existing parcelle', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const parcelle = await createTestParcelle(testUser.id, { numero: 'P001' })

            const response = await apiClient
                .delete('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send({ id: parcelle.id })
                .expect(200)

            expect(response.body).toMatchObject({
                success: true
            })

            // Verify deletion in database
            const dbParcelle = testDb.prepare('SELECT * FROM parcelles WHERE id = ?').get(parcelle.id)
            expect(dbParcelle).toBeUndefined()
        })

        test('should require parcelle ID', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const response = await apiClient
                .delete('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send({})
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: 'ID de parcelle manquant'
            })
        })

        test('should only allow user to delete their own parcelles', async () => {
            const testUser1 = await authHelpers.createTestUser({ email: 'user1@example.com' })
            const testUser2 = await authHelpers.createTestUser({ email: 'user2@example.com' })
            const session2 = await authHelpers.createTestSession(testUser2.id)

            // Create parcelle for user1
            const parcelle = await createTestParcelle(testUser1.id, { numero: 'P001' })

            // Try to delete as user2
            const response = await apiClient
                .delete('/api/v1/parcelles')
                .set('Cookie', `session_id=${session2.id}`)
                .send({ id: parcelle.id })
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Parcelle non trouvée ou non autorisée'
            })

            // Verify parcelle still exists
            const dbParcelle = testDb.prepare('SELECT * FROM parcelles WHERE id = ?').get(parcelle.id)
            expect(dbParcelle).toBeDefined()
        })

        test('should handle non-existent parcelle ID', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const response = await apiClient
                .delete('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send({ id: 'non-existent-id' })
                .expect(404)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Parcelle non trouvée ou non autorisée'
            })
        })

        test('should require authentication', async () => {
            const response = await apiClient
                .delete('/api/v1/parcelles')
                .send({ id: 'some-id' })
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })
    })

    describe('Business Logic and Data Integrity', () => {
        test('should maintain data consistency during concurrent operations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const parcelle = await createTestParcelle(testUser.id, {
                numero: 'P001',
                poids: 1.0,
                prixAchat: 10.00
            })

            // Simulate concurrent updates
            const updatePromises = Array(5).fill(null).map((_, index) =>
                apiClient
                    .put('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        id: parcelle.id,
                        numero: `P001-${index}`,
                        transporteur: 'DHL',
                        poids: 1.0 + index,
                        prixAchat: 10.00 + index
                    })
            )

            const responses = await Promise.all(updatePromises)

            // At least one should succeed
            const successfulResponses = responses.filter(r => r.status === 200)
            expect(successfulResponses.length).toBeGreaterThan(0)

            // Verify final state is consistent
            const finalParcelle = testDb.prepare('SELECT * FROM parcelles WHERE id = ?').get(parcelle.id)
            expect(finalParcelle).toBeDefined()
            expect(finalParcelle.prixParGramme).toBeCloseTo(finalParcelle.prixTotal / finalParcelle.poids, 2)
        })

        test('should validate business rules for price calculations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const testCases = [
                { poids: 0.001, prixAchat: 0.01, shouldSucceed: true },
                { poids: 1000, prixAchat: 10000, shouldSucceed: true },
                { poids: 0.5, prixAchat: 999999.99, shouldSucceed: true }
            ]

            for (const testCase of testCases) {
                const parcelleData = {
                    numero: `P${Math.random().toString(36).substr(2, 9)}`,
                    transporteur: 'DHL',
                    poids: testCase.poids,
                    prixAchat: testCase.prixAchat
                }

                const response = await apiClient
                    .post('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send(parcelleData)

                if (testCase.shouldSucceed) {
                    expect(response.status).toBe(200)
                    expect(response.body.success).toBe(true)
                    
                    const expectedPrixParGramme = testCase.prixAchat / testCase.poids
                    expect(response.body.parcelle.prixParGramme).toBeCloseTo(expectedPrixParGramme, 2)
                } else {
                    expect(response.status).toBeGreaterThanOrEqual(400)
                    expect(response.body.success).toBe(false)
                }
            }
        })

        test('should handle edge cases in numeric calculations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Test very small numbers
            const smallNumberData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: 0.001,
                prixAchat: 0.001
            }

            const response1 = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(smallNumberData)
                .expect(200)

            expect(response1.body.parcelle.prixParGramme).toBeCloseTo(1.0, 2)

            // Test precision with many decimal places
            const precisionData = {
                numero: 'P002',
                transporteur: 'DHL',
                poids: 3.14159,
                prixAchat: 9.87654
            }

            const response2 = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send(precisionData)
                .expect(200)

            const expectedPrixParGramme = 9.87654 / 3.14159
            expect(response2.body.parcelle.prixParGramme).toBeCloseTo(expectedPrixParGramme, 2)
        })
    })

    describe('Performance Tests', () => {
        test('should handle large dataset operations efficiently', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create multiple parcelles
            const createPromises = Array(50).fill(null).map((_, index) =>
                apiClient
                    .post('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        numero: `P${String(index).padStart(3, '0')}`,
                        transporteur: index % 2 === 0 ? 'DHL' : 'UPS',
                        poids: 1.0 + (index * 0.1),
                        prixAchat: 10.0 + (index * 0.5)
                    })
            )

            const startTime = Date.now()
            const responses = await Promise.all(createPromises)
            const createTime = Date.now() - startTime

            // All should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200)
                expect(response.body.success).toBe(true)
            })

            // Test retrieval performance
            const retrievalStartTime = Date.now()
            const getResponse = await apiClient
                .get('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .expect(200)
            const retrievalTime = Date.now() - retrievalStartTime

            expect(getResponse.body).toHaveLength(50)
            
            // Performance assertions (adjust thresholds as needed)
            expect(createTime).toBeLessThan(10000) // 10 seconds for 50 creates
            expect(retrievalTime).toBeLessThan(1000) // 1 second for retrieval
        })

        test('should handle concurrent read operations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create some test data
            await createTestParcelle(testUser.id, { numero: 'P001' })
            await createTestParcelle(testUser.id, { numero: 'P002' })

            // Make concurrent read requests
            const readPromises = Array(20).fill(null).map(() =>
                apiClient
                    .get('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
            )

            const startTime = Date.now()
            const responses = await Promise.all(readPromises)
            const totalTime = Date.now() - startTime

            // All should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200)
                expect(response.body).toHaveLength(2)
            })

            // Should complete reasonably quickly
            expect(totalTime).toBeLessThan(5000) // 5 seconds for 20 concurrent reads
        })
    })

    // Helper function to create test parcelle
    async function createTestParcelle(userId: string, data: Partial<Parcelle> = {}) {
        const defaultData = {
            numero: 'P001',
            transporteur: 'DHL',
            poids: 1.5,
            prixAchat: 25.50,
            ...data
        }

        const id = `parcelle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const created_at = new Date().toISOString()
        const updated_at = created_at
        const prixTotal = defaultData.prixAchat
        const prixParGramme = prixTotal / defaultData.poids

        testDb.prepare(`
            INSERT INTO parcelles (id, user_id, numero, transporteur, poids, prixAchat, prixTotal, prixParGramme, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, userId, defaultData.numero, defaultData.transporteur, defaultData.poids, defaultData.prixAchat, prixTotal, prixParGramme, created_at, updated_at)

        return {
            id,
            userId,
            numero: defaultData.numero,
            transporteur: defaultData.transporteur,
            poids: defaultData.poids,
            prixAchat: defaultData.prixAchat,
            prixTotal,
            prixParGramme,
            createdAt: created_at,
            updatedAt: updated_at
        }
    }
})