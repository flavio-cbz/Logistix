import type { AuthRepository } from '@/lib/application/ports/auth-repository.port';
import { ValidationError } from '@/lib/shared/errors/base-errors';

export interface LogoutUserInput {
  sessionId: string;
}

export interface LogoutUserOutput {
  success: true;
}

/**
 * Use-case : Déconnexion d'un utilisateur (Logout)
 * 
 * Responsabilités :
 * - Valider le sessionId
 * - Supprimer la session du repository
 */
export class LogoutUserUseCase {
  constructor(private readonly authRepo: AuthRepository) {}

  async execute(input: LogoutUserInput): Promise<LogoutUserOutput> {
    // 1. Valider le sessionId
    this.validateSessionId(input.sessionId);

    // 2. Supprimer la session (ne lève pas d'erreur si inexistante)
    await this.authRepo.deleteSession(input.sessionId);

    return { success: true };
  }

  private validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new ValidationError('Session ID invalide', { field: 'sessionId' });
    }
  }
}
