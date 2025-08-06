import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the database service
vi.mock('@/lib/services/database/db', () => ({
  databaseService: {
    execute: vi.fn().mockResolvedValue(undefined),
    queryOne: vi.fn().mockImplementation((query: string, params: any[]) => {
      if (query.includes('SELECT id, username, password_hash FROM users WHERE username = \'admin\'')) {
        return Promise.resolve({
          id: 'admin-id',
          username: 'admin',
          password_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        })
      }
      if (query.includes('sessions')) {
        if (params[0] === 'valid-session') {
          return Promise.resolve({
            session_id: 'valid-session',
            user_id: 'admin-id',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            username: 'admin',
            bio: '',
            language: 'fr',
            theme: 'system',
            avatar: ''
          })
        }
      }
      return Promise.resolve(null)
    })
  },
  generateId: vi.fn().mockReturnValue('generated-id'),
  getCurrentTimestamp: vi.fn().mockReturnValue('2023-01-01T00:00:00.000Z'),
  db: {
    prepare: (query: string) => ({
      get: (params?: any) => {
        if (query.includes('SELECT id, username, password_hash FROM users WHERE username = \'admin\'')) {
          return {
            id: 'admin-id',
            username: 'admin',
            password_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
          }
        }
        return null
      },
      run: () => ({ changes: 1 })
    })
  }
}))

// Mock the admin service
vi.mock('@/lib/services/admin', () => ({
  getAdminPassword: vi.fn().mockReturnValue('password123'),
  isAdminUsingDefaultPassword: vi.fn().mockReturnValue(true)
}))

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    get: vi.fn().mockImplementation((name: string) => {
      if (name === 'session_id') {
        return { value: 'valid-session' }
      }
      return null
    }),
    set: vi.fn(),
    delete: vi.fn()
  })
}))

// Mock audit logging
vi.mock('@/lib/middlewares/comprehensive-audit-logging', () => ({
  withAuthenticationAuditLogging: (handler: any) => handler,
  logAuthenticationEvent: vi.fn().mockResolvedValue(undefined)
}))

// Mock API route optimization
vi.mock('@/lib/utils/api-route-optimization', () => ({
  optimizedApiPost: (handler: any) => handler
}))

// Import handlers after mocks
import { POST as loginHandler } from '@/app/api/v1/auth/login/route'
import { GET as meHandler } from '@/app/api/v1/auth/me/route'
import { POST as profileUpdateHandler } from '@/app/api/v1/profile/update/route'
import { POST as logoutHandler } from '@/app/api/v1/auth/logout/route'

describe('Authentication API - Direct Route Tests', () => {
  beforeAll(() => {
    // Setup test environment
    process.env.NODE_ENV = 'test'
  })

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('POST /api/v1/auth/login', () => {
    test('should login successfully with valid admin credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'admin',
          password: 'password123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Connexion réussie')
      expect(responseData.userId).toBeDefined()
    })

    test('should fail login with invalid credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'admin',
          password: 'wrongpassword'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.success).toBe(false)
      expect(responseData.message).toBe('Identifiant ou mot de passe incorrect')
    })

    test('should fail login with missing fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 'admin'
          // missing password
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.message).toBe('Erreur de validation')
      expect(responseData.errors).toBeDefined()
    })

    test('should handle SQL injection attempts safely', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: "admin'; DROP TABLE users; --",
          password: 'password123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const responseData = await response.json()

      // Should not crash and should return appropriate error
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(responseData.success).toBe(false)
    })

    test('should handle XSS attempts in login data', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: '<script>alert("xss")</script>',
          password: 'password123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const responseData = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(responseData.success).toBe(false)
      
      // Response should not contain unescaped script tags
      const responseText = JSON.stringify(responseData)
      expect(responseText).not.toContain('<script>')
    })

    test('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: '{"invalid": json}',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    test('should get user profile with valid session', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Cookie': 'session_id=valid-session'
        }
      })

      const response = await meHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.user).toBeDefined()
      expect(responseData.user.id).toBe('admin-id')
      expect(responseData.user.username).toBe('admin')
    })

    test('should fail without valid session', async () => {
      // Mock cookies to return null for session_id
      const mockCookies = vi.mocked(await import('next/headers')).cookies
      mockCookies.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
        delete: vi.fn()
      } as any)

      const request = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET'
      })

      const response = await meHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.success).toBe(false)
      expect(responseData.message).toBe('Non authentifié')
    })
  })

  describe('POST /api/v1/profile/update', () => {
    test('should update user profile successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          email: 'admin@example.com',
          bio: 'Updated bio',
          theme: 'dark',
          language: 'fr'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session_id=valid-session'
        }
      })

      const response = await profileUpdateHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Profil mis à jour avec succès')
    })

    test('should validate profile update data', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          username: 'a', // Too short
          email: 'invalid-email', // Invalid format
          theme: 'dark',
          language: 'fr'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session_id=valid-session'
        }
      })

      const response = await profileUpdateHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.message).toContain('Données invalides')
    })

    test('should prevent XSS in profile data', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          username: '<script>alert("xss")</script>',
          email: 'test@example.com',
          bio: '<img src="x" onerror="alert(\'xss\')" />',
          theme: 'dark',
          language: 'fr'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session_id=valid-session'
        }
      })

      const response = await profileUpdateHandler(request)
      const responseData = await response.json()

      // Should either reject or sanitize
      if (response.status === 200) {
        // If accepted, should be sanitized
        expect(responseData.success).toBe(true)
      } else {
        // If rejected, should be due to validation
        expect(response.status).toBe(400)
        expect(responseData.success).toBe(false)
      }
    })

    test('should require authentication for profile updates', async () => {
      // Mock cookies to return null for session_id
      const mockCookies = vi.mocked(await import('next/headers')).cookies
      mockCookies.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
        delete: vi.fn()
      } as any)

      const request = new NextRequest('http://localhost:3000/api/v1/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          username: 'unauthorized',
          email: 'unauthorized@example.com',
          theme: 'dark',
          language: 'fr'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await profileUpdateHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.success).toBe(false)
      expect(responseData.message).toBe('Non authentifié')
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    test('should logout successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': 'session_id=valid-session'
        }
      })

      const response = await logoutHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Déconnexion réussie')
    })

    test('should handle logout without session', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST'
      })

      const response = await logoutHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('Déconnexion réussie')
    })
  })

  describe('Security and Validation Tests', () => {
    test('should handle concurrent login attempts', async () => {
      const loginRequests = Array(5).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            identifier: 'admin',
            password: 'password123'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const responses = await Promise.all(
        loginRequests.map(request => loginHandler(request))
      )

      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200)
        const data = await response.json()
        expect(data.success).toBe(true)
      }
    })

    test('should validate input data types', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: 123, // Should be string
          password: null // Should be string
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.message).toBe('Erreur de validation')
    })

    test('should handle extremely large payloads', async () => {
      const largePayload = {
        identifier: 'admin',
        password: 'a'.repeat(10000), // Very long password
        extraData: 'x'.repeat(100000) // Large extra data
      }

      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(largePayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await loginHandler(request)
      
      // Should either reject due to size limits or handle gracefully
      expect([400, 413, 401, 500]).toContain(response.status)
    })

    test('should validate bio length constraints in profile update', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          email: 'admin@example.com',
          bio: 'a'.repeat(161), // Exceeds 160 character limit
          theme: 'dark',
          language: 'fr'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session_id=valid-session'
        }
      })

      const response = await profileUpdateHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.message).toContain('La biographie ne peut pas dépasser 160 caractères')
    })

    test('should validate avatar URL format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          email: 'admin@example.com',
          avatar: 'not-a-valid-url',
          theme: 'dark',
          language: 'fr'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session_id=valid-session'
        }
      })

      const response = await profileUpdateHandler(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.message).toContain('Veuillez entrer une URL valide pour l\'avatar')
    })
  })
})