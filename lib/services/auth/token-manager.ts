/* Attempt to load Next.js `server-only` helper when available.
   In test environments (vitest) this package may be absent or will
   throw if treated as a Client component import — ignore failures
   so unit tests can run. */
// @ts-ignore - `server-only` est un helper runtime Next.js; le charger dynamiquement
// évite l'import statique qui casse les tests/client. En test, le module peut être absent.
void import("server-only").catch(() => {});
import crypto from "crypto";
import { signHmacHex } from "../../utils/crypto";

const SECRET = process.env["AUTH_TOKEN_SECRET"]! || "dev-secret-change-me";
const DEFAULT_EXP_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function base64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Buffer {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return Buffer.from(s, "base64");
}

function signHex(_data: string): string {
  return signHmacHex(SECRET, _data);
}

/**
 * Génère un token minimal sécurisé HMAC-based.
 * Format: payloadBase64Url.expiresAtMs.signatureHex
 */
export function generateToken(
  payload: Record<string, any>,
  expiresInMs: number = DEFAULT_EXP_MS,
): string {
  const payloadJson = JSON.stringify(payload || {});
  const payloadB64 = base64urlEncode(Buffer.from(payloadJson, "utf8"));
  const expiresAt = String(Date.now() + expiresInMs);
  const signature = signHex(`${payloadB64}.${expiresAt}`);
  return `${payloadB64}.${expiresAt}.${signature}`;
}

/**
 * Vérifie un token et retourne le payload décodé si valide.
 * Ne lance pas d'exception pour les tokens invalides — renvoie un objet explicite.
 */
export function verifyToken(
  token: string,
): { valid: true; payload: any } | { valid: false; reason: string } {
  if (!token || typeof token !== "string")
    return { valid: false, reason: "invalid_token" };

  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, reason: "invalid_format" };

  const [payloadB64, expiresAtStr, signatureHex] = parts;

  // Vérifier la signature
  const expectedSig = signHex(`${payloadB64}.${expiresAtStr}`);
  // Détecter explicitement une signature non-hex : retourner 'signature_error'
  if (
    typeof signatureHex !== "string" ||
    !/^[0-9a-fA-F]+$/.test(signatureHex) ||
    signatureHex.length % 2 !== 0
  ) {
    return { valid: false, reason: "signature_error" };
  }
  try {
    const a = Buffer.from(expectedSig, "hex");
    const b = Buffer.from(signatureHex, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, reason: "bad_signature" };
    }
  } catch {
    return { valid: false, reason: "signature_error" };
  }

  // Vérifier expiration
  const expiresAt = Number(expiresAtStr);
  if (isNaN(expiresAt)) return { valid: false, reason: "invalid_expiry" };
  if (Date.now() > expiresAt) return { valid: false, reason: "expired" };

  // Décoder payload
  try {
    const payloadBuf = base64urlDecode(payloadB64!);
    const payload = JSON.parse(payloadBuf.toString("utf8"));
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, reason: "invalid_payload" };
  }
}

/**
 * Parse sans vérifier signature (utile pour debugging, évite throw)
 */
export function parseTokenUnsafe(token: string): any | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadBuf = base64urlDecode(parts[0]!);
    return JSON.parse(payloadBuf.toString("utf8"));
  } catch {
    return null;
  }
}

const tokenManager = {
  generateToken,
  verifyToken,
  parseTokenUnsafe,
};

export default tokenManager;
