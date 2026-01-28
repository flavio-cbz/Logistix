import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as AuthAdapter from '@/lib/services/auth/auth';
import { serviceContainer } from '@/lib/services/container';

// Mock dependencies
vi.mock('@/lib/services/container', () => ({
    serviceContainer: {
        getAuthService: vi.fn(),
    },
}));

describe('Auth Adapter (auth.ts)', () => {
    const mockAuthService = {
        createUser: vi.fn(),
        verifyCredentials: vi.fn(),
        createSession: vi.fn(),
        destroySession: vi.fn(),
        requireAuth: vi.fn(),
        getSessionUser: vi.fn(),
        validateSession: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (serviceContainer.getAuthService as any).mockReturnValue(mockAuthService);
    });

    it('should delegate createUser to AuthService', async () => {
        await AuthAdapter.createUser('test', 'password');
        expect(mockAuthService.createUser).toHaveBeenCalledWith({ username: 'test', password: 'password' });
    });

    it('should delegate verifyCredentials to AuthService', async () => {
        await AuthAdapter.verifyCredentials('test', 'password');
        expect(mockAuthService.verifyCredentials).toHaveBeenCalledWith('test', 'password');
    });

    it('should delegate createSession to AuthService', async () => {
        await AuthAdapter.createSession('user-id');
        expect(mockAuthService.createSession).toHaveBeenCalledWith('user-id');
    });

    it('should delegate signOut to AuthService.destroySession', async () => {
        await AuthAdapter.signOut();
        expect(mockAuthService.destroySession).toHaveBeenCalled();
    });

    it('should delegate requireAuth to AuthService', async () => {
        await AuthAdapter.requireAuth();
        expect(mockAuthService.requireAuth).toHaveBeenCalled();
    });

    it('should delegate getSessionUser to AuthService', async () => {
        await AuthAdapter.getSessionUser();
        expect(mockAuthService.getSessionUser).toHaveBeenCalled();
    });
});
