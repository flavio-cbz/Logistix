import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { getCurrentTimestamp } from "@/lib/database";
import { encryptSecret, decryptSecret } from '@/lib/utils/crypto';
import { logger } from '@/lib/utils/logging/logger';
import { vintedRepository } from '@/lib/repositories/vinted-repository';

// Mock dependencies
vi.mock('@/lib/database', () => ({
  getCurrentTimestamp: vi.fn(() => '2025-09-26T12:00:00.000Z'),
}));

vi.mock('@/lib/utils/crypto', () => ({
  encryptSecret: vi.fn(),
  decryptSecret: vi.fn(),
}));

vi.mock('@/lib/utils/logging/logger', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
  return {
    getLogger: vi.fn(() => mockLogger),
    logger: mockLogger,
  };
});

// Mock Repository
vi.mock('@/lib/repositories/vinted-repository', () => ({
  vintedRepository: {
    findByUserId: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    deleteByUserId: vi.fn(),
  }
}));

const refreshAccessTokenMock = vi.fn();

vi.mock('@/lib/services/auth/vinted-auth-service', () => ({
  VintedAuthService: class {
    public cookie: string;

    constructor(cookie: string) {
      this.cookie = cookie;
    }

    refreshAccessToken = refreshAccessTokenMock;
  },
}));

describe('vintedSessionManager', () => {
  const mockVintedRepository = vi.mocked(vintedRepository);
  const mockGetCurrentTimestamp = vi.mocked(getCurrentTimestamp);
  const mockEncryptSecret = vi.mocked(encryptSecret);
  const mockDecryptSecret = vi.mocked(decryptSecret);
  const mockLogger = vi.mocked(logger);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentTimestamp.mockReturnValue('2025-09-26T12:00:00.000Z');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns decrypted cookie when session exists', async () => {
    mockVintedRepository.findByUserId.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'user-1',
      sessionCookie: 'encrypted-cookie',
      status: 'active',
      lastValidatedAt: null,
      lastRefreshedAt: null,
      refreshErrorMessage: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    });
    mockDecryptSecret.mockResolvedValueOnce('plain-cookie');

    const cookie = await vintedSessionManager.getSessionCookie('user-1');

    expect(cookie).toBe('plain-cookie');
    expect(mockDecryptSecret).toHaveBeenCalledWith('encrypted-cookie', 'user-1');
  });

  it('marks session as requiring configuration when decryption fails', async () => {
    // First call for getSessionCookie
    mockVintedRepository.findByUserId.mockResolvedValueOnce({
      id: 'session-2',
      userId: 'user-2',
      sessionCookie: 'encrypted-cookie',
      status: 'active',
      lastValidatedAt: null,
      lastRefreshedAt: null,
      refreshErrorMessage: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    });

    // Second call for updateSessionStatus (checking existence)
    mockVintedRepository.findByUserId.mockResolvedValueOnce({
      id: 'session-2',
      userId: 'user-2',
      sessionCookie: 'encrypted-cookie',
      status: 'active',
      lastValidatedAt: null,
      lastRefreshedAt: null,
      refreshErrorMessage: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    });

    mockDecryptSecret.mockRejectedValueOnce(new Error('decrypt failed'));

    const result = await vintedSessionManager.getSessionCookie('user-2');

    expect(result).toBeNull();
    expect(mockVintedRepository.update).toHaveBeenCalledWith(
        'session-2',
        {
            status: 'requires_configuration',
            refreshErrorMessage: 'Impossible de déchiffrer la session'
        }
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('refreshes session when token is still valid', async () => {
    mockVintedRepository.findByUserId.mockResolvedValueOnce({
      id: 'session-3',
      userId: 'user-3',
      sessionCookie: 'encrypted-cookie',
      status: 'active',
      lastValidatedAt: null,
      lastRefreshedAt: null,
      refreshErrorMessage: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    });
    mockDecryptSecret.mockResolvedValueOnce('plain-cookie');

    // Access private method for spying
    const tokenValiditySpy = vi.spyOn(vintedSessionManager as any, 'isTokenValid').mockResolvedValueOnce(true);

    const response = await vintedSessionManager.refreshSession('user-3');

    expect(response).toEqual({ success: true });
    expect(tokenValiditySpy).toHaveBeenCalledWith('plain-cookie');
    expect(mockVintedRepository.update).toHaveBeenCalledWith(
        'session-3',
        expect.objectContaining({
            status: 'active',
            lastValidatedAt: '2025-09-26T12:00:00.000Z',
            refreshErrorMessage: null,
        })
    );
  });

  it('refreshes cookie when token is invalid but refresh succeeds', async () => {
    const initialCookie = 'access_token_web=oldAccess; refresh_token_web=oldRefresh; foo=bar';

    mockVintedRepository.findByUserId.mockResolvedValueOnce({
      id: 'session-4',
      userId: 'user-4',
      sessionCookie: 'encrypted-cookie',
      status: 'active',
      lastValidatedAt: null,
      lastRefreshedAt: null,
      refreshErrorMessage: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    });
    mockDecryptSecret.mockResolvedValueOnce(initialCookie);
    mockEncryptSecret.mockResolvedValueOnce('encrypted-new');

    vi.spyOn(vintedSessionManager as any, 'isTokenValid').mockResolvedValueOnce(false);
    refreshAccessTokenMock.mockResolvedValueOnce({
      accessToken: 'newAccess',
      refreshToken: 'newRefresh',
    });

    const response = await vintedSessionManager.refreshSession('user-4');

    expect(response).toEqual({
      success: true,
      tokens: { accessToken: 'newAccess', refreshToken: 'newRefresh' },
    });
    expect(mockEncryptSecret).toHaveBeenCalledWith(
      'access_token_web=newAccess; refresh_token_web=newRefresh; foo=bar',
      'user-4'
    );
    expect(mockVintedRepository.update).toHaveBeenCalledWith(
        'session-4',
        expect.objectContaining({
            sessionCookie: 'encrypted-new',
            status: 'active',
            lastRefreshedAt: '2025-09-26T12:00:00.000Z',
            lastValidatedAt: '2025-09-26T12:00:00.000Z',
            refreshErrorMessage: null,
        })
    );
  });
});
