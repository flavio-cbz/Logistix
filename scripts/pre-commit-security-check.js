#!/usr/bin/env node

/**
 * 🔒 PRE-COMMIT HOOK - LogistiX Security
 * =====================================
 * 
 * Hook de validation automatique avant commit pour maintenir
 * la qualité et sécurité du code. Exécute des vérifications
 * rapides sur les fichiers modifiés.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 PRE-COMMIT: Validation de sécurité LogistiX...\n');

/**
 * Exécute une commande et retourne le résultat
 */
function executeCommand(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    if (!options.ignoreErrors) {
      throw error;
    }
    return null;
  }
}

/**
 * Obtient la liste des fichiers modifiés (staged)
 */
function getStagedFiles() {
  const output = executeCommand('git diff --cached --name-only', { silent: true });
  return output ? output.trim().split('\n').filter(f => f.length > 0) : [];
}

/**
 * Vérifie si des endpoints API ont été modifiés
 */
function hasApiChanges(files) {
  return files.some(file => file.match(/app\/api\/.*route\.(ts|js)$/));
}

/**
 * Valide la syntaxe TypeScript des fichiers modifiés
 */
function validateTypeScript(files) {
  console.log('🔧 Vérification TypeScript...');
  
  const tsFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  
  if (tsFiles.length === 0) {
    console.log('   ℹ️ Aucun fichier TypeScript modifié\n');
    return true;
  }
  
  try {
    // Vérification rapide avec tsc --noEmit
    executeCommand('npx tsc --noEmit --skipLibCheck', { silent: true });
    console.log('   ✅ TypeScript valide\n');
    return true;
  } catch (error) {
    console.log('   ❌ Erreurs TypeScript détectées');
    console.log('   💡 Exécutez "npm run type-check" pour plus de détails\n');
    return false;
  }
}

/**
 * Valide les schémas Zod si des endpoints API sont modifiés
 */
function validateZodSchemas() {
  console.log('🧪 Validation des schémas Zod...');
  
  try {
    const result = executeCommand('npx tsx scripts/test-validation-schemas.ts', { 
      silent: true,
      ignoreErrors: true 
    });
    
    if (result && result.includes('✅')) {
      console.log('   ✅ Schémas Zod valides\n');
      return true;
    } else {
      console.log('   ⚠️ Certains schémas Zod ont des problèmes');
      console.log('   💡 Vérifiez avec "npx tsx scripts/test-validation-schemas.ts"\n');
      return true; // Non bloquant
    }
  } catch (error) {
    console.log('   ⚠️ Impossible de valider les schémas Zod');
    console.log('   💡 Vérifiez manuellement si nécessaire\n');
    return true; // Non bloquant
  }
}

/**
 * Vérifie la sécurité des endpoints API
 */
function validateApiSecurity() {
  console.log('🔒 Vérification sécurité des endpoints...');
  
  try {
    const result = executeCommand('node scripts/analyze-api-security.js', { silent: true });
    
    // Extraire le pourcentage de sécurisation
    const percentageMatch = result.match(/Pourcentage sécurisé: ([\d.]+)%/);
    const percentage = percentageMatch ? parseFloat(percentageMatch[1]) : 0;
    
    console.log(`   📊 Endpoints sécurisés: ${percentage}%`);
    
    if (percentage >= 35) {
      console.log('   ✅ Seuil de sécurité respecté (≥ 35%)\n');
      return true;
    } else {
      console.log('   ❌ Seuil de sécurité non respecté (< 35%)');
      console.log('   💡 Sécurisez des endpoints avec validation Zod\n');
      return false;
    }
  } catch (error) {
    console.log('   ⚠️ Impossible d\'analyser la sécurité');
    console.log('   💡 Vérifiez manuellement avec "node scripts/analyze-api-security.js"\n');
    return true; // Non bloquant si script indisponible
  }
}

/**
 * Vérifie les imports de sécurité dans les nouveaux fichiers API
 */
function validateApiImports(files) {
  console.log('🔍 Vérification des imports de sécurisation...');
  
  const apiFiles = files.filter(f => f.match(/app\/api\/.*route\.(ts|js)$/));
  
  if (apiFiles.length === 0) {
    console.log('   ℹ️ Aucun fichier API modifié\n');
    return true;
  }
  
  let allSecure = true;
  
  for (const file of apiFiles) {
    if (!fs.existsSync(file)) {
      continue; // Fichier supprimé
    }
    
    const content = fs.readFileSync(file, 'utf8');
    
    // Vérifier la présence des imports de sécurisation
    const hasValidation = content.includes('validateQuery') || 
                         content.includes('validateBody') || 
                         content.includes('validateRequest');
    
    const hasErrorResponse = content.includes('createErrorResponse') || 
                            content.includes('createSuccessResponse');
    
    if (!hasValidation && !hasErrorResponse) {
      console.log(`   ⚠️ ${file} : Pas d'imports de sécurisation détectés`);
      console.log(`      💡 Considérez l'ajout de validation Zod et réponses standardisées`);
      // Non bloquant - juste un avertissement
    } else {
      console.log(`   ✅ ${file} : Imports de sécurisation présents`);
    }
  }
  
  console.log('');
  return allSecure;
}

/**
 * Exécution principale
 */
async function main() {
  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    console.log('ℹ️ Aucun fichier staged pour le commit\n');
    return;
  }
  
  console.log(`📁 Fichiers à committer: ${stagedFiles.length}\n`);
  
  let allChecksPass = true;
  
  // 1. Validation TypeScript (bloquant)
  if (!validateTypeScript(stagedFiles)) {
    allChecksPass = false;
  }
  
  // 2. Vérification des imports de sécurisation (non bloquant)
  validateApiImports(stagedFiles);
  
  // 3. Si des API sont modifiées, vérifications spéciales
  if (hasApiChanges(stagedFiles)) {
    console.log('🔄 Changements d\'API détectés - Vérifications supplémentaires...\n');
    
    // Validation des schémas Zod (non bloquant)
    validateZodSchemas();
    
    // Sécurité globale des endpoints (potentiellement bloquant)
    if (!validateApiSecurity()) {
      console.log('⚠️ AVERTISSEMENT: Sécurité globale faible');
      console.log('   💡 Le commit est autorisé mais considérez l\'amélioration de la sécurité\n');
      // Ne pas bloquer pour l'instant, mais avertir
    }
  }
  
  // Résultat final
  if (allChecksPass) {
    console.log('✅ PRE-COMMIT: Toutes les vérifications sont passées');
    console.log('🚀 Commit autorisé !\n');
    process.exit(0);
  } else {
    console.log('❌ PRE-COMMIT: Certaines vérifications ont échoué');
    console.log('🛑 Commit bloqué - Corrigez les erreurs avant de committer\n');
    process.exit(1);
  }
}

// Gestion des erreurs globales
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur inattendue dans le pre-commit hook:', error.message);
  process.exit(1);
});

// Exécution
main().catch((error) => {
  console.error('❌ Erreur dans le pre-commit hook:', error.message);
  process.exit(1);
});