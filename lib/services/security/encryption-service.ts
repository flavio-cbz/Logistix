import { hkdf } from "@panva/hkdf";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

// Ce sel doit être unique à l'application et peut être stocké dans une variable d'environnement
// pour plus de sécurité, mais il n'est pas considéré comme un secret critique.
const APP_ENCRYPTION_SALT =
  process.env["APP_ENCRYPTION_SALT"]! || "default-logistix-salt-change-me";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // Pour GCM, l'IV recommandé est de 12 octets, mais 16 est courant.
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Génère un secret unique et cryptographiquement fort pour un utilisateur.
 * @returns {string} Un secret de 32 octets encodé en hexadécimal.
 */
export function generateUserSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Dérive une clé de chiffrement (KEK) de 256 bits pour un utilisateur à partir de son secret.
 * @param userSecret - Le secret persistant de l'utilisateur.
 * @returns {Promise<Buffer>} La clé de chiffrement dérivée (32 octets).
 */
export async function deriveUserKek(userSecret: string): Promise<Buffer> {
  const keyMaterial = Buffer.from(userSecret, "hex");
  const salt = Buffer.from(APP_ENCRYPTION_SALT, "utf-8");
  const info = "logistix-vinted-token-encryption";

  const hk = await hkdf("sha256", keyMaterial, salt, info, KEY_LENGTH);
  return Buffer.from(hk);
}

/**
 * Chiffre un texte en utilisant la clé de chiffrement fournie.
 * Utilise AES-256-GCM pour assurer la confidentialité et l'authenticité.
 * @param text - Le texte à chiffrer.
 * @param key - La clé de chiffrement (doit faire 32 octets).
 * @returns {string} Le texte chiffré, encodé en base64, incluant l'IV et le tag d'authentification.
 */
export function encrypt(text: string, _key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, _key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Concatène IV, tag et texte chiffré pour un stockage facile.
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Déchiffre un texte chiffré avec AES-256-GCM.
 * @param encryptedText - Le texte chiffré encodé en base64.
 * @param key - La clé de chiffrement (doit faire 32 octets).
 * @returns {string} Le texte original en clair.
 * @throws {Error} Si le déchiffrement échoue (clé incorrecte ou données corrompues).
 */
export function decrypt(encryptedText: string, _key: Buffer): string {
  const data = Buffer.from(encryptedText, "base64");
  const iv = data.slice(0, IV_LENGTH);
  const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, _key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
