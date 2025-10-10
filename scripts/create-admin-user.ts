#!/usr/bin/env ts-node
/**
 * Script déprécié - Utilisez npm run db:manage admin à la place
 */

console.warn('⚠️  Ce script est déprécié. Utilisez plutôt : npm run db:manage admin');
console.log('Pour plus d\'informations, utilisez : npm run db:manage help');

// Appeler le nouveau script
import { createDefaultAdminUser } from './database-manager';

(async () => {
  try {
    await createDefaultAdminUser();
    console.log('✅ Utilisateur administrateur créé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur administrateur:', error);
    process.exit(1);
  }
})();