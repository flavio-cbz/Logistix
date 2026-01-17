import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { databaseService, getCurrentTimestamp } from "@/lib/database";
import { encryptSecret, decryptSecret } from '@/lib/utils/crypto';
import { logger } from '@/lib/utils/logging/logger';

vi.mock('@/lib/database', () => {
  const queryOne = vi.fn();
  const execute = vi.fn();
  const getCurrentTimestamp = vi.fn(() => '2025-09-26T12:00:00.000Z');

  return {
    databaseService: {
      queryOne,
      execute,
    },
    getCurrentTimestamp,
  };
});

vi.mock('@/lib/utils/crypto', () => {
  return {
    encryptSecret: vi.fn(),
    decryptSecret: vi.fn(),
  };
});

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
  const mockDatabaseService = vi.mocked(databaseService);
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
    mockDatabaseService.queryOne.mockResolvedValueOnce({
      id: 'session-1',
      user_id: 'user-1',
      session_cookie: 'encrypted-cookie',
      status: 'active',
      last_validated_at: null,
      last_refreshed_at: null,
      refresh_error_message: null,
    });
    mockDecryptSecret.mockResolvedValueOnce('plain-cookie');

    const cookie = await vintedSessionManager.getSessionCookie('user-1');

    expect(cookie).toBe('plain-cookie');
    expect(mockDecryptSecret).toHaveBeenCalledWith('encrypted-cookie', 'user-1');
    expect(mockDatabaseService.execute).not.toHaveBeenCalled();
  });

  it('marks session as requiring configuration when decryption fails', async () => {
    mockDatabaseService.queryOne.mockResolvedValueOnce({
      id: 'session-2',
      user_id: 'user-2',
      session_cookie: 'encrypted-cookie',
      status: 'active',
      last_validated_at: null,
      last_refreshed_at: null,
      refresh_error_message: null,
    });
    mockDecryptSecret.mockRejectedValueOnce(new Error('decrypt failed'));

    const result = await vintedSessionManager.getSessionCookie('user-2');

    expect(result).toBeNull();
    expect(mockDatabaseService.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vinted_sessions SET'),
      [
        'requires_configuration',
        'Impossible de déchiffrer la session',
        null,
        '2025-09-26T12:00:00.000Z',
        'user-2',
      ],
      'vinted-session-decrypt-failure',
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('refreshes session when token is still valid', async () => {
    mockDatabaseService.queryOne.mockResolvedValueOnce({
      id: 'session-3',
      user_id: 'user-3',
      session_cookie: 'encrypted-cookie',
      status: 'active',
      last_validated_at: null,
      last_refreshed_at: null,
      refresh_error_message: null,
    });
    mockDecryptSecret.mockResolvedValueOnce('plain-cookie');

    const tokenValiditySpy = vi
      .spyOn(vintedSessionManager, 'isTokenValid')
      .mockResolvedValueOnce(true);

    const response = await vintedSessionManager.refreshSession('user-3');

    expect(response).toEqual({ success: true });
    expect(tokenValiditySpy).toHaveBeenCalledWith('plain-cookie');
    expect(mockDatabaseService.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vinted_sessions SET'),
      [
        'active',
        '2025-09-26T12:00:00.000Z',
        null,
        '2025-09-26T12:00:00.000Z',
        'user-3',
      ],
      'vinted-session-validated',
    );
  });

  it('refreshes cookie when token is invalid but refresh succeeds', async () => {
    const initialCookie = 'access_token_web=oldAccess; refresh_token_web=oldRefresh; foo=bar';

    mockDatabaseService.queryOne.mockResolvedValueOnce({
      id: 'session-4',
      user_id: 'user-4',
      session_cookie: 'encrypted-cookie',
      status: 'active',
      last_validated_at: null,
      last_refreshed_at: null,
      refresh_error_message: null,
    });
    mockDecryptSecret.mockResolvedValueOnce(initialCookie);
    mockEncryptSecret.mockResolvedValueOnce('encrypted-new');

    vi.spyOn(vintedSessionManager, 'isTokenValid').mockResolvedValueOnce(false);
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
    expect(mockDatabaseService.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE vinted_sessions SET'),
      [
        'encrypted-new',
        'active',
        '2025-09-26T12:00:00.000Z',
        '2025-09-26T12:00:00.000Z',
        null,
        '2025-09-26T12:00:00.000Z',
        'user-4',
      ],
      'vinted-session-refresh-success',
    );
  });
});
