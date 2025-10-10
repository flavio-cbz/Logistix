import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { databaseService } from "@/lib/services/database/db";
import {
  deriveUserKek,
  generateUserSecret,
} from "@/lib/services/security/encryption-service";
import { logger } from "@/lib/utils/logging/logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const ENCODING = "base64";

/**
 * Derive a KEK for a user by reading their encryption_secret from the DB.
 * If l'utilisateur n'a pas de encryption_secret, on le génère et le persiste automatiquement.
 * Si la colonne encryption_secret n'existe pas, une erreur explicite est levée.
 */
async function deriveKekForUser(userId: string): Promise<Buffer> {
  try {
    const row = await databaseService.queryOne<{ encryption_secret?: string }>(
      "SELECT encryption_secret FROM users WHERE id = ?",
      [userId],
      "deriveKekForUser",
    );

    if (row?.encryption_secret) {
      // Utilise le secret existant
      return await deriveUserKek(row.encryption_secret);
    } else {
      // Génère et persiste un nouveau secret si absent
      const newSecret = generateUserSecret();
      await databaseService.execute(
        "UPDATE users SET encryption_secret = ? WHERE id = ?",
        [newSecret, userId],
        "autoPopulateEncryptionSecret",
      );
      logger.info(
        `[deriveKekForUser] Nouveau encryption_secret généré et sauvegardé pour userId=${userId}`,
      );
      return await deriveUserKek(newSecret);
    }
  } catch (err: unknown) {
    // Utilisation de unknown pour une meilleure gestion des erreurs
    // Si la colonne encryption_secret n'existe pas, on lève une erreur explicite
    let msg = "An unknown error occurred";
    if (err instanceof Error) {
      msg = err.message;
    } else if (typeof err === "string") {
      msg = err;
    }

    if (
      msg.includes("no such column") ||
      msg.includes("no such table") ||
      msg.includes("SQLITE_ERROR")
    ) {
      throw new Error(
        "[deriveKekForUser] La colonne encryption_secret est manquante dans la table users. Migration requise.",
      );
    } else {
      throw err;
    }
  }
}

function encodeParts(iv: Buffer, tag: Buffer, encrypted: Buffer): string {
  return `${iv.toString(ENCODING)}:${tag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`;
}

function decodeParts(str: string): {
  iv: Buffer;
  tag: Buffer;
  encrypted: Buffer;
} {
  const parts = str.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }
  return {
    iv: Buffer.from(parts[0]!, ENCODING),
    tag: Buffer.from(parts[1]!, ENCODING),
    encrypted: Buffer.from(parts[2]!, ENCODING),
  };
}

/**
 * Service that performs envelope encryption for Vinted sessions.
 * KEK is now derived per-user by reading users.encryption_secret and calling deriveUserKek.
 */
class VintedSessionCipherService {
  // Cache KEK derivation promises per user to avoid repeated expensive KDFs
  private kekPromises: Map<string, Promise<Buffer>> = new Map();

  private getKek(userId: string): Promise<Buffer> {
    let p = this.kekPromises.get(userId);
    if (!p) {
      p = deriveKekForUser(userId);
      this.kekPromises.set(userId, p);
    }
    return p;
  }

  /**
   * Encrypt a session token using envelope encryption.
   * Returns { encryptedToken, encryptedDek, metadata }
   * Accepts userId to derive a per-user KEK.
   */
  public async encryptSession(
    userId: string,
    plainToken: string,
  ): Promise<{
    encryptedToken: string;
    encryptedDek: string;
    metadata: string;
  }> {
    // Validation et logs d'entrée

    if (typeof userId !== "string" || userId.length === 0) {
      logger.error("[encryptSession] userId invalide", { userId });
      throw new Error("userId must be a non-empty string");
    }
    if (typeof plainToken !== "string" || plainToken.length === 0) {
      logger.error("[encryptSession] plainToken invalide", {
        plainToken_length: plainToken?.length,
      });
      throw new Error("plainToken must be a non-empty string");
    }

    // 1. generate DEK
    const dek = randomBytes(32);

    // 2. encrypt token with DEK
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, dek, iv);
    const encryptedTokenBuf = Buffer.concat([
      cipher.update(plainToken, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    const encryptedToken = encodeParts(iv, tag, encryptedTokenBuf);

    // 3. encrypt DEK with KEK (per-user)
    const kek = await this.getKek(userId);

    const dekIv = randomBytes(IV_LENGTH);

    const dekCipher = createCipheriv(ALGORITHM, kek, dekIv);
    const encryptedDekBuf = Buffer.concat([
      dekCipher.update(dek),
      dekCipher.final(),
    ]);
    const dekTag = dekCipher.getAuthTag();

    const encryptedDek = encodeParts(dekIv, dekTag, encryptedDekBuf);

    const metadata = JSON.stringify({
      kek_provider: "per-user",
      kek_id: userId,
      algo: ALGORITHM,
    });

    return { encryptedToken, encryptedDek, metadata };
  }

  /**
   * Decrypt a session token using envelope encryption.
   * Accepts userId to derive the per-user KEK needed to unwrap the DEK.
   */
  public async decryptSession(
    userId: string,
    encryptedToken: string,
    encryptedDek?: string | null,
  ): Promise<string> {
    if (!encryptedDek) {
      throw new Error(
        "No encrypted DEK present for this session. Legacy decryption n’est plus supportée.",
      );
    }

    // decrypt DEK with per-user KEK
    const kek = await this.getKek(userId);
    const {
      iv: dekIv,
      tag: dekTag,
      encrypted: dekEncrypted,
    } = decodeParts(encryptedDek);
    const dekDecipher = createDecipheriv(ALGORITHM, kek, dekIv);
    dekDecipher.setAuthTag(dekTag);
    const dek = Buffer.concat([
      dekDecipher.update(dekEncrypted),
      dekDecipher.final(),
    ]);

    // decrypt token with DEK
    const { iv, tag, encrypted } = decodeParts(encryptedToken);
    const decipher = createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
}

export const vintedSessionCipherService = new VintedSessionCipherService();
