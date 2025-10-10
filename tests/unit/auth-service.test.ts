/**
 * Tests unitaires pour le service d'authentification principal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as auth from '../../lib/services/auth/auth';
import { databaseService } from '../../lib/services/database/db';
import { cookies } from 'next/headers';
import * as bcrypt from 'bcrypt';

// Mocks
vi.mock('../../lib/services/database/db', () => ({
  databaseService: {
    queryOne: vi.fn(),
    query: vi.fn(),
    execute: vi.fn(),
    insert: vi.fn()
  }
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn()
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234')
}));

vi.mock('../../lib/utils/logging/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Service d\'authentification', () => {
  const mockCookies = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    password_hash: 'hashed-password'
  };

  const mockSession = {
    id: 'session-123',
    user_id: 'user-123',
    username: 'testuser',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ai_config: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockReturnValue(mockCookies as any);
    mockCookies.get.mockReturnValue({ value: 'session-123' });
    
    // Mock Date pour des tests prévisibles
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createUser', () => {
    it('devrait créer un utilisateur avec succès', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(null); // Utilisateur n'existe pas
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(databaseService.execute).mockResolvedValue({
        changes: 1,
        lastInsertRowid: 1
      } as any);

      const result = await auth.createUser('newuser', 'password123');

      expect(result).toEqual({
        id: 'test-uuid-1234',
        username: 'newuser'
      });
      
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(databaseService.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['test-uuid-1234', 'newuser', 'hashed-password']),
        'createUser'
      );
    });

    it('devrait échouer si l\'utilisateur existe déjà', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(mockUser);

      await expect(auth.createUser('existinguser', 'password123')).rejects.toThrow(
        'Un utilisateur avec ce nom existe déjà'
      );
    });

    it('devrait valider les paramètres d\'entrée', async () => {
      await expect(auth.createUser('', 'password123')).rejects.toThrow();
      await expect(auth.createUser('user', '')).rejects.toThrow();
      await expect(auth.createUser('user@invalid', 'pass')).rejects.toThrow();
    });
  });

  describe('verifyCredentials', () => {
    it('devrait vérifier des identifiants valides', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await auth.verifyCredentials('testuser', 'password123');

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser'
      });
      
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('devrait échouer avec un utilisateur inexistant', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(null);

      await expect(auth.verifyCredentials('nonexistent', 'password123')).rejects.toThrow(
        'USER_NOT_FOUND'
      );
    });

    it('devrait échouer avec un mot de passe incorrect', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(auth.verifyCredentials('testuser', 'wrongpassword')).rejects.toThrow(
        'INVALID_PASSWORD'
      );
    });
  });

  describe('createSession', () => {
    it('devrait créer une session avec succès', async () => {
      // Mock pour vérifier que l'utilisateur existe
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce({ id: '550e8400-e29b-41d4-a716-446655440000' });
      
      vi.mocked(databaseService.execute).mockResolvedValue({
        changes: 1,
        lastInsertRowid: 1
      } as any);

      const sessionId = await auth.createSession('550e8400-e29b-41d4-a716-446655440000');

      expect(sessionId).toBe('test-uuid-1234');
      expect(databaseService.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining(['test-uuid-1234', '550e8400-e29b-41d4-a716-446655440000']),
        'createSession'
      );
    });

    it('devrait valider l\'ID utilisateur', async () => {
      await expect(auth.createSession('')).rejects.toThrow();
      await expect(auth.createSession('invalid-uuid')).rejects.toThrow();
    });
  });

  describe('requireAuth', () => {
    it('devrait retourner l\'utilisateur pour une session valide', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(mockSession);

      const result = await auth.requireAuth();

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        isAdmin: false,
        aiConfig: undefined
      });
    });

    it('devrait échouer si aucun cookie de session', async () => {
      mockCookies.get.mockReturnValue(undefined);

      await expect(auth.requireAuth()).rejects.toThrow('Non authentifié');
    });

    it('devrait échouer si la session n\'existe pas en base', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(null);

      await expect(auth.requireAuth()).rejects.toThrow('Session invalide');
    });

    it('devrait échouer si la session est expirée', async () => {
      const expiredSession = {
        ...mockSession,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      };
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(expiredSession);
      vi.mocked(databaseService.execute).mockResolvedValue({ changes: 1, lastInsertRowid: 1 } as any);

      await expect(auth.requireAuth()).rejects.toThrow('Session expirée');
      
      // Vérifie que la session expirée est supprimée
      expect(databaseService.execute).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE id = ?',
        ['session-123'],
        'requireAuth-cleanup'
      );
    });

    it('devrait identifier l\'utilisateur admin', async () => {
      const adminSession = { ...mockSession, username: 'admin' };
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(adminSession);

      const result = await auth.requireAuth();

      expect(result.isAdmin).toBe(true);
    });
  });

  describe('requireAdmin', () => {
    it('devrait autoriser l\'accès pour un admin', async () => {
      const adminSession = { ...mockSession, username: 'admin' };
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(adminSession);

      const result = await auth.requireAdmin();

      expect(result.username).toBe('admin');
      expect(result.isAdmin).toBe(true);
    });

    it('devrait refuser l\'accès pour un utilisateur normal', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(mockSession);

      await expect(auth.requireAdmin()).rejects.toThrow('Non autorisé');
    });
  });

  describe('getSessionUser', () => {
    it('devrait retourner l\'utilisateur pour une session valide', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(mockSession);

      const result = await auth.getSessionUser();

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        isAdmin: false,
        aiConfig: undefined
      });
    });

    it('devrait retourner null si aucune session', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const result = await auth.getSessionUser();

      expect(result).toBe(null);
    });

    it('devrait retourner null si session expirée', async () => {
      const expiredSession = {
        ...mockSession,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      };
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(expiredSession);
      vi.mocked(databaseService.execute).mockResolvedValue({ changes: 1, lastInsertRowid: 1 } as any);

      const result = await auth.getSessionUser();

      expect(result).toBe(null);
    });
  });

  describe('validateSession', () => {
    const mockRequest = {
      headers: new Headers(),
      url: 'http://localhost:3000'
    } as NextRequest;

    it('devrait valider une session existante', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(mockSession);

      const result = await auth.validateSession(mockRequest);

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 'user-123',
        username: 'testuser',
        isAdmin: false,
        aiConfig: undefined
      });
    });

    it('devrait échouer pour une session invalide', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const result = await auth.validateSession(mockRequest);

      expect(result.success).toBe(false);
      expect(result.user).toBe(null);
      expect(result.message).toBe('Non authentifié');
    });
  });

  describe('signOut', () => {
    it('devrait supprimer la session et le cookie', async () => {
      // Mock pour récupérer la session avant suppression
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce({ user_id: 'user-123' });
      vi.mocked(databaseService.execute).mockResolvedValue({ changes: 1, lastInsertRowid: 1 } as any);

      await auth.signOut();

      expect(databaseService.execute).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE id = ?',
        ['session-123'],
        'signOut'
      );
      expect(mockCookies.delete).toHaveBeenCalled();
    });

    it('devrait gérer l\'absence de session', async () => {
      mockCookies.get.mockReturnValue(undefined);

      await expect(auth.signOut()).resolves.not.toThrow();
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de base de données', async () => {
      vi.mocked(databaseService.queryOne).mockRejectedValue(new Error('DB Error'));

      await expect(auth.requireAuth()).rejects.toThrow('Non authentifié');
    });

    it('devrait gérer les erreurs de hachage', async () => {
      vi.mocked(databaseService.queryOne).mockResolvedValueOnce(null);
      vi.mocked(bcrypt.hash).mockRejectedValue(new Error('Hash Error'));

      await expect(auth.createUser('user', 'password')).rejects.toThrow();
    });
  });

  describe('Validation des schémas', () => {
    it('devrait valider les identifiants utilisateur', async () => {
      const invalidCases = [
        ['', 'password123'], // Username vide
        ['u', 'password123'], // Username trop court
        ['user@invalid', 'password123'], // Caractères invalides
        ['validuser', ''], // Mot de passe vide
        ['validuser', '123'], // Mot de passe trop court
      ];

      for (const [username, password] of invalidCases) {
        await expect(auth.createUser(username, password)).rejects.toThrow();
      }
    });
  });
});