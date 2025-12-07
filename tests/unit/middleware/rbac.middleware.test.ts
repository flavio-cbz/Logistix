/**
 * Tests for RBAC Functions in Auth Middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  requireRole,
  requireAdmin,
  canAccessResource,
  type AuthContext,
} from '../../../lib/middleware/auth-middleware';
import { serviceContainer } from '../../../lib/services/container';

// Mock service container
vi.mock('../../../lib/services/container', () => ({
  serviceContainer: {
    getAuthService: vi.fn(),
  },
}));

describe('RBAC Functions', () => {
  const mockAuthService = {
    getSessionUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(serviceContainer.getAuthService).mockReturnValue(mockAuthService as any);
  });

  describe('requireAdmin', () => {
    it('should allow admin user', async () => {
      const mockUser = {
        id: 'admin-123',
        username: 'adminuser',
        isAdmin: true,
        role: 'admin',
      };

      mockAuthService.getSessionUser.mockResolvedValue(mockUser);

      const mockReq = new NextRequest('http://localhost:3000/api/admin');
      const result = await requireAdmin(mockReq);

      expect(result.user.isAdmin).toBe(true);
      expect(result.user.id).toBe('admin-123');
    });

    it('should deny regular user', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        isAdmin: false,
        role: 'user',
      };

      mockAuthService.getSessionUser.mockResolvedValue(mockUser);

      const mockReq = new NextRequest('http://localhost:3000/api/admin');

      await expect(requireAdmin(mockReq)).rejects.toThrow('Admin privileges required');
    });
  });

  describe('requireRole', () => {
    it('should allow user with matching role', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        isAdmin: false,
        role: 'editor',
      };

      mockAuthService.getSessionUser.mockResolvedValue(mockUser);

      const mockReq = new NextRequest('http://localhost:3000/api/test');
      const result = await requireRole(['editor', 'admin'], mockReq);

      expect(result.user.role).toBe('editor');
      expect(result.user.id).toBe('user-123');
    });

    it('should deny user without matching role', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        isAdmin: false,
        role: 'viewer',
      };

      mockAuthService.getSessionUser.mockResolvedValue(mockUser);

      const mockReq = new NextRequest('http://localhost:3000/api/test');

      await expect(requireRole(['editor', 'admin'], mockReq)).rejects.toThrow(
        "Role 'viewer' is not authorized for this resource"
      );
    });
  });

  describe('canAccessResource', () => {
    it('should allow user to access their own resource', () => {
      const authContext: AuthContext = {
        user: {
          id: 'user-123',
          username: 'testuser',
          isAdmin: false,
          role: 'user',
        },
        requestId: 'req-123',
      };

      const result = canAccessResource(authContext, 'user-123');

      expect(result).toBe(true);
    });

    it('should deny user accessing another user resource', () => {
      const authContext: AuthContext = {
        user: {
          id: 'user-123',
          username: 'testuser',
          isAdmin: false,
          role: 'user',
        },
        requestId: 'req-123',
      };

      const result = canAccessResource(authContext, 'user-456');

      expect(result).toBe(false);
    });

    it('should allow admin to access any resource', () => {
      const authContext: AuthContext = {
        user: {
          id: 'admin-123',
          username: 'adminuser',
          isAdmin: true,
          role: 'admin',
        },
        requestId: 'req-123',
      };

      const result = canAccessResource(authContext, 'user-456');

      expect(result).toBe(true);
    });

    it('should allow admin to access their own resource', () => {
      const authContext: AuthContext = {
        user: {
          id: 'admin-123',
          username: 'adminuser',
          isAdmin: true,
          role: 'admin',
        },
        requestId: 'req-123',
      };

      const result = canAccessResource(authContext, 'admin-123');

      expect(result).toBe(true);
    });
  });
});
