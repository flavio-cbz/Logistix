/**
 * Migration de sécurité - Chiffrement des secrets utilisateurs
 * 
 * Chiffre tous les encryptionSecret existants avec la clé maîtresse
 * Utilise AES-256-GCM pour authentification + confidentialité
 * 
 * REQUIS: Variable d'environnement ENCRYPTION_MASTER_KEY (32 bytes en hex)
 * Générer avec: openssl rand -hex 32
 * 
 * @module scripts/db/migrate-encrypt-user-secrets
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { 
  encryptUserSecret, 
  isEncryptedSecret, 
  migrateSecretToEncrypted 
} from '../../lib/utils/crypto-secrets';

const DB_PATH = path.join(process.cwd(), 'data', 'logistix.db');

interface UserRow {
  id: string;
  username: string;
  encryption_secret: string | null;
}

async function main() {
  console.log('🔐 Migration: Chiffrement des secrets utilisateurs\n');

  // Vérifier que la clé maîtresse est définie
  if (!process.env.ENCRYPTION_MASTER_KEY) {
    console.error('❌ ERREUR: Variable ENCRYPTION_MASTER_KEY non définie');
    console.error('\n📝 Générez-la avec:');
    console.error('   openssl rand -hex 32');
    console.error('\n💡 Puis ajoutez dans .env.local:');
    console.error('   ENCRYPTION_MASTER_KEY=<valeur_générée>');
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  try {
    // Récupérer tous les utilisateurs avec des secrets
    const users = db.prepare(`
      SELECT id, username, encryption_secret 
      FROM users 
      WHERE encryption_secret IS NOT NULL
    `).all() as UserRow[];

    console.log(`📊 Trouvé ${users.length} utilisateur(s) avec encryption_secret\n`);

    if (users.length === 0) {
      console.log('✅ Aucune migration nécessaire');
      process.exit(0);
    }

    let encrypted = 0;
    let alreadyEncrypted = 0;
    let failed = 0;

    // Migrer chaque utilisateur
    for (const user of users) {
      const secret = user.encryption_secret;

      if (!secret) continue;

      // Vérifier si déjà chiffré
      if (isEncryptedSecret(secret)) {
        console.log(`⏭️  ${user.username}: Déjà chiffré`);
        alreadyEncrypted++;
        continue;
      }

      // Chiffrer le secret
      console.log(`🔒 ${user.username}: Chiffrement en cours...`);
      const encryptedSecret = migrateSecretToEncrypted(secret);

      if (!encryptedSecret) {
        console.error(`   ❌ Échec chiffrement (secret invalide)`);
        failed++;
        continue;
      }

      // Mettre à jour en base
      try {
        db.prepare(`
          UPDATE users 
          SET encryption_secret = ?, updated_at = ?
          WHERE id = ?
        `).run(encryptedSecret, new Date().toISOString(), user.id);

        console.log(`   ✅ Chiffré avec succès`);
        encrypted++;
      } catch (error) {
        console.error(`   ❌ Erreur mise à jour DB:`, error);
        failed++;
      }
    }

    // Résumé
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ DE LA MIGRATION');
    console.log('='.repeat(50));
    console.log(`✅ Chiffrés avec succès   : ${encrypted}`);
    console.log(`⏭️  Déjà chiffrés          : ${alreadyEncrypted}`);
    console.log(`❌ Échecs                 : ${failed}`);
    console.log(`📦 Total traité           : ${users.length}`);
    console.log('='.repeat(50) + '\n');

    if (failed > 0) {
      console.warn('⚠️  ATTENTION: Certains secrets n\'ont pas pu être migrés');
      console.warn('   Vérifiez les logs ci-dessus pour plus de détails');
      process.exit(1);
    }

    console.log('🎉 Migration terminée avec succès !');
    console.log('\n💡 Prochaines étapes:');
    console.log('   1. Tester que l\'application fonctionne normalement');
    console.log('   2. Vérifier que les tokens Vinted se déchiffrent');
    console.log('   3. Faire un backup de la DB migrée');

  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Exécuter la migration
main().catch((error) => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});