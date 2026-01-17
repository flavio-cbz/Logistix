/**
 * Utilitaires de chiffrement pour secrets utilisateur
 * 
 * Chiffre les encryptionSecret des utilisateurs avec une clé maîtresse
 * Pour protéger les tokens Vinted même si la DB est compromise
 * 
 * @module lib/utils/crypto-secrets
 * @priority CRITICAL - Sécurité des données utilisateurs
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Constantes de chiffrement
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Récupère la clé maîtresse de chiffrement depuis variable d'environnement
 * 
 * @throws {Error} Si ENCRYPTION_MASTER_KEY n'est pas définie
 * @returns Buffer de 32 bytes pour AES-256
 */
function getMasterKey(): Buffer {
    const MASTER_KEY_HEX = process.env['ENCRYPTION_MASTER_KEY'];

    if (!MASTER_KEY_HEX) {
        throw new Error(
            'ENCRYPTION_MASTER_KEY non définie. ' +
            'Générez-la avec: openssl rand -hex 32'
        );
    }

    const key = Buffer.from(MASTER_KEY_HEX, 'hex');

    if (key.length !== 32) {
        throw new Error(
            `ENCRYPTION_MASTER_KEY invalide: doit faire 32 bytes (64 hex chars), reçu ${key.length} bytes`
        );
    }

    return key;
}

/**
 * Chiffre un secret utilisateur avec AES-256-GCM
 * 
 * Format de sortie (base64) : IV (16 bytes) + AuthTag (16 bytes) + Données chiffrées
 * 
 * @param plainSecret - Secret en clair (hexadécimal 64 chars généré par generateUserSecret)
 * @returns Secret chiffré en base64 avec IV et tag d'authentification
 * 
 * @example
 * const userSecret = generateUserSecret(); // Depuis crypto.ts
 * const encrypted = encryptUserSecret(userSecret);
 * // Stocker 'encrypted' dans users.encryptionSecret
 */
export function encryptUserSecret(plainSecret: string): string {
    const masterKey = getMasterKey();
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, masterKey, iv);

    // Chiffrer le secret (déjà en hex depuis generateUserSecret)
    const encrypted = Buffer.concat([
        cipher.update(plainSecret, 'hex'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Format: IV (16) + AuthTag (16) + Encrypted Data
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString('base64');
}

/**
 * Déchiffre un secret utilisateur
 * 
 * @param encryptedSecret - Secret chiffré (base64) avec IV et tag
 * @returns Secret original en hexadécimal
 * 
 * @throws {Error} Si le tag d'authentification est invalide (données altérées)
 * 
 * @example
 * const encrypted = user.encryptionSecret; // Depuis DB
 * const plainSecret = decryptUserSecret(encrypted);
 * // Utiliser plainSecret dans deriveUserKek()
 */
export function decryptUserSecret(encryptedSecret: string): string {
    const masterKey = getMasterKey();
    const data = Buffer.from(encryptedSecret, 'base64');

    // Extraire IV, AuthTag et données chiffrées
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);

    try {
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return decrypted.toString('hex');
    } catch (_error) {
        throw new Error(
            'Échec déchiffrement secret utilisateur. ' +
            'Données corrompues ou clé maîtresse invalide.'
        );
    }
}

/**
 * Vérifie si une chaîne est un secret chiffré
 * 
 * @param value - Valeur à tester
 * @returns true si la valeur ressemble à un secret chiffré
 * 
 * @example
 * if (isEncryptedSecret(user.encryptionSecret)) {
 *   // Déchiffrer
 * } else {
 *   // Migration nécessaire: chiffrer le secret
 * }
 */
export function isEncryptedSecret(value: string | null | undefined): boolean {
    if (!value) return false;

    // Un secret hexadécimal de 64 caractères n'est PAS chiffré
    if (/^[0-9a-f]{64}$/i.test(value)) return false;

    try {
        const data = Buffer.from(value, 'base64');

        // Vérifier que c'est vraiment du base64 valide (pas juste décodable)
        // En re-encodant, on doit retrouver la même chaîne (modulo padding =)
        const reEncoded = data.toString('base64');
        if (reEncoded !== value && reEncoded.replace(/=+$/, '') !== value.replace(/=+$/, '')) {
            return false;
        }

        // Un secret chiffré fait au minimum IV (16) + AuthTag (16) + quelques bytes de données
        return data.length >= (IV_LENGTH + AUTH_TAG_LENGTH + 1);
    } catch {
        return false;
    }
}

/**
 * Migre un secret en clair vers format chiffré
 * 
 * Fonction helper pour migration de DB
 * 
 * @param plainSecret - Secret en clair (hex)
 * @returns Secret chiffré, ou null si plainSecret invalide
 * 
 * @example
 * // Dans migration script
 * const users = await db.select().from(usersTable);
 * for (const user of users) {
 *   if (!isEncryptedSecret(user.encryptionSecret)) {
 *     const encrypted = migrateSecretToEncrypted(user.encryptionSecret);
 *     if (encrypted) {
 *       await db.update(usersTable)
 *         .set({ encryptionSecret: encrypted })
 *         .where(eq(usersTable.id, user.id));
 *     }
 *   }
 * }
 */
export function migrateSecretToEncrypted(plainSecret: string | null | undefined): string | null {
    if (!plainSecret) return null;

    // Vérifier que c'est un secret valide (64 chars hex OU UUID 36 chars)
    const isHex64 = /^[0-9a-f]{64}$/i.test(plainSecret);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plainSecret);

    if (!isHex64 && !isUuid) {
        // console.warn(`Secret invalide, impossible de migrer: ${plainSecret.substring(0, 10)}...`);
        return null;
    }

    try {
        return encryptUserSecret(plainSecret);
    } catch (_error) {
        // console.error('Erreur migration secret:', error);
        return null;
    }
}