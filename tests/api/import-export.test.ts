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
import { TestDataFactory } from '../fixtures/test-data'

describe('Import/Export API - Direct HTTP Tests', () => {
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

    describe('GET /api/v1/export/complete', () => {
        test('should export complete data successfully for authenticated user', async () => {
            // Create test user and session
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create test data to export
            const testParcelle = TestDataFactory.createParcelle({ userId: testUser.id })
            const testProduct = TestDataFactory.createProduct({ userId: testUser.id })

            // Insert test data
            testDb.prepare(`
                INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, date_creation, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                testParcelle.id,
                testParcelle.numero,
                testParcelle.transporteur,
                testParcelle.poids,
                testParcelle.prixAchat,
                testParcelle.dateCreation,
                testUser.id
            )

            testDb.prepare(`
                INSERT INTO produits (id, nom, prix, quantite, parcelle_id, user_id, description, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                testProduct.id,
                testProduct.nom,
                testProduct.prix,
                testProduct.quantite,
                testParcelle.id,
                testUser.id,
                testProduct.description,
                testProduct.status
            )

            const response = await apiClient
                .get('/api/v1/export/complete')
                .set('Cookie', `session_id=${session.id}`)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    parcelles: expect.arrayContaining([
                        expect.objectContaining({
                            id: testParcelle.id,
                            numero: testParcelle.numero,
                            transporteur: testParcelle.transporteur
                        })
                    ]),
                    produits: expect.arrayContaining([
                        expect.objectContaining({
                            id: testProduct.id,
                            nom: testProduct.nom,
                            prix: testProduct.prix
                        })
                    ]),
                    metadata: expect.objectContaining({
                        exportDate: expect.any(String),
                        version: expect.any(String),
                        userId: testUser.id
                    })
                }
            })

            // Verify response headers for download
            expect(response.headers['content-type']).toContain('application/json')
            expect(response.headers['content-disposition']).toContain('attachment')
        })

        test('should export data with filtering parameters', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create multiple parcelles with different dates
            const oldParcelle = TestDataFactory.createParcelle({ 
                userId: testUser.id,
                dateCreation: '2023-01-01'
            })
            const newParcelle = TestDataFactory.createParcelle({ 
                userId: testUser.id,
                dateCreation: '2024-01-01'
            })

            testDb.prepare(`
                INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, date_creation, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                oldParcelle.id, oldParcelle.numero, oldParcelle.transporteur,
                oldParcelle.poids, oldParcelle.prixAchat, oldParcelle.dateCreation, testUser.id
            )

            testDb.prepare(`
                INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, date_creation, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                newParcelle.id, newParcelle.numero, newParcelle.transporteur,
                newParcelle.poids, newParcelle.prixAchat, newParcelle.dateCreation, testUser.id
            )

            const response = await apiClient
                .get('/api/v1/export/complete')
                .query({
                    dateFrom: '2024-01-01',
                    format: 'json'
                })
                .set('Cookie', `session_id=${session.id}`)
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.data.parcelles).toHaveLength(1)
            expect(response.body.data.parcelles[0].id).toBe(newParcelle.id)
        })

        test('should export data in different formats', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Test CSV format
            const csvResponse = await apiClient
                .get('/api/v1/export/complete')
                .query({ format: 'csv' })
                .set('Cookie', `session_id=${session.id}`)
                .expect(200)

            expect(csvResponse.headers['content-type']).toContain('text/csv')
            expect(csvResponse.text).toContain('numero,transporteur,poids')

            // Test Excel format
            const excelResponse = await apiClient
                .get('/api/v1/export/complete')
                .query({ format: 'xlsx' })
                .set('Cookie', `session_id=${session.id}`)
                .expect(200)

            expect(excelResponse.headers['content-type']).toContain('application/vnd.openxmlformats')
        })

        test('should handle large dataset export with streaming', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create large dataset (simulate with multiple records)
            const largeParcelles = Array.from({ length: 1000 }, (_, i) => 
                TestDataFactory.createParcelle({ 
                    userId: testUser.id,
                    numero: `LARGE-${i.toString().padStart(4, '0')}`
                })
            )

            // Insert in batches to avoid memory issues
            const batchSize = 100
            for (let i = 0; i < largeParcelles.length; i += batchSize) {
                const batch = largeParcelles.slice(i, i + batchSize)
                const stmt = testDb.prepare(`
                    INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, date_creation, user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `)
                
                for (const parcelle of batch) {
                    stmt.run(
                        parcelle.id, parcelle.numero, parcelle.transporteur,
                        parcelle.poids, parcelle.prixAchat, parcelle.dateCreation, testUser.id
                    )
                }
            }

            const response = await apiClient
                .get('/api/v1/export/complete')
                .query({ stream: 'true' })
                .set('Cookie', `session_id=${session.id}`)
                .timeout(30000) // Increase timeout for large export
                .expect(200)

            expect(response.body.success).toBe(true)
            expect(response.body.data.parcelles).toHaveLength(1000)
            expect(response.headers['transfer-encoding']).toBe('chunked')
        })

        test('should require authentication for export', async () => {
            const response = await apiClient
                .get('/api/v1/export/complete')
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })

        test('should handle export with invalid session', async () => {
            const response = await apiClient
                .get('/api/v1/export/complete')
                .set('Cookie', 'session_id=invalid-session')
                .expect(401)

            expect(response.body.success).toBe(false)
        })

        test('should validate export format parameter', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const response = await apiClient
                .get('/api/v1/export/complete')
                .query({ format: 'invalid-format' })
                .set('Cookie', `session_id=${session.id}`)
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Format non supporté')
            })
        })
    })

    describe('POST /api/v1/import/data', () => {
        test('should import valid JSON data successfully', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const importData = {
                parcelles: [
                    TestDataFactory.createParcelle({ userId: testUser.id }),
                    TestDataFactory.createParcelle({ userId: testUser.id })
                ],
                produits: [
                    TestDataFactory.createProduct({ userId: testUser.id })
                ],
                metadata: {
                    version: '1.0.0',
                    exportDate: new Date().toISOString()
                }
            }

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .send(importData)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                message: 'Données importées avec succès',
                imported: {
                    parcelles: 2,
                    produits: 1
                }
            })

            // Verify data was actually imported
            const parcelleCount = testDb.prepare('SELECT COUNT(*) as count FROM parcelles WHERE user_id = ?').get(testUser.id)
            expect(parcelleCount.count).toBe(2)

            const productCount = testDb.prepare('SELECT COUNT(*) as count FROM produits WHERE user_id = ?').get(testUser.id)
            expect(productCount.count).toBe(1)
        })

        test('should validate import data format', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const invalidData = {
                invalid: 'structure'
            }

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .send(invalidData)
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Format de données invalide')
            })
        })

        test('should handle data conflicts during import', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create existing parcelle
            const existingParcelle = TestDataFactory.createParcelle({ userId: testUser.id })
            testDb.prepare(`
                INSERT INTO parcelles (id, numero, transporteur, poids, prix_achat, date_creation, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                existingParcelle.id, existingParcelle.numero, existingParcelle.transporteur,
                existingParcelle.poids, existingParcelle.prixAchat, existingParcelle.dateCreation, testUser.id
            )

            // Try to import data with same numero (conflict)
            const conflictingData = {
                parcelles: [
                    { ...TestDataFactory.createParcelle({ userId: testUser.id }), numero: existingParcelle.numero }
                ],
                produits: [],
                metadata: { version: '1.0.0' }
            }

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .send(conflictingData)
                .query({ conflictResolution: 'skip' })
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                message: expect.stringContaining('avec conflits'),
                conflicts: {
                    parcelles: 1
                },
                imported: {
                    parcelles: 0
                }
            })
        })

        test('should handle large file import with progress tracking', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create large import dataset
            const largeImportData = {
                parcelles: Array.from({ length: 500 }, () => TestDataFactory.createParcelle({ userId: testUser.id })),
                produits: Array.from({ length: 1000 }, () => TestDataFactory.createProduct({ userId: testUser.id })),
                metadata: { version: '1.0.0' }
            }

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .send(largeImportData)
                .timeout(60000) // Increase timeout for large import
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                imported: {
                    parcelles: 500,
                    produits: 1000
                },
                processingTime: expect.any(Number)
            })
        })

        test('should validate file size limits', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create oversized data (simulate with very large strings)
            const oversizedData = {
                parcelles: Array.from({ length: 10000 }, () => ({
                    ...TestDataFactory.createParcelle({ userId: testUser.id }),
                    description: 'x'.repeat(10000) // Very large description
                })),
                produits: [],
                metadata: { version: '1.0.0' }
            }

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .send(oversizedData)
                .expect(413) // Payload Too Large

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Fichier trop volumineux')
            })
        })

        test('should require authentication for import', async () => {
            const importData = {
                parcelles: [],
                produits: [],
                metadata: { version: '1.0.0' }
            }

            const response = await apiClient
                .post('/api/v1/import/data')
                .send(importData)
                .expect(401)

            expect(response.body).toMatchObject({
                success: false,
                message: 'Non authentifié'
            })
        })

        test('should handle malformed JSON gracefully', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .set('Content-Type', 'application/json')
                .send('{ invalid json }')
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('JSON invalide')
            })
        })

        test('should validate data integrity during import', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const invalidData = {
                parcelles: [
                    {
                        // Missing required fields
                        id: 'test-id',
                        // numero: missing
                        transporteur: 'Test Transport'
                        // other required fields missing
                    }
                ],
                produits: [],
                metadata: { version: '1.0.0' }
            }

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .send(invalidData)
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Données invalides'),
                errors: expect.arrayContaining([
                    expect.objectContaining({
                        field: expect.any(String),
                        message: expect.any(String)
                    })
                ])
            })
        })
    })

    describe('Format Validation and Error Handling', () => {
        test('should validate CSV import format', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const csvData = `numero,transporteur,poids,prix_achat
TEST-001,Transport A,1.5,25.50
TEST-002,Transport B,2.0,30.00`

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .set('Content-Type', 'text/csv')
                .send(csvData)
                .expect(200)

            expect(response.body).toMatchObject({
                success: true,
                imported: {
                    parcelles: 2
                }
            })
        })

        test('should handle CSV format errors', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const invalidCsvData = `numero,transporteur,poids,prix_achat
TEST-001,Transport A,invalid_weight,25.50
TEST-002,Transport B,2.0,invalid_price`

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .set('Content-Type', 'text/csv')
                .send(invalidCsvData)
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Erreurs de format CSV'),
                errors: expect.arrayContaining([
                    expect.objectContaining({
                        row: expect.any(Number),
                        field: expect.any(String),
                        value: expect.any(String),
                        error: expect.any(String)
                    })
                ])
            })
        })

        test('should validate Excel import format', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Mock Excel file buffer (in real implementation, this would be actual Excel data)
            const mockExcelBuffer = Buffer.from('mock excel data')

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .send(mockExcelBuffer)
                .expect(200)

            expect(response.body.success).toBe(true)
        })

        test('should handle unsupported file formats', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .set('Content-Type', 'application/pdf')
                .send('PDF content')
                .expect(400)

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Format de fichier non supporté')
            })
        })
    })

    describe('Error Handling and Edge Cases', () => {
        test('should handle database connection errors during export', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Simulate database error by closing connection
            testDb.close()

            const response = await apiClient
                .get('/api/v1/export/complete')
                .set('Cookie', `session_id=${session.id}`)
                .expect(500)

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Erreur de base de données')
            })

            // Restore database connection for cleanup
            testDb = await setupTestDatabase()
        })

        test('should handle database transaction rollback on import failure', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create data that will cause constraint violation
            const conflictingData = {
                parcelles: [
                    TestDataFactory.createParcelle({ userId: testUser.id }),
                    TestDataFactory.createParcelle({ userId: testUser.id }) // Duplicate ID
                ],
                produits: [],
                metadata: { version: '1.0.0' }
            }

            // Make both parcelles have the same ID to cause conflict
            conflictingData.parcelles[1].id = conflictingData.parcelles[0].id

            const response = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .send(conflictingData)
                .expect(400)

            expect(response.body.success).toBe(false)

            // Verify no partial data was imported (transaction rolled back)
            const parcelleCount = testDb.prepare('SELECT COUNT(*) as count FROM parcelles WHERE user_id = ?').get(testUser.id)
            expect(parcelleCount.count).toBe(0)
        })

        test('should handle memory limits during large export', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // This test would need actual memory pressure simulation
            // For now, we test the error handling path
            const response = await apiClient
                .get('/api/v1/export/complete')
                .query({ 
                    format: 'json',
                    limit: 'unlimited' // This should trigger memory protection
                })
                .set('Cookie', `session_id=${session.id}`)
                .expect(413) // Payload Too Large or appropriate error

            expect(response.body).toMatchObject({
                success: false,
                message: expect.stringContaining('Export trop volumineux')
            })
        })

        test('should handle concurrent import/export operations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const importData = {
                parcelles: [TestDataFactory.createParcelle({ userId: testUser.id })],
                produits: [],
                metadata: { version: '1.0.0' }
            }

            // Start concurrent operations
            const importPromise = apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .send(importData)

            const exportPromise = apiClient
                .get('/api/v1/export/complete')
                .set('Cookie', `session_id=${session.id}`)

            const [importResponse, exportResponse] = await Promise.all([importPromise, exportPromise])

            // Both operations should complete successfully
            expect(importResponse.status).toBe(200)
            expect(exportResponse.status).toBe(200)
            expect(importResponse.body.success).toBe(true)
            expect(exportResponse.body.success).toBe(true)
        })
    })
})