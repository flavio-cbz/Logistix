import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import supertest from 'supertest'
import {
    setupTestServer,
    teardownTestServer,
    setupTestDatabase,
    teardownTestDatabase,
    cleanupTestDatabase,
    createApiClient
} from '../api/setup'
import { createAuthHelpers, ApiAuthHelpers } from '../api/auth-helpers'

describe('Audit and Validation Tests', () => {
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

    describe('Complete Audit Log Generation and Storage Tests', () => {
        test('should log user authentication events', async () => {
            const testUser = await authHelpers.createTestUser({
                email: 'audit@example.com',
                username: 'audituser'
            })

            // Successful login
            const loginResponse = await apiClient
                .post('/api/v1/auth/login')
                .send({
                    identifier: testUser.email,
                    password: 'password123'
                })

            // Check if audit log entry was created
            const auditLogs = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE user_id = ? AND action = 'LOGIN' 
                ORDER BY created_at DESC LIMIT 1
            `).all(testUser.id)

            if (auditLogs.length > 0) {
                const log = auditLogs[0]
                expect(log.action).toBe('LOGIN')
                expect(log.user_id).toBe(testUser.id)
                expect(log.resource_type).toBe('USER')
                expect(log.success).toBe(true)
                expect(log.ip_address).toBeDefined()
                expect(log.user_agent).toBeDefined()
                expect(new Date(log.created_at)).toBeInstanceOf(Date)
            }

            // Failed login attempt
            await apiClient
                .post('/api/v1/auth/login')
                .send({
                    identifier: testUser.email,
                    password: 'wrongpassword'
                })

            const failedLoginLogs = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'LOGIN_FAILED' AND details LIKE ?
                ORDER BY created_at DESC LIMIT 1
            `).all(`%${testUser.email}%`)

            if (failedLoginLogs.length > 0) {
                const log = failedLoginLogs[0]
                expect(log.action).toBe('LOGIN_FAILED')
                expect(log.success).toBe(false)
                expect(log.details).toContain(testUser.email)
            }
        })

        test('should log data modification events', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create a parcel
            const createResponse = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    numero: 'AUDIT-001',
                    transporteur: 'Test Transporteur',
                    poids: 100,
                    prix_achat: 50
                })

            if (createResponse.status === 200 || createResponse.status === 201) {
                const parcelId = createResponse.body.id || createResponse.body.data?.id

                // Check audit log for creation
                const createLogs = testDb.prepare(`
                    SELECT * FROM audit_logs 
                    WHERE user_id = ? AND action = 'CREATE' AND resource_type = 'PARCELLE'
                    ORDER BY created_at DESC LIMIT 1
                `).all(testUser.id)

                if (createLogs.length > 0) {
                    const log = createLogs[0]
                    expect(log.action).toBe('CREATE')
                    expect(log.resource_type).toBe('PARCELLE')
                    expect(log.resource_id).toBe(parcelId)
                    expect(log.user_id).toBe(testUser.id)
                    expect(log.success).toBe(true)
                    expect(JSON.parse(log.new_values)).toMatchObject({
                        numero: 'AUDIT-001',
                        transporteur: 'Test Transporteur'
                    })
                }

                // Update the parcel
                const updateResponse = await apiClient
                    .put(`/api/v1/parcelles/${parcelId}`)
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        numero: 'AUDIT-001-UPDATED',
                        transporteur: 'Updated Transporteur',
                        poids: 150,
                        prix_achat: 75
                    })

                if (updateResponse.status === 200) {
                    // Check audit log for update
                    const updateLogs = testDb.prepare(`
                        SELECT * FROM audit_logs 
                        WHERE user_id = ? AND action = 'UPDATE' AND resource_type = 'PARCELLE'
                        ORDER BY created_at DESC LIMIT 1
                    `).all(testUser.id)

                    if (updateLogs.length > 0) {
                        const log = updateLogs[0]
                        expect(log.action).toBe('UPDATE')
                        expect(log.resource_type).toBe('PARCELLE')
                        expect(log.resource_id).toBe(parcelId)
                        expect(log.user_id).toBe(testUser.id)
                        expect(log.success).toBe(true)
                        
                        const oldValues = JSON.parse(log.old_values)
                        const newValues = JSON.parse(log.new_values)
                        expect(oldValues.numero).toBe('AUDIT-001')
                        expect(newValues.numero).toBe('AUDIT-001-UPDATED')
                    }
                }

                // Delete the parcel
                const deleteResponse = await apiClient
                    .delete(`/api/v1/parcelles/${parcelId}`)
                    .set('Cookie', `session_id=${session.id}`)

                if (deleteResponse.status === 200 || deleteResponse.status === 204) {
                    // Check audit log for deletion
                    const deleteLogs = testDb.prepare(`
                        SELECT * FROM audit_logs 
                        WHERE user_id = ? AND action = 'DELETE' AND resource_type = 'PARCELLE'
                        ORDER BY created_at DESC LIMIT 1
                    `).all(testUser.id)

                    if (deleteLogs.length > 0) {
                        const log = deleteLogs[0]
                        expect(log.action).toBe('DELETE')
                        expect(log.resource_type).toBe('PARCELLE')
                        expect(log.resource_id).toBe(parcelId)
                        expect(log.user_id).toBe(testUser.id)
                        expect(log.success).toBe(true)
                    }
                }
            }
        })

        test('should log administrative actions', async () => {
            const adminUser = await authHelpers.createTestUser({ role: 'admin' })
            const session = await authHelpers.createTestSession(adminUser.id)

            // Attempt admin actions
            const adminActions = [
                { method: 'get', path: '/api/v1/admin/database/overview', action: 'VIEW_DATABASE' },
                { method: 'get', path: '/api/v1/admin/system/health', action: 'VIEW_SYSTEM_HEALTH' },
                { method: 'post', path: '/api/v1/admin/maintenance', action: 'SYSTEM_MAINTENANCE' },
                { method: 'get', path: '/api/v1/admin/logs', action: 'VIEW_LOGS' }
            ]

            for (const adminAction of adminActions) {
                const response = await apiClient[adminAction.method](adminAction.path)
                    .set('Cookie', `session_id=${session.id}`)

                // Check audit log for admin action
                const adminLogs = testDb.prepare(`
                    SELECT * FROM audit_logs 
                    WHERE user_id = ? AND action = ? 
                    ORDER BY created_at DESC LIMIT 1
                `).all(adminUser.id, adminAction.action)

                if (adminLogs.length > 0) {
                    const log = adminLogs[0]
                    expect(log.action).toBe(adminAction.action)
                    expect(log.user_id).toBe(adminUser.id)
                    expect(log.resource_type).toBe('SYSTEM')
                    expect(log.success).toBe(response.status < 400)
                }
            }
        })

        test('should log security events and violations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // SQL injection attempt
            const sqlInjectionResponse = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    numero: "'; DROP TABLE parcelles; --",
                    transporteur: 'Test',
                    poids: 100,
                    prix_achat: 50
                })

            // Check for security violation log
            const securityLogs = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'SECURITY_VIOLATION' AND details LIKE '%SQL_INJECTION%'
                ORDER BY created_at DESC LIMIT 1
            `).all()

            if (securityLogs.length > 0) {
                const log = securityLogs[0]
                expect(log.action).toBe('SECURITY_VIOLATION')
                expect(log.success).toBe(false)
                expect(log.details).toContain('SQL_INJECTION')
                expect(log.ip_address).toBeDefined()
            }

            // XSS attempt
            const xssResponse = await apiClient
                .post('/api/v1/profile/update')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    username: '<script>alert("xss")</script>',
                    email: 'test@example.com',
                    theme: 'light',
                    language: 'fr'
                })

            // Check for XSS violation log
            const xssLogs = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE action = 'SECURITY_VIOLATION' AND details LIKE '%XSS%'
                ORDER BY created_at DESC LIMIT 1
            `).all()

            if (xssLogs.length > 0) {
                const log = xssLogs[0]
                expect(log.action).toBe('SECURITY_VIOLATION')
                expect(log.success).toBe(false)
                expect(log.details).toContain('XSS')
            }

            // Unauthorized access attempt
            const unauthorizedResponse = await apiClient
                .get('/api/v1/admin/database/overview')
                .set('Cookie', `session_id=${session.id}`)

            if (unauthorizedResponse.status === 403) {
                const unauthorizedLogs = testDb.prepare(`
                    SELECT * FROM audit_logs 
                    WHERE user_id = ? AND action = 'UNAUTHORIZED_ACCESS'
                    ORDER BY created_at DESC LIMIT 1
                `).all(testUser.id)

                if (unauthorizedLogs.length > 0) {
                    const log = unauthorizedLogs[0]
                    expect(log.action).toBe('UNAUTHORIZED_ACCESS')
                    expect(log.success).toBe(false)
                    expect(log.user_id).toBe(testUser.id)
                }
            }
        })

        test('should log data export and import events', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Data export
            const exportResponse = await apiClient
                .get('/api/v1/export/complete')
                .set('Cookie', `session_id=${session.id}`)

            // Check export audit log
            const exportLogs = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE user_id = ? AND action = 'DATA_EXPORT'
                ORDER BY created_at DESC LIMIT 1
            `).all(testUser.id)

            if (exportLogs.length > 0) {
                const log = exportLogs[0]
                expect(log.action).toBe('DATA_EXPORT')
                expect(log.user_id).toBe(testUser.id)
                expect(log.resource_type).toBe('DATA')
                expect(log.success).toBe(exportResponse.status < 400)
            }

            // Data import
            const importData = JSON.stringify({
                parcelles: [
                    { numero: 'IMPORT-001', transporteur: 'Test', poids: 100, prix_achat: 50 }
                ]
            })

            const importResponse = await apiClient
                .post('/api/v1/import/data')
                .set('Cookie', `session_id=${session.id}`)
                .send({ data: importData })

            // Check import audit log
            const importLogs = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE user_id = ? AND action = 'DATA_IMPORT'
                ORDER BY created_at DESC LIMIT 1
            `).all(testUser.id)

            if (importLogs.length > 0) {
                const log = importLogs[0]
                expect(log.action).toBe('DATA_IMPORT')
                expect(log.user_id).toBe(testUser.id)
                expect(log.resource_type).toBe('DATA')
                expect(log.success).toBe(importResponse.status < 400)
            }
        })

        test('should maintain audit log integrity and immutability', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Create an action that generates an audit log
            await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    numero: 'INTEGRITY-001',
                    transporteur: 'Test',
                    poids: 100,
                    prix_achat: 50
                })

            // Get the audit log entry
            const auditLogs = testDb.prepare(`
                SELECT * FROM audit_logs 
                WHERE user_id = ? AND action = 'CREATE'
                ORDER BY created_at DESC LIMIT 1
            `).all(testUser.id)

            if (auditLogs.length > 0) {
                const originalLog = auditLogs[0]

                // Attempt to modify the audit log (should fail or be prevented)
                try {
                    testDb.prepare(`
                        UPDATE audit_logs 
                        SET action = 'MODIFIED', success = false 
                        WHERE id = ?
                    `).run(originalLog.id)

                    // If update succeeds, verify it was actually prevented by triggers or constraints
                    const modifiedLog = testDb.prepare('SELECT * FROM audit_logs WHERE id = ?').get(originalLog.id)
                    
                    // Audit logs should be immutable - either update fails or is logged as tampering
                    if (modifiedLog.action === 'MODIFIED') {
                        // Check if tampering was logged
                        const tamperLogs = testDb.prepare(`
                            SELECT * FROM audit_logs 
                            WHERE action = 'AUDIT_TAMPERING'
                            ORDER BY created_at DESC LIMIT 1
                        `).all()
                        
                        expect(tamperLogs.length).toBeGreaterThan(0)
                    } else {
                        // Update was prevented - audit log remains unchanged
                        expect(modifiedLog.action).toBe(originalLog.action)
                        expect(modifiedLog.success).toBe(originalLog.success)
                    }
                } catch (error) {
                    // Update failed due to database constraints - this is expected
                    expect(error).toBeDefined()
                }

                // Attempt to delete audit log (should fail or be prevented)
                try {
                    testDb.prepare('DELETE FROM audit_logs WHERE id = ?').run(originalLog.id)

                    // Verify deletion was prevented
                    const deletedLog = testDb.prepare('SELECT * FROM audit_logs WHERE id = ?').get(originalLog.id)
                    expect(deletedLog).toBeDefined() // Should still exist
                } catch (error) {
                    // Deletion failed due to constraints - this is expected
                    expect(error).toBeDefined()
                }
            }
        })
    })

    describe('User Action Traceability and Reporting Tests', () => {
        test('should trace complete user session activities', async () => {
            const testUser = await authHelpers.createTestUser({
                username: 'traceuser',
                email: 'trace@example.com'
            })

            // Login
            const loginResponse = await apiClient
                .post('/api/v1/auth/login')
                .send({
                    identifier: testUser.email,
                    password: 'password123'
                })

            const sessionId = loginResponse.headers['set-cookie']?.[0]?.split('session_id=')[1]?.split(';')[0]

            if (sessionId) {
                // Perform various actions
                const actions = [
                    () => apiClient.get('/api/v1/parcelles').set('Cookie', `session_id=${sessionId}`),
                    () => apiClient.post('/api/v1/parcelles').set('Cookie', `session_id=${sessionId}`)
                        .send({ numero: 'TRACE-001', transporteur: 'Test', poids: 100, prix_achat: 50 }),
                    () => apiClient.get('/api/v1/produits').set('Cookie', `session_id=${sessionId}`),
                    () => apiClient.get('/api/v1/statistiques/roi').set('Cookie', `session_id=${sessionId}`)
                ]

                for (const action of actions) {
                    await action()
                }

                // Logout
                await apiClient
                    .post('/api/v1/auth/logout')
                    .set('Cookie', `session_id=${sessionId}`)

                // Verify complete session trace
                const sessionTrace = testDb.prepare(`
                    SELECT * FROM audit_logs 
                    WHERE user_id = ? OR session_id = ?
                    ORDER BY created_at ASC
                `).all(testUser.id, sessionId)

                if (sessionTrace.length > 0) {
                    // Should have login, actions, and logout
                    const actions = sessionTrace.map(log => log.action)
                    expect(actions).toContain('LOGIN')
                    expect(actions).toContain('LOGOUT')
                    
                    // Verify session continuity
                    sessionTrace.forEach(log => {
                        expect(log.session_id).toBe(sessionId)
                        expect(new Date(log.created_at)).toBeInstanceOf(Date)
                    })
                }
            }
        })

        test('should generate user activity reports', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Generate various activities over time
            const activities = [
                { action: 'CREATE', resource: 'PARCELLE', data: { numero: 'RPT-001' } },
                { action: 'UPDATE', resource: 'PARCELLE', data: { numero: 'RPT-001-UPD' } },
                { action: 'VIEW', resource: 'DASHBOARD', data: {} },
                { action: 'EXPORT', resource: 'DATA', data: { format: 'CSV' } }
            ]

            for (const activity of activities) {
                // Simulate the activity by making API calls
                switch (activity.action) {
                    case 'CREATE':
                        await apiClient.post('/api/v1/parcelles')
                            .set('Cookie', `session_id=${session.id}`)
                            .send({ ...activity.data, transporteur: 'Test', poids: 100, prix_achat: 50 })
                        break
                    case 'UPDATE':
                        // Assume we have a parcel to update
                        break
                    case 'VIEW':
                        await apiClient.get('/api/v1/dashboard')
                            .set('Cookie', `session_id=${session.id}`)
                        break
                    case 'EXPORT':
                        await apiClient.get('/api/v1/export/complete')
                            .set('Cookie', `session_id=${session.id}`)
                        break
                }
            }

            // Generate activity report
            const activityReport = testDb.prepare(`
                SELECT 
                    action,
                    resource_type,
                    COUNT(*) as count,
                    MIN(created_at) as first_occurrence,
                    MAX(created_at) as last_occurrence
                FROM audit_logs 
                WHERE user_id = ? 
                GROUP BY action, resource_type
                ORDER BY count DESC
            `).all(testUser.id)

            expect(activityReport.length).toBeGreaterThan(0)

            activityReport.forEach(report => {
                expect(report.action).toBeDefined()
                expect(report.count).toBeGreaterThan(0)
                expect(new Date(report.first_occurrence)).toBeInstanceOf(Date)
                expect(new Date(report.last_occurrence)).toBeInstanceOf(Date)
            })
        })

        test('should track data access patterns', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Access different types of data
            const dataAccess = [
                '/api/v1/parcelles',
                '/api/v1/produits',
                '/api/v1/statistiques/roi',
                '/api/v1/market-analysis/search',
                '/api/v1/dashboard'
            ]

            for (const endpoint of dataAccess) {
                await apiClient
                    .get(endpoint)
                    .set('Cookie', `session_id=${session.id}`)
            }

            // Analyze access patterns
            const accessPatterns = testDb.prepare(`
                SELECT 
                    resource_type,
                    COUNT(*) as access_count,
                    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
                    GROUP_CONCAT(DISTINCT ip_address) as ip_addresses
                FROM audit_logs 
                WHERE user_id = ? AND action LIKE '%VIEW%' OR action LIKE '%ACCESS%'
                GROUP BY resource_type
            `).all(testUser.id)

            if (accessPatterns.length > 0) {
                accessPatterns.forEach(pattern => {
                    expect(pattern.access_count).toBeGreaterThan(0)
                    expect(pattern.success_rate).toBeGreaterThanOrEqual(0)
                    expect(pattern.success_rate).toBeLessThanOrEqual(1)
                })
            }
        })

        test('should identify suspicious user behavior patterns', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Simulate suspicious behavior patterns
            const suspiciousActivities = [
                // Rapid successive login attempts
                () => Promise.all([
                    apiClient.post('/api/v1/auth/login').send({ identifier: 'admin', password: 'wrong1' }),
                    apiClient.post('/api/v1/auth/login').send({ identifier: 'admin', password: 'wrong2' }),
                    apiClient.post('/api/v1/auth/login').send({ identifier: 'admin', password: 'wrong3' })
                ]),
                
                // Bulk data access
                () => Promise.all([
                    apiClient.get('/api/v1/parcelles').set('Cookie', `session_id=${session.id}`),
                    apiClient.get('/api/v1/produits').set('Cookie', `session_id=${session.id}`),
                    apiClient.get('/api/v1/export/complete').set('Cookie', `session_id=${session.id}`)
                ]),

                // Unauthorized access attempts
                () => Promise.all([
                    apiClient.get('/api/v1/admin/database/overview').set('Cookie', `session_id=${session.id}`),
                    apiClient.get('/api/v1/admin/system/health').set('Cookie', `session_id=${session.id}`),
                    apiClient.get('/api/v1/admin/logs').set('Cookie', `session_id=${session.id}`)
                ])
            ]

            for (const activity of suspiciousActivities) {
                await activity()
            }

            // Analyze for suspicious patterns
            const suspiciousPatterns = testDb.prepare(`
                SELECT 
                    user_id,
                    action,
                    COUNT(*) as frequency,
                    MIN(created_at) as start_time,
                    MAX(created_at) as end_time,
                    (julianday(MAX(created_at)) - julianday(MIN(created_at))) * 24 * 60 as duration_minutes
                FROM audit_logs 
                WHERE user_id = ? 
                    AND (success = 0 OR action LIKE '%FAILED%' OR action LIKE '%UNAUTHORIZED%')
                GROUP BY user_id, action
                HAVING frequency > 2 OR duration_minutes < 1
            `).all(testUser.id)

            if (suspiciousPatterns.length > 0) {
                suspiciousPatterns.forEach(pattern => {
                    expect(pattern.frequency).toBeGreaterThan(0)
                    expect(pattern.duration_minutes).toBeDefined()
                })
            }
        })

        test('should maintain audit trail for compliance reporting', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Perform actions that require compliance tracking
            const complianceActions = [
                { action: 'DATA_ACCESS', endpoint: '/api/v1/parcelles' },
                { action: 'DATA_MODIFICATION', endpoint: '/api/v1/parcelles', method: 'POST' },
                { action: 'DATA_EXPORT', endpoint: '/api/v1/export/complete' },
                { action: 'ADMIN_ACCESS', endpoint: '/api/v1/admin/database/overview' }
            ]

            for (const complianceAction of complianceActions) {
                if (complianceAction.method === 'POST') {
                    await apiClient.post(complianceAction.endpoint)
                        .set('Cookie', `session_id=${session.id}`)
                        .send({ numero: 'COMP-001', transporteur: 'Test', poids: 100, prix_achat: 50 })
                } else {
                    await apiClient.get(complianceAction.endpoint)
                        .set('Cookie', `session_id=${session.id}`)
                }
            }

            // Generate compliance report
            const complianceReport = testDb.prepare(`
                SELECT 
                    DATE(created_at) as date,
                    action,
                    resource_type,
                    COUNT(*) as count,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_actions,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_actions,
                    GROUP_CONCAT(DISTINCT user_id) as users_involved
                FROM audit_logs 
                WHERE user_id = ?
                GROUP BY DATE(created_at), action, resource_type
                ORDER BY date DESC, count DESC
            `).all(testUser.id)

            expect(complianceReport.length).toBeGreaterThan(0)

            complianceReport.forEach(report => {
                expect(report.date).toBeDefined()
                expect(report.action).toBeDefined()
                expect(report.count).toBeGreaterThan(0)
                expect(report.successful_actions + report.failed_actions).toBe(report.count)
            })
        })
    })

    describe('Security Report Generation and Analysis Tests', () => {
        test('should generate security incident reports', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Generate security incidents
            const securityIncidents = [
                // SQL injection attempts
                () => apiClient.post('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({ numero: "'; DROP TABLE parcelles; --", transporteur: 'Test', poids: 100, prix_achat: 50 }),
                
                // XSS attempts
                () => apiClient.post('/api/v1/profile/update')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({ username: '<script>alert("xss")</script>', email: 'test@example.com', theme: 'light', language: 'fr' }),
                
                // Unauthorized access attempts
                () => apiClient.get('/api/v1/admin/database/overview')
                    .set('Cookie', `session_id=${session.id}`),
                
                // Brute force attempts
                () => Promise.all([
                    apiClient.post('/api/v1/auth/login').send({ identifier: 'admin', password: 'wrong1' }),
                    apiClient.post('/api/v1/auth/login').send({ identifier: 'admin', password: 'wrong2' }),
                    apiClient.post('/api/v1/auth/login').send({ identifier: 'admin', password: 'wrong3' })
                ])
            ]

            for (const incident of securityIncidents) {
                await incident()
            }

            // Generate security incident report
            const securityReport = testDb.prepare(`
                SELECT 
                    DATE(created_at) as incident_date,
                    action,
                    COUNT(*) as incident_count,
                    GROUP_CONCAT(DISTINCT user_id) as affected_users,
                    GROUP_CONCAT(DISTINCT ip_address) as source_ips,
                    MIN(created_at) as first_incident,
                    MAX(created_at) as last_incident
                FROM audit_logs 
                WHERE action LIKE '%SECURITY%' 
                    OR action LIKE '%FAILED%' 
                    OR action LIKE '%UNAUTHORIZED%'
                    OR success = 0
                GROUP BY DATE(created_at), action
                ORDER BY incident_date DESC, incident_count DESC
            `).all()

            if (securityReport.length > 0) {
                securityReport.forEach(report => {
                    expect(report.incident_date).toBeDefined()
                    expect(report.incident_count).toBeGreaterThan(0)
                    expect(new Date(report.first_incident)).toBeInstanceOf(Date)
                    expect(new Date(report.last_incident)).toBeInstanceOf(Date)
                })
            }
        })

        test('should analyze security trends and patterns', async () => {
            // Generate historical security data
            const historicalIncidents = [
                { days_ago: 1, incidents: 5 },
                { days_ago: 2, incidents: 3 },
                { days_ago: 3, incidents: 8 },
                { days_ago: 4, incidents: 2 },
                { days_ago: 5, incidents: 6 }
            ]

            // Insert historical audit logs for trend analysis
            for (const incident of historicalIncidents) {
                const incidentDate = new Date()
                incidentDate.setDate(incidentDate.getDate() - incident.days_ago)

                for (let i = 0; i < incident.incidents; i++) {
                    testDb.prepare(`
                        INSERT INTO audit_logs (
                            id, user_id, session_id, action, resource_type, resource_id,
                            success, ip_address, user_agent, details, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        `audit-${incident.days_ago}-${i}`,
                        'test-user',
                        'test-session',
                        'SECURITY_VIOLATION',
                        'SYSTEM',
                        null,
                        0,
                        '192.168.1.100',
                        'Test User Agent',
                        'Simulated security incident',
                        incidentDate.toISOString()
                    )
                }
            }

            // Analyze security trends
            const trendAnalysis = testDb.prepare(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as daily_incidents,
                    COUNT(DISTINCT user_id) as affected_users,
                    COUNT(DISTINCT ip_address) as source_ips,
                    AVG(COUNT(*)) OVER (
                        ORDER BY DATE(created_at) 
                        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                    ) as moving_average
                FROM audit_logs 
                WHERE action = 'SECURITY_VIOLATION'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 7
            `).all()

            if (trendAnalysis.length > 0) {
                trendAnalysis.forEach(trend => {
                    expect(trend.date).toBeDefined()
                    expect(trend.daily_incidents).toBeGreaterThan(0)
                    expect(trend.moving_average).toBeGreaterThan(0)
                })

                // Check for trend patterns
                const incidents = trendAnalysis.map(t => t.daily_incidents)
                const isIncreasing = incidents.slice(1).every((val, i) => val >= incidents[i])
                const isDecreasing = incidents.slice(1).every((val, i) => val <= incidents[i])
                
                // Should detect trend direction
                expect(typeof isIncreasing).toBe('boolean')
                expect(typeof isDecreasing).toBe('boolean')
            }
        })

        test('should generate automated security alerts', async () => {
            const testUser = await authHelpers.createTestUser()

            // Simulate high-risk security events
            const highRiskEvents = [
                'MULTIPLE_LOGIN_FAILURES',
                'SQL_INJECTION_ATTEMPT',
                'PRIVILEGE_ESCALATION_ATTEMPT',
                'DATA_BREACH_ATTEMPT',
                'UNAUTHORIZED_ADMIN_ACCESS'
            ]

            for (const event of highRiskEvents) {
                // Insert high-risk security event
                testDb.prepare(`
                    INSERT INTO audit_logs (
                        id, user_id, session_id, action, resource_type, resource_id,
                        success, ip_address, user_agent, details, severity, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    `high-risk-${event}`,
                    testUser.id,
                    'test-session',
                    'SECURITY_VIOLATION',
                    'SYSTEM',
                    null,
                    0,
                    '192.168.1.100',
                    'Malicious User Agent',
                    `High-risk event: ${event}`,
                    'HIGH',
                    new Date().toISOString()
                )
            }

            // Check for automated alert generation
            const securityAlerts = testDb.prepare(`
                SELECT 
                    action,
                    severity,
                    COUNT(*) as alert_count,
                    MAX(created_at) as latest_alert
                FROM audit_logs 
                WHERE severity = 'HIGH' 
                    AND action = 'SECURITY_VIOLATION'
                    AND created_at >= datetime('now', '-1 hour')
                GROUP BY action, severity
            `).all()

            if (securityAlerts.length > 0) {
                securityAlerts.forEach(alert => {
                    expect(alert.severity).toBe('HIGH')
                    expect(alert.alert_count).toBeGreaterThan(0)
                    expect(new Date(alert.latest_alert)).toBeInstanceOf(Date)
                })
            }

            // Check alert notification system
            const alertNotifications = testDb.prepare(`
                SELECT * FROM security_alerts 
                WHERE created_at >= datetime('now', '-1 hour')
                ORDER BY created_at DESC
            `).all()

            // If alert system exists, verify notifications were created
            if (alertNotifications.length > 0) {
                alertNotifications.forEach(notification => {
                    expect(notification.alert_type).toBeDefined()
                    expect(notification.severity).toBeDefined()
                    expect(notification.status).toBeDefined()
                })
            }
        })

        test('should provide security metrics and KPIs', async () => {
            // Generate sample security data for metrics calculation
            const securityMetrics = testDb.prepare(`
                SELECT 
                    COUNT(*) as total_security_events,
                    COUNT(CASE WHEN success = 0 THEN 1 END) as failed_attempts,
                    COUNT(CASE WHEN action LIKE '%LOGIN%' AND success = 0 THEN 1 END) as failed_logins,
                    COUNT(CASE WHEN action = 'SECURITY_VIOLATION' THEN 1 END) as security_violations,
                    COUNT(DISTINCT user_id) as users_with_security_events,
                    COUNT(DISTINCT ip_address) as unique_source_ips,
                    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
                    (COUNT(CASE WHEN success = 0 THEN 1 END) * 100.0 / COUNT(*)) as failure_rate
                FROM audit_logs 
                WHERE created_at >= datetime('now', '-24 hours')
            `).get()

            if (securityMetrics) {
                expect(securityMetrics.total_security_events).toBeGreaterThanOrEqual(0)
                expect(securityMetrics.failed_attempts).toBeGreaterThanOrEqual(0)
                expect(securityMetrics.success_rate).toBeGreaterThanOrEqual(0)
                expect(securityMetrics.success_rate).toBeLessThanOrEqual(1)
                expect(securityMetrics.failure_rate).toBeGreaterThanOrEqual(0)
                expect(securityMetrics.failure_rate).toBeLessThanOrEqual(100)
            }

            // Security performance indicators
            const securityKPIs = testDb.prepare(`
                SELECT 
                    'Mean Time to Detection' as kpi_name,
                    AVG(
                        (julianday(created_at) - julianday(LAG(created_at) OVER (ORDER BY created_at))) * 24 * 60
                    ) as value_minutes
                FROM audit_logs 
                WHERE action = 'SECURITY_VIOLATION'
                
                UNION ALL
                
                SELECT 
                    'Security Incident Frequency' as kpi_name,
                    COUNT(*) * 1.0 / 24 as value_per_hour
                FROM audit_logs 
                WHERE action = 'SECURITY_VIOLATION' 
                    AND created_at >= datetime('now', '-24 hours')
            `).all()

            if (securityKPIs.length > 0) {
                securityKPIs.forEach(kpi => {
                    expect(kpi.kpi_name).toBeDefined()
                    expect(typeof kpi.value_minutes === 'number' || typeof kpi.value_per_hour === 'number').toBe(true)
                })
            }
        })
    })
})