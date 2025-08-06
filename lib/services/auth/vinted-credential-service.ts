import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ENCODING = 'hex';

/**
 * VintedCredentialService
 * 
 * Gère le chiffrement et le déchiffrement des identifiants Vinted.
 * Utilise AES-256-GCM pour un chiffrement authentifié.
 * La clé de chiffrement est dérivée d'un mot de passe principal stocké
 * dans les variables d'environnement pour plus de sécurité.
 */
class VintedCredentialService {
  private key: Promise<Buffer>;

  constructor() {
    this.key = this.initializeKey();
  }

  private async initializeKey(): Promise<Buffer> {
    const password = process.env.VINTED_CREDENTIALS_SECRET;
    if (!password) {
      throw new Error('La variable d\'environnement VINTED_CREDENTIALS_SECRET est requise pour le chiffrement.');
    }
    // Utilise un salt statique pour la dérivation de la clé. Pour une sécurité maximale,
    // ce salt pourrait aussi être stocké de manière sécurisée.
    const salt = process.env.VINTED_CREDENTIALS_SALT || 'default-salt-should-be-changed';
    return (await promisify(scrypt)(password, salt, 32)) as Buffer;
  }

  /**
   * Chiffre une chaîne de caractères.
   * @param text Le texte à chiffrer.
   * @returns Une chaîne chiffrée au format: iv:encryptedData:tag
   */
  public async encrypt(text: string): Promise<string> {
    const key = await this.key;
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [iv.toString(ENCODING), encrypted.toString(ENCODING), tag.toString(ENCODING)].join(':');
  }

  /**
   * Déchiffre une chaîne de caractères.
   * @param encryptedText La chaîne chiffrée au format: iv:encryptedData:tag
   * @returns Le texte déchiffré.
   */
  public async decrypt(encryptedText: string): Promise<string> {
    const key = await this.key;
    const [ivHex, encryptedDataHex, tagHex] = encryptedText.split(':');

    if (!ivHex || !encryptedDataHex || !tagHex) {
      throw new Error('Format de chiffrement invalide.');
    }

    const iv = Buffer.from(ivHex, ENCODING);
    const encryptedData = Buffer.from(encryptedDataHex, ENCODING);
    const tag = Buffer.from(tagHex, ENCODING);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return decrypted.toString('utf8');
  }
}

// Exporte une instance unique (singleton) du service
export const vintedCredentialService = new VintedCredentialService();