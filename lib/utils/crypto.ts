<<<<<<< HEAD
/**
 * @fileoverview Cryptographic utilities for secure data handling and password management
 * @description This module provides comprehensive cryptographic functions including
 * AES-256-GCM encryption/decryption, bcrypt password hashing, and various hash utilities.
 * All functions follow security best practices for data protection.
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */

import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
} from "crypto";
import bcrypt from "bcrypt";
// import { secretManager } from "../services/security/secret-manager"; // Temporairement désactivé pour éviter dépendance circulaire

/**
 * Derives an encryption key from a user ID using SHA-256
 * 
 * @description Generates a deterministic encryption key from the user's ID.
 * This allows per-user encryption without requiring an external secret.
 * @param {string} userId - The user's unique identifier
 * @returns {Buffer} A 32-byte encryption key
 * @internal
 */
function deriveKeyFromUserId(userId: string): Buffer {
  return createHash("sha256").update(`logistix-secret-${userId}-v1`).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM encryption with user-specific key
 * 
 * @description Encrypts sensitive data using AES-256-GCM with a key derived from the user ID.
 * The output format is base64-encoded: iv.ciphertext.tag for secure storage and transmission.
 * @param {string} plain - The plaintext string to encrypt
 * @param {string} userId - The user's ID to derive the encryption key from
 * @returns {Promise<string>} Base64-encoded encrypted string in format "iv.ciphertext.tag"
 * @example
 * ```typescript
 * const encrypted = await encryptSecret("sensitive data", "user-123");
 * ```
 * @since 1.0.0
 */
export async function encryptSecret(plain: string, userId?: string): Promise<string> {
  // Use user-derived key or fall back to a static key for backwards compatibility
  const key = userId
    ? deriveKeyFromUserId(userId)
    : createHash("sha256").update("logistix-default-key-v1").digest();

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    tag.toString("base64"),
  ].join(".");
}

/**
 * Decrypts an AES-256-GCM encrypted string with user-specific key
 * 
 * @description Decrypts data encrypted with encryptSecret function using the user's ID.
 * @param {string} enc - Base64-encoded encrypted string in format "iv.ciphertext.tag"
 * @param {string} userId - The user's ID to derive the decryption key from
 * @returns {Promise<string>} The decrypted plaintext string
 * @example
 * ```typescript
 * const decrypted = await decryptSecret(encryptedData, "user-123");
 * ```
 * @since 1.0.0
 */
export async function decryptSecret(enc: string, userId?: string): Promise<string> {
  const parts = enc.split(".");
  if (parts.length !== 3) throw new Error("Format de secret chiffré invalide");
  const [ivB64, encryptedB64, tagB64] = parts;
  if (!ivB64 || !encryptedB64 || !tagB64)
    throw new Error("Format de secret chiffré invalide");

  // Use user-derived key or fall back to a static key for backwards compatibility
  const key = userId
    ? deriveKeyFromUserId(userId)
    : createHash("sha256").update("logistix-default-key-v1").digest();

  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Hashes a password using bcrypt with salt rounds
 * 
 * @description Securely hashes passwords using bcrypt with 12 salt rounds for strong
 * protection against rainbow table and brute force attacks. Asynchronous operation.
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} The bcrypt hash string
 * @throws {Error} When hashing fails
 * @example
 * ```typescript
 * const hash = await hashPassword("userPassword123");
 * // Returns: "$2b$12$..."
 * ```
 * @since 1.0.0
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * Synchronously hashes a password using bcrypt
 * 
 * @description Synchronous version of password hashing using bcrypt with 12 salt rounds.
 * Use sparingly as it blocks the event loop. Prefer hashPassword for most use cases.
 * @param {string} password - The plaintext password to hash
 * @returns {string} The bcrypt hash string
 * @throws {Error} When hashing fails
 * @example
 * ```typescript
 * const hash = hashPasswordSync("userPassword123");
 * // Returns: "$2b$12$..."
 * ```
 * @since 1.0.0
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, 12);
}

/**
 * Compares a plaintext password with a bcrypt hash
 * 
 * @description Securely compares a plaintext password against a stored bcrypt hash.
 * Uses constant-time comparison to prevent timing attacks.
 * @param {string} password - The plaintext password to verify
 * @param {string} hash - The stored bcrypt hash to compare against
 * @returns {Promise<boolean>} True if password matches hash, false otherwise
 * @throws {Error} When comparison fails due to invalid hash format
 * @example
 * ```typescript
 * const isValid = await comparePassword("userPassword123", storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 * ```
 * @since 1.0.0
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Creates a SHA-256 hash of the input string
 * 
 * @description Generates a SHA-256 hash of the input string and returns it as
 * a hexadecimal string. Useful for creating checksums and non-cryptographic hashing.
 * @param {string} input - The string to hash
 * @returns {string} The SHA-256 hash as a hexadecimal string
 * @example
 * ```typescript
 * const hash = sha256Hex("Hello World");
 * // Returns: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"
 * ```
 * @since 1.0.0
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Creates an HMAC-SHA256 signature of the data using the provided key
 * 
 * @description Generates an HMAC-SHA256 signature for message authentication.
 * Used for verifying data integrity and authenticity in API communications.
 * @param {string} _key - The secret key for HMAC generation
 * @param {string} _data - The data to sign
 * @returns {string} The HMAC-SHA256 signature as a hexadecimal string
 * @example
 * ```typescript
 * const signature = signHmacHex("secretKey", "message to sign");
 * // Returns: "abc123def456..." (hex string)
 * ```
 * @since 1.0.0
 */
export function signHmacHex(_key: string, _data: string): string {
  return createHmac("sha256", _key).update(_data).digest("hex");
}
=======
/**
 * @fileoverview Cryptographic utilities for secure data handling and password management
 * @description This module provides comprehensive cryptographic functions including
 * AES-256-GCM encryption/decryption, bcrypt password hashing, and various hash utilities.
 * All functions follow security best practices for data protection.
 * @version 1.0.0
 * @since 2025-01-09
 * @author Development Team
 */

import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
} from "crypto";
import bcrypt from "bcrypt";
// import { secretManager } from "../services/security/secret-manager"; // Temporairement désactivé pour éviter dépendance circulaire

/**
 * Retrieves the encryption key from environment variables
 * 
 * @description Gets the API secret key from environment variables and converts it to a Buffer.
 * This is a temporary implementation to avoid circular dependencies with secretManager.
 * @returns {Promise<Buffer>} The encryption key as a Buffer
 * @throws {Error} When API_SECRET_KEY environment variable is missing
 * @example
 * ```typescript
 * const key = await getKey();
 * // Use key for encryption operations
 * ```
 * @internal
 * @todo Reintegrate secretManager after resolving circular dependencies
 */
export async function getKey(): Promise<Buffer> {
  // Utilisation temporaire uniquement des variables d'environnement pour éviter dépendance circulaire
  // TODO: Réintégrer secretManager après résolution des dépendances circulaires
  const envKey = process.env["API_SECRET_KEY"]!;
  if (!envKey) throw new Error("Missing API secret: variable API_SECRET_KEY requise");
  return Buffer.from(envKey, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM encryption
 * 
 * @description Encrypts sensitive data using AES-256-GCM with a random IV and authentication tag.
 * The output format is base64-encoded: iv.ciphertext.tag for secure storage and transmission.
 * @param {string} plain - The plaintext string to encrypt
 * @returns {Promise<string>} Base64-encoded encrypted string in format "iv.ciphertext.tag"
 * @throws {Error} When encryption key is unavailable or encryption fails
 * @example
 * ```typescript
 * const encrypted = await encryptSecret("sensitive data");
 * // Returns: "base64iv.base64ciphertext.base64tag"
 * ```
 * @since 1.0.0
 */
export async function encryptSecret(plain: string): Promise<string> {
  const key = await getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    tag.toString("base64"),
  ].join(".");
}

/**
 * Decrypts an AES-256-GCM encrypted string
 * 
 * @description Decrypts data encrypted with encryptSecret function. Expects input in
 * base64 format: iv.ciphertext.tag. Validates authentication tag for data integrity.
 * @param {string} enc - Base64-encoded encrypted string in format "iv.ciphertext.tag"
 * @returns {Promise<string>} The decrypted plaintext string
 * @throws {Error} When format is invalid, key is unavailable, or decryption fails
 * @example
 * ```typescript
 * const decrypted = await decryptSecret("base64iv.base64ciphertext.base64tag");
 * // Returns: "original plaintext"
 * ```
 * @since 1.0.0
 */
export async function decryptSecret(enc: string): Promise<string> {
  const parts = enc.split(".");
  if (parts.length !== 3) throw new Error("Format de secret chiffré invalide");
  const [ivB64, encryptedB64, tagB64] = parts;
  if (!ivB64 || !encryptedB64 || !tagB64)
    throw new Error("Format de secret chiffré invalide");
  const key = await getKey();
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Hashes a password using bcrypt with salt rounds
 * 
 * @description Securely hashes passwords using bcrypt with 12 salt rounds for strong
 * protection against rainbow table and brute force attacks. Asynchronous operation.
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} The bcrypt hash string
 * @throws {Error} When hashing fails
 * @example
 * ```typescript
 * const hash = await hashPassword("userPassword123");
 * // Returns: "$2b$12$..."
 * ```
 * @since 1.0.0
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * Synchronously hashes a password using bcrypt
 * 
 * @description Synchronous version of password hashing using bcrypt with 12 salt rounds.
 * Use sparingly as it blocks the event loop. Prefer hashPassword for most use cases.
 * @param {string} password - The plaintext password to hash
 * @returns {string} The bcrypt hash string
 * @throws {Error} When hashing fails
 * @example
 * ```typescript
 * const hash = hashPasswordSync("userPassword123");
 * // Returns: "$2b$12$..."
 * ```
 * @since 1.0.0
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, 12);
}

/**
 * Compares a plaintext password with a bcrypt hash
 * 
 * @description Securely compares a plaintext password against a stored bcrypt hash.
 * Uses constant-time comparison to prevent timing attacks.
 * @param {string} password - The plaintext password to verify
 * @param {string} hash - The stored bcrypt hash to compare against
 * @returns {Promise<boolean>} True if password matches hash, false otherwise
 * @throws {Error} When comparison fails due to invalid hash format
 * @example
 * ```typescript
 * const isValid = await comparePassword("userPassword123", storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 * ```
 * @since 1.0.0
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Creates a SHA-256 hash of the input string
 * 
 * @description Generates a SHA-256 hash of the input string and returns it as
 * a hexadecimal string. Useful for creating checksums and non-cryptographic hashing.
 * @param {string} input - The string to hash
 * @returns {string} The SHA-256 hash as a hexadecimal string
 * @example
 * ```typescript
 * const hash = sha256Hex("Hello World");
 * // Returns: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"
 * ```
 * @since 1.0.0
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Creates an HMAC-SHA256 signature of the data using the provided key
 * 
 * @description Generates an HMAC-SHA256 signature for message authentication.
 * Used for verifying data integrity and authenticity in API communications.
 * @param {string} _key - The secret key for HMAC generation
 * @param {string} _data - The data to sign
 * @returns {string} The HMAC-SHA256 signature as a hexadecimal string
 * @example
 * ```typescript
 * const signature = signHmacHex("secretKey", "message to sign");
 * // Returns: "abc123def456..." (hex string)
 * ```
 * @since 1.0.0
 */
export function signHmacHex(_key: string, _data: string): string {
  return createHmac("sha256", _key).update(_data).digest("hex");
}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
