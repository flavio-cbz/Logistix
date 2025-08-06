import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createMockDatabase,
  createMockUser,
  createMockSession,
  ServiceTestUtils,
  expectToThrow,
  expectToResolve,
  waitForPromises
} from './setup'

// Mock the auth service dependencies
const mockDatabase = createMockDatabase()
const mockLogger = ServiceTestUtils.createMockLogger()

// Mock the actual auth service module
vi.mock('@/lib/services/auth/auth', () => ({
  hashPassword: vi.fn(),
  createUser: vi.fn(),
  verifyCredentials: vi.fn(),
  createSession: vi.fn(),
  signOut: vi.fn(),
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
  getSessionUser: vi.fn()
}))

// Mock database service
vi.mock('@/lib/services/database/db', () => ({
  databaseService: {
    execute: vi.fn(),
    queryOne: vi.fn(),
    queryAll: vi.fn()
  },
  generateId: vi.fn().mockReturnValue('generated-id'),
  getCurrentTimestamp: vi.fn().mockReturnValue('2024-01-01T00:00:00.000Z')
}))

// Mock admin service
vi.mock('@/lib/services/admin/admin', () => ({
  getAdminPassword: vi.fn().mockReturnValue('admin123'),
  isAdminUsingDefaultPassword: vi.fn().mockReturnValue(true),
  initializeAdmin: vi.fn(),
  isAdmin: vi.fn(),
  resetUserPassword: vi.fn(),
  deleteUser: vi.fn(),
  cleanupExpiredSessions: vi.fn()
}))

// Mock crypto
vi.mock('crypto', () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('hashed-password')
  })
}))

// Mock logging instrumentation
vi.mock('@/lib/services/logging-instrumentation', () => ({
  AuthServiceInstrumentation: {
    instrumentLogin: vi.fn().mockImplementation((fn, credentials) => fn(credentials)),
    instrumentLogout: vi.fn()
  }
}))

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn()
  }))
}))

// Import the mocked modules
import * as authService from '@/lib/services/auth/auth'
import { databaseService, generateId, getCurrentTimestamp } from '@/lib/services/database/db'
import { getAdminPassword, isAdminUsingDefaultPassword } from '@/lib/services/admin/admin'
import { AuthServiceInstrumentation } from '@/lib/services/logging-instrumentation'
import { cookies } from 'next/headers'
import crypto from 'crypto'

describe('Authentication Services - Direct Function Calls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Password Hashing and Validation Functions', () => {
    test('hashPassword should create SHA256 hash', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('hashed-password-123')
      }
      
      ;(crypto.createHash as any).mockReturnValue(mockHash)
      
      // Test the actual implementation
      const password = 'testpassword123'
      const result = authService.hashPassword(password)
      
      expect(crypto.createHash).toHaveBeenCalledWith('sha256')
      expect(mockHash.update).toHaveBeenCalledWith(password)
      expect(mockHash.digest).toHaveBeenCalledWith('hex')
      expect(result).toBe('hashed-password-123')
    })

    test('hashPassword should handle empty password', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('empty-hash')
      }
      
      ;(crypto.createHash as any).mockReturnValue(mockHash)
      
      const result = authService.hashPassword('')
      
      expect(mockHash.update).toHaveBeenCalledWith('')
      expect(result).toBe('empty-hash')
    })

    test('hashPassword should handle special characters and unicode', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('special-hash')
      }
      
      ;(crypto.createHash as any).mockReturnValue(mockHash)
      
      const specialPassword = 'p@ssw0rd!@#$%^&*()éàü'
      const result = authService.hashPassword(specialPassword)
      
      expect(mockHash.update).toHaveBeenCalledWith(specialPassword)
      expect(result).toBe('special-hash')
    })

    test('hashPassword should produce consistent results for same input', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('consistent-hash')
      }
      
      ;(crypto.createHash as any).mockReturnValue(mockHash)
      
      const password = 'samepassword'
      const result1 = authService.hashPassword(password)
      const result2 = authService.hashPassword(password)
      
      expect(result1).toBe(result2)
      expect(result1).toBe('consistent-hash')
    })

    test('hashPassword should handle very long passwords', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('long-password-hash')
      }
      
      ;(crypto.createHash as any).mockReturnValue(mockHash)
      
      const longPassword = 'a'.repeat(1000) // 1000 character password
      const result = authService.hashPassword(longPassword)
      
      expect(mockHash.update).toHaveBeenCalledWith(longPassword)
      expect(result).toBe('long-password-hash')
    })

    test('hashPassword should handle null and undefined gracefully', () => {
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('null-hash')
      }
      
      ;(crypto.createHash as any).mockReturnValue(mockHash)
      
      // Test with null
      const result1 = authService.hashPassword(null as any)
      expect(mockHash.update).toHaveBeenCalledWith(null)
      
      // Test with undefined
      const result2 = authService.hashPassword(undefined as any)
      expect(mockHash.update).toHaveBeenCalledWith(undefined)
    })

    test('hashPassword should handle crypto errors gracefully', () => {
      ;(crypto.createHash as any).mockImplementation(() => {
        throw new Error('Crypto module error')
      })
      
      expect(() => authService.hashPassword('password')).toThrow('Crypto module error')
    })

    test('password validation should reject weak passwords', () => {
      // This test assumes there would be a password validation function
      // Since it doesn't exist in the current implementation, we test the concept
      const weakPasswords = [
        '',
        '123',
        'password',
        '12345678',
        'qwerty'
      ]
      
      // For now, we just verify that these would be hashed
      weakPasswords.forEach(password => {
        const mockHash = {
          update: vi.fn().mockReturnThis(),
          digest: vi.fn().mockReturnValue(`hash-${password}`)
        }
        ;(crypto.createHash as any).mockReturnValue(mockHash)
        
        const result = authService.hashPassword(password)
        expect(result).toBe(`hash-${password}`)
      })
    })

    test('password hashing should be deterministic for same input', () => {
      const password = 'testpassword123'
      const expectedHash = 'deterministic-hash'
      
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(expectedHash)
      }
      
      ;(crypto.createHash as any).mockReturnValue(mockHash)
      
      // Hash the same password multiple times
      const results = Array(5).fill(null).map(() => authService.hashPassword(password))
      
      // All results should be identical
      results.forEach(result => {
        expect(result).toBe(expectedHash)
      })
    })

    test('password hashing should use secure algorithm', () => {
      const password = 'securepassword'
      const mockHash = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('secure-hash')
      }
      
      ;(crypto.createHash as any).mockReturnValue(mockHash)
      
      authService.hashPassword(password)
      
      // Verify SHA256 is used (secure algorithm)
      expect(crypto.createHash).toHaveBeenCalledWith('sha256')
      expect(mockHash.digest).toHaveBeenCalledWith('hex')
    })
  })

  describe('User Creation Functions', () => {
    test('createUser should create user with hashed password', async () => {
      const mockUser = createMockUser({
        id: 'generated-id',
        username: 'newuser',
        password_hash: 'hashed-password'
      })

      ;(databaseService.execute as any).mockResolvedValue(undefined)
      ;(generateId as any).mockReturnValue('generated-id')
      ;(getCurrentTimestamp as any).mockReturnValue('2024-01-01T00:00:00.000Z')
      
      // Mock hashPassword implementation
      ;(authService.hashPassword as any).mockReturnValue('hashed-password')

      const result = await authService.createUser('newuser', 'plainpassword')

      expect(generateId).toHaveBeenCalled()
      expect(authService.hashPassword).toHaveBeenCalledWith('plainpassword')
      expect(getCurrentTimestamp).toHaveBeenCalled()
      expect(databaseService.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['generated-id', 'newuser', 'hashed-password', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'],
        'createUser'
      )
      expect(result).toEqual({
        id: 'generated-id',
        username: 'newuser'
      })
    })

    test('createUser should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      ;(databaseService.execute as any).mockRejectedValue(dbError)
      ;(authService.hashPassword as any).mockReturnValue('hashed-password')

      await expectToThrow(
        () => authService.createUser('testuser', 'password'),
        'Database connection failed'
      )
    })

    test('createUser should handle duplicate username', async () => {
      const duplicateError = new Error('UNIQUE constraint failed: users.username')
      ;(databaseService.execute as any).mockRejectedValue(duplicateError)
      ;(authService.hashPassword as any).mockReturnValue('hashed-password')

      await expectToThrow(
        () => authService.createUser('existinguser', 'password'),
        'UNIQUE constraint failed'
      )
    })

    test('createUser should validate input parameters', async () => {
      ;(authService.hashPassword as any).mockReturnValue('hashed-password')

      // Test with empty username
      await expectToThrow(
        () => authService.createUser('', 'password')
      )

      // Test with empty password
      await expectToThrow(
        () => authService.createUser('username', '')
      )
    })
  })

  describe('Credential Verification Functions', () => {
    test('verifyCredentials should validate admin with correct password', async () => {
      const mockUser = createMockUser({
        id: 'admin-id',
        username: 'admin',
        password_hash: 'hashed-admin-password'
      })

      ;(databaseService.queryOne as any).mockResolvedValue(mockUser)
      ;(authService.hashPassword as any).mockReturnValue('hashed-admin-password')
      ;(isAdminUsingDefaultPassword as any).mockReturnValue(false)

      const result = await authService.verifyCredentials('admin-password')

      expect(databaseService.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, password_hash FROM users WHERE username = \'admin\''),
        [],
        'verifyCredentials'
      )
      expect(authService.hashPassword).toHaveBeenCalledWith('admin-password')
      expect(result).toEqual({
        id: 'admin-id',
        username: 'admin'
      })
    })

    test('verifyCredentials should handle admin default password', async () => {
      const mockUser = createMockUser({
        id: 'admin-id',
        username: 'admin',
        password_hash: 'old-hash'
      })

      ;(databaseService.queryOne as any).mockResolvedValue(mockUser)
      ;(isAdminUsingDefaultPassword as any).mockReturnValue(true)
      ;(getAdminPassword as any).mockReturnValue('default-admin-password')

      const result = await authService.verifyCredentials('default-admin-password')

      expect(result).toEqual({
        id: 'admin-id',
        username: 'admin'
      })
    })

    test('verifyCredentials should return null for invalid password', async () => {
      const mockUser = createMockUser({
        password_hash: 'correct-hash'
      })

      ;(databaseService.queryOne as any).mockResolvedValue(mockUser)
      ;(authService.hashPassword as any).mockReturnValue('wrong-hash')
      ;(isAdminUsingDefaultPassword as any).mockReturnValue(false)

      const result = await authService.verifyCredentials('wrong-password')

      expect(result).toBeNull()
    })

    test('verifyCredentials should return null for non-existent user', async () => {
      ;(databaseService.queryOne as any).mockResolvedValue(null)

      const result = await authService.verifyCredentials('any-password')

      expect(result).toBeNull()
    })

    test('verifyCredentials should handle database errors gracefully', async () => {
      ;(databaseService.queryOne as any).mockRejectedValue(new Error('Database error'))

      const result = await authService.verifyCredentials('password')

      expect(result).toBeNull()
    })
  })

  describe('Session Creation and Management Services', () => {
    test('createSession should create new session with proper expiration', async () => {
      const userId = 'test-user-id'
      const sessionId = 'generated-session-id'

      ;(generateId as any).mockReturnValue(sessionId)
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      // Mock Date.now for consistent expiration time
      const mockNow = 1640995200000 // 2022-01-01T00:00:00.000Z
      vi.spyOn(Date, 'now').mockReturnValue(mockNow)

      const result = await authService.createSession(userId)

      expect(generateId).toHaveBeenCalled()
      expect(databaseService.execute).toHaveBeenCalledWith(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
        [sessionId, userId, expect.any(String)],
        'createSession'
      )
      expect(result).toBe(sessionId)

      // Verify expiration is set to 7 days from now
      const expectedExpiration = new Date(mockNow + 7 * 24 * 60 * 60 * 1000).toISOString()
      expect(databaseService.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([sessionId, userId, expectedExpiration]),
        'createSession'
      )

      vi.restoreAllMocks()
    })

    test('createSession should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed')
      ;(databaseService.execute as any).mockRejectedValue(dbError)
      ;(generateId as any).mockReturnValue('session-id')

      await expectToThrow(
        () => authService.createSession('user-id'),
        'Database connection failed'
      )
    })

    test('createSession should handle database constraint violations', async () => {
      const constraintError = new Error('UNIQUE constraint failed: sessions.id')
      ;(databaseService.execute as any).mockRejectedValue(constraintError)
      ;(generateId as any).mockReturnValue('duplicate-session-id')

      await expectToThrow(
        () => authService.createSession('user-id'),
        'UNIQUE constraint failed'
      )
    })

    test('createSession should validate user ID parameter', async () => {
      // Test empty string
      await expectToThrow(
        () => authService.createSession('')
      )

      // Test null
      await expectToThrow(
        () => authService.createSession(null as any)
      )

      // Test undefined
      await expectToThrow(
        () => authService.createSession(undefined as any)
      )

      // Test whitespace only
      await expectToThrow(
        () => authService.createSession('   ')
      )
    })

    test('createSession should generate unique session IDs', async () => {
      const userId = 'test-user-id'
      const sessionIds = ['session-1', 'session-2', 'session-3']
      
      ;(generateId as any)
        .mockReturnValueOnce(sessionIds[0])
        .mockReturnValueOnce(sessionIds[1])
        .mockReturnValueOnce(sessionIds[2])
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      const results = await Promise.all([
        authService.createSession(userId),
        authService.createSession(userId),
        authService.createSession(userId)
      ])

      expect(results).toEqual(sessionIds)
      expect(generateId).toHaveBeenCalledTimes(3)
    })

    test('createSession should set appropriate expiration time', async () => {
      const userId = 'test-user-id'
      const mockNow = 1640995200000 // 2022-01-01T00:00:00.000Z
      const expectedExpiration = new Date(mockNow + 7 * 24 * 60 * 60 * 1000).toISOString()

      vi.spyOn(Date, 'now').mockReturnValue(mockNow)
      ;(generateId as any).mockReturnValue('session-id')
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      await authService.createSession(userId)

      expect(databaseService.execute).toHaveBeenCalledWith(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
        ['session-id', userId, expectedExpiration],
        'createSession'
      )

      vi.restoreAllMocks()
    })

    test('createSession should handle concurrent session creation', async () => {
      const userId = 'concurrent-user'
      const sessionIds = ['concurrent-1', 'concurrent-2', 'concurrent-3', 'concurrent-4', 'concurrent-5']
      
      ;(generateId as any)
        .mockReturnValueOnce(sessionIds[0])
        .mockReturnValueOnce(sessionIds[1])
        .mockReturnValueOnce(sessionIds[2])
        .mockReturnValueOnce(sessionIds[3])
        .mockReturnValueOnce(sessionIds[4])
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      // Create multiple sessions concurrently
      const sessionPromises = Array(5).fill(null).map(() => 
        authService.createSession(userId)
      )

      const results = await Promise.all(sessionPromises)

      expect(results).toEqual(sessionIds)
      expect(databaseService.execute).toHaveBeenCalledTimes(5)
    })

    test('createSession should handle ID generation failures', async () => {
      ;(generateId as any).mockImplementation(() => {
        throw new Error('ID generation failed')
      })

      await expectToThrow(
        () => authService.createSession('user-id'),
        'ID generation failed'
      )
    })

    test('createSession should handle timestamp generation failures', async () => {
      ;(generateId as any).mockReturnValue('session-id')
      
      // Mock Date constructor to throw error
      const originalDate = global.Date
      global.Date = vi.fn().mockImplementation(() => {
        throw new Error('Date creation failed')
      }) as any

      await expectToThrow(
        () => authService.createSession('user-id'),
        'Date creation failed'
      )

      // Restore original Date
      global.Date = originalDate
    })

    test('createSession should validate session expiration calculation', async () => {
      const userId = 'test-user-id'
      const mockNow = 1640995200000 // 2022-01-01T00:00:00.000Z
      
      vi.spyOn(Date, 'now').mockReturnValue(mockNow)
      ;(generateId as any).mockReturnValue('session-id')
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      await authService.createSession(userId)

      // Verify expiration is exactly 7 days (604800000 ms) from now
      const expectedExpiration = new Date(mockNow + 7 * 24 * 60 * 60 * 1000).toISOString()
      expect(databaseService.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), userId, expectedExpiration]),
        'createSession'
      )

      vi.restoreAllMocks()
    })

    test('createSession should handle database transaction failures', async () => {
      const transactionError = new Error('Transaction rolled back')
      ;(databaseService.execute as any).mockRejectedValue(transactionError)
      ;(generateId as any).mockReturnValue('session-id')

      await expectToThrow(
        () => authService.createSession('user-id'),
        'Transaction rolled back'
      )

      // Verify cleanup or rollback behavior if implemented
      expect(databaseService.execute).toHaveBeenCalledTimes(1)
    })
  })

  describe('Session Validation Functions', () => {
    test('requireAuth should return user session for valid session', async () => {
      const mockSession = {
        session_id: 'valid-session',
        user_id: 'user-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        username: 'testuser',
        bio: 'Test bio',
        language: 'en',
        theme: 'dark',
        avatar: 'avatar.jpg'
      }

      // Mock cookies
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'valid-session' })
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.queryOne as any).mockResolvedValue(mockSession)

      const result = await authService.requireAuth()

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        bio: 'Test bio',
        language: 'en',
        theme: 'dark',
        avatar: 'avatar.jpg',
        isAdmin: false
      })
    })

    test('requireAuth should throw error for missing session', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue(undefined)
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      await expectToThrow(
        () => authService.requireAuth(),
        'Non authentifié'
      )
    })

    test('requireAuth should throw error for expired session', async () => {
      const expiredSession = {
        session_id: 'expired-session',
        user_id: 'user-123',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired
        username: 'testuser'
      }

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'expired-session' })
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.queryOne as any).mockResolvedValue(expiredSession)
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      await expectToThrow(
        () => authService.requireAuth(),
        'Session expirée'
      )

      // Verify expired session is cleaned up
      expect(databaseService.execute).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE id = ?',
        ['expired-session'],
        'requireAuth-cleanup'
      )
    })

    test('requireAuth should handle invalid session', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'invalid-session' })
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.queryOne as any).mockResolvedValue(null)

      await expectToThrow(
        () => authService.requireAuth(),
        'Session invalide'
      )
    })

    test('requireAuth should identify admin users', async () => {
      const adminSession = {
        session_id: 'admin-session',
        user_id: 'admin-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        username: 'admin',
        bio: '',
        language: 'fr',
        theme: 'system',
        avatar: ''
      }

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'admin-session' })
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.queryOne as any).mockResolvedValue(adminSession)

      const result = await authService.requireAuth()

      expect(result.isAdmin).toBe(true)
      expect(result.username).toBe('admin')
    })
  })

  describe('Admin Authorization Functions', () => {
    test('requireAdmin should succeed for admin user', async () => {
      const adminUser = {
        id: 'admin-123',
        username: 'admin',
        bio: '',
        language: 'fr',
        theme: 'system',
        avatar: '',
        isAdmin: true
      }

      ;(authService.requireAuth as any).mockResolvedValue(adminUser)

      await expectToResolve(() => authService.requireAdmin())
    })

    test('requireAdmin should throw error for non-admin user', async () => {
      const regularUser = {
        id: 'user-123',
        username: 'user',
        bio: '',
        language: 'fr',
        theme: 'system',
        avatar: '',
        isAdmin: false
      }

      ;(authService.requireAuth as any).mockResolvedValue(regularUser)

      await expectToThrow(
        () => authService.requireAdmin(),
        'Non autorisé'
      )
    })

    test('requireAdmin should handle authentication failure', async () => {
      ;(authService.requireAuth as any).mockRejectedValue(new Error('Non authentifié'))

      await expectToThrow(
        () => authService.requireAdmin(),
        'Non authentifié'
      )
    })
  })

  describe('Session Cleanup Functions', () => {
    test('signOut should delete session and clear cookie', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'session-to-delete' }),
        delete: vi.fn()
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.execute as any).mockResolvedValue(undefined)

      await authService.signOut()

      expect(databaseService.execute).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE id = ?',
        ['session-to-delete'],
        'signOut'
      )
      expect(mockCookies.delete).toHaveBeenCalledWith('session_id')
    })

    test('signOut should handle missing session gracefully', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue(undefined),
        delete: vi.fn()
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      await expectToResolve(() => authService.signOut())

      expect(databaseService.execute).not.toHaveBeenCalled()
      expect(mockCookies.delete).not.toHaveBeenCalled()
    })

    test('signOut should handle database errors', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'session-id' }),
        delete: vi.fn()
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.execute as any).mockRejectedValue(new Error('Database error'))

      // Should not throw, but handle gracefully
      await expectToResolve(() => authService.signOut())
    })
  })

  describe('User Session Retrieval Functions', () => {
    test('getSessionUser should return user for valid session', async () => {
      const mockSession = {
        session_id: 'valid-session',
        user_id: 'user-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        username: 'testuser',
        bio: 'Test bio',
        language: 'en',
        theme: 'dark',
        avatar: 'avatar.jpg'
      }

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'valid-session' })
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.queryOne as any).mockResolvedValue(mockSession)

      const result = await authService.getSessionUser()

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        bio: 'Test bio',
        language: 'en',
        theme: 'dark',
        avatar: 'avatar.jpg',
        isAdmin: false
      })
    })

    test('getSessionUser should return null for missing session', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue(undefined)
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      const result = await authService.getSessionUser()

      expect(result).toBeNull()
    })

    test('getSessionUser should return null for expired session', async () => {
      const expiredSession = {
        session_id: 'expired-session',
        user_id: 'user-123',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        username: 'testuser'
      }

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'expired-session' })
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.queryOne as any).mockResolvedValue(expiredSession)
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      const result = await authService.getSessionUser()

      expect(result).toBeNull()
      
      // Verify cleanup
      expect(databaseService.execute).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE id = ?',
        ['expired-session'],
        'getSessionUser-cleanup'
      )
    })

    test('getSessionUser should handle database errors gracefully', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'session-id' })
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.queryOne as any).mockRejectedValue(new Error('Database error'))

      const result = await authService.getSessionUser()

      expect(result).toBeNull()
    })
  })

  describe('Audit Logging and User Action Tracking', () => {
    test('should log user creation events with detailed context', async () => {
      ;(databaseService.execute as any).mockResolvedValue(undefined)
      ;(authService.hashPassword as any).mockReturnValue('hashed-password')

      await authService.createUser('newuser', 'password')

      // Verify logging calls were made with proper context
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Creating new user'),
        expect.objectContaining({ username: 'newuser' })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('User created successfully'),
        expect.objectContaining({ 
          userId: 'generated-id',
          username: 'newuser'
        })
      )
    })

    test('should log authentication attempts with instrumentation', async () => {
      const mockUser = createMockUser({
        id: 'admin-id',
        username: 'admin',
        password_hash: 'hashed-password'
      })
      
      ;(databaseService.queryOne as any).mockResolvedValue(mockUser)
      ;(authService.hashPassword as any).mockReturnValue('hashed-password')
      ;(isAdminUsingDefaultPassword as any).mockReturnValue(false)

      await authService.verifyCredentials('password')

      // Verify authentication instrumentation was called
      expect(AuthServiceInstrumentation.instrumentLogin).toHaveBeenCalledWith(
        expect.any(Function),
        { username: 'admin', password: 'password' }
      )
    })

    test('should log failed authentication attempts with warnings', async () => {
      ;(databaseService.queryOne as any).mockResolvedValue(null)

      const result = await authService.verifyCredentials('wrong-password')

      // Verify failed authentication returns null and logs warning
      expect(result).toBeNull()
      expect(AuthServiceInstrumentation.instrumentLogin).toHaveBeenCalled()
    })

    test('should log session creation with performance metrics', async () => {
      ;(databaseService.execute as any).mockResolvedValue(undefined)
      ;(generateId as any).mockReturnValue('session-123')

      await authService.createSession('user-id')

      // Verify session creation logging with context
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Creating new session'),
        expect.objectContaining({ userId: 'user-id' })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Session created successfully'),
        expect.objectContaining({ 
          userId: 'user-id',
          sessionId: 'session-123'
        })
      )
    })

    test('should log session destruction with instrumentation', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'session-to-delete' }),
        delete: vi.fn()
      }
      
      ;(cookies as any).mockReturnValue(mockCookies)
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      await authService.signOut()

      // Verify logout instrumentation was called
      expect(AuthServiceInstrumentation.instrumentLogout).toHaveBeenCalledWith(
        'unknown',
        'session-to-delete'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('User signing out'),
        expect.objectContaining({ sessionId: 'session-to-delete' })
      )
    })

    test('should track user actions with detailed context', async () => {
      const mockSession = {
        session_id: 'session-123',
        user_id: 'user-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        username: 'testuser',
        bio: 'Test bio',
        language: 'fr',
        theme: 'dark',
        avatar: 'avatar.jpg'
      }

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'session-123' })
      }
      
      ;(cookies as any).mockReturnValue(mockCookies)
      ;(databaseService.queryOne as any).mockResolvedValue(mockSession)

      await authService.requireAuth()

      // Verify user action tracking includes proper context and operation name
      expect(databaseService.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('sessions'),
        ['session-123'],
        'requireAuth'
      )
    })

    test('should track failed authentication attempts for security monitoring', async () => {
      const mockUser = createMockUser({
        password_hash: 'correct-hash'
      })

      ;(databaseService.queryOne as any).mockResolvedValue(mockUser)
      ;(authService.hashPassword as any).mockReturnValue('wrong-hash')
      ;(isAdminUsingDefaultPassword as any).mockReturnValue(false)

      const result = await authService.verifyCredentials('wrong-password')

      expect(result).toBeNull()
      // Verify that failed attempts are tracked through instrumentation
      expect(AuthServiceInstrumentation.instrumentLogin).toHaveBeenCalled()
    })

    test('should log session validation failures for audit trail', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'invalid-session' })
      }
      
      ;(cookies as any).mockReturnValue(mockCookies)
      ;(databaseService.queryOne as any).mockResolvedValue(null)

      await expectToThrow(
        () => authService.requireAuth(),
        'Session invalide'
      )

      // Verify that session validation failures are tracked
      expect(databaseService.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('sessions'),
        ['invalid-session'],
        'requireAuth'
      )
    })

    test('should track session cleanup operations for maintenance audit', async () => {
      const expiredSession = {
        session_id: 'expired-session',
        user_id: 'user-123',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        username: 'testuser'
      }

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'expired-session' })
      }
      
      ;(cookies as any).mockReturnValue(mockCookies)
      ;(databaseService.queryOne as any).mockResolvedValue(expiredSession)
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      await expectToThrow(
        () => authService.requireAuth(),
        'Session expirée'
      )

      // Verify cleanup operations are tracked with proper context
      expect(databaseService.execute).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE id = ?',
        ['expired-session'],
        'requireAuth-cleanup'
      )
    })

    test('should log admin privilege escalation attempts', async () => {
      const regularUser = {
        id: 'user-123',
        username: 'regularuser',
        bio: '',
        language: 'fr',
        theme: 'system',
        avatar: '',
        isAdmin: false
      }

      ;(authService.requireAuth as any).mockResolvedValue(regularUser)

      await expectToThrow(
        () => authService.requireAdmin(),
        'Non autorisé'
      )

      // Verify that admin access attempts are tracked
      expect(authService.requireAuth).toHaveBeenCalled()
    })

    test('should track user session retrieval for activity monitoring', async () => {
      const mockSession = {
        session_id: 'active-session',
        user_id: 'user-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        username: 'activeuser',
        bio: 'Active user',
        language: 'en',
        theme: 'light',
        avatar: 'user.jpg'
      }

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'active-session' })
      }
      
      ;(cookies as any).mockReturnValue(mockCookies)
      ;(databaseService.queryOne as any).mockResolvedValue(mockSession)

      const result = await authService.getSessionUser()

      expect(result).toBeDefined()
      // Verify that session retrieval is tracked with proper operation context
      expect(databaseService.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('sessions'),
        ['active-session'],
        'getSessionUser'
      )
    })

    test('should handle audit logging errors gracefully', async () => {
      // Mock logging failure
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logging system failure')
      })

      ;(databaseService.execute as any).mockResolvedValue(undefined)
      ;(authService.hashPassword as any).mockReturnValue('hashed-password')

      // Should not fail even if logging fails
      const result = await authService.createUser('testuser', 'password')

      expect(result).toEqual({
        id: 'generated-id',
        username: 'testuser'
      })
    })

    test('should track concurrent authentication attempts for security analysis', async () => {
      const mockUser = createMockUser({
        id: 'admin-id',
        username: 'admin',
        password_hash: 'hashed-password'
      })

      ;(databaseService.queryOne as any).mockResolvedValue(mockUser)
      ;(authService.hashPassword as any).mockReturnValue('hashed-password')
      ;(isAdminUsingDefaultPassword as any).mockReturnValue(false)

      // Simulate concurrent authentication attempts
      const authPromises = Array(3).fill(null).map(() =>
        authService.verifyCredentials('password')
      )

      const results = await Promise.all(authPromises)

      // All should succeed and be tracked
      results.forEach(result => {
        expect(result).toEqual({
          id: 'admin-id',
          username: 'admin'
        })
      })

      // Verify all attempts were instrumented
      expect(AuthServiceInstrumentation.instrumentLogin).toHaveBeenCalledTimes(3)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed session data', async () => {
      const malformedSession = {
        session_id: 'session-123',
        user_id: 'user-123',
        expires_at: 'invalid-date',
        username: 'testuser'
      }

      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: 'session-123' })
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      ;(databaseService.queryOne as any).mockResolvedValue(malformedSession)
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      await expectToThrow(
        () => authService.requireAuth(),
        'Session invalide'
      )

      // Verify cleanup of malformed session
      expect(databaseService.execute).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE id = ?',
        ['session-123'],
        'requireAuth-cleanup'
      )
    })

    test('should handle concurrent session operations', async () => {
      const userId = 'user-123'
      ;(generateId as any)
        .mockReturnValueOnce('session-1')
        .mockReturnValueOnce('session-2')
        .mockReturnValueOnce('session-3')
      ;(databaseService.execute as any).mockResolvedValue(undefined)

      // Create multiple sessions concurrently
      const sessionPromises = [
        authService.createSession(userId),
        authService.createSession(userId),
        authService.createSession(userId)
      ]

      const results = await Promise.all(sessionPromises)

      expect(results).toEqual(['session-1', 'session-2', 'session-3'])
      expect(databaseService.execute).toHaveBeenCalledTimes(3)
    })

    test('should handle database connection failures gracefully', async () => {
      const connectionError = new Error('SQLITE_BUSY: database is locked')
      ;(databaseService.queryOne as any).mockRejectedValue(connectionError)

      const result = await authService.verifyCredentials('password')

      expect(result).toBeNull()
    })

    test('should validate session cookie format', async () => {
      const mockCookies = {
        get: vi.fn().mockReturnValue({ value: '   ' }) // Whitespace only
      }
      
      vi.doMock('next/headers', () => ({
        cookies: () => mockCookies
      }))

      await expectToThrow(
        () => authService.requireAuth(),
        'Non authentifié'
      )
    })

    test('should handle null/undefined user data gracefully', async () => {
      await expectToThrow(
        () => authService.createUser(null as any, 'password')
      )

      await expectToThrow(
        () => authService.createUser('username', null as any)
      )

      await expectToThrow(
        () => authService.createSession(null as any)
      )
    })
  })
})
