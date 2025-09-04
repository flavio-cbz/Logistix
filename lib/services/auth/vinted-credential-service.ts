
class VintedCredentialService {
  constructor() {}

  // Toute la logique legacy/fallback supprimée : on lève une erreur explicite si utilisé

  public async encrypt(_plain: string): Promise<string> {
    throw new Error(
      "encrypt() legacy n'est plus supporté. Utilisez le chiffrement par utilisateur (encryption_secret)."
    );
  }

  public async decrypt(_encrypted: string): Promise<string> {
    throw new Error(
      "decrypt() legacy n'est plus supporté. Utilisez le chiffrement par utilisateur (encryption_secret)."
    );
  }
}

export const vintedCredentialService = new VintedCredentialService();
