/**
 * Implémentation SQLite du AuthRepository
 * Couche infrastructure pour la persistance des données d'authentification
 */

import type {
  AuthRepository,
  User,
  Session,
  CreateUserDTO,
  CreateSessionDTO,
} from '@/lib/application/ports/auth-repository.port';
import { databaseService } from '@/lib/services/database/db';
import { InfrastructureError } from '@/lib/shared/errors/base-errors';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  encryption_secret?: string | null;
  email?: string | null;
  bio?: string | null;
  avatar?: string | null;
  language?: string | null;
  theme?: string | null;
  ai_config?: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionRow {
  id: string; // Note: colonne 'id' en DB, mappée vers 'sessionId'
  user_id: string;
  expires_at: string;
  created_at: string;
}

export class SqliteAuthRepository implements AuthRepository {
  
  // ============= USER OPERATIONS =============
  
  async findUserByUsername(username: string): Promise<User | null> {
    try {
      const row = await databaseService.queryOne<UserRow>(
        'SELECT * FROM users WHERE username = ?',
        [username],
        'find-user-by-username'
      );

      return row ? this.mapUserRowToDomain(row) : null;
    } catch (error) {
      throw new InfrastructureError('Erreur lors de la recherche de l\'utilisateur', { username, error });
    }
  }

  async findUserById(userId: string): Promise<User | null> {
    try {
      const row = await databaseService.queryOne<UserRow>(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        'find-user-by-id'
      );

      return row ? this.mapUserRowToDomain(row) : null;
    } catch (error) {
      throw new InfrastructureError('Erreur lors de la recherche de l\'utilisateur par ID', { userId, error });
    }
  }

  async createUser(data: CreateUserDTO): Promise<User> {
    try {
      const now = new Date().toISOString();
      
      await databaseService.execute(
        `INSERT INTO users (id, username, password_hash, encryption_secret, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.id, data.username, data.passwordHash, data.encryptionSecret || null, now, now],
        'create-user'
      );

      // Récupérer l'utilisateur créé
      const user = await this.findUserById(data.id);
      if (!user) {
        throw new InfrastructureError('Utilisateur créé mais introuvable', { userId: data.id });
      }

      return user;
    } catch (error) {
      throw new InfrastructureError('Erreur lors de la création de l\'utilisateur', { username: data.username, error });
    }
  }

  // ============= SESSION OPERATIONS =============

  async findSessionById(sessionId: string): Promise<Session | null> {
    try {
      const row = await databaseService.queryOne<SessionRow>(
        'SELECT * FROM sessions WHERE id = ?',
        [sessionId],
        'find-session-by-id'
      );

      return row ? this.mapSessionRowToDomain(row) : null;
    } catch (error) {
      throw new InfrastructureError('Erreur lors de la recherche de la session', { sessionId, error });
    }
  }

  async createSession(data: CreateSessionDTO): Promise<Session> {
    try {
      const now = new Date().toISOString();

      await databaseService.execute(
        `INSERT INTO sessions (id, user_id, expires_at, created_at)
         VALUES (?, ?, ?, ?)`,
        [data.sessionId, data.userId, data.expiresAt, now],
        'create-session'
      );

      // Récupérer la session créée
      const session = await this.findSessionById(data.sessionId);
      if (!session) {
        throw new InfrastructureError('Session créée mais introuvable', { sessionId: data.sessionId });
      }

      return session;
    } catch (error) {
      throw new InfrastructureError('Erreur lors de la création de la session', { userId: data.userId, error });
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await databaseService.execute(
        'DELETE FROM sessions WHERE id = ?',
        [sessionId],
        'delete-session'
      );
    } catch (error) {
      throw new InfrastructureError('Erreur lors de la suppression de la session', { sessionId, error });
    }
  }

  async deleteExpiredSessions(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const result = await databaseService.execute(
        'DELETE FROM sessions WHERE expires_at <= ?',
        [now],
        'delete-expired-sessions'
      );

      return result.changes || 0;
    } catch (error) {
      throw new InfrastructureError('Erreur lors de la suppression des sessions expirées', { error });
    }
  }

  // ============= MAPPERS =============

  private mapUserRowToDomain(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      email: row.email || null,
      bio: row.bio || null,
      avatar: row.avatar || null,
      language: row.language || null,
      theme: row.theme || null,
      aiConfig: row.ai_config || null,
      encryptionSecret: row.encryption_secret || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSessionRowToDomain(row: SessionRow): Session {
    return {
      sessionId: row.id, // Mapper 'id' vers 'sessionId'
      userId: row.user_id,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }
}

/**
 * Factory pour obtenir une instance du AuthRepository
 */
export function getAuthRepository(): AuthRepository {
  return new SqliteAuthRepository();
}
