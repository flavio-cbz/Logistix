import type { AuthRepository } from '@/lib/application/ports/auth-repository.port';
import { ValidationError, ConflictError } from '@/lib/shared/errors/base-errors';
import { hash as bcryptHash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterUserInput {
  username: string;
  password: string;
}

export interface RegisterUserOutput {
  userId: string;
  username: string;
}

/**
 * Use-case : Inscription d'un nouvel utilisateur
 * 
 * Responsabilités :
 * - Valider les credentials (username, password)
 * - Vérifier l'unicité du username
 * - Hasher le mot de passe
 * - Créer l'utilisateur dans le repository
 */
export class RegisterUserUseCase {
  private readonly SALT_ROUNDS = 10;
  
  // Validation du username
  private readonly USERNAME_MIN_LENGTH = 2;
  private readonly USERNAME_MAX_LENGTH = 50;
  private readonly USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
  
  // Validation du password
  private readonly PASSWORD_MIN_LENGTH = 6;
  private readonly PASSWORD_MAX_LENGTH = 100;

  constructor(private readonly authRepo: AuthRepository) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // 1. Valider le username
    this.validateUsername(input.username);
    
    // 2. Valider le password
    this.validatePassword(input.password);

    // 3. Normaliser le username (trim)
    const normalizedUsername = input.username.trim();

    // 4. Vérifier l'unicité du username
    const existingUser = await this.authRepo.findUserByUsername(normalizedUsername);
    if (existingUser) {
      throw new ConflictError('Ce nom d\'utilisateur est déjà utilisé', { username: normalizedUsername });
    }

    // 5. Hasher le mot de passe
    const passwordHash = await bcryptHash(input.password, this.SALT_ROUNDS);

    // 6. Générer un ID unique
    const userId = uuidv4();

    // 7. Créer l'utilisateur
    const user = await this.authRepo.createUser({
      id: userId,
      username: normalizedUsername,
      passwordHash,
    });

    return {
      userId: user.id,
      username: user.username,
    };
  }

  private validateUsername(username: string): void {
    if (!username || typeof username !== 'string') {
      throw new ValidationError('Le nom d\'utilisateur est requis', { field: 'username' });
    }

    const trimmed = username.trim();
    
    if (trimmed.length < this.USERNAME_MIN_LENGTH) {
      throw new ValidationError(
        `Le nom d'utilisateur doit faire au moins ${this.USERNAME_MIN_LENGTH} caractères`,
        { field: 'username', value: trimmed }
      );
    }

    if (trimmed.length > this.USERNAME_MAX_LENGTH) {
      throw new ValidationError(
        `Le nom d'utilisateur ne peut pas dépasser ${this.USERNAME_MAX_LENGTH} caractères`,
        { field: 'username', value: trimmed }
      );
    }

    if (!this.USERNAME_REGEX.test(trimmed)) {
      throw new ValidationError(
        'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores',
        { field: 'username', value: trimmed }
      );
    }
  }

  private validatePassword(password: string): void {
    if (!password || typeof password !== 'string') {
      throw new ValidationError('Le mot de passe est requis', { field: 'password' });
    }

    if (password.length < this.PASSWORD_MIN_LENGTH) {
      throw new ValidationError(
        `Le mot de passe doit faire au moins ${this.PASSWORD_MIN_LENGTH} caractères`,
        { field: 'password' }
      );
    }

    if (password.length > this.PASSWORD_MAX_LENGTH) {
      throw new ValidationError(
        `Le mot de passe ne peut pas dépasser ${this.PASSWORD_MAX_LENGTH} caractères`,
        { field: 'password' }
      );
    }
  }
}
