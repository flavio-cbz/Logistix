import supertest from 'supertest'
import { vi } from 'vitest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

// Authentication test helpers
export class ApiAuthHelpers {
  private apiClient: supertest.SuperTest<supertest.Test>
  private testDb: any

  constructor(apiClient: supertest.SuperTest<supertest.Test>, testDb: any) {
    this.apiClient = apiClient
    this.testDb = testDb
  }

  // Create test user with hashed password
  async createTestUser(userData: Partial<any> = {}) {
    const defaultUser = {
      id: `user-${Date.now()}`,
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    }

    const user = { ...defaultUser, ...userData }
    const hashedPassword = await bcrypt.hash(user.password, 10)

    const stmt = this.testDb.prepare(`
      INSERT INTO users (id, username, email, password, role, profile)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      user.id,
      user.username,
      user.email,
      hashedPassword,
      user.role,
      JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        theme: 'system'
      })
    )

    return { ...user, password: hashedPassword }
  }

  // Create test admin user
  async createTestAdmin(userData: Partial<any> = {}) {
    return this.createTestUser({
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      ...userData
    })
  }

  // Generate JWT token for testing
  generateTestToken(userId: string, role: string = 'user', expiresIn: string = '1h') {
    const payload = {
      userId,
      role,
      iat: Math.floor(Date.now() / 1000)
    }

    return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn })
  }

  // Create session in database
  async createTestSession(userId: string, token?: string) {
    const sessionToken = token || this.generateTestToken(userId)
    const sessionId = `session-${Date.now()}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const stmt = this.testDb.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `)

    stmt.run(sessionId, userId, sessionToken, expiresAt.toISOString())

    return {
      id: sessionId,
      userId,
      token: sessionToken,
      expiresAt
    }
  }

  // Login helper that returns authentication data
  async loginUser(email: string = 'test@example.com', password: string = 'password123') {
    const response = await this.apiClient
      .post('/api/v1/auth/login')
      .send({ email, password })

    if (response.status === 200) {
      return {
        success: true,
        user: response.body.data.user,
        token: response.body.data.token,
        session: response.body.data.session
      }
    }

    return {
      success: false,
      error: response.body.error || 'Login failed'
    }
  }

  // Login as admin helper
  async loginAsAdmin() {
    return this.loginUser('admin@example.com', 'password123')
  }

  // Register new user helper
  async registerUser(userData: Partial<any> = {}) {
    const defaultData = {
      username: `user${Date.now()}`,
      email: `user${Date.now()}@example.com`,
      password: 'password123',
      confirmPassword: 'password123'
    }

    const registrationData = { ...defaultData, ...userData }

    const response = await this.apiClient
      .post('/api/v1/auth/register')
      .send(registrationData)

    if (response.status === 201) {
      return {
        success: true,
        user: response.body.data.user,
        token: response.body.data.token
      }
    }

    return {
      success: false,
      error: response.body.error || 'Registration failed'
    }
  }

  // Logout helper
  async logoutUser(token: string) {
    const response = await this.apiClient
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send()

    return response.status === 200
  }

  // Create authenticated request helpers
  createAuthenticatedRequest(token: string) {
    return {
      get: (url: string) => 
        this.apiClient.get(url).set('Authorization', `Bearer ${token}`),
      post: (url: string) => 
        this.apiClient.post(url).set('Authorization', `Bearer ${token}`),
      put: (url: string) => 
        this.apiClient.put(url).set('Authorization', `Bearer ${token}`),
      patch: (url: string) => 
        this.apiClient.patch(url).set('Authorization', `Bearer ${token}`),
      delete: (url: string) => 
        this.apiClient.delete(url).set('Authorization', `Bearer ${token}`)
    }
  }

  // Validate token helper
  validateToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret')
      return { valid: true, payload: decoded }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  }

  // Check if user exists
  async userExists(email: string) {
    const stmt = this.testDb.prepare('SELECT id FROM users WHERE email = ?')
    const user = stmt.get(email)
    return !!user
  }

  // Get user by email
  async getUserByEmail(email: string) {
    const stmt = this.testDb.prepare('SELECT * FROM users WHERE email = ?')
    return stmt.get(email)
  }

  // Get user by ID
  async getUserById(id: string) {
    const stmt = this.testDb.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(id)
  }

  // Delete user (for cleanup)
  async deleteUser(id: string) {
    const stmt = this.testDb.prepare('DELETE FROM users WHERE id = ?')
    stmt.run(id)
  }

  // Delete session (for cleanup)
  async deleteSession(sessionId: string) {
    const stmt = this.testDb.prepare('DELETE FROM sessions WHERE id = ?')
    stmt.run(sessionId)
  }

  // Clean up all test users
  async cleanupTestUsers() {
    this.testDb.exec('DELETE FROM sessions')
    this.testDb.exec('DELETE FROM users WHERE email LIKE "%@example.com"')
  }

  // Mock authentication middleware
  mockAuthMiddleware(user: any = null, session: any = null) {
    return vi.fn().mockImplementation((req: any, res: any, next: any) => {
      if (user) {
        req.user = user
        req.session = session
      }
      next()
    })
  }

  // Mock failed authentication
  mockFailedAuth() {
    return vi.fn().mockImplementation((req: any, res: any, next: any) => {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    })
  }

  // Mock authorization check
  mockAuthorizationCheck(requiredRole: string = 'user') {
    return vi.fn().mockImplementation((req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      if (req.user.role !== requiredRole && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        })
      }

      next()
    })
  }

  // Test authentication scenarios
  async testAuthenticationScenarios() {
    const scenarios = {
      validLogin: async () => {
        const user = await this.createTestUser()
        return this.loginUser(user.email, 'password123')
      },

      invalidCredentials: async () => {
        return this.loginUser('nonexistent@example.com', 'wrongpassword')
      },

      expiredToken: async () => {
        const user = await this.createTestUser()
        const expiredToken = this.generateTestToken(user.id, user.role, '-1h')
        return this.validateToken(expiredToken)
      },

      invalidToken: async () => {
        return this.validateToken('invalid.token.here')
      },

      missingToken: async () => {
        const response = await this.apiClient
          .get('/api/v1/auth/profile')
          .send()
        
        return response.status === 401
      },

      validTokenAccess: async () => {
        const user = await this.createTestUser()
        const loginResult = await this.loginUser(user.email, 'password123')
        
        if (!loginResult.success) return false

        const response = await this.apiClient
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${loginResult.token}`)
          .send()

        return response.status === 200
      }
    }

    return scenarios
  }

  // Security test helpers
  async testSecurityVulnerabilities() {
    return {
      sqlInjection: async () => {
        const maliciousEmail = "'; DROP TABLE users; --"
        const response = await this.apiClient
          .post('/api/v1/auth/login')
          .send({ email: maliciousEmail, password: 'password' })
        
        // Should not succeed and should not crash the server
        return response.status >= 400
      },

      xssAttempt: async () => {
        const maliciousData = {
          username: '<script>alert("xss")</script>',
          email: 'test@example.com',
          password: 'password123'
        }
        
        const response = await this.apiClient
          .post('/api/v1/auth/register')
          .send(maliciousData)
        
        // Should sanitize input or reject
        return response.status >= 400 || 
               !response.body.data?.user?.username?.includes('<script>')
      },

      bruteForceProtection: async () => {
        const attempts = []
        
        // Attempt multiple failed logins
        for (let i = 0; i < 10; i++) {
          const response = await this.apiClient
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'wrongpassword' })
          
          attempts.push(response.status)
        }
        
        // Should eventually rate limit
        return attempts.some(status => status === 429)
      }
    }
  }
}

// Export helper factory
export function createAuthHelpers(apiClient: supertest.SuperTest<supertest.Test>, testDb: any) {
  return new ApiAuthHelpers(apiClient, testDb)
}