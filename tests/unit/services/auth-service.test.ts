/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService } from '@/lib/services/auth-service';
import {
  createTestUser,
  createTestApiRequest
} from '../../setup/test-data-factory';
import {
  expectValidationError,
  expectCustomError,
  expectAuthorizationError
} from '../../utils/test-helpers';
import { ValidationError, AuthError, NotFoundError } from '@/lib/errors/custom-error';

// Mock dependencies
const mockCookiesInstance = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookiesInstance),
}));

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234-5678-9012'),
}));

// Mock pour databaseService (utilisé par AuthService)
vi.mock('@/lib/services/database/db', () => {
  const mockFn = () => {
    // Factory qui génère les mocks pour chaque test
    return {
      queryOne: vi.fn(),
      execute: vi.fn(),
      queryMany: vi.fn(),
      transaction: vi.fn(),
    };
  };

  const mockInstance = mockFn();

  return {
    databaseService: mockInstance,
    DatabaseService: class {
      static getInstance() {
        return mockInstance;
      }
    },
  };
});

vi.mock('@/lib/utils/formatting/calculations', () => ({
  getCurrentTimestamp: vi.fn(() => '2024-01-01T00:00:00.000Z'),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockCookies: any;
  let mockDb: any;
  let mockBcrypt: any;
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(async () => {
    // Reset environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
    process.env.COOKIE_NAME = 'test_session';

    // Setup mocks - Reset les fonctions mockées
    mockCookiesInstance.get.mockReset();
    mockCookiesInstance.set.mockReset();
    mockCookiesInstance.delete.mockReset();

    mockCookies = mockCookiesInstance;

    // Import mock databaseService depuis le module mocké
    const { databaseService } = await import('@/lib/services/database/db');
    mockDb = databaseService;

    // Reset mocks databaseService
    mockDb.queryOne.mockReset();
    mockDb.execute.mockReset();
    mockDb.queryMany.mockReset();
    mockDb.transaction.mockReset();

    // Import mock bcrypt avec vi.mocked pour accéder aux fonctions mockées
    const bcrypt = await import('bcrypt');
    mockBcrypt = {
      hash: vi.mocked(bcrypt.hash),
      compare: vi.mocked(bcrypt.compare),
    };

    // Reset bcrypt mocks
    mockBcrypt.hash.mockReset();
    mockBcrypt.compare.mockReset();

    testUser = createTestUser();
    authService = new AuthService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const userData = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com'
      };

      mockDb.queryOne.mockResolvedValue(null); // No existing user
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockDb.execute.mockResolvedValue(undefined);

      // Act
      const result = await authService.createUser(userData);

      // Assert
      expect(result).toEqual({
        id: 'test-uuid-1234-5678-9012',
        username: 'testuser'
      });
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM users WHERE username = ?'),
        ['testuser'],
        'createUser-checkExisting'
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['test-uuid-1234-5678-9012', 'testuser']),
        'createUser'
      );
    });

    it('should throw ValidationError if user already exists', async () => {
      // Arrange
      const userData = {
        username: 'existinguser',
        password: 'password123'
      };

      mockDb.queryOne.mockResolvedValue({ id: 'existing-id' });

      // Act & Assert
      await expectValidationError(
        () => authService.createUser(userData),
        'username',
        'A user with this username already exists'
      );
    });

    it('should validate username format', async () => {
      // Act & Assert
      await expectValidationError(
        () => authService.createUser({ username: 'a', password: 'password123' }),
        undefined,
        'Username must be at least 2 characters'
      );
    });

    it('should validate password length', async () => {
      // Act & Assert
      await expectValidationError(
        () => authService.createUser({ username: 'testuser', password: '123' }),
        undefined,
        'Password must be at least 6 characters'
      );
    });

    it('should validate username characters', async () => {
      // Act & Assert
      await expectValidationError(
        () => authService.createUser({ username: 'test@user', password: 'password123' }),
        undefined,
        'Username can only contain letters, numbers, hyphens and underscores'
      );
    });
  });

  describe('verifyCredentials', () => {
    it('should verify valid credentials', async () => {
      // Arrange
      const credentials = { username: 'testuser', password: 'password123' };
      const dbUser = {
        id: testUser.id,
        username: 'testuser',
        password_hash: 'hashed-password'
      };

      mockDb.queryOne.mockResolvedValue(dbUser);
      mockBcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await authService.verifyCredentials(credentials.username, credentials.password);

      // Assert
      expect(result).toEqual({
        id: testUser.id,
        username: 'testuser'
      });
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, password_hash FROM users WHERE username = ?'),
        ['testuser'],
        'verifyCredentials'
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('should throw AuthError for non-existent user', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValue(null);

      // Act & Assert
      await expectCustomError(
        () => authService.verifyCredentials('nonexistent', 'password123'),
        'AUTH_ERROR',
        'Invalid username or password'
      );
    });

    it('should throw AuthError for incorrect password', async () => {
      // Arrange
      const dbUser = {
        id: testUser.id,
        username: 'testuser',
        password_hash: 'hashed-password'
      };

      mockDb.queryOne.mockResolvedValue(dbUser);
      mockBcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expectCustomError(
        () => authService.verifyCredentials('testuser', 'wrongpassword'),
        'AUTH_ERROR',
        'Invalid username or password'
      );
    });
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValue({ id: testUser.id });
      mockDb.execute.mockResolvedValue(undefined);

      // Act
      const result = await authService.createSession(testUser.id);

      // Assert
      expect(result).toBe('test-uuid-1234-5678-9012');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM users WHERE id = ?'),
        [testUser.id],
        'createSession-checkUser'
      );
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_sessions'),
        expect.arrayContaining(['test-uuid-1234-5678-9012', testUser.id]),
        'createSession'
      );
    });

    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValue(null);

      // Act & Assert
      await expectCustomError(
        () => authService.createSession('550e8400-e29b-41d4-a716-446655440000'),
        'NOT_FOUND',
        "User with identifier '550e8400-e29b-41d4-a716-446655440000' not found"
      );
    });

    it('should validate userId is a valid UUID', async () => {
      // Act & Assert
      await expectValidationError(
        () => authService.createSession('invalid-uuid'),
        'userId',
        'must be a valid UUID'
      );
    });
  });

  describe('destroySession', () => {
    it('should destroy session successfully', async () => {
      // Arrange
      const sessionId = 'test-session-id';
      mockDb.queryOne.mockResolvedValue({ user_id: testUser.id });
      mockDb.execute.mockResolvedValue(undefined);

      // Act
      await authService.destroySession(sessionId);

      // Assert
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_sessions WHERE id = ?'),
        [sessionId],
        'destroySession'
      );
      expect(mockCookies.delete).toHaveBeenCalledWith('logistix_session');
    });

    it('should handle missing session gracefully', async () => {
      // Arrange
      mockCookies.get.mockReturnValue(undefined);

      // Act
      await authService.destroySession();

      // Assert
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it('should use cookie session if no sessionId provided', async () => {
      // Arrange
      const sessionId = 'cookie-session-id';
      mockCookies.get.mockReturnValue({ value: sessionId });
      mockDb.queryOne.mockResolvedValue({ user_id: testUser.id });
      mockDb.execute.mockResolvedValue(undefined);

      // Act
      await authService.destroySession();

      // Assert
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_sessions WHERE id = ?'),
        [sessionId],
        'destroySession'
      );
    });
  });

  describe('requireAuth', () => {
    it('should return user session for valid session', async () => {
      // Arrange
      const sessionId = 'valid-session-id';
      const sessionData = {
        session_id: sessionId,
        user_id: testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        username: testUser.username,
        email: testUser.email,
        avatar: testUser.profile?.avatar,
        language: 'fr',
        theme: 'light',
        ai_config: null
      };

      mockCookies.get.mockReturnValue({ value: sessionId });
      mockDb.queryOne.mockResolvedValue(sessionData);

      // Act
      const result = await authService.requireAuth();

      // Assert
      expect(result).toEqual({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        avatar: testUser.profile?.avatar,
        language: 'fr',
        theme: 'light',
        isAdmin: false,
        aiConfig: undefined
      });
    });

    it('should throw AuthError when no session cookie', async () => {
      // Arrange
      mockCookies.get.mockReturnValue(undefined);

      // Act & Assert
      await expectCustomError(
        () => authService.requireAuth(),
        'AUTH_ERROR',
        'Authentication required'
      );
    });

    it('should throw AuthError for invalid session', async () => {
      // Arrange
      const sessionId = 'invalid-session-id';
      mockCookies.get.mockReturnValue({ value: sessionId });
      mockDb.queryOne.mockResolvedValue(null);

      // Act & Assert
      await expectCustomError(
        () => authService.requireAuth(),
        'AUTH_ERROR',
        'Invalid session'
      );
    });

    it('should throw AuthError for expired session', async () => {
      // Arrange
      const sessionId = 'expired-session-id';
      const sessionData = {
        session_id: sessionId,
        user_id: testUser.id,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        username: testUser.username,
        email: testUser.email
      };

      mockCookies.get.mockReturnValue({ value: sessionId });
      mockDb.queryOne.mockResolvedValue(sessionData);
      mockDb.execute.mockResolvedValue(undefined);

      // Act & Assert
      await expectCustomError(
        () => authService.requireAuth(),
        'AUTH_ERROR',
        'Session expired'
      );

      // Should clean up expired session
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_sessions WHERE id = ?'),
        [sessionId],
        'requireAuth-cleanup'
      );
    });

    it('should identify admin user correctly', async () => {
      // Arrange
      const sessionId = 'admin-session-id';
      const sessionData = {
        session_id: sessionId,
        user_id: testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: 'admin',
        email: 'admin@example.com'
      };

      mockCookies.get.mockReturnValue({ value: sessionId });
      mockDb.queryOne.mockResolvedValue(sessionData);

      // Act
      const result = await authService.requireAuth();

      // Assert
      expect(result.isAdmin).toBe(true);
      expect(result.username).toBe('admin');
    });
  });

  describe('requireAdmin', () => {
    it('should return user session for admin user', async () => {
      // Arrange
      const sessionId = 'admin-session-id';
      const sessionData = {
        session_id: sessionId,
        user_id: testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: 'admin',
        email: 'admin@example.com'
      };

      mockCookies.get.mockReturnValue({ value: sessionId });
      mockDb.queryOne.mockResolvedValue(sessionData);

      // Act
      const result = await authService.requireAdmin();

      // Assert
      expect(result.isAdmin).toBe(true);
      expect(result.username).toBe('admin');
    });

    it('should throw AuthorizationError for non-admin user', async () => {
      // Arrange
      const sessionId = 'user-session-id';
      const sessionData = {
        session_id: sessionId,
        user_id: testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: 'regularuser',
        email: 'user@example.com'
      };

      mockCookies.get.mockReturnValue({ value: sessionId });
      mockDb.queryOne.mockResolvedValue(sessionData);

      // Act & Assert
      await expectCustomError(
        () => authService.requireAdmin(),
        'AUTHORIZATION_ERROR',
        'Admin access required'
      );
    });
  });

  describe('getSessionUser', () => {
    it('should return user session when authenticated', async () => {
      // Arrange
      const sessionId = 'valid-session-id';
      const sessionData = {
        session_id: sessionId,
        user_id: testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testUser.username,
        email: testUser.email
      };

      mockCookies.get.mockReturnValue({ value: sessionId });
      mockDb.queryOne.mockResolvedValue(sessionData);

      // Act
      const result = await authService.getSessionUser();

      // Assert
      expect(result).toBeTruthy();
      expect(result?.username).toBe(testUser.username);
    });

    it('should return null when not authenticated', async () => {
      // Arrange
      mockCookies.get.mockReturnValue(undefined);

      // Act
      const result = await authService.getSessionUser();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('should authenticate user and create session', async () => {
      // Arrange
      const credentials = { username: 'testuser', password: 'password123' };
      const dbUser = {
        id: testUser.id,
        username: 'testuser',
        password_hash: 'hashed-password'
      };
      const sessionData = {
        session_id: 'new-session-id',
        user_id: testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testUser.username,
        email: testUser.email
      };

      // Mock credential verification: sequence of database calls
      // 1) verifyCredentials -> returns dbUser
      // 2) createSession-checkUser -> returns { id: userId }
      // 3) requireAuth -> returns sessionData
      mockDb.queryOne
        .mockResolvedValueOnce(dbUser) // verifyCredentials
        .mockResolvedValueOnce({ id: testUser.id }) // createSession-checkUser
        .mockResolvedValueOnce(sessionData); // requireAuth

      // bcrypt compare should succeed
      mockBcrypt.compare.mockResolvedValue(true);

      // execute for creating session should succeed and return undefined
      mockDb.execute.mockResolvedValue(undefined);

      // Ensure cookies.get will return the session id after authenticate sets it
      mockCookies.get.mockReturnValueOnce({ value: 'test-uuid-1234-5678-9012' });

      // Act
      const result = await authService.authenticate(credentials.username, credentials.password);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid credentials', async () => {
      // Arrange
      mockDb.queryOne.mockResolvedValue(null);

      // Act
      const result = await authService.authenticate('invalid', 'password');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid username or password');
      expect(result.user).toBeUndefined();
    });
  });

  describe('validateSession', () => {
    it('should return success for valid session', async () => {
      // Arrange
      const sessionId = 'valid-session-id';
      const sessionData = {
        session_id: sessionId,
        user_id: testUser.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        username: testUser.username,
        email: testUser.email
      };

      mockCookies.get.mockReturnValue({ value: sessionId });
      mockDb.queryOne.mockResolvedValue(sessionData);

      // Act
      const result = await authService.validateSession();

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should return failure when not authenticated', async () => {
      // Arrange
      mockCookies.get.mockReturnValue(undefined);

      // Act
      const result = await authService.validateSession();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Not authenticated');
    });
  });
});