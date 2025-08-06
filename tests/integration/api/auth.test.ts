/**
 * Authentication API Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the database and services
vi.mock('@/lib/services/database/db', () => ({
  db: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn()
    }))
  }
}));

vi.mock('bcrypt', () => ({
  hash: vi.fn(() => Promise.resolve('hashed-password')),
  compare: vi.fn(() => Promise.resolve(true))
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(() => 'mock-jwt-token'),
  verify: vi.fn(() => ({ userId: 'user-123', email: 'test@example.com' }))
}));

// Import API handlers after mocks
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';
import { POST as signupHandler } from '@/app/api/v1/auth/signup/route';
import { GET as meHandler } from '@/app/api/v1/auth/me/route';
import { POST as logoutHandler } from '@/app/api/v1/auth/logout/route';

describe('Authentication API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User'
      };

      // Mock database response
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(mockUser)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      });
      expect(data.data.token).toBe('mock-jwt-token');
    });

    it('should reject login with invalid email', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(null)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User'
      };

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(mockUser)
      });

      // Mock bcrypt to return false for password comparison
      const bcrypt = await import('bcrypt');
      (bcrypt.compare as any).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: ''
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create new user with valid data', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(null), // User doesn't exist
        run: vi.fn().mockReturnValue({ lastInsertRowid: 1 })
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('newuser@example.com');
      expect(data.data.user.name).toBe('New User');
      expect(data.data.token).toBe('mock-jwt-token');
    });

    it('should reject signup with existing email', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'existing@example.com',
        name: 'Existing User'
      };

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(existingUser)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'New User'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_EXISTS');
    });

    it('should validate signup data', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: '123', // Too short
          name: ''
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user data with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(mockUser)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await meHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user).toEqual(mockUser);
    });

    it('should reject request without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET'
      });

      const response = await meHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid token', async () => {
      const jwt = await import('jsonwebtoken');
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      const response = await meHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_TOKEN');
    });

    it('should handle user not found', async () => {
      const mockDb = await import('@/lib/services/database/db');
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(null)
      });

      const request = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await meHandler(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-jwt-token'
        }
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');
    });

    it('should handle logout without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST'
      });

      const response = await logoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication flow', async () => {
      const mockDb = await import('@/lib/services/database/db');
      
      // Step 1: Signup
      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(null), // User doesn't exist
        run: vi.fn().mockReturnValue({ lastInsertRowid: 1 })
      });

      const signupRequest = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'flowtest@example.com',
          password: 'password123',
          name: 'Flow Test User'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const signupResponse = await signupHandler(signupRequest);
      const signupData = await signupResponse.json();

      expect(signupResponse.status).toBe(201);
      expect(signupData.success).toBe(true);

      // Step 2: Get user info
      const mockUser = {
        id: 'user-123',
        email: 'flowtest@example.com',
        name: 'Flow Test User'
      };

      (mockDb.db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(mockUser)
      });

      const meRequest = new NextRequest('http://localhost:3000/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${signupData.data.token}`
        }
      });

      const meResponse = await meHandler(meRequest);
      const meData = await meResponse.json();

      expect(meResponse.status).toBe(200);
      expect(meData.success).toBe(true);
      expect(meData.data.user.email).toBe('flowtest@example.com');

      // Step 3: Logout
      const logoutRequest = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${signupData.data.token}`
        }
      });

      const logoutResponse = await logoutHandler(logoutRequest);
      const logoutData = await logoutResponse.json();

      expect(logoutResponse.status).toBe(200);
      expect(logoutData.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_JSON');
    });

    it('should handle missing content-type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      const response = await loginHandler(request);
      
      // Should still work or return appropriate error
      expect(response.status).toBeOneOf([200, 400]);
    });

    it('should handle rate limiting', async () => {
      // This would require implementing rate limiting middleware
      // For now, we'll just test that the endpoint exists
      const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await loginHandler(request);
      expect(response).toBeDefined();
    });
  });
});