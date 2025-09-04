import { randomBytes, createCipheriv, createDecipheriv, createHash, createHmac } from "crypto";
import bcrypt from "bcrypt";
import { secretManager } from "../services/security/secret-manager";

export async function getKey(): Promise<Buffer> {
  // Priorité : secretManager > variable d'env (fallback contrôlable)
  await secretManager.init();
  const keyFromDb = secretManager.getSecret("ai_api_key");
  if (keyFromDb) return Buffer.from(keyFromDb, "hex");

  const disableFallback = (process.env as any)['DISABLE_ENV_SECRET_FALLBACK'] === "true";
  if (disableFallback) {
    throw new Error("Missing API secret in app_secrets and env fallback disabled");
  }

  const envKey = process.env['API_SECRET_KEY']!;
  if (!envKey) throw new Error("Missing API secret: ni app_secrets ni .env");
  return Buffer.from(envKey, "hex");
}

 // Chiffrement AES-256-GCM, sortie base64 : iv.ciphertext.tag
export async function encryptSecret(plain: string): Promise<string> {
  const key = await getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    tag.toString("base64"),
  ].join(".");
}

// Déchiffrement AES-256-GCM, entrée base64 : iv.ciphertext.tag
export async function decryptSecret(enc: string): Promise<string> {
  const parts = enc.split(".");
  if (parts.length !== 3) throw new Error("Format de secret chiffré invalide");
  const [ivB64, encryptedB64, tagB64] = parts;
  if (!ivB64 || !encryptedB64 || !tagB64) throw new Error("Format de secret chiffré invalide");
  const key = await getKey();
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

// Bcrypt helpers pour le hachage des mots de passe
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Utilities used across the codebase
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function signHmacHex(_key: string, _data: string): string {
  return createHmac('sha256', _key).update(_data).digest('hex');
}