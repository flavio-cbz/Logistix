import * as fs from 'fs';
import * as path from 'path';

/**
 * Debug Logger Validation Script
 * 
 * Validates the Debug Logger implementation structure and functionality
 * Run with: npx tsx lib/services/validation/debug-logger-validation.ts
 */

function validateDebugLogger(): boolean {
  console.log('🚀 Démarrage de la validation du DebugLogger...');

  try {
    // Test 1: Module import et existence de la classe/instance
    let DebugLogger: unknown;
    let debugLogger: unknown;
    try {
      const module = require('./debug-logger');
      DebugLogger = module.DebugLogger;
      debugLogger = module.debugLogger;

      if (typeof DebugLogger !== 'function' || typeof debugLogger === 'undefined') {
        console.error('❌ Test 1 échoué: DebugLogger ou son instance debugLogger n\'est pas correctement exporté.');
        return false;
      }
      console.log('✅ Test 1 réussi: Module DebugLogger importé.');
    } catch (error: unknown) {
      console.error(`❌ Test 1 échoué: Impossible d'importer DebugLogger. ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }

    // Test 2: Définitions de types
    try {
      const typesModule = require('./types');
      const requiredTypes = [
        'DebugReport',
        'ApiCallLog',
        'DatabaseOperationLog',
        'CalculationLog',
        'ErrorLog'
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
    // Instancier DebugLogger si c'est une classe, sinon utiliser l'instance exportée
    const loggerInstance = typeof DebugLogger === 'function' ? new (DebugLogger as new () => any)() : debugLogger;

    const requirements = {
      '4.2': { method: 'enableDebugMode', message: 'Debug mode activation' },
      '4.3': { method: 'log', message: 'Detailed logging (TRACE/DEBUG)' }, // Assuming 'log' is the comprehensive method
      '4.4': { method: 'logApiRequest', message: 'API/DB/Calculation logging' },
      '4.5': { method: 'generateDebugReport', message: 'Debug report generation' }
    };

    for (const [reqId, { method, message }] of Object.entries(requirements)) {
      if (typeof loggerInstance[method] !== 'function') {
        console.error(`❌ Test 4 échoué (${reqId}): Méthode requise "${method}" pour "${message}" est manquante ou n'est pas une fonction.`);
        return false;
      }
      console.log(`✅ Test 4 réussi (${reqId}): Méthode "${method}" présente.`);
    }

    // Test 5: Core functionality validation (vérifier la présence des méthodes clés)
    const coreFeaturesMethods = [
      'enableDebugMode', 'disableDebugMode', 'log', 'logApiRequest', 'logDatabaseOperation',
      'logCalculation', 'logError', 'generateDebugReport', 'clearLogs', 'getScopedLogger', 'sanitizeHeaders', 'exportToJson'
    ];

    for (const method of coreFeaturesMethods) {
      if (typeof loggerInstance[method] !== 'function') {
        console.error(`❌ Test 5 échoué: Méthode de fonctionnalité principale "${method}" est manquante ou n'est pas une fonction.`);
        return false;
      }
    }
    console.log('✅ Test 5 réussi: Toutes les méthodes de fonctionnalité principale sont présentes.');

    // Test 6: File structure validation
    const requiredFiles = [
      'debug-logger.ts',
      path.join('__tests__', 'debug-logger.test.ts'),
      'types.ts',
      'index.ts'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Test 6 échoué: Fichier requis manquant: ${file} (chemin: ${filePath})`);
        return false;
      }
      console.log(`✅ Test 6 réussi: Fichier ${file} trouvé.`);
    }

    console.log('\n🎉 Tous les tests de validation du DebugLogger ont réussi !');
    return true;

  } catch (error: unknown) {
    console.error('\n❌ Validation générale échouée:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const success = validateDebugLogger();
  process.exit(success ? 0 : 1);
}

export { validateDebugLogger };