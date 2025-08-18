// AES-256-GCM helpers for encrypting/decrypting short secrets (api keys)
// Uses Node's crypto. Requires process.env.API_SECRET_KEY (32 bytes, base64 or raw).
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // Recommended length for GCM
const TAG_LENGTH = 16; // Auth tag length

function getKey(): Buffer {
  const raw = process.env.API_SECRET_KEY;
  if (!raw) {
    throw new Error("Missing API_SECRET_KEY environment variable");
  }
  // Allow storing key as base64 or raw utf8 32-byte string
  try {
    // If base64 -> decode
    const buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
  } catch (e) {
    // ignore
  }
  const bufUtf = Buffer.from(raw, "utf8");
  if (bufUtf.length !== 32) {
    throw new Error("API_SECRET_KEY must be 32 bytes (raw utf8) or base64-encoded 32 bytes");
  }
  return bufUtf;
}

/**
 * Encrypts a utf8 string and returns base64 payload in the format:
 * base64(iv) . ":" . base64(tag) . ":" . base64(ciphertext)
 */
export function encryptSecret(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypts a payload produced by encryptSecret.
 * Accepts string in format iv:tag:ciphertext (all base64).
 */
export function decryptSecret(payload: string): string {
  const key = getKey();
  const parts = payload.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted payload format");
  const iv = Buffer.from(parts[0] || "", "base64");
  const tag = Buffer.from(parts[1] || "", "base64");
  const encrypted = Buffer.from(parts[2] || "", "base64");

  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

export function signHmacHex(secret: string, data: string): string {
  return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
}
import bcrypt from 'bcrypt';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function comparePasswordSync(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}