import * as fs from 'fs';
import * as path from 'path';

/**
 * Database Integrity Checker Validation Script
 * 
 * Validates the Database Integrity Checker implementation structure and exports
 * Run with: npx tsx lib/services/validation/database-integrity-validation.ts
 */

function validateDatabaseIntegrityChecker(): boolean {
  console.log('🚀 Démarrage de la validation du DatabaseIntegrityChecker...');

  try {
    // Test 1: Module import et existence de la classe
    let DatabaseIntegrityChecker: unknown;
    try {
      // Utilisation d'un import dynamique pour éviter les erreurs de compilation si le module n'existe pas
      const module = require('./database-integrity-checker');
      DatabaseIntegrityChecker = module.DatabaseIntegrityChecker;
      if (typeof DatabaseIntegrityChecker !== 'function') {
        console.error('❌ Test 1 échoué: DatabaseIntegrityChecker n\'est pas une classe exportée.');
        return false;
      }
      console.log('✅ Test 1 réussi: Module DatabaseIntegrityChecker importé.');
    } catch (error: unknown) {
      console.error(`❌ Test 1 échoué: Impossible d'importer DatabaseIntegrityChecker. ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }

    // Test 2: Définitions de types
    try {
      const typesModule = require('./types');
      const requiredTypes = [
        'PreDeletionState',
        'IntegrityResult',
        'DatabaseSnapshot',
        'ConsistencyResult'
      ];
      const missingTypes = requiredTypes.filter(type => !(type in typesModule));
      if (missingTypes.length > 0) {
        console.error(`❌ Test 2 échoué: Types manquants dans 'types.ts': ${missingTypes.join(', ')}`);
        return false;
      }
      console.log('✅ Test 2 réussi: Tous les types requis sont définis.');
    } catch (error: unknown) {
      console.error(`❌ Test 2 échoué: Impossible de charger les types. ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }

    // Test 3: Export de l'index
    try {
      const indexModule = require('./index');
      if (Object.keys(indexModule).length === 0) {
        console.error('❌ Test 3 échoué: Le fichier index.ts n\'exporte rien.');
        return false;
      }
      console.log('✅ Test 3 réussi: Fichier index.ts exporte des éléments.');
    } catch (error: unknown) {
      console.error(`❌ Test 3 échoué: Impossible de charger le fichier index.ts. ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }

    // Test 4: Couverture des exigences (simple vérification de la présence des méthodes)
    const checkerInstance = new (DatabaseIntegrityChecker as new () => any)(); // Cast pour instancier
    const requirements = {
      '3.1': { method: 'checkPreDeletion', message: 'Pre-deletion state capture' },
      '3.2': { method: 'checkPostDeletion', message: 'Post-deletion validation' },
      '3.3': { method: 'createDatabaseSnapshot', message: 'Database snapshot functionality' },
      '3.4': { method: 'detectOrphanedData', message: 'Orphaned data detection' }
    };

    for (const [reqId, { method, message }] of Object.entries(requirements)) {
      if (typeof checkerInstance[method] !== 'function') {
        console.error(`❌ Test 4 échoué (${reqId}): Méthode requise "${method}" pour "${message}" est manquante ou n'est pas une fonction.`);
        return false;
      }
      console.log(`✅ Test 4 réussi (${reqId}): Méthode "${method}" présente.`);
    }

    // Test 5: Validation de la structure des fichiers
    const requiredFiles = [
      'database-integrity-checker.ts',
      path.join('__tests__', 'database-integrity-checker.test.ts'),
      'types.ts',
      'index.ts'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Test 5 échoué: Fichier requis manquant: ${file} (chemin: ${filePath})`);
        return false;
      }
      console.log(`✅ Test 5 réussi: Fichier ${file} trouvé.`);
    }

    console.log('\n🎉 Tous les tests de validation du DatabaseIntegrityChecker ont réussi !');
    return true;

  } catch (error: unknown) {
    console.error('\n❌ Validation générale échouée:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const success = validateDatabaseIntegrityChecker();
  process.exit(success ? 0 : 1);
}

export { validateDatabaseIntegrityChecker };