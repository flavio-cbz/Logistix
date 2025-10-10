/**
 * Port de repository pour l'authentification
 * Abstraction pour les opérations de persistance liées à l'authentification
 */

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  email?: string | null;
  bio?: string | null;
  avatar?: string | null;
  language?: string | null;
  theme?: string | null;
  aiConfig?: string | null;
  encryptionSecret?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateUserDTO {
  id: string;
  username: string;
  passwordHash: string;
  encryptionSecret?: string;
}

export interface CreateSessionDTO {
  sessionId: string;
  userId: string;
  expiresAt: string;
}

/**
 * Interface du repository d'authentification
 */
export interface AuthRepository {
  // User operations
  findUserByUsername(username: string): Promise<User | null>;
  findUserById(userId: string): Promise<User | null>;
  createUser(data: CreateUserDTO): Promise<User>;
  
  // Session operations
  findSessionById(sessionId: string): Promise<Session | null>;
  createSession(data: CreateSessionDTO): Promise<Session>;
  deleteSession(sessionId: string): Promise<void>;
  deleteExpiredSessions(): Promise<number>;
}
