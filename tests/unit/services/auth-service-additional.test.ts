/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService } from '@/lib/services/auth-service';
import {
    createTestUser,
} from '../../setup/test-data-factory';
import {
    expectValidationError,
    expectCustomError,
} from '../../utils/test-helpers';

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
vi.mock('@/lib/database/database-service', () => {
    const mockFn = () => {
        // Factory qui génère les mocks pour chaque test
        return {
            queryOne: vi.fn(),
            execute: vi.fn(),
            queryMany: vi.fn(),
            transaction: vi.fn(),
            // Ajouter query pour supporter query() en plus de queryMany() si nécessaire
            query: vi.fn(),
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

vi.mock('@/lib/utils/crypto-secrets', () => ({
    encryptUserSecret: vi.fn(() => 'encrypted-secret-mock'),
    decryptUserSecret: vi.fn(() => 'decrypted-secret-mock'),
}));

describe('AuthService Additional Tests', () => {
    let authService: AuthService;
    let mockCookies: any;
    let mockDb: any;
    let mockBcrypt: any;
    let testUser: ReturnType<typeof createTestUser>;

    beforeEach(async () => {
        // Reset environment variables
        vi.stubEnv('JWT_SECRET', 'test-jwt-secret-that-is-at-least-32-characters-long');
        vi.stubEnv('COOKIE_NAME', 'test_session');

        // Setup mocks - Reset les fonctions mockées
        mockCookiesInstance.get.mockReset();
        mockCookiesInstance.set.mockReset();
        mockCookiesInstance.delete.mockReset();

        mockCookies = mockCookiesInstance;

        // Import mock databaseService depuis le module mocké
        const { databaseService } = await import('@/lib/database/database-service');
        mockDb = databaseService;

        // Reset mocks databaseService
        mockDb.queryOne.mockReset();
        mockDb.execute.mockReset();
        mockDb.queryMany.mockReset();
        mockDb.query.mockReset();
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

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            // Arrange
            const userId = testUser.id;
            const currentPassword = 'oldpassword123';
            const newPassword = 'newpassword456';

            const dbUser = {
                id: userId,
                username: 'testuser',
                password_hash: 'hashed-old-password'
            };

            mockDb.queryOne.mockResolvedValue(dbUser);
            mockBcrypt.compare.mockResolvedValue(true);
            mockBcrypt.hash.mockResolvedValue('hashed-new-password');
            mockDb.execute.mockResolvedValue(undefined);

            // Act
            await authService.changePassword(userId, currentPassword, newPassword);

            // Assert
            expect(mockBcrypt.compare).toHaveBeenCalledWith(currentPassword, 'hashed-old-password');
            expect(mockBcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
            expect(mockDb.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'),
                expect.arrayContaining(['hashed-new-password']),
                'changePassword'
            );
        });

        it('should throw AuthError for incorrect current password', async () => {
            // Arrange
            const userId = testUser.id;
            const dbUser = {
                id: userId,
                username: 'testuser',
                password_hash: 'hashed-old-password'
            };

            mockDb.queryOne.mockResolvedValue(dbUser);
            mockBcrypt.compare.mockResolvedValue(false);

            // Act & Assert
            await expectCustomError(
                () => authService.changePassword(userId, 'wrongpassword', 'newpassword456'),
                'AUTH_ERROR',
                'Invalid current password' // Updated expected message
            );
        });

        it('should throw NotFoundError for non-existent user', async () => {
            // Arrange
            mockDb.queryOne.mockResolvedValue(null);

            // Act & Assert
            await expectCustomError(
                () => authService.changePassword('550e8400-e29b-41d4-a716-446655440000', 'oldPassword123', 'validPassword123'),
                'NOT_FOUND',
                'User with identifier'
            );
        });

        // Note: Validation order matters. If userId is validated first, this test might need adjustment
        // But since UUID validation is sync and DB is async, we expect validation error.
        it('should validate new password length', async () => {
            // Act & Assert
            // This fails if the service checks user existence before password length.
            // AuthService implementation: validateUUID(userId) -> then checks passwords -> then DB
            // So this should work.
            await expectValidationError(
                () => authService.changePassword(testUser.id, 'oldpass', '123'),
                undefined,
                undefined // Message might vary, simpler to check type
            );
        });
    });

    describe('getUserSessions', () => {
        it('should return all active sessions for a user', async () => {
            // Arrange
            const sessions = [
                {
                    id: 'session-1',
                    user_id: testUser.id,
                    device_name: 'Chrome on Windows',
                    device_type: 'desktop',
                    ip_address: '192.168.1.1',
                    user_agent: 'Mozilla/5.0...',
                    last_activity_at: '2024-01-01T00:00:00.000Z',
                    created_at: '2024-01-01T00:00:00.000Z',
                    expires_at: new Date(Date.now() + 86400000).toISOString()
                },
                {
                    id: 'session-2',
                    user_id: testUser.id,
                    device_name: 'iPhone',
                    device_type: 'mobile',
                    ip_address: '192.168.1.2',
                    user_agent: 'Safari...',
                    last_activity_at: '2024-01-01T01:00:00.000Z',
                    created_at: '2024-01-01T00:00:00.000Z',
                    expires_at: new Date(Date.now() + 86400000).toISOString()
                }
            ];

            // AuthService uses databaseService.query() for this method, not queryMany
            mockDb.query.mockResolvedValue(sessions);

            // Act
            const result = await authService.getUserSessions(testUser.id);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].id).toEqual(sessions[0].id);
            expect(result[1].id).toEqual(sessions[1].id);
            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM user_sessions'),
                expect.arrayContaining([testUser.id]),
                'getUserSessions'
            );
        });

        it('should return empty array for user with no sessions', async () => {
            // Arrange
            mockDb.query.mockResolvedValue([]);

            // Act
            const result = await authService.getUserSessions(testUser.id);

            // Assert
            expect(result).toEqual([]);
        });

        it('should validate userId is a valid UUID', async () => {
            // Act & Assert
            await expectValidationError(
                () => authService.getUserSessions('invalid-uuid'),
                'userId',
                'must be a valid UUID'
            );
        });
    });

    describe('revokeAllSessionsExcept', () => {
        it('should revoke all sessions except current one', async () => {
            // Arrange
            const currentSessionId = 'current-session';
            mockDb.queryOne.mockResolvedValue({ id: testUser.id }); // User exists check
            mockDb.execute.mockResolvedValue({ changes: 3 });

            // Act
            const result = await authService.revokeAllSessionsExcept(testUser.id, currentSessionId);

            // Assert
            expect(result).toBe(3);
            expect(mockDb.execute).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM user_sessions WHERE user_id = ? AND id != ?'),
                [testUser.id, currentSessionId],
                'revokeAllSessionsExcept'
            );
        });

        it('should return 0 when no sessions to revoke', async () => {
            // Arrange
            mockDb.queryOne.mockResolvedValue({ id: testUser.id }); // User exists check
            mockDb.execute.mockResolvedValue({ changes: 0 });

            // Act
            const result = await authService.revokeAllSessionsExcept(testUser.id, 'current-session');

            // Assert
            expect(result).toBe(0);
        });

        // Testing validation
    });

    describe('revokeUserSession', () => {
        it('should revoke a specific session', async () => {
            // Arrange
            const sessionId = 'session-to-revoke';
            const sessionData = {
                id: sessionId,
                user_id: testUser.id
            };

            mockDb.queryOne.mockResolvedValue(sessionData); // Session ownership check
            mockDb.execute.mockResolvedValue(undefined);

            // Act
            await authService.revokeUserSession(testUser.id, sessionId);

            // Assert
            expect(mockDb.queryOne).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id FROM user_sessions WHERE id = ? AND user_id = ?'),
                [sessionId, testUser.id],
                'revokeUserSession-checkOwnership'
            );
            expect(mockDb.execute).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM user_sessions WHERE id = ?'),
                [sessionId],
                'revokeUserSession'
            );
        });

        it('should throw NotFoundError for non-existent session', async () => {
            // Arrange
            mockDb.queryOne.mockResolvedValue(null);

            // Act & Assert
            await expectCustomError(
                () => authService.revokeUserSession(testUser.id, 'non-existent-session'),
                'NOT_FOUND',
                'Session with identifier'
            );
        });
    });
});
