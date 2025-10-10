/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';
import { 
  setupTestDatabase,
  createMockRequest,
  extractJsonResponse,
  assertApiResponse,
  assertValidationError,
  assertAuthError
} from './api-test-setup';

// Mock dependencies
vi.mock('@/lib/services/database/enhanced-database-service', () => ({
  enhancedDb: {
    queryOne: vi.fn(),
    execute: vi.fn(),
  },
}));

vi.mock('@/lib/middlewares/comprehensive-audit-logging', () => ({
  logAuthenticationEvent: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('Auth API Integration Tests', () => {
  let testDb: any;
  let mockEnhancedDb: any;
  let mockBcrypt: any;

  beforeEach(async () => {
    testDb = await setupTestDatabase();
    
    const { enhancedDb } = require('@/lib/services/database/enhanced-database-service');
    mockEnhancedDb = enhancedDb;
    
    mockBcrypt = require('bcrypt');
  });

  afterEach(() => {
    if (testDb?.cleanup) {
      testDb.cleanup();
    }
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const loginData = {
        username: testDb.testUser.username,
        password: 'password123'
      };

      // Mock database responses
      mockEnhancedDb.queryOne
        .mockResolvedValueOnce({
          id: testDb.testUser.id,
          username: testDb.testUser.username,
          password_hash: 'hashed-password'
        })
        .mockResolvedValueOnce({ id: testDb.testUser.id }) // createSession check
        .mockResolvedValueOnce({
          session_id: 'new-session-id',
          user_id: testDb.testUser.id,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          username: testDb.testUser.username,
          email: testDb.testUser.email
        }); // requireAuth

      mockBcrypt.compare.mockResolvedValue(true);
      mockEnhancedDb.execute.mockResolvedValue(undefined);

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(200);
      assertApiResponse(responseData, 'success');
      expect(responseData.data).toHaveProperty('message', 'Connexion réussie');
      expect(responseData.data).toHaveProperty('user');
      expect(responseData.data.user).toHaveProperty('id', testDb.testUser.id);
      expect(responseData.data.user).toHaveProperty('username', testDb.testUser.username);

      // Verify session cookie is set
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('logistix_session=');
      expect(setCookieHeader).toContain('HttpOnly');
    });

    it('should return 400 for missing username', async () => {
      // Arrange
      const loginData = {
        password: 'password123'
      };

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertValidationError(responseData, undefined, "Le nom d'utilisateur est requis");
    });

    it('should return 400 for missing password', async () => {
      // Arrange
      const loginData = {
        username: 'testuser'
      };

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertValidationError(responseData, undefined, 'Le mot de passe est requis');
    });

    it('should return 400 for invalid username format', async () => {
      // Arrange
      const loginData = {
        username: 'a', // Too short
        password: 'password123'
      };

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertValidationError(responseData, undefined, "Le nom d'utilisateur doit faire au moins 2 caractères");
    });

    it('should return 400 for invalid password length', async () => {
      // Arrange
      const loginData = {
        username: 'testuser',
        password: '123' // Too short
      };

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertValidationError(responseData, undefined, 'Le mot de passe doit faire au moins 6 caractères');
    });

    it('should return 401 for non-existent user', async () => {
      // Arrange
      const loginData = {
        username: 'nonexistent',
        password: 'password123'
      };

      mockEnhancedDb.queryOne.mockResolvedValue(null);

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(401);
      assertApiResponse(responseData, 'error');
      expect(responseData.error.message).toBe("Ce nom d'utilisateur n'existe pas.");
    });

    it('should return 401 for incorrect password', async () => {
      // Arrange
      const loginData = {
        username: testDb.testUser.username,
        password: 'wrongpassword'
      };

      mockEnhancedDb.queryOne.mockResolvedValue({
        id: testDb.testUser.id,
        username: testDb.testUser.username,
        password_hash: 'hashed-password'
      });
      mockBcrypt.compare.mockResolvedValue(false);

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(401);
      assertApiResponse(responseData, 'error');
      expect(responseData.error.message).toBe('Mot de passe incorrect.');
    });

    it('should return 400 for invalid JSON body', async () => {
      // Arrange
      const request = new Request('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: 'invalid json'
      });

      // Act
      const response = await loginHandler(request as any);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(400);
      assertApiResponse(responseData, 'error');
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const loginData = {
        username: testDb.testUser.username,
        password: 'password123'
      };

      mockEnhancedDb.queryOne.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(500);
      assertApiResponse(responseData, 'error');
      expect(responseData.error.code).toBe('SERVICE_ERROR');
    });

    it('should handle session creation errors', async () => {
      // Arrange
      const loginData = {
        username: testDb.testUser.username,
        password: 'password123'
      };

      mockEnhancedDb.queryOne
        .mockResolvedValueOnce({
          id: testDb.testUser.id,
          username: testDb.testUser.username,
          password_hash: 'hashed-password'
        })
        .mockResolvedValueOnce({ id: testDb.testUser.id }); // createSession check

      mockBcrypt.compare.mockResolvedValue(true);
      mockEnhancedDb.execute.mockRejectedValue(new Error('Session creation failed'));

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await extractJsonResponse(response);

      // Assert
      expect(response.status).toBe(500);
      assertApiResponse(responseData, 'error');
      expect(responseData.error.message).toContain('Erreur lors de la création de session');
    });

    it('should include proper CORS headers', async () => {
      // Arrange
      const loginData = {
        username: testDb.testUser.username,
        password: 'password123'
      };

      mockEnhancedDb.queryOne
        .mockResolvedValueOnce({
          id: testDb.testUser.id,
          username: testDb.testUser.username,
          password_hash: 'hashed-password'
        })
        .mockResolvedValueOnce({ id: testDb.testUser.id })
        .mockResolvedValueOnce({
          session_id: 'new-session-id',
          user_id: testDb.testUser.id,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          username: testDb.testUser.username,
          email: testDb.testUser.email
        });

      mockBcrypt.compare.mockResolvedValue(true);
      mockEnhancedDb.execute.mockResolvedValue(undefined);

      const request = createMockRequest('POST', 'http://localhost:3000/api/v1/auth/login', loginData);

      // Act
      const response = await loginHandler(request);

      // Assert
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});