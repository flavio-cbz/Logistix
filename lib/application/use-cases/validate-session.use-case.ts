import type { AuthRepository, User } from '@/lib/application/ports/auth-repository.port';
import { AuthError, ValidationError } from '@/lib/shared/errors/base-errors';

export interface ValidateSessionInput {
  sessionId: string;
}

export interface UserSession {
  id: string;
  username: string;
  email?: string | null;
  avatar?: string | null;
  language?: string | null;
  theme?: string | null;
  aiConfig?: {
    endpoint: string;
    apiKey: string;
    model: string;
  } | null;
  isAdmin: boolean;
}

export interface ValidateSessionOutput {
  session: {
    sessionId: string;
    userId: string;
    expiresAt: string;
  };
  user: UserSession;
}

/**
 * Use-case : Validation d'une session
 * 
 * Responsabilités :
 * - Valider le format du sessionId
 * - Vérifier l'existence de la session
 * - Vérifier que la session n'est pas expirée
 * - Récupérer les données utilisateur associées
 */
export class ValidateSessionUseCase {
  constructor(private readonly authRepo: AuthRepository) {}

  async execute(input: ValidateSessionInput): Promise<ValidateSessionOutput> {
    // 1. Valider le sessionId
    this.validateSessionId(input.sessionId);

    // 2. Récupérer la session
    const session = await this.authRepo.findSessionById(input.sessionId);
    if (!session) {
      throw new AuthError('Session invalide ou expirée');
    }

    // 3. Vérifier que la session n'est pas expirée
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt <= now) {
      // Session expirée, la supprimer
      await this.authRepo.deleteSession(input.sessionId);
      throw new AuthError('Session expirée');
    }

    // 4. Récupérer l'utilisateur associé
    const user = await this.authRepo.findUserById(session.userId);
    if (!user) {
      // Cas incohérent : session existe mais pas l'utilisateur
      await this.authRepo.deleteSession(input.sessionId);
      throw new AuthError('Utilisateur introuvable');
    }

    // 5. Transformer en UserSession
    const userSession = this.mapToUserSession(user);

    return {
      session: {
        sessionId: session.sessionId,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
      user: userSession,
    };
  }

  private validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new ValidationError('Session ID invalide', { field: 'sessionId' });
    }
  }

  private mapToUserSession(user: User): UserSession {
    // Déterminer si l'utilisateur est admin (basé sur username pour le moment)
    const isAdmin = user.username.toLowerCase() === 'admin';

    // Parser la configuration IA si disponible
    let aiConfig = null;
    if (user.aiConfig) {
      try {
        aiConfig = JSON.parse(user.aiConfig);
      } catch {
        // Ignore si le parsing échoue
      }
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email || null,
      avatar: user.avatar || null,
      language: user.language || null,
      theme: user.theme || null,
      aiConfig,
      isAdmin,
    };
  }
}
