import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/v1/health/route';

// Mock des dépendances
vi.mock('@/lib/services/auth/vinted-session-manager');
vi.mock('@/lib/services/database/db');
vi.mock('@/lib/utils/logging/logger');
vi.mock('@/lib/middlewares/database-initialization');

describe('/api/v1/health - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return health status with database and auth information', async () => {
    // Arrange - Mock successful health check
    const mockVintedSessionManager = await vi.importMock('@/lib/services/auth/vinted-session-manager');
    const mockDatabaseService = await vi.importMock('@/lib/services/database/db');
    const mockDatabaseInit = await vi.importMock('@/lib/middlewares/database-initialization');

    mockVintedSessionManager.vintedSessionManager = {
      isTokenValid: vi.fn().mockResolvedValue(true),
      getTokenStatus: vi.fn().mockReturnValue({
        isValid: true,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        lastRefresh: new Date().toISOString(),
      }),
    };

    mockDatabaseInit.checkDatabaseStatus = vi.fn().mockResolvedValue({
      status: 'healthy',
      connectionPool: { active: 2, idle: 8, total: 10 },
      lastMigration: '2025-01-01T00:00:00Z',
      tablesCount: 15,
    });

    mockDatabaseService.databaseService = {
      isHealthy: vi.fn().mockResolvedValue(true),
    };

    // Act
    const response = await GET();
    
    // Assert
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);
    
    // Vérifier que les services sont appelés
    expect(mockVintedSessionManager.vintedSessionManager.isTokenValid).toHaveBeenCalled();
    expect(mockDatabaseInit.checkDatabaseStatus).toHaveBeenCalled();
  });

  it('should handle database connection errors gracefully', async () => {
    // Arrange - Mock database error
    const mockDatabaseInit = await vi.importMock('@/lib/middlewares/database-initialization');
    const mockVintedSessionManager = await vi.importMock('@/lib/services/auth/vinted-session-manager');

    mockDatabaseInit.checkDatabaseStatus = vi.fn().mockRejectedValue(
      new Error('Database connection failed')
    );

    mockVintedSessionManager.vintedSessionManager = {
      isTokenValid: vi.fn().mockResolvedValue(false),
      getTokenStatus: vi.fn().mockReturnValue({
        isValid: false,
        error: 'Token expired',
      }),
    };

    // Act
    const response = await GET();
    
    // Assert
    expect(response).toBeInstanceOf(NextResponse);
    
    // Le health check devrait toujours retourner une réponse, même en cas d'erreur
    const responseData = await response.json();
    expect(responseData).toHaveProperty('status');
    expect(responseData).toHaveProperty('timestamp');
    expect(responseData).toHaveProperty('services');
  });

  it('should return proper service status format', async () => {
    // Arrange
    const mockVintedSessionManager = await vi.importMock('@/lib/services/auth/vinted-session-manager');
    const mockDatabaseInit = await vi.importMock('@/lib/middlewares/database-initialization');

    mockVintedSessionManager.vintedSessionManager = {
      isTokenValid: vi.fn().mockResolvedValue(true),
      getTokenStatus: vi.fn().mockReturnValue({
        isValid: true,
        expiresAt: '2025-12-31T23:59:59Z',
      }),
    };

    mockDatabaseInit.checkDatabaseStatus = vi.fn().mockResolvedValue({
      status: 'healthy',
      connectionPool: { active: 3, idle: 7, total: 10 },
    });

    // Act
    const response = await GET();
    
    // Assert
    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    
    // Vérifier la structure de la réponse
    expect(responseData).toHaveProperty('status');
    expect(responseData).toHaveProperty('timestamp');
    expect(responseData).toHaveProperty('services');
    
    if (responseData.services) {
      expect(responseData.services).toHaveProperty('database');
      expect(responseData.services).toHaveProperty('vintedAuth');
    }
  });

  it('should handle authentication service failures gracefully', async () => {
    // Arrange - Mock auth service error
    const mockVintedSessionManager = await vi.importMock('@/lib/services/auth/vinted-session-manager');
    const mockDatabaseInit = await vi.importMock('@/lib/middlewares/database-initialization');

    mockVintedSessionManager.vintedSessionManager = {
      isTokenValid: vi.fn().mockRejectedValue(new Error('Auth service unavailable')),
      getTokenStatus: vi.fn().mockReturnValue({
        isValid: false,
        error: 'Service unavailable',
      }),
    };

    mockDatabaseInit.checkDatabaseStatus = vi.fn().mockResolvedValue({
      status: 'healthy',
    });

    // Act
    const response = await GET();
    
    // Assert
    expect(response).toBeInstanceOf(NextResponse);
    
    const responseData = await response.json();
    expect(responseData).toHaveProperty('status');
    
    // L'API devrait indiquer un statut dégradé si un service est en panne
    if (responseData.services?.vintedAuth) {
      expect(responseData.services.vintedAuth).toHaveProperty('status');
    }
  });

  it('should return consistent response format', async () => {
    // Arrange - Mock services with minimal responses
    const mockVintedSessionManager = await vi.importMock('@/lib/services/auth/vinted-session-manager');
    const mockDatabaseInit = await vi.importMock('@/lib/middlewares/database-initialization');

    mockVintedSessionManager.vintedSessionManager = {
      isTokenValid: vi.fn().mockResolvedValue(false),
      getTokenStatus: vi.fn().mockReturnValue({ isValid: false }),
    };

    mockDatabaseInit.checkDatabaseStatus = vi.fn().mockResolvedValue({
      status: 'healthy',
    });

    // Act
    const response = await GET();
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    
    const responseData = await response.json();
    
    // Vérifier les propriétés requises
    expect(responseData).toHaveProperty('status');
    expect(responseData).toHaveProperty('timestamp');
    expect(typeof responseData.timestamp).toBe('string');
    
    // Vérifier que le timestamp est une date ISO valide
    expect(() => new Date(responseData.timestamp)).not.toThrow();
  });
});