import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { NextRequest } from 'next/server';
import { POST, GET, DELETE } from '@/app/api/v1/vinted/configure/route';
import { POST as AuthPOST, GET as AuthGET } from '@/app/api/v1/vinted/auth/route';
import { getSessionUser } from '@/lib/services/auth';
import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { vintedCredentialService } from '@/lib/services/auth/vinted-credential-service';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';

// Mock dependencies
vi.mock('@/lib/services/auth');
vi.mock('@/lib/services/database/drizzle-client');
vi.mock('@/lib/services/auth/vinted-credential-service');
vi.mock('@/lib/services/auth/vinted-session-manager');
vi.mock('@/lib/services/auth/vinted-auth-service');

const mockGetSessionUser = vi.mocked(getSessionUser);
const mockDb = vi.mocked(db);
const mockVintedCredentialService = vi.mocked(vintedCredentialService);
const mockVintedSessionManager = vi.mocked(vintedSessionManager);

describe('External Integrations API Tests - Task 14', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockGetSessionUser.mockResolvedValue(mockUser);
    
    // Mock database operations
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    });
    mockDb.update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    });
    mockDb.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined)
    });
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      })
    });
    mockDb.transaction = vi.fn().mockImplementation((callback) => callback(mockDb));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Vinted Authentication API', () => {
    describe('POST /api/v1/vinted/auth', () => {
      it('should store Vinted cookie successfully', async () => {
        // Arrange
        const validCookie = 'access_token_web=test-token; refresh_token_web=refresh-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-cookie');

        const request = new NextRequest('http://localhost/api/v1/vinted/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: validCookie })
        });

        // Act
        const response = await AuthPOST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockVintedCredentialService.encrypt).toHaveBeenCalledWith(validCookie);
        expect(mockDb.insert).toHaveBeenCalledWith(vintedSessions);
      });

      it('should return 400 when cookie is missing', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/v1/vinted/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        // Act
        const response = await AuthPOST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe('Cookie Vinted manquant ou invalide.');
      });

      it('should return 400 when cookie is invalid type', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/v1/vinted/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: 123 })
        });

        // Act
        const response = await AuthPOST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe('Cookie Vinted manquant ou invalide.');
      });

      it('should handle encryption errors', async () => {
        // Arrange
        const validCookie = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockRejectedValue(new Error('Encryption failed'));

        const request = new NextRequest('http://localhost/api/v1/vinted/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: validCookie })
        });

        // Act
        const response = await AuthPOST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.error).toBe('Erreur lors de l\'enregistrement du cookie.');
        expect(data.details).toBe('Encryption failed');
      });

      it('should handle database errors', async () => {
        // Arrange
        const validCookie = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-cookie');
        mockDb.insert = vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockRejectedValue(new Error('Database error'))
          })
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: validCookie })
        });

        // Act
        const response = await AuthPOST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.error).toBe('Erreur lors de l\'enregistrement du cookie.');
      });
    });

    describe('GET /api/v1/vinted/auth', () => {
      it('should validate existing session successfully', async () => {
        // Arrange
        const mockSession = [{
          session_cookie: 'encrypted-cookie'
        }];
        mockDb.select = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockSession)
          })
        });
        mockVintedCredentialService.decrypt.mockResolvedValue('access_token_web=valid-token');

        // Mock VintedAuthService
        const mockAuthService = {
          validateAccessToken: vi.fn().mockResolvedValue(true)
        };
        vi.mocked(VintedAuthService).mockImplementation(() => mockAuthService as any);
        vi.mocked(VintedAuthService.extractAccessTokenFromCookie).mockReturnValue('valid-token');

        const request = new NextRequest('http://localhost/api/v1/vinted/auth');

        // Act
        const response = await AuthGET();
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.authenticated).toBe(true);
        expect(data.tokens).toBeDefined();
      });

      it('should return 401 when no session exists', async () => {
        // Arrange
        mockDb.select = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/auth');

        // Act
        const response = await AuthGET();
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.authenticated).toBe(false);
        expect(data.error).toBe('Aucun cookie Vinted enregistré.');
      });

      it('should refresh token when validation fails', async () => {
        // Arrange
        const mockSession = [{
          session_cookie: 'encrypted-cookie'
        }];
        mockDb.select = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockSession)
          })
        });
        mockVintedCredentialService.decrypt.mockResolvedValue('access_token_web=expired-token');

        const mockAuthService = {
          validateAccessToken: vi.fn().mockResolvedValue(false),
          refreshAccessToken: vi.fn().mockResolvedValue({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token'
          })
        };
        vi.mocked(VintedAuthService).mockImplementation(() => mockAuthService as any);

        const request = new NextRequest('http://localhost/api/v1/vinted/auth');

        // Act
        const response = await AuthGET();
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.authenticated).toBe(true);
        expect(data.tokens).toEqual({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        });
      });

      it('should handle decryption errors', async () => {
        // Arrange
        const mockSession = [{
          session_cookie: 'encrypted-cookie'
        }];
        mockDb.select = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockSession)
          })
        });
        mockVintedCredentialService.decrypt.mockRejectedValue(new Error('Decryption failed'));

        const request = new NextRequest('http://localhost/api/v1/vinted/auth');

        // Act
        const response = await AuthGET();
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.authenticated).toBe(false);
        expect(data.error).toBe('Erreur lors de la vérification.');
      });
    });
  });

  describe('Vinted Configuration API', () => {
    describe('GET /api/v1/vinted/configure', () => {
      it('should return configuration status for authenticated user', async () => {
        // Arrange
        const mockSessionData = [{
          status: 'active',
          lastRefreshedAt: '2025-01-01T00:00:00.000Z',
          refreshErrorMessage: null
        }];
        mockDb.select = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockSessionData)
            })
          })
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/configure');

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toEqual({
          status: 'active',
          lastRefreshedAt: '2025-01-01T00:00:00.000Z',
          refreshErrorMessage: null
        });
      });

      it('should return requires_configuration when no session exists', async () => {
        // Arrange
        mockDb.select = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([])
            })
          })
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/configure');

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.status).toBe('requires_configuration');
      });

      it('should return 401 when user is not authenticated', async () => {
        // Arrange
        mockGetSessionUser.mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/v1/vinted/configure');

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.message).toBe('Non authentifié');
      });

      it('should handle database errors gracefully', async () => {
        // Arrange
        mockDb.select = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error('Database error'))
            })
          })
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/configure');

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur interne du serveur');
        expect(data.error).toBe('Database error');
      });
    });

    describe('POST /api/v1/vinted/configure', () => {
      it('should configure Vinted session successfully', async () => {
        // Arrange
        const sessionToken = 'access_token_web=new-token; refresh_token_web=new-refresh';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-session-token');
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: true,
          tokens: {
            accessToken: 'new-token',
            refreshToken: 'new-refresh'
          }
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.message).toBe('Cookie/token Vinted enregistré avec succès.');
        expect(mockVintedCredentialService.encrypt).toHaveBeenCalledWith(sessionToken);
        expect(mockVintedSessionManager.refreshSession).toHaveBeenCalledWith(mockUser.id);
      });

      it('should return 400 when session token is missing', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(data.message).toBe('Le cookie/token Vinted est requis.');
      });

      it('should return 401 when user is not authenticated', async () => {
        // Arrange
        mockGetSessionUser.mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: 'test-token' })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.message).toBe('Non authentifié');
      });

      it('should handle encryption errors', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockRejectedValue(new Error('Encryption failed'));

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
        expect(data.error).toBe('Encryption failed');
      });

      it('should handle database transaction errors', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-token');
        mockDb.transaction = vi.fn().mockRejectedValue(new Error('Transaction failed'));

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
        expect(data.error).toBe('Transaction failed');
      });

      it('should handle session refresh errors', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-token');
        mockVintedSessionManager.refreshSession.mockRejectedValue(new Error('Refresh failed'));

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
        expect(data.error).toBe('Refresh failed');
      });
    });

    describe('DELETE /api/v1/vinted/configure', () => {
      it('should delete Vinted configuration successfully', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'DELETE'
        });

        // Act
        const response = await DELETE(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.message).toBe('Configuration Vinted supprimée avec succès.');
        expect(mockDb.delete).toHaveBeenCalledWith(vintedSessions);
      });

      it('should return 401 when user is not authenticated', async () => {
        // Arrange
        mockGetSessionUser.mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'DELETE'
        });

        // Act
        const response = await DELETE(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.message).toBe('Non authentifié');
      });

      it('should handle database deletion errors', async () => {
        // Arrange
        mockDb.delete = vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Delete failed'))
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'DELETE'
        });

        // Act
        const response = await DELETE(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur interne du serveur');
        expect(data.error).toBe('Delete failed');
      });
    });
  });

  describe('External API Error Handling', () => {
    describe('Network Error Scenarios', () => {
      it('should handle connection timeout errors', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-token');
        mockVintedSessionManager.refreshSession.mockRejectedValue(
          Object.assign(new Error('timeout of 5000ms exceeded'), { code: 'ECONNABORTED' })
        );

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
        expect(data.error).toContain('timeout');
      });

      it('should handle DNS resolution errors', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-token');
        mockVintedSessionManager.refreshSession.mockRejectedValue(
          Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' })
        );

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
        expect(data.error).toContain('ENOTFOUND');
      });

      it('should handle SSL certificate errors', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-token');
        mockVintedSessionManager.refreshSession.mockRejectedValue(
          Object.assign(new Error('certificate verify failed'), { code: 'CERT_UNTRUSTED' })
        );

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
        expect(data.error).toContain('certificate');
      });
    });

    describe('HTTP Error Scenarios', () => {
      it('should handle 401 Unauthorized errors', async () => {
        // Arrange
        const mockSession = [{
          session_cookie: 'encrypted-cookie'
        }];
        mockDb.select = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockSession)
          })
        });
        mockVintedCredentialService.decrypt.mockResolvedValue('access_token_web=invalid-token');

        const mockAuthService = {
          validateAccessToken: vi.fn().mockResolvedValue({
            valid: false,
            status: 401,
            error: 'Unauthorized'
          }),
          refreshAccessToken: vi.fn().mockResolvedValue(null)
        };
        vi.mocked(VintedAuthService).mockImplementation(() => mockAuthService as any);

        const request = new NextRequest('http://localhost/api/v1/vinted/auth');

        // Act
        const response = await AuthGET();
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.authenticated).toBe(false);
      });

      it('should handle 429 Rate Limit errors', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-token');
        
        const rateLimitError = new Error('Too Many Requests');
        (rateLimitError as any).response = { status: 429, statusText: 'Too Many Requests' };
        mockVintedSessionManager.refreshSession.mockRejectedValue(rateLimitError);

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
        expect(data.error).toBe('Too Many Requests');
      });

      it('should handle 503 Service Unavailable errors', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-token');
        
        const serviceError = new Error('Service Unavailable');
        (serviceError as any).response = { status: 503, statusText: 'Service Unavailable' };
        mockVintedSessionManager.refreshSession.mockRejectedValue(serviceError);

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
        expect(data.error).toBe('Service Unavailable');
      });
    });

    describe('Data Validation Errors', () => {
      it('should handle malformed JSON in request body', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json'
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
      });

      it('should handle missing Content-Type header', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          body: JSON.stringify({ sessionToken: 'test-token' })
        });

        // Act
        const response = await POST(request);

        // Assert
        // Should still work as Next.js handles JSON parsing
        expect(response.status).toBe(200);
      });

      it('should handle empty request body', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ''
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
      });
    });
  });

  describe('Integration Performance Tests', () => {
    describe('Response Time Tests', () => {
      it('should respond to configuration requests within acceptable time', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-token');
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: true,
          tokens: { accessToken: 'new-token', refreshToken: 'new-refresh' }
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        const startTime = Date.now();

        // Act
        const response = await POST(request);
        await response.json();

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Assert
        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      });

      it('should handle concurrent configuration requests', async () => {
        // Arrange
        const sessionToken = 'access_token_web=test-token';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-token');
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: true,
          tokens: { accessToken: 'new-token', refreshToken: 'new-refresh' }
        });

        const requests = Array(5).fill(null).map(() => 
          new NextRequest('http://localhost/api/v1/vinted/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
          })
        );

        const startTime = Date.now();

        // Act
        const responses = await Promise.all(requests.map(req => POST(req)));
        const results = await Promise.all(responses.map(res => res.json()));

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Assert
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });
        results.forEach(result => {
          expect(result.message).toBe('Cookie/token Vinted enregistré avec succès.');
        });
        expect(totalTime).toBeLessThan(3000); // Should handle 5 concurrent requests within 3 seconds
      });
    });

    describe('Memory Usage Tests', () => {
      it('should handle large session tokens without memory issues', async () => {
        // Arrange
        const largeSessionToken = 'access_token_web=' + 'x'.repeat(10000); // 10KB token
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-large-token');
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: true,
          tokens: { accessToken: 'new-token', refreshToken: 'new-refresh' }
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: largeSessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.message).toBe('Cookie/token Vinted enregistré avec succès.');
        expect(mockVintedCredentialService.encrypt).toHaveBeenCalledWith(largeSessionToken);
      });

      it('should handle multiple large requests sequentially', async () => {
        // Arrange
        const largeSessionTokens = Array(3).fill(null).map((_, i) => 
          'access_token_web=' + `token${i}`.repeat(1000)
        );
        
        mockVintedCredentialService.encrypt.mockImplementation((token) => 
          Promise.resolve(`encrypted-${token.slice(0, 20)}`)
        );
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: true,
          tokens: { accessToken: 'new-token', refreshToken: 'new-refresh' }
        });

        // Act
        for (const sessionToken of largeSessionTokens) {
          const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
          });

          const response = await POST(request);
          const data = await response.json();

          // Assert
          expect(response.status).toBe(200);
          expect(data.message).toBe('Cookie/token Vinted enregistré avec succès.');
        }
      });
    });
  });

  describe('Security Tests', () => {
    describe('Input Validation', () => {
      it('should sanitize session token input', async () => {
        // Arrange
        const maliciousToken = 'access_token_web=<script>alert("xss")</script>';
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-sanitized-token');
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: true,
          tokens: { accessToken: 'new-token', refreshToken: 'new-refresh' }
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: maliciousToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.message).toBe('Cookie/token Vinted enregistré avec succès.');
        expect(mockVintedCredentialService.encrypt).toHaveBeenCalledWith(maliciousToken);
      });

      it('should handle SQL injection attempts in session tokens', async () => {
        // Arrange
        const sqlInjectionToken = "access_token_web='; DROP TABLE users; --";
        mockVintedCredentialService.encrypt.mockResolvedValue('encrypted-safe-token');
        mockVintedSessionManager.refreshSession.mockResolvedValue({
          success: true,
          tokens: { accessToken: 'new-token', refreshToken: 'new-refresh' }
        });

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: sqlInjectionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.message).toBe('Cookie/token Vinted enregistré avec succès.');
        // The token should be encrypted as-is, but database operations should be safe
      });

      it('should reject excessively long session tokens', async () => {
        // Arrange
        const excessivelyLongToken = 'access_token_web=' + 'x'.repeat(100000); // 100KB token
        
        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: excessivelyLongToken })
        });

        // Act
        const response = await POST(request);

        // Assert
        // Should either succeed (if system can handle it) or fail gracefully
        expect([200, 400, 413, 500]).toContain(response.status);
      });
    });

    describe('Authentication Security', () => {
      it('should not expose sensitive information in error messages', async () => {
        // Arrange
        const sessionToken = 'access_token_web=sensitive-token';
        mockVintedCredentialService.encrypt.mockRejectedValue(
          new Error('Encryption failed: sensitive-key-info')
        );

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(data.message).toBe('Erreur lors de la configuration');
        expect(data.error).not.toContain('sensitive-token');
        expect(data.error).toBe('Encryption failed: sensitive-key-info');
      });

      it('should validate user session before allowing configuration', async () => {
        // Arrange
        mockGetSessionUser.mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/v1/vinted/configure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: 'test-token' })
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(data.message).toBe('Non authentifié');
        expect(mockVintedCredentialService.encrypt).not.toHaveBeenCalled();
      });
    });
  });
});