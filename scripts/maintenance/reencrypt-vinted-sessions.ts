#!/usr/bin/env tsx
/**
 * Script de migration sûre pour rechiffrer les sessions Vinted si la clé a changé.
 *
 * Usage (dry-run, ne modifie rien) :
 *   OLD_VINTED_CREDENTIALS_SECRET=oldsecret NEW_VINTED_CREDENTIALS_SECRET=newsecret tsx scripts/maintenance/reencrypt-vinted-sessions.ts
 *
 * Pour appliquer les modifications (dangerous - écrase les données en base) :
 *   OLD_VINTED_CREDENTIALS_SECRET=oldsecret NEW_VINTED_CREDENTIALS_SECRET=newsecret PERFORM_REENCRYPT=true tsx scripts/maintenance/reencrypt-vinted-sessions.ts
 *
 * Comportement :
 *  - Récupère toutes les lignes de vintedSessions
 *  - Pour chaque session, tente de déchiffrer avec la nouvelle clé (si déjà migré -> passe)
 *  - Sinon tente de déchiffrer avec l'ancienne clé ; si succès -> rechiffre avec la nouvelle clé et met à jour (si PERFORM_REENCRYPT=true)
 *  - Sinon marque l'entrée comme "requires_configuration" (si PERFORM_REENCRYPT=true) et logge pour intervention manuelle
 *
 * IMPORTANT : Testez d'abord en dry-run. Gardez une sauvegarde de la base avant de lancer avec PERFORM_REENCRYPT=true.
 */

import dotenv from 'dotenv';
dotenv.config();

import { promisify } from 'util';
import { scrypt as scryptCb, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';

const scrypt = promisify(scryptCb);

const ALGORITHM = 'aes-256-gcm';
/* const IV_LEN_CANDIDATES = [12, 16];
const TAG_LEN = 16; */
// Suppression : variables inutilisées

/** Dérive une clé 32 bytes depuis secret + salt (même méthode que le service) */
async function deriveKey(secret: string, salt: string): Promise<Buffer> {
  return (await scrypt(secret, salt, 32)) as Buffer;
}

/** Essaye de déchiffrer une charge en essayant plusieurs formats courants */
function tryDecryptWithKey(_key: Buffer, payload: string): string | null {
  const parts = payload.split(':');

  // Formats attendus :
  // - base64 canonical: iv_base64:tag_base64:ciphertext_base64
  // - legacy hex: iv_hex:encrypted_hex:tag_hex
  if (parts.length === 3) {
    // Try base64 canonical (iv:tag:encrypted)
    const a = parts[0]!, b = parts[1]!, c = parts[2]!;
    if (a && b && c) {
      try {
        const iv = Buffer.from(a, 'base64');
        const tag = Buffer.from(b, 'base64');
        const encrypted = Buffer.from(c, 'base64');
        const decipher = createDecipheriv(ALGORITHM, _key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
      } catch (e) {
        // fallback to hex style: iv:encrypted:tag
        try {
          const iv = Buffer.from(a, 'hex');
          const encrypted = Buffer.from(b, 'hex');
          const tag = Buffer.from(c, 'hex');
          const decipher = createDecipheriv(ALGORITHM, _key, iv);
          decipher.setAuthTag(tag);
          const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
          return decrypted.toString('utf8');
        } catch (e2) {
          // ignore
        }
      }
    }
  }

  // If structure is different, try some heuristic attempts:
  // Try splitting into 3 parts by '.' or '|' in case of other delimiters (rare)
  const altParts = payload.split('.');
  if (altParts.length === 3) {
    const a = altParts[0]!, b = altParts[1]!, c = altParts[2]!;
    if (a && b && c) {
      try {
        const iv = Buffer.from(a, 'base64');
        const tag = Buffer.from(b, 'base64');
        const encrypted = Buffer.from(c, 'base64');
        const decipher = createDecipheriv(ALGORITHM, _key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
      } catch (e) {
        // ignore
      }
    }
  }

  return null;
}

/** Chiffre dans le format canonique base64 iv:tag:ciphertext */
function encryptWithKey(_key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, _key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

async function main() {
  const oldSecret = process.env['OLD_VINTED_CREDENTIALS_SECRET']!;
  const newSecret = process.env['NEW_VINTED_CREDENTIALS_SECRET']!;
  const salt = process.env['VINTED_CREDENTIALS_SALT']! || 'default-salt-should-be-changed';
  const perform = Boolean(process.env['PERFORM_REENCRYPT']!);
  // Optionnel : override via flag in env PERFORM_REENCRYPT=true

  if (!oldSecret || !newSecret) {
    console.error('Les variables OLD_VINTED_CREDENTIALS_SECRET et NEW_VINTED_CREDENTIALS_SECRET sont requises.');
    process.exit(1);
  }

  console.log(`Mode: ${perform ? 'APPLY (dangerous)' : 'DRY-RUN (no DB modifications)'}`);
  console.log('Deriving keys...');
  const oldKey = await deriveKey(oldSecret, salt);
  const newKey = await deriveKey(newSecret, salt);

  console.log('Récupération des sessions Vinted en base...');
  const sessions = await db.select().from(vintedSessions);

  console.log(`Found ${sessions.length} sessions. Processing...`);

  let alreadyOk = 0;
  let migrated = 0;
  let failed = 0;
  const failures: { id: string; reason: string }[] = [];

  for (const s of sessions) {
    // Access payload using both possible property names
    const payload = (s as any).sessionCookie ?? (s as any).session_cookie ?? null;
    if (!payload) {
      // nothing to do
      continue;
    }

    // 1) Try decrypt with newKey (already migrated or secret unchanged)
    let decrypted = tryDecryptWithKey(newKey, payload);
    if (decrypted) {
      alreadyOk++;
      continue;
    }

    // 2) Try decrypt with oldKey (needs migration)
    decrypted = tryDecryptWithKey(oldKey, payload);
    if (!decrypted) {
      // Could be corrupted or in unknown format
      failed++;
      failures.push({ id: (s as any).id, reason: 'Déchiffrement impossible avec ancienne et nouvelle clé' });
      if (perform) {
        try {
          await db.update(vintedSessions).set({
            status: 'requires_configuration',
            refreshErrorMessage: 'Impossible de déchiffrer la session après migration',
          }).where(eq(vintedSessions.id, (s as any).id));
        } catch (e) {
          console.error(`Échec update status pour ${ (s as any).id }:`, e);
        }
      }
      continue;
    }

    // If we reach here, we successfully decrypted with the old key and can re-encrypt with newKey
    const newEncrypted = encryptWithKey(newKey, decrypted);

    console.log(`Session ${ (s as any).id } will be migrated (dry-run:${!perform})`);

    if (perform) {
      try {
        // Use the drizzle schema field name (sessionCookie) which maps to session_cookie in DB
        await db.update(vintedSessions).set({
          sessionCookie: newEncrypted,
          status: 'active',
          refreshErrorMessage: null,
          updatedAt: new Date().toISOString(),
        }).where(eq(vintedSessions.id, (s as any).id));
        migrated++;
      } catch (e) {
        failed++;
        failures.push({ id: (s as any).id, reason: `DB update failed: ${ (e as any).message ?? e }` });
      }
    } else {
      migrated++;
    }
  }

  console.log('--- Résumé ---');
  console.log(`Total sessions: ${sessions.length}`);
  console.log(`Already valid with new key: ${alreadyOk}`);
  console.log(`Will be / were migrated: ${migrated}`);
  console.log(`Failed: ${failed}`);
  if (failures.length > 0) {
    console.log('Echecs détaillés (id / raison) :');
    failures.forEach(f => console.log(` - ${f.id} : ${f.reason}`));
  }

  if (!perform) {
    console.log('\nDry-run terminé. Pour appliquer les mises à jour, ré-exécutez avec PERFORM_REENCRYPT=true');
  } else {
    console.log('\nMigration appliquée. Vérifiez les logs et effectuez un backup DB préalable la prochaine fois.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Erreur inattendue dans le script de migration:', err);
  process.exit(2);
});