/**
 * Tests pour les utilitaires de chiffrement de secrets
 * 
 * Vérifie que le chiffrement/déchiffrement AES-256-GCM fonctionne correctement
 * et que les secrets utilisateurs sont protégés
 * 
 * @module tests/unit/utils/crypto-secrets.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  encryptUserSecret,
  decryptUserSecret,
  isEncryptedSecret,
  migrateSecretToEncrypted,
} from '@/lib/utils/crypto-secrets';
import { randomBytes } from 'crypto';

// Générer une clé de test valide (32 bytes = 64 hex chars)
const TEST_MASTER_KEY = randomBytes(32).toString('hex');
let originalMasterKey: string | undefined;

// Mock ENCRYPTION_MASTER_KEY pour les tests
beforeAll(() => {
  originalMasterKey = process.env.ENCRYPTION_MASTER_KEY;
  process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY;
});

afterAll(() => {
  // Restaurer la clé originale
  if (originalMasterKey !== undefined) {
    process.env.ENCRYPTION_MASTER_KEY = originalMasterKey;
  } else {
    delete process.env.ENCRYPTION_MASTER_KEY;
  }
});

describe('crypto-secrets', () => {
  describe('encryptUserSecret', () => {
    it('should encrypt a valid hex secret', () => {
      const plainSecret = randomBytes(32).toString('hex');
      const encrypted = encryptUserSecret(plainSecret);

      // Le secret chiffré doit être en base64
      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plainSecret);

      // Doit pouvoir être converti en Buffer
      const buffer = Buffer.from(encrypted, 'base64');
      expect(buffer.length).toBeGreaterThan(48); // IV (16) + Tag (16) + Data
    });

    it('should produce different outputs for same input (IV randomness)', () => {
      const plainSecret = randomBytes(32).toString('hex');
      const encrypted1 = encryptUserSecret(plainSecret);
      const encrypted2 = encryptUserSecret(plainSecret);

      // Même input, différents outputs (grâce à l'IV aléatoire)
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw if ENCRYPTION_MASTER_KEY is missing', () => {
      const oldKey = process.env.ENCRYPTION_MASTER_KEY;
      delete process.env.ENCRYPTION_MASTER_KEY;

      expect(() => {
        encryptUserSecret('test');
      }).toThrow(/ENCRYPTION_MASTER_KEY non définie/);

      process.env.ENCRYPTION_MASTER_KEY = oldKey;
    });

    it('should throw if ENCRYPTION_MASTER_KEY is invalid length', () => {
      const oldKey = process.env.ENCRYPTION_MASTER_KEY;
      process.env.ENCRYPTION_MASTER_KEY = 'tooshort';

      expect(() => {
        encryptUserSecret('test');
      }).toThrow(/invalide.*32 bytes/);

      process.env.ENCRYPTION_MASTER_KEY = oldKey;
    });
  });

  describe('decryptUserSecret', () => {
    it('should decrypt an encrypted secret back to original', () => {
      const plainSecret = randomBytes(32).toString('hex');
      const encrypted = encryptUserSecret(plainSecret);
      const decrypted = decryptUserSecret(encrypted);

      expect(decrypted).toBe(plainSecret);
    });

    it('should throw on tampered data (authentication)', () => {
      const plainSecret = randomBytes(32).toString('hex');
      const encrypted = encryptUserSecret(plainSecret);

      // Altérer le dernier byte
      const buffer = Buffer.from(encrypted, 'base64');
      buffer[buffer.length - 1] = buffer[buffer.length - 1]! ^ 0xff;
      const tampered = buffer.toString('base64');

      expect(() => {
        decryptUserSecret(tampered);
      }).toThrow(/Échec déchiffrement/);
    });

    it('should throw on invalid base64', () => {
      expect(() => {
        decryptUserSecret('not-base64!!!');
      }).toThrow();
    });

    it('should throw if encrypted with different master key', () => {
      const plainSecret = randomBytes(32).toString('hex');
      const encrypted = encryptUserSecret(plainSecret);

      // Changer la clé maîtresse
      const oldKey = process.env.ENCRYPTION_MASTER_KEY;
      process.env.ENCRYPTION_MASTER_KEY = randomBytes(32).toString('hex');

      expect(() => {
        decryptUserSecret(encrypted);
      }).toThrow(/Échec déchiffrement/);

      process.env.ENCRYPTION_MASTER_KEY = oldKey;
    });
  });

  describe('isEncryptedSecret', () => {
    it('should return true for encrypted secrets', () => {
      const plainSecret = randomBytes(32).toString('hex');
      const encrypted = encryptUserSecret(plainSecret);

      expect(isEncryptedSecret(encrypted)).toBe(true);
    });

    it('should return false for plain hex secrets', () => {
      const plainSecret = randomBytes(32).toString('hex');

      expect(isEncryptedSecret(plainSecret)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isEncryptedSecret(null)).toBe(false);
      expect(isEncryptedSecret(undefined)).toBe(false);
    });

    it('should return false for invalid strings', () => {
      expect(isEncryptedSecret('not-a-secret')).toBe(false);
      expect(isEncryptedSecret('')).toBe(false);
      expect(isEncryptedSecret('tooshort')).toBe(false);
    });

    it('should return false for too short base64 data', () => {
      // Moins de IV (16) + Tag (16) bytes
      const shortData = Buffer.from('short').toString('base64');
      expect(isEncryptedSecret(shortData)).toBe(false);
    });
  });

  describe('migrateSecretToEncrypted', () => {
    it('should migrate valid plain secret', () => {
      const plainSecret = randomBytes(32).toString('hex');
      const migrated = migrateSecretToEncrypted(plainSecret);

      expect(migrated).toBeTruthy();
      expect(isEncryptedSecret(migrated!)).toBe(true);

      // Vérifier déchiffrement
      const decrypted = decryptUserSecret(migrated!);
      expect(decrypted).toBe(plainSecret);
    });

    it('should return null for invalid secrets', () => {
      expect(migrateSecretToEncrypted('tooshort')).toBeNull();
      expect(migrateSecretToEncrypted('not-hex-at-all')).toBeNull();
      expect(migrateSecretToEncrypted(null)).toBeNull();
      expect(migrateSecretToEncrypted(undefined)).toBeNull();
    });

    it('should not migrate already encrypted secrets', () => {
      const plainSecret = randomBytes(32).toString('hex');
      const encrypted = encryptUserSecret(plainSecret);

      // Ne devrait pas tenter de chiffrer un secret déjà chiffré
      // (retourne null car pas le bon format hex 64 chars)
      const result = migrateSecretToEncrypted(encrypted);
      expect(result).toBeNull();
    });

    it('should validate hex format (64 chars)', () => {
      // Secret valide: 32 bytes = 64 hex chars
      const valid = randomBytes(32).toString('hex');
      expect(migrateSecretToEncrypted(valid)).toBeTruthy();

      // Secret invalide: 31 bytes = 62 hex chars
      const invalid = randomBytes(31).toString('hex');
      expect(migrateSecretToEncrypted(invalid)).toBeNull();
    });
  });

  describe('End-to-end encryption workflow', () => {
    it('should support full user secret lifecycle', () => {
      // 1. Générer un secret utilisateur (comme generateUserSecret() dans crypto.ts)
      const userSecret = randomBytes(32).toString('hex');
      expect(userSecret).toHaveLength(64);

      // 2. Chiffrer avant stockage en DB
      const encryptedForDb = encryptUserSecret(userSecret);
      expect(isEncryptedSecret(encryptedForDb)).toBe(true);

      // 3. Stocker dans DB (simulation)
      const storedSecret = encryptedForDb;

      // 4. Récupérer de la DB et déchiffrer
      const decryptedFromDb = decryptUserSecret(storedSecret);
      expect(decryptedFromDb).toBe(userSecret);

      // 5. Utiliser le secret déchiffré (ex: deriveUserKek)
      expect(decryptedFromDb).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/i.test(decryptedFromDb)).toBe(true);
    });

    it('should handle migration from plain to encrypted', () => {
      // Scénario: DB contient des secrets en clair, on migre
      const plainSecret = randomBytes(32).toString('hex');

      // Vérifier qu'il n'est pas chiffré
      expect(isEncryptedSecret(plainSecret)).toBe(false);

      // Migrer
      const migrated = migrateSecretToEncrypted(plainSecret);
      expect(migrated).toBeTruthy();
      expect(isEncryptedSecret(migrated!)).toBe(true);

      // Vérifier que le déchiffrement donne l'original
      const decrypted = decryptUserSecret(migrated!);
      expect(decrypted).toBe(plainSecret);
    });
  });
});