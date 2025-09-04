#!/usr/bin/env node
/**
 * Inspecte la table vinted_sessions et tente de déchiffrer chaque session.
 *
 * Usage:
 *   node scripts/maintenance/check_vinted_sessions.js
 *
 * Ce script est un utilitaire de diagnostic : il n'écrit rien en base, il affiche
 * un résumé pour chaque ligne et un échec éventuel avec la raison.
 *
 * Il réimplémente les mêmes primitives que l'application :
 *  - derive KEK via HKDF si users.encryption_secret existe
 *  - fallback sur VINTED_CREDENTIALS_SECRET si absent
 *  - déchiffrement AES-256-GCM (format stocké : iv:tag:encrypted en base64)
 */

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { createDecipheriv, hkdfSync } = require("crypto");
// Load hkdf package safely (commonjs default vs named export)
let hkdfPkg;
try { hkdfPkg = require("@panva/hkdf"); } catch (e) { hkdfPkg = null; }
// Support multiple shapes: { hkdf }, default export function, or the module itself
const hkdfFunc = hkdfPkg ? (hkdfPkg.hkdf || hkdfPkg.default || hkdfPkg) : null;

const DB_PATH = path.join(process.cwd(), "data", "logistix.db");
if (!fs.existsSync(DB_PATH)) {
  console.error("Database not found at:", DB_PATH);
  process.exit(2);
}

const APP_ENCRYPTION_SALT = process.env.APP_ENCRYPTION_SALT || "default-logistix-salt-change-me";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ALGO = "aes-256-gcm";

function decodeParts(str) {
  const parts = String(str || "").split(":");
  if (parts.length !== 3) throw new Error("Invalid format (expected iv:tag:encrypted)");
  return {
    iv: Buffer.from(parts[0], "base64"),
    tag: Buffer.from(parts[1], "base64"),
    encrypted: Buffer.from(parts[2], "base64"),
  };
}

async function deriveKekFromUserSecret(userSecretHex) {
  const keyMaterial = Buffer.from(userSecretHex, "hex");
  const salt = Buffer.from(APP_ENCRYPTION_SALT, "utf-8");
  const info = "logistix-vinted-token-encryption";

  if (hkdfFunc && typeof hkdfFunc === "function") {
    // @panva/hkdf style async function
    const hk = await hkdfFunc("sha256", keyMaterial, salt, info, KEY_LENGTH);
    return Buffer.from(hk);
  }

  // Fallback to Node built-in hkdfSync if available
  if (typeof hkdfSync === "function") {
    try {
      const hk = hkdfSync("sha256", keyMaterial, salt, info, KEY_LENGTH);
      return Buffer.from(hk);
    } catch (e) {
      throw new Error("Node hkdfSync failed: " + e.message);
    }
  }

  throw new Error("HKDF function not available: ensure @panva/hkdf or Node hkdfSync is present");
}

function decryptWithKey(keyBuf, encryptedPartsStr) {
  const { iv, tag, encrypted } = decodeParts(encryptedPartsStr);
  if (iv.length !== IV_LENGTH && iv.length !== 16 && iv.length !== 12) {
    // Accept common IV lengths but warn
  }
  const decipher = createDecipheriv(ALGO, keyBuf, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted;
}

(async function main() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    // Use snake_case column names as stored in DB
    const sessions = db.prepare("SELECT id, user_id, session_cookie, encrypted_dek, encryption_metadata, status FROM vinted_sessions").all();
    if (!sessions || sessions.length === 0) {
      console.log("Aucune ligne trouvée dans vinted_sessions.");
      return process.exit(0);
    }

    console.log(`Found ${sessions.length} vinted_sessions rows. Attempting to decrypt each...`);
    for (const row of sessions) {
      console.log("------------------------------------------------------------");
      console.log(`id: ${row.id}`);
      console.log(`userId: ${row.user_id}`);
      console.log(`status: ${row.status}`);
      try {
        // Try per-user KEK first
        const userRow = db.prepare("SELECT encryption_secret FROM users WHERE id = ? LIMIT 1").get(row.user_id);
        let kek;
        if (userRow && userRow.encryption_secret) {
          try {
            kek = await deriveKekFromUserSecret(userRow.encryption_secret);
            console.log("Using per-user encryption_secret to derive KEK.");
          } catch (e) {
            throw new Error("Failed to derive KEK from user encryption_secret: " + e.message);
          }
        } else {
          // Fallback to legacy env secret
          const password = process.env.VINTED_KEK_SECRET || process.env.VINTED_CREDENTIALS_SECRET;
          if (!password) {
            throw new Error("No user encryption_secret and no legacy env KEK (VINTED_KEK_SECRET/VINTED_CREDENTIALS_SECRET).");
          }
          // Derive with scrypt-like approach from legacy code (approximate)
          const { scryptSync } = require("crypto");
          const salt = process.env.VINTED_CREDENTIALS_SALT || "default-salt-should-be-changed";
          kek = scryptSync(password, salt, KEY_LENGTH);
          console.log("Using legacy env-based KEK derived with scrypt.");
        }

        // If encrypted_dek exists -> envelope mode
        if (row.encrypted_dek) {
          // decrypt DEK with KEK
          let dek;
          try {
            // Attempt to decrypt and get raw Buffer
            const dekBuf = decryptWithKey(kek, row.encrypted_dek);
            // dekBuf is a Buffer (raw DEK bytes)
            dek = dekBuf;
          } catch (e1) {
            try {
              // alternative method: decode parts then decrypt to Buffer
              const { iv, tag, encrypted } = decodeParts(row.encrypted_dek);
              const dec = createDecipheriv(ALGO, kek, iv);
              dec.setAuthTag(tag);
              dek = Buffer.concat([dec.update(encrypted), dec.final()]);
            } catch (e2) {
              throw new Error("Failed to decrypt DEK: " + (e2.message || e1.message));
            }
          }

          // decrypt session_cookie with DEK
          try {
            const { iv, tag, encrypted } = decodeParts(row.session_cookie);
            const decipher = createDecipheriv(ALGO, dek, iv);
            decipher.setAuthTag(tag);
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
            const cookieStr = decrypted.toString("utf8");
            console.log("Decrypted session cookie (preview):", cookieStr.slice(0, 120));
          } catch (e) {
            throw new Error("Failed to decrypt session_cookie with DEK: " + e.message);
          }
        } else {
          // Legacy: session_cookie may be encrypted directly using vintedCredentialService format
          try {
            const cookieBuf = decryptWithKey(kek, row.session_cookie);
            const cookiePlain = cookieBuf.toString("utf8");
            console.log("Decrypted legacy session_cookie (preview):", cookiePlain.slice(0, 120));
          } catch (e) {
            throw new Error("Failed to decrypt legacy session_cookie: " + e.message);
          }
        }

        console.log("Result: OK");
      } catch (err) {
        console.error("Decryption failed:", err && err.message ? err.message : err);
        console.log("encryptionMetadata:", row.encryption_metadata);
      }
    }
  } catch (err) {
    console.error("Script error:", err);
    process.exit(1);
  } finally {
    try { db.close(); } catch (e) {}
  }
})();