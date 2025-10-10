/**
 * Tests unitaires pour les use-cases d'authentification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RegisterUserUseCase } from '@/lib/application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '@/lib/application/use-cases/login-user.use-case';
import { ValidateSessionUseCase } from '@/lib/application/use-cases/validate-session.use-case';
import { LogoutUserUseCase } from '@/lib/application/use-cases/logout-user.use-case';
import type {
  AuthRepository,
  User,
  Session,
  CreateUserDTO,
  CreateSessionDTO,
} from '@/lib/application/ports/auth-repository.port';
import { ValidationError, ConflictError, AuthError } from '@/lib/shared/errors/base-errors';

// ============= IN-MEMORY AUTH REPOSITORY (pour tests) =============

class InMemoryAuthRepository implements AuthRepository {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();

  async findUserByUsername(username: string): Promise<User | null> {
    const user = Array.from(this.users.values()).find((u) => u.username === username);
    return user || null;
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async createUser(data: CreateUserDTO): Promise<User> {
    const now = new Date().toISOString();
    const user: User = {
      id: data.id,
      username: data.username,
      passwordHash: data.passwordHash,
      email: null,
      bio: null,
      avatar: null,
      language: null,
      theme: null,
      aiConfig: null,
      encryptionSecret: data.encryptionSecret || null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findSessionById(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async createSession(data: CreateSessionDTO): Promise<Session> {
    const now = new Date().toISOString();
    const session: Session = {
      sessionId: data.sessionId,
      userId: data.userId,
      expiresAt: data.expiresAt,
      createdAt: now,
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt) <= now) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }

  // Helpers pour les tests
  reset() {
    this.users.clear();
    this.sessions.clear();
  }
}

// ============= TESTS =============

describe('Auth use-cases', () => {
  let repo: InMemoryAuthRepository;
  let registerUseCase: RegisterUserUseCase;
  let loginUseCase: LoginUserUseCase;
  let validateSessionUseCase: ValidateSessionUseCase;
  let logoutUseCase: LogoutUserUseCase;

  beforeEach(() => {
    repo = new InMemoryAuthRepository();
    registerUseCase = new RegisterUserUseCase(repo);
    loginUseCase = new LoginUserUseCase(repo);
    validateSessionUseCase = new ValidateSessionUseCase(repo);
    logoutUseCase = new LogoutUserUseCase(repo);
  });

  // ============= REGISTER USE CASE =============

  describe('RegisterUserUseCase', () => {
    it('crée un utilisateur avec des credentials valides', async () => {
      const result = await registerUseCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.username).toBe('testuser');
      expect(result.userId).toBeDefined();

      const user = await repo.findUserByUsername('testuser');
      expect(user).not.toBeNull();
      expect(user!.username).toBe('testuser');
      expect(user!.passwordHash).toBeDefined();
      expect(user!.passwordHash).not.toBe('password123'); // Vérifie que le mot de passe est hashé
    });

    it('normalise le username (trim)', async () => {
      const result = await registerUseCase.execute({
        username: '  testuser  ',
        password: 'password123',
      });

      expect(result.username).toBe('testuser');
    });

    it('lève ConflictError si le username existe déjà', async () => {
      await registerUseCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      await expect(
        registerUseCase.execute({
          username: 'testuser',
          password: 'anotherpass',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('lève ValidationError pour un username trop court', async () => {
      await expect(
        registerUseCase.execute({
          username: 'a',
          password: 'password123',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('lève ValidationError pour un username avec des caractères invalides', async () => {
      await expect(
        registerUseCase.execute({
          username: 'user@invalid',
          password: 'password123',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('lève ValidationError pour un password trop court', async () => {
      await expect(
        registerUseCase.execute({
          username: 'testuser',
          password: '12345',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ============= LOGIN USE CASE =============

  describe('LoginUserUseCase', () => {
    beforeEach(async () => {
      // Créer un utilisateur test
      await registerUseCase.execute({
        username: 'testuser',
        password: 'password123',
      });
    });

    it('authentifie un utilisateur avec des credentials valides', async () => {
      const result = await loginUseCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.sessionId).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.expiresAt).toBeDefined();

      // Vérifier que la session a été créée
      const session = await repo.findSessionById(result.sessionId);
      expect(session).not.toBeNull();
    });

    it('lève AuthError pour un username inexistant', async () => {
      await expect(
        loginUseCase.execute({
          username: 'nonexistent',
          password: 'password123',
        })
      ).rejects.toThrow(AuthError);
    });

    it('lève AuthError pour un mot de passe incorrect', async () => {
      await expect(
        loginUseCase.execute({
          username: 'testuser',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(AuthError);
    });

    it('normalise le username (trim)', async () => {
      const result = await loginUseCase.execute({
        username: '  testuser  ',
        password: 'password123',
      });

      expect(result.username).toBe('testuser');
    });

    it('lève ValidationError pour un username vide', async () => {
      await expect(
        loginUseCase.execute({
          username: '   ',
          password: 'password123',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ============= VALIDATE SESSION USE CASE =============

  describe('ValidateSessionUseCase', () => {
    let sessionId: string;
    let userId: string;

    beforeEach(async () => {
      // Créer un utilisateur et se connecter
      const registerResult = await registerUseCase.execute({
        username: 'testuser',
        password: 'password123',
      });
      userId = registerResult.userId;

      const loginResult = await loginUseCase.execute({
        username: 'testuser',
        password: 'password123',
      });
      sessionId = loginResult.sessionId;
    });

    it('valide une session active', async () => {
      const result = await validateSessionUseCase.execute({ sessionId });

      expect(result.session.sessionId).toBe(sessionId);
      expect(result.session.userId).toBe(userId);
      expect(result.user.username).toBe('testuser');
      expect(result.user.isAdmin).toBe(false);
    });

    it('lève AuthError pour une session inexistante', async () => {
      await expect(
        validateSessionUseCase.execute({ sessionId: 'invalid-session-id' })
      ).rejects.toThrow(AuthError);
    });

    it('lève AuthError pour une session expirée', async () => {
      // Créer une session expirée
      const expiredSession: CreateSessionDTO = {
        sessionId: 'expired-session',
        userId,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expirée il y a 1 seconde
      };
      await repo.createSession(expiredSession);

      await expect(
        validateSessionUseCase.execute({ sessionId: 'expired-session' })
      ).rejects.toThrow(AuthError);

      // Vérifier que la session expirée a été supprimée
      const session = await repo.findSessionById('expired-session');
      expect(session).toBeNull();
    });

    it('identifie un utilisateur admin', async () => {
      // Créer un utilisateur admin
      await registerUseCase.execute({
        username: 'admin',
        password: 'adminpass',
      });

      const adminLogin = await loginUseCase.execute({
        username: 'admin',
        password: 'adminpass',
      });

      const result = await validateSessionUseCase.execute({ sessionId: adminLogin.sessionId });

      expect(result.user.isAdmin).toBe(true);
    });

    it('lève ValidationError pour un sessionId vide', async () => {
      await expect(
        validateSessionUseCase.execute({ sessionId: '   ' })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ============= LOGOUT USE CASE =============

  describe('LogoutUserUseCase', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Créer un utilisateur et se connecter
      await registerUseCase.execute({
        username: 'testuser',
        password: 'password123',
      });

      const loginResult = await loginUseCase.execute({
        username: 'testuser',
        password: 'password123',
      });
      sessionId = loginResult.sessionId;
    });

    it('supprime une session existante', async () => {
      const result = await logoutUseCase.execute({ sessionId });

      expect(result.success).toBe(true);

      // Vérifier que la session a été supprimée
      const session = await repo.findSessionById(sessionId);
      expect(session).toBeNull();
    });

    it('ne lève pas d\'erreur pour une session inexistante', async () => {
      const result = await logoutUseCase.execute({ sessionId: 'non-existent' });

      expect(result.success).toBe(true);
    });

    it('lève ValidationError pour un sessionId vide', async () => {
      await expect(
        logoutUseCase.execute({ sessionId: '   ' })
      ).rejects.toThrow(ValidationError);
    });
  });
});
