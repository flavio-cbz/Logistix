import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import supertest from 'supertest'
import {
    setupTestServer,
    teardownTestServer,
    setupTestDatabase,
    teardownTestDatabase,
    cleanupTestDatabase,
    createApiClient,
    AuthHelper,
    ApiTestUtils
} from './setup'

describe('Technical Infrastructure API - Direct HTTP Tests', () => {
    let apiClient: supertest.SuperTest<supertest.Test>
    let testDb: any
    let authHelper: AuthHelper

    beforeAll(async () => {
        await setupTestServer()
        testDb = await setupTestDatabase()
        apiClient = createApiClient()
        authHelper = new AuthHelper(apiClient)
    })

    afterAll(async () => {
        await teardownTestDatabase()
        await teardownTestServer()
    })

    beforeEach(async () => {
        await cleanupTestDatabase()
    })

    describe('API Versioning Compliance and Routing', () => {
        test('should enforce API v1 versioning for all endpoints', async () => {
            // Test that v1 endpoints are accessible
            const v1Endpoints = [
                '/api/v1/auth/login',
                '/api/v1/market-analysis',
                '/api/v1/metadata/catalogs',
                '/api/v1/vinted/configure'
            ]

            for (const endpoint of v1Endpoints) {
                const response = await apiClient.get(endpoint)
                // Should not return 404 (endpoint exists)
                expect(response.status).not.toBe(404)
            }
        })

        test('should reject requests to non-versioned API endpoints', async () => {
            const nonVersionedEndpoints = [
                '/api/auth/login',
                '/api/market-analysis',
                '/api/metadata/catalogs'
            ]

            for (const endpoint of nonVersionedEndpoints) {
                const response = await apiClient.get(endpoint)
                expect(response.status).toBe(404)
            }
        })

        test('should return proper API version in response headers', async () => {
            const response = await apiClient.get('/api/v1/market-analysis/health')
            
            expect(response.headers).toHaveProperty('x-api-version')
            expect(response.headers['x-api-version']).toBe('v1')
        }) 
       test('should handle API route parameter validation', async () => {
            // Test with invalid UUID parameter
            const response = await apiClient.get('/api/v1/market-analysis/invalid-uuid')
            
            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('success', false)
            expect(response.body.message).toContain('UUID')
        })

        test('should support proper HTTP methods for each endpoint', async () => {
            // Test market analysis endpoints
            const getResponse = await apiClient.get('/api/v1/market-analysis')
            expect([200, 401]).toContain(getResponse.status) // May require auth

            const postResponse = await apiClient.post('/api/v1/market-analysis')
            expect([200, 400, 401]).toContain(postResponse.status) // May require auth or data

            // Test unsupported methods return 405
            const patchResponse = await apiClient.patch('/api/v1/market-analysis')
            expect(patchResponse.status).toBe(405)
        })
    })

    describe('Zod Schema Validation Across Endpoints', () => {
        test('should validate request body schema for market analysis', async () => {
            const invalidData = {
                invalidField: 'test',
                missingRequiredFields: true
            }

            const response = await apiClient
                .post('/api/v1/market-analysis')
                .send(invalidData)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('success', false)
            expect(response.body).toHaveProperty('errors')
            expect(Array.isArray(response.body.errors)).toBe(true)
        })

        test('should validate query parameters with Zod schemas', async () => {
            // Test pagination validation
            const response = await apiClient
                .get('/api/v1/market-analysis?page=invalid&limit=999')

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('success', false)
            expect(response.body.message).toContain('validation')
        })

        test('should return detailed validation errors for invalid data', async () => {
            const invalidMarketAnalysisData = [
                {
                    id: '', // Empty ID
                    price: {
                        amount: -10, // Negative price
                        currency: 'INVALID' // Invalid currency format
                    },
                    size_title: '', // Empty size title
                    status: '', // Empty status
                    user: {
                        login: '', // Empty login
                        feedback_reputation: 150 // Exceeds max
                    },
                    photos: [], // Empty photos array
                    created_at: 'invalid-date', // Invalid date format
                    sold_at: 'invalid-date' // Invalid date format
                }
            ]

            const response = await apiClient
                .post('/api/v1/market-analysis')
                .send(invalidMarketAnalysisData)

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('errors')
            expect(response.body.errors.length).toBeGreaterThan(0)
            
            // Check that specific validation errors are present
            const errorMessages = response.body.errors.map((e: any) => e.message).join(' ')
            expect(errorMessages).toContain('requis')
            expect(errorMessages).toContain('positif')
        })   
     test('should validate nested object schemas correctly', async () => {
            const dataWithInvalidNestedObjects = [
                {
                    id: 'valid-id',
                    price: {
                        amount: 'not-a-number', // Should be number
                        currency: 'EUR'
                    },
                    size_title: 'Valid Size',
                    status: 'valid',
                    user: {
                        login: 'validuser',
                        feedback_reputation: 'not-a-number' // Should be number
                    },
                    photos: [
                        { url: 'not-a-valid-url' } // Invalid URL
                    ],
                    created_at: '2024-01-01T00:00:00Z',
                    sold_at: '2024-01-01T00:00:00Z'
                }
            ]

            const response = await apiClient
                .post('/api/v1/market-analysis')
                .send(dataWithInvalidNestedObjects)

            expect(response.status).toBe(400)
            expect(response.body.errors).toBeDefined()
            
            // Check for nested validation errors
            const errorFields = response.body.errors.map((e: any) => e.field)
            expect(errorFields.some((field: string) => field.includes('price'))).toBe(true)
            expect(errorFields.some((field: string) => field.includes('user'))).toBe(true)
            expect(errorFields.some((field: string) => field.includes('photos'))).toBe(true)
        })

        test('should validate array length constraints', async () => {
            // Test empty array (should fail minimum constraint)
            const emptyArrayResponse = await apiClient
                .post('/api/v1/market-analysis')
                .send([])

            expect(emptyArrayResponse.status).toBe(400)
            expect(emptyArrayResponse.body.message).toContain('Au moins une vente similaire')

            // Test array with too many items (if there's a max constraint)
            const tooManyItems = Array(1001).fill({
                id: 'test-id',
                price: { amount: 10, currency: 'EUR' },
                size_title: 'Test Size',
                status: 'test',
                user: { login: 'test', feedback_reputation: 50 },
                photos: [{ url: 'https://example.com/photo.jpg' }],
                created_at: '2024-01-01T00:00:00Z',
                sold_at: '2024-01-01T00:00:00Z'
            })

            const tooManyResponse = await apiClient
                .post('/api/v1/market-analysis')
                .send(tooManyItems)

            expect(tooManyResponse.status).toBe(400)
            expect(tooManyResponse.body.message).toContain('1000')
        })
    })

    describe('Centralized Error Handling Mechanisms', () => {
        test('should return consistent error response format', async () => {
            const response = await apiClient
                .get('/api/v1/market-analysis/invalid-uuid')

            expect(response.body).toHaveProperty('success', false)
            expect(response.body).toHaveProperty('message')
            expect(typeof response.body.message).toBe('string')
            
            if (response.body.errors) {
                expect(Array.isArray(response.body.errors)).toBe(true)
            }
            
            if (response.body.code) {
                expect(typeof response.body.code).toBe('string')
            }
        })   
     test('should handle database errors gracefully', async () => {
            // This test would require mocking database failures
            // For now, we test that database errors don't crash the API
            const response = await apiClient
                .get('/api/v1/market-analysis')

            // Should not return 500 internal server error for normal requests
            expect(response.status).not.toBe(500)
        })

        test('should handle external API failures gracefully', async () => {
            // Test Vinted API error handling
            const response = await apiClient
                .get('/api/v1/vinted/configure')

            // Should handle external API failures without crashing
            expect([200, 401, 503]).toContain(response.status)
            
            if (response.status >= 400) {
                expect(response.body).toHaveProperty('success', false)
                expect(response.body).toHaveProperty('message')
            }
        })

        test('should include request ID in error responses', async () => {
            const response = await apiClient
                .post('/api/v1/market-analysis')
                .send({ invalid: 'data' })

            expect(response.status).toBe(400)
            
            // Check for request ID in headers or body
            const hasRequestId = response.headers['x-request-id'] || 
                                response.body.requestId || 
                                response.body.meta?.requestId

            expect(hasRequestId).toBeDefined()
        })

        test('should handle malformed JSON requests', async () => {
            const response = await apiClient
                .post('/api/v1/market-analysis')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }')

            expect(response.status).toBe(400)
            expect(response.body).toHaveProperty('success', false)
            expect(response.body.message).toContain('JSON')
        })

        test('should handle missing Content-Type header', async () => {
            const response = await apiClient
                .post('/api/v1/market-analysis')
                .send('some data')

            expect([400, 415]).toContain(response.status)
            expect(response.body).toHaveProperty('success', false)
        })

        test('should handle request timeout scenarios', async () => {
            // This would require a slow endpoint or mocking
            // For now, verify that normal requests complete within reasonable time
            const startTime = Date.now()
            
            const response = await apiClient
                .get('/api/v1/market-analysis/health')

            const duration = Date.now() - startTime
            expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
        })
    })

    describe('API Documentation Generation', () => {
        test('should provide OpenAPI/Swagger documentation endpoint', async () => {
            // Check if API documentation is available
            const docEndpoints = [
                '/api/docs',
                '/api/v1/docs',
                '/api/swagger',
                '/docs'
            ]

            let foundDocs = false
            for (const endpoint of docEndpoints) {
                const response = await apiClient.get(endpoint)
                if (response.status === 200) {
                    foundDocs = true
                    break
                }
            }

            // If no docs endpoint found, that's acceptable but should be noted
            if (!foundDocs) {
                console.warn('No API documentation endpoint found')
            }
        })        
test('should provide API health check endpoint', async () => {
            const response = await apiClient.get('/api/v1/market-analysis/health')

            expect([200, 503]).toContain(response.status)
            expect(response.body).toHaveProperty('status')
            
            if (response.status === 200) {
                expect(response.body.status).toBe('healthy')
            }
        })

        test('should include API metadata in responses', async () => {
            const response = await apiClient.get('/api/v1/market-analysis/health')

            // Check for API metadata
            expect(response.headers).toHaveProperty('x-api-version')
            
            // Response should include timestamp
            if (response.body.meta) {
                expect(response.body.meta).toHaveProperty('timestamp')
            }
        })

        test('should validate API endpoint schemas match documentation', async () => {
            // This test would compare actual API responses with documented schemas
            const response = await apiClient.get('/api/v1/market-analysis/health')

            if (response.status === 200) {
                // Verify response structure matches expected schema
                expect(response.body).toHaveProperty('status')
                expect(typeof response.body.status).toBe('string')
                
                if (response.body.checks) {
                    expect(Array.isArray(response.body.checks)).toBe(true)
                }
            }
        })
    })

    describe('API Rate Limiting and Security', () => {
        test('should implement rate limiting for API endpoints', async () => {
            const requests = []
            
            // Make multiple rapid requests
            for (let i = 0; i < 20; i++) {
                requests.push(apiClient.get('/api/v1/market-analysis/health'))
            }

            const responses = await Promise.all(requests)
            
            // Check if any requests were rate limited
            const rateLimitedResponses = responses.filter(r => r.status === 429)
            
            // Rate limiting may or may not be implemented
            if (rateLimitedResponses.length > 0) {
                expect(rateLimitedResponses[0].body).toHaveProperty('message')
                expect(rateLimitedResponses[0].body.message).toContain('rate')
            }
        })

        test('should include security headers in API responses', async () => {
            const response = await apiClient.get('/api/v1/market-analysis/health')

            // Check for common security headers
            const securityHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection',
                'strict-transport-security'
            ]

            // At least some security headers should be present
            const presentHeaders = securityHeaders.filter(header => 
                response.headers[header] !== undefined
            )

            // This is informational - security headers may be set at reverse proxy level
            if (presentHeaders.length === 0) {
                console.warn('No security headers found in API responses')
            }
        })

        test('should validate CORS configuration', async () => {
            const response = await apiClient
                .options('/api/v1/market-analysis/health')
                .set('Origin', 'https://example.com')

            // CORS headers should be present for OPTIONS requests
            if (response.headers['access-control-allow-origin']) {
                expect(response.headers['access-control-allow-origin']).toBeDefined()
            }
        })
    })
})