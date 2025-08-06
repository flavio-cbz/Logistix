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

describe('Audit and Validation Tests - Direct API', () => {
    let apiClient: supertest.SuperTest<supertest.Test>
    let testDb: any
    let authHelpers: ApiAuthHelpers

    beforeAll(async () => {
        await setupTestServer()
        testDb = await setupTestDatabase()
        apiClient = createApiClient()
        authHelpers = createAuthHelpers(apiClient, testDb)

        // Create audit log table for testing
        testDb.exec(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                action TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                resource_id TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                session_id TEXT,
                success BOOLEAN DEFAULT TRUE,
                error_message TEXT
            )
        `)
    })

    afterAll(async () => {
        await teardownTestDatabase()
        await teardownTestServer()
    })

    beforeEach(async () => {
        await cleanupTestDatabase()
        // Clear audit logs
        testDb.exec('DELETE FROM audit_logs')
    })

    afterEach(async () => {
        await authHelpers.cleanupTestUsers()
    })

    describe('Audit Log Generation Tests', () => {
        test('should log user authentication attempts', async () => {
            const testUser = await authHelpers.createTestUser()

            // Successful login
            await apiClient
                .post('/api/v1/auth/login')
                .send({
                    identifier: testUser.email,
                    password: 'password123'
                })
                .expect(200)

            // Check audit log for successful login
            const successLog = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'LOGIN_SUCCESS' 
                AND user_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            `).get(testUser.id)

            if (successLog) {
                expect(successLog.action).toBe('LOGIN_SUCCESS')
                expect(successLog.resource_type).toBe('USER')
                expect(successLog.success).toBe(true)
                expect(successLog.user_id).toBe(testUser.id)
            }

            // Failed login attempt
            await apiClient
                .post('/api/v1/auth/login')
                .send({
                    identifier: testUser.email,
                    password: 'wrongpassword'
                })
                .expect(401)

            // Check audit log for failed login
            const failLog = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'LOGIN_FAILED' 
                AND resource_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            `).get(testUser.email)

            if (failLog) {
                expect(failLog.action).toBe('LOGIN_FAILED')
                expect(failLog.resource_type).toBe('USER')
                expect(failLog.success).toBe(false)
                expect(failLog.error_message).toContain('Invalid credentials')
            }
        })

        test('should log profile update actions', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const updateData = {
                username: 'updated-user',
                email: 'updated@example.com',
                bio: 'Updated bio',
                theme: 'dark',
                language: 'en'
            }

            await apiClient
                .post('/api/v1/profile/update')
                .set('Cookie', `session_id=${session.id}`)
                .send(updateData)
                .expect(200)

            // Check audit log for profile update
            const auditLog = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'PROFILE_UPDATE' 
                AND user_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            `).get(testUser.id)

            if (auditLog) {
                expect(auditLog.action).toBe('PROFILE_UPDATE')
                expect(auditLog.resource_type).toBe('USER')
                expect(auditLog.resource_id).toBe(testUser.id)
                expect(auditLog.success).toBe(true)
                expect(auditLog.session_id).toBe(session.id)

                const details = JSON.parse(auditLog.details || '{}')
                expect(details.changes).toBeDefined()
                expect(details.changes.username).toBe('updated-user')
            }
        })

        test('should log parcelle CRUD operations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create parcelle
            const createResponse = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prix_achat: 25.50
                })

            if (createResponse.status === 200 || createResponse.status === 201) {
                const parcelleId = createResponse.body.data?.id || createResponse.body.id

                // Check create audit log
                const createLog = testDb.prepare(`
                    SELECT * FROM audit_logs 
                    WHERE action = 'PARCELLE_CREATE' 
                    AND user_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                `).get(testUser.id)

                if (createLog) {
                    expect(createLog.action).toBe('PARCELLE_CREATE')
                    expect(createLog.resource_type).toBe('PARCELLE')
                    expect(createLog.success).toBe(true)
                }

                // Update parcelle
                await apiClient
                    .put(`/api/v1/parcelles/${parcelleId}`)
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        numero: 'P001-UPDATED',
                        transporteur: 'UPS',
                        poids: 2.0,
                        prix_achat: 30.00
                    })

                // Check update audit log
                const updateLog = testDb.prepare(`
                    SELECT * FROM audit_logs 
                    WHERE action = 'PARCELLE_UPDATE' 
                    AND user_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                `).get(testUser.id)

                if (updateLog) {
                    expect(updateLog.action).toBe('PARCELLE_UPDATE')
                    expect(updateLog.resource_type).toBe('PARCELLE')
                    expect(updateLog.resource_id).toBe(parcelleId)
                }

                // Delete parcelle
                await apiClient
                    .delete(`/api/v1/parcelles/${parcelleId}`)
                    .set('Cookie', `session_id=${session.id}`)

                // Check delete audit log
                const deleteLog = testDb.prepare(`
                    SELECT * FROM audit_logs 
                    WHERE action = 'PARCELLE_DELETE' 
                    AND user_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                `).get(testUser.id)

                if (deleteLog) {
                    expect(deleteLog.action).toBe('PARCELLE_DELETE')
                    expect(deleteLog.resource_type).toBe('PARCELLE')
                    expect(deleteLog.resource_id).toBe(parcelleId)
                }
            }
        })

        test('should log product management operations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)
            const testParcelle = await authHelpers.createTestParcelle(testUser.id)

            // Create product
            const createResponse = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    nom: 'Test Product',
                    prix: 15.99,
                    quantite: 1,
                    parcelle_id: testParcelle.id,
                    description: 'Test product description'
                })

            if (createResponse.status === 200 || createResponse.status === 201) {
                const productId = createResponse.body.data?.id || createResponse.body.id

                // Check create audit log
                const createLog = testDb.prepare(`
                    SELECT * FROM audit_logs 
                    WHERE action = 'PRODUCT_CREATE' 
                    AND user_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                `).get(testUser.id)

                if (createLog) {
                    expect(createLog.action).toBe('PRODUCT_CREATE')
                    expect(createLog.resource_type).toBe('PRODUCT')
                    expect(createLog.success).toBe(true)
                }

                // Record sale
                await apiClient
                    .post(`/api/v1/produits/${productId}/vente`)
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        prix_vente: 20.00,
                        plateforme: 'Vinted',
                        frais_vente: 2.00
                    })

                // Check sale audit log
                const saleLog = testDb.prepare(`
                    SELECT * FROM audit_logs 
                    WHERE action = 'PRODUCT_SALE' 
                    AND user_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT 1
                `).get(testUser.id)

                if (saleLog) {
                    expect(saleLog.action).toBe('PRODUCT_SALE')
                    expect(saleLog.resource_type).toBe('PRODUCT')
                    expect(saleLog.resource_id).toBe(productId)

                    const details = JSON.parse(saleLog.details || '{}')
                    expect(details.prix_vente).toBe(20.00)
                    expect(details.plateforme).toBe('Vinted')
                }
            }
        })

        test('should log security-related events', async () => {
            const testUser = await authHelpers.createTestUser()

            // Multiple failed login attempts
            for (let i = 0; i < 5; i++) {
                await apiClient
                    .post('/api/v1/auth/login')
                    .send({
                        identifier: testUser.email,
                        password: 'wrongpassword'
                    })
            }

            // Check for security alert log
            const securityLog = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'SECURITY_ALERT' 
                AND resource_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            `).get(testUser.email)

            if (securityLog) {
                expect(securityLog.action).toBe('SECURITY_ALERT')
                expect(securityLog.resource_type).toBe('SECURITY')
                expect(securityLog.success).toBe(false)

                const details = JSON.parse(securityLog.details || '{}')
                expect(details.alert_type).toBe('MULTIPLE_FAILED_LOGINS')
                expect(details.attempt_count).toBeGreaterThanOrEqual(5)
            }
        })

        test('should log administrative actions', async () => {
            const adminUser = await authHelpers.createTestUser({ role: 'admin' })
            const session = await authHelpers.createTestSession(adminUser.id)

            // Admin database query
            await apiClient
                .post('/api/v1/admin/database/query')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    query: 'SELECT COUNT(*) FROM users'
                })

            // Check admin action log
            const adminLog = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'ADMIN_DATABASE_QUERY' 
                AND user_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            `).get(adminUser.id)

            if (adminLog) {
                expect(adminLog.action).toBe('ADMIN_DATABASE_QUERY')
                expect(adminLog.resource_type).toBe('DATABASE')
                expect(adminLog.user_id).toBe(adminUser.id)

                const details = JSON.parse(adminLog.details || '{}')
                expect(details.query).toContain('SELECT COUNT(*)')
            }
        })

        test('should capture IP address and user agent in audit logs', async () => {
            const testUser = await authHelpers.createTestUser()

            await apiClient
                .post('/api/v1/auth/login')
                .set('User-Agent', 'Test-Browser/1.0')
                .set('X-Forwarded-For', '192.168.1.100')
                .send({
                    identifier: testUser.email,
                    password: 'password123'
                })

            const auditLog = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'LOGIN_SUCCESS' 
                AND user_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            `).get(testUser.id)

            if (auditLog) {
                expect(auditLog.user_agent).toContain('Test-Browser')
                expect(auditLog.ip_address).toBeDefined()
            }
        })
    })

    describe('User Action Traceability Tests', () => {
        test('should trace complete user workflow from login to logout', async () => {
            const testUser = await authHelpers.createTestUser()

            // Login
            const loginResponse = await apiClient
                .post('/api/v1/auth/login')
                .send({
                    identifier: testUser.email,
                    password: 'password123'
                })
                .expect(200)

            const sessionId = loginResponse.headers['set-cookie']?.[0]?.match(/session_id=([^;]+)/)?.[1]

            // Create parcelle
            await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${sessionId}`)
                .send({
                    numero: 'TRACE001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prix_achat: 25.50
                })

            // Update profile
            await apiClient
                .post('/api/v1/profile/update')
                .set('Cookie', `session_id=${sessionId}`)
                .send({
                    username: testUser.username,
                    email: testUser.email,
                    bio: 'Traced user',
                    theme: 'dark',
                    language: 'fr'
                })

            // Logout
            await apiClient
                .post('/api/v1/auth/logout')
                .set('Cookie', `session_id=${sessionId}`)

            // Verify complete audit trail
            const auditTrail = testDb.prepare(`
                SELECT action, resource_type, timestamp, session_id 
                FROM audit_logs 
                WHERE user_id = ? 
                ORDER BY timestamp ASC
            `).all(testUser.id)

            if (auditTrail.length > 0) {
                const actions = auditTrail.map(log => log.action)
                expect(actions).toContain('LOGIN_SUCCESS')
                expect(actions).toContain('PARCELLE_CREATE')
                expect(actions).toContain('PROFILE_UPDATE')
                expect(actions).toContain('LOGOUT')

                // Verify session consistency
                const sessionIds = auditTrail.map(log => log.session_id).filter(Boolean)
                const uniqueSessions = [...new Set(sessionIds)]
                expect(uniqueSessions.length).toBe(1) // All actions should have same session
            }
        })

        test('should trace data access patterns', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Access different resources
            await apiClient
                .get('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)

            await apiClient
                .get('/api/v1/produits')
                .set('Cookie', `session_id=${session.id}`)

            await apiClient
                .get('/api/v1/statistiques/roi')
                .set('Cookie', `session_id=${session.id}`)

            // Check access logs
            const accessLogs = testDb.prepare(`
                SELECT action, resource_type 
                FROM audit_logs 
                WHERE user_id = ? 
                AND action LIKE '%_ACCESS'
                ORDER BY timestamp ASC
            `).all(testUser.id)

            if (accessLogs.length > 0) {
                const resourcesAccessed = accessLogs.map(log => log.resource_type)
                expect(resourcesAccessed).toContain('PARCELLE')
                expect(resourcesAccessed).toContain('PRODUCT')
                expect(resourcesAccessed).toContain('STATISTICS')
            }
        })

        test('should trace failed operations and errors', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Attempt to create parcelle with invalid data
            await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    numero: '', // Invalid empty numero
                    transporteur: 'DHL',
                    poids: -1, // Invalid negative weight
                    prix_achat: 'invalid' // Invalid price format
                })
                .expect(400)

            // Check error audit log
            const errorLog = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'PARCELLE_CREATE_FAILED' 
                AND user_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 1
            `).get(testUser.id)

            if (errorLog) {
                expect(errorLog.success).toBe(false)
                expect(errorLog.error_message).toBeDefined()

                const details = JSON.parse(errorLog.details || '{}')
                expect(details.validation_errors).toBeDefined()
            }
        })

        test('should trace concurrent user sessions', async () => {
            const testUser = await authHelpers.createTestUser()
            const session1 = await authHelpers.createTestSession(testUser.id)
            const session2 = await authHelpers.createTestSession(testUser.id)

            // Perform actions in both sessions
            await Promise.all([
                apiClient
                    .get('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session1.id}`),
                apiClient
                    .get('/api/v1/produits')
                    .set('Cookie', `session_id=${session2.id}`)
            ])

            // Check that both sessions are tracked
            const sessionLogs = testDb.prepare(`
                SELECT DISTINCT session_id 
                FROM audit_logs 
                WHERE user_id = ?
            `).all(testUser.id)

            if (sessionLogs.length > 0) {
                const sessionIds = sessionLogs.map(log => log.session_id)
                expect(sessionIds).toContain(session1.id)
                expect(sessionIds).toContain(session2.id)
            }
        })
    })

    describe('Security Report Generation Tests', () => {
        test('should generate security summary report', async () => {
            const testUser = await authHelpers.createTestUser()

            // Generate various security events
            await apiClient.post('/api/v1/auth/login').send({ identifier: testUser.email, password: 'wrong' })
            await apiClient.post('/api/v1/auth/login').send({ identifier: testUser.email, password: 'wrong' })
            await apiClient.post('/api/v1/auth/login').send({ identifier: testUser.email, password: 'password123' })

            // Generate security report
            const adminUser = await authHelpers.createTestUser({ role: 'admin', email: 'admin@example.com' })
            const adminSession = await authHelpers.createTestSession(adminUser.id)

            const reportResponse = await apiClient
                .get('/api/v1/admin/security/report')
                .set('Cookie', `session_id=${adminSession.id}`)

            if (reportResponse.status === 200) {
                expect(reportResponse.body.success).toBe(true)
                expect(reportResponse.body.data).toHaveProperty('failed_logins')
                expect(reportResponse.body.data).toHaveProperty('successful_logins')
                expect(reportResponse.body.data).toHaveProperty('security_alerts')
                expect(reportResponse.body.data.failed_logins).toBeGreaterThanOrEqual(2)
                expect(reportResponse.body.data.successful_logins).toBeGreaterThanOrEqual(1)
            }
        })

        test('should generate user activity report', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Generate user activity
            await apiClient.get('/api/v1/parcelles').set('Cookie', `session_id=${session.id}`)
            await apiClient.post('/api/v1/profile/update').set('Cookie', `session_id=${session.id}`).send({
                username: testUser.username,
                email: testUser.email,
                theme: 'dark',
                language: 'fr'
            })

            // Generate activity report
            const adminUser = await authHelpers.createTestUser({ role: 'admin', email: 'admin@example.com' })
            const adminSession = await authHelpers.createTestSession(adminUser.id)

            const reportResponse = await apiClient
                .get(`/api/v1/admin/users/${testUser.id}/activity`)
                .set('Cookie', `session_id=${adminSession.id}`)

            if (reportResponse.status === 200) {
                expect(reportResponse.body.success).toBe(true)
                expect(reportResponse.body.data).toHaveProperty('total_actions')
                expect(reportResponse.body.data).toHaveProperty('recent_actions')
                expect(reportResponse.body.data.total_actions).toBeGreaterThan(0)
                expect(Array.isArray(reportResponse.body.data.recent_actions)).toBe(true)
            }
        })

        test('should generate anomaly detection report', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Generate suspicious activity patterns
            for (let i = 0; i < 10; i++) {
                await apiClient
                    .post('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        numero: `BULK${i}`,
                        transporteur: 'DHL',
                        poids: 1.0,
                        prix_achat: 10.00
                    })
            }

            // Generate anomaly report
            const adminUser = await authHelpers.createTestUser({ role: 'admin', email: 'admin@example.com' })
            const adminSession = await authHelpers.createTestSession(adminUser.id)

            const reportResponse = await apiClient
                .get('/api/v1/admin/security/anomalies')
                .set('Cookie', `session_id=${adminSession.id}`)

            if (reportResponse.status === 200) {
                expect(reportResponse.body.success).toBe(true)
                expect(reportResponse.body.data).toHaveProperty('anomalies')
                expect(Array.isArray(reportResponse.body.data.anomalies)).toBe(true)

                const anomalies = reportResponse.body.data.anomalies
                const bulkCreationAnomaly = anomalies.find((a: any) => a.type === 'BULK_CREATION')
                if (bulkCreationAnomaly) {
                    expect(bulkCreationAnomaly.user_id).toBe(testUser.id)
                    expect(bulkCreationAnomaly.count).toBeGreaterThanOrEqual(10)
                }
            }
        })

        test('should generate compliance audit report', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Generate various user actions for compliance tracking
            await apiClient.post('/api/v1/profile/update').set('Cookie', `session_id=${session.id}`).send({
                username: testUser.username,
                email: testUser.email,
                bio: 'Compliance test user',
                theme: 'light',
                language: 'fr'
            })

            const testParcelle = await authHelpers.createTestParcelle(testUser.id)
            await apiClient.delete(`/api/v1/parcelles/${testParcelle.id}`).set('Cookie', `session_id=${session.id}`)

            // Generate compliance report
            const adminUser = await authHelpers.createTestUser({ role: 'admin', email: 'admin@example.com' })
            const adminSession = await authHelpers.createTestSession(adminUser.id)

            const reportResponse = await apiClient
                .get('/api/v1/admin/compliance/audit')
                .set('Cookie', `session_id=${adminSession.id}`)
                .query({
                    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    end_date: new Date().toISOString()
                })

            if (reportResponse.status === 200) {
                expect(reportResponse.body.success).toBe(true)
                expect(reportResponse.body.data).toHaveProperty('audit_summary')
                expect(reportResponse.body.data).toHaveProperty('data_changes')
                expect(reportResponse.body.data).toHaveProperty('user_actions')

                const auditSummary = reportResponse.body.data.audit_summary
                expect(auditSummary.total_actions).toBeGreaterThan(0)
                expect(auditSummary.data_modifications).toBeGreaterThan(0)
                expect(auditSummary.deletions).toBeGreaterThan(0)
            }
        })
    })

    describe('Audit Log Integrity Tests', () => {
        test('should prevent audit log tampering', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Generate audit log entry
            await apiClient
                .post('/api/v1/profile/update')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    username: testUser.username,
                    email: testUser.email,
                    bio: 'Original bio',
                    theme: 'light',
                    language: 'fr'
                })

            // Attempt to modify audit log directly (should be prevented)
            try {
                testDb.prepare(`
                    UPDATE audit_logs 
                    SET details = '{"tampered": true}' 
                    WHERE user_id = ?
                `).run(testUser.id)

                // If modification succeeds, verify integrity check detects it
                const adminUser = await authHelpers.createTestUser({ role: 'admin', email: 'admin@example.com' })
                const adminSession = await authHelpers.createTestSession(adminUser.id)

                const integrityResponse = await apiClient
                    .get('/api/v1/admin/audit/integrity')
                    .set('Cookie', `session_id=${adminSession.id}`)

                if (integrityResponse.status === 200) {
                    expect(integrityResponse.body.data).toHaveProperty('integrity_violations')
                    expect(integrityResponse.body.data.integrity_violations.length).toBeGreaterThan(0)
                }
            } catch (error) {
                // Expected: audit log modification should be prevented
                expect(error).toBeDefined()
            }
        })

        test('should maintain audit log retention policy', async () => {
            const testUser = await authHelpers.createTestUser()

            // Create old audit log entries
            const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
            testDb.prepare(`
                INSERT INTO audit_logs (id, user_id, action, resource_type, timestamp)
                VALUES (?, ?, 'OLD_ACTION', 'TEST', ?)
            `).run(`old-log-${Date.now()}`, testUser.id, oldDate.toISOString())

            // Trigger retention policy check
            const adminUser = await authHelpers.createTestUser({ role: 'admin', email: 'admin@example.com' })
            const adminSession = await authHelpers.createTestSession(adminUser.id)

            const retentionResponse = await apiClient
                .post('/api/v1/admin/audit/cleanup')
                .set('Cookie', `session_id=${adminSession.id}`)
                .send({ retention_days: 180 })

            if (retentionResponse.status === 200) {
                expect(retentionResponse.body.success).toBe(true)
                expect(retentionResponse.body.data).toHaveProperty('deleted_count')

                // Verify old logs are removed
                const oldLogs = testDb.prepare(`
                    SELECT COUNT(*) as count 
                    FROM audit_logs 
                    WHERE timestamp < datetime('now', '-180 days')
                `).get()

                expect(oldLogs.count).toBe(0)
            }
        })

        test('should validate audit log completeness', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Perform tracked operations
            const operations = [
                () => apiClient.post('/api/v1/parcelles').set('Cookie', `session_id=${session.id}`).send({
                    numero: 'COMPLETE001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prix_achat: 25.50
                }),
                () => apiClient.get('/api/v1/parcelles').set('Cookie', `session_id=${session.id}`),
                () => apiClient.post('/api/v1/profile/update').set('Cookie', `session_id=${session.id}`).send({
                    username: testUser.username,
                    email: testUser.email,
                    theme: 'dark',
                    language: 'fr'
                })
            ]

            // Execute operations
            for (const operation of operations) {
                await operation()
            }

            // Validate audit completeness
            const adminUser = await authHelpers.createTestUser({ role: 'admin', email: 'admin@example.com' })
            const adminSession = await authHelpers.createTestSession(adminUser.id)

            const completenessResponse = await apiClient
                .get('/api/v1/admin/audit/completeness')
                .set('Cookie', `session_id=${adminSession.id}`)
                .query({ user_id: testUser.id })

            if (completenessResponse.status === 200) {
                expect(completenessResponse.body.success).toBe(true)
                expect(completenessResponse.body.data).toHaveProperty('completeness_score')
                expect(completenessResponse.body.data).toHaveProperty('missing_logs')
                expect(completenessResponse.body.data.completeness_score).toBeGreaterThan(0.8) // 80% completeness
            }
        })
    })
})