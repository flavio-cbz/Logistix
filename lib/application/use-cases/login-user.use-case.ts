import type { AuthRepository } from '@/lib/application/ports/auth-repository.port';
import { AuthError, ValidationError } from '@/lib/shared/errors/base-errors';
import { compare as bcryptCompare } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface LoginUserInput {
  username: string;
  password: string;
}

export interface LoginUserOutput {
  sessionId: string;
  userId: string;
  username: string;
  expiresAt: string;
}

/**
 * Use-case : Authentification d'un utilisateur (Login)
 * 
 * Responsabilités :
 * - Valider les credentials
 * - Vérifier l'existence de l'utilisateur
 * - Vérifier le mot de passe
 * - Créer une nouvelle session
 */
export class LoginUserUseCase {
  private readonly SESSION_DURATION_HOURS = 24 * 7; // 7 jours

  constructor(private readonly authRepo: AuthRepository) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    // 1. Valider les entrées
    this.validateInput(input);

    // 2. Normaliser le username
    const normalizedUsername = input.username.trim();

    // 3. Trouver l'utilisateur par username
    const user = await this.authRepo.findUserByUsername(normalizedUsername);
    if (!user) {
      throw new AuthError('Identifiants invalides');
    }

    // 4. Vérifier le mot de passe
    const isPasswordValid = await bcryptCompare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthError('Identifiants invalides');
    }

    // 5. Générer un ID de session unique
    const sessionId = uuidv4();

    // 6. Calculer la date d'expiration
    const expiresAt = this.calculateExpirationDate();

    // 7. Créer la session
    await this.authRepo.createSession({
      sessionId,
      userId: user.id,
      expiresAt,
    });

    return {
      sessionId,
      userId: user.id,
      username: user.username,
      expiresAt,
    };
  }

  private validateInput(input: LoginUserInput): void {
    if (!input.username || typeof input.username !== 'string' || !input.username.trim()) {
      throw new ValidationError('Le nom d\'utilisateur est requis', { field: 'username' });
    }

    if (!input.password || typeof input.password !== 'string') {
      throw new ValidationError('Le mot de passe est requis', { field: 'password' });
    }
  }

  private calculateExpirationDate(): string {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION_HOURS * 60 * 60 * 1000);
    return expiresAt.toISOString();
  }
}
