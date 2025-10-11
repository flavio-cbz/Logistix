#!/usr/bin/env tsx

/**
 * Script d'initialisation sécurisée - LogistiX
 * 
 * Génère les secrets requis et crée le fichier .env.local
 * À exécuter lors du premier setup du projet
 * 
 * @module scripts/setup-security
 */

import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

const ENV_LOCAL_PATH = path.join(process.cwd(), '.env.local');
const ENV_EXAMPLE_PATH = path.join(process.cwd(), '.env.local.example');

/**
 * Génère un secret cryptographiquement sûr
 * 
 * @param bytes - Nombre de bytes à générer
 * @returns Secret en hexadécimal
 */
function generateSecret(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Vérifie si .env.local existe déjà
 */
function checkExistingEnv(): boolean {
  if (existsSync(ENV_LOCAL_PATH)) {
    console.log('⚠️  Le fichier .env.local existe déjà\n');
    return true;
  }
  return false;
}

/**
 * Lit le template .env.local.example
 */
function loadEnvExample(): string {
  if (!existsSync(ENV_EXAMPLE_PATH)) {
    throw new Error(
      'Fichier .env.local.example introuvable. ' +
      'Vérifiez que vous êtes à la racine du projet.'
    );
  }

  return readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
}

/**
 * Génère le contenu .env.local avec secrets
 */
function generateEnvLocal(template: string): string {
  const secrets = {
    ENCRYPTION_MASTER_KEY: generateSecret(32),
    JWT_SECRET: generateSecret(32),
  };

  let content = template;

  // Remplacer les placeholders vides
  content = content.replace(
    /^ENCRYPTION_MASTER_KEY=$/m,
    `ENCRYPTION_MASTER_KEY=${secrets.ENCRYPTION_MASTER_KEY}`
  );

  content = content.replace(
    /^JWT_SECRET=$/m,
    `JWT_SECRET=${secrets.JWT_SECRET}`
  );

  // Ajouter un timestamp de génération
  const generatedAt = new Date().toISOString();
  content = content.replace(
    /^# Variables d'environnement - LogistiX$/m,
    `# Variables d'environnement - LogistiX
# Généré automatiquement le: ${generatedAt}`
  );

  return content;
}

/**
 * Affiche les secrets générés (de manière sécurisée)
 */
function displaySecrets(content: string): void {
  const encryptionKey = content.match(/ENCRYPTION_MASTER_KEY=([a-f0-9]{64})/)?.[1];
  const jwtSecret = content.match(/JWT_SECRET=([a-f0-9]{64})/)?.[1];

  console.log('🔑 Secrets générés:\n');
  
  if (encryptionKey) {
    console.log('   ENCRYPTION_MASTER_KEY:');
    console.log(`   ${encryptionKey.substring(0, 16)}...${encryptionKey.substring(48)}`);
    console.log('   (32 bytes pour chiffrement AES-256)\n');
  }

  if (jwtSecret) {
    console.log('   JWT_SECRET:');
    console.log(`   ${jwtSecret.substring(0, 16)}...${jwtSecret.substring(48)}`);
    console.log('   (32 bytes pour signature JWT)\n');
  }
}

/**
 * Affiche les instructions post-setup
 */
function displayInstructions(): void {
  console.log('📝 Prochaines étapes:\n');
  console.log('   1. Éditez .env.local pour ajouter vos clés API:');
  console.log('      - SECRET_OPENAI_API_KEY (pour l\'IA)');
  console.log('      - SECRET_VINTED_API_KEY (si disponible)\n');
  console.log('   2. Lancez la migration de chiffrement:');
  console.log('      npx tsx scripts/db/migrate-encrypt-user-secrets.ts\n');
  console.log('   3. Démarrez l\'application:');
  console.log('      npm run dev\n');
  console.log('⚠️  IMPORTANT: Ne commitez JAMAIS .env.local !');
  console.log('   Ce fichier est déjà dans .gitignore\n');
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔐 Setup Sécurité - LogistiX\n');
  console.log('='.repeat(50) + '\n');

  // Vérifier si .env.local existe
  if (checkExistingEnv()) {
    console.log('❓ Voulez-vous régénérer les secrets ? (y/N)');
    console.log('   ⚠️  Cela invalidera les secrets existants !');
    
    // Pour un script automatique, on s'arrête ici
    console.log('\n✋ Arrêt du script pour éviter écrasement accidentel');
    console.log('💡 Pour régénérer, supprimez manuellement .env.local d\'abord\n');
    process.exit(0);
  }

  try {
    // Charger le template
    console.log('📄 Chargement du template .env.local.example...');
    const template = loadEnvExample();

    // Générer le contenu avec secrets
    console.log('🎲 Génération des secrets cryptographiques...\n');
    const envContent = generateEnvLocal(template);

    // Sauvegarder
    writeFileSync(ENV_LOCAL_PATH, envContent, { mode: 0o600 });
    console.log('✅ Fichier .env.local créé avec succès !\n');

    // Afficher les secrets (partiellement)
    displaySecrets(envContent);

    // Instructions finales
    displayInstructions();

    console.log('='.repeat(50));
    console.log('✅ Setup sécurité terminé !\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    console.error('\n💡 Vérifiez que vous êtes à la racine du projet');
    process.exit(1);
  }
}

// Exécution
if (require.main === module) {
  main().catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

export { main as setupSecurity };