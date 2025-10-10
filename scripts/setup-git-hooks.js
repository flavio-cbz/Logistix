#!/usr/bin/env node

/**
 * 🔧 SETUP GIT HOOKS - LogistiX Security
 * ======================================
 * 
 * Script pour configurer automatiquement les hooks Git
 * pour maintenir la sécurité et qualité du code.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Configuration des hooks Git pour LogistiX...\n');

/**
 * Vérifie si on est dans un repo Git
 */
function isGitRepository() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Crée le hook pre-commit
 */
function setupPreCommitHook() {
  const hooksDir = '.git/hooks';
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  
  if (!fs.existsSync(hooksDir)) {
    console.log('❌ Dossier .git/hooks introuvable');
    return false;
  }
  
  // Contenu du hook pre-commit
  const hookContent = `#!/bin/sh
#
# LogistiX Pre-commit Security Hook
# Exécute les vérifications de sécurité avant chaque commit
#

echo "🔒 Exécution du hook de sécurité LogistiX..."
node scripts/pre-commit-security-check.js
`;

  try {
    fs.writeFileSync(preCommitPath, hookContent);
    
    // Rendre le hook exécutable (Unix/Mac)
    if (process.platform !== 'win32') {
      execSync(`chmod +x ${preCommitPath}`);
    }
    
    console.log('✅ Hook pre-commit configuré');
    return true;
  } catch (error) {
    console.log(`❌ Erreur lors de la création du hook: ${error.message}`);
    return false;
  }
}

/**
 * Crée un hook commit-msg pour valider les messages
 */
function setupCommitMsgHook() {
  const hooksDir = '.git/hooks';
  const commitMsgPath = path.join(hooksDir, 'commit-msg');
  
  // Contenu du hook commit-msg
  const hookContent = `#!/bin/sh
#
# LogistiX Commit Message Validation
# Vérifie que les messages de commit suivent les conventions
#

commit_message=$(cat $1)

# Vérifier que le message n'est pas vide
if [ -z "$commit_message" ]; then
    echo "❌ Message de commit vide"
    exit 1
fi

# Vérifier la longueur minimale
if [ \${#commit_message} -lt 10 ]; then
    echo "❌ Message de commit trop court (minimum 10 caractères)"
    exit 1
fi

# Suggestions pour des messages plus informatifs
if echo "$commit_message" | grep -qE "^(fix|feat|docs|style|refactor|test|chore|security)"; then
    echo "✅ Message de commit conforme aux conventions"
else
    echo "💡 Conseil: Utilisez des préfixes comme 'feat:', 'fix:', 'security:', etc."
fi

exit 0
`;

  try {
    fs.writeFileSync(commitMsgPath, hookContent);
    
    // Rendre le hook exécutable (Unix/Mac)
    if (process.platform !== 'win32') {
      execSync(`chmod +x ${commitMsgPath}`);
    }
    
    console.log('✅ Hook commit-msg configuré');
    return true;
  } catch (error) {
    console.log(`❌ Erreur lors de la création du hook commit-msg: ${error.message}`);
    return false;
  }
}

/**
 * Configure les scripts npm pour les hooks
 */
function setupNpmScripts() {
  const packageJsonPath = 'package.json';
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json introuvable');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Ajouter les scripts s'ils n'existent pas
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    const scriptsToAdd = {
      'setup:hooks': 'node scripts/setup-git-hooks.js',
      'security:check': 'node scripts/pre-commit-security-check.js',
      'security:analyze': 'node scripts/analyze-api-security.js',
      'security:test': 'npx tsx scripts/test-validation-schemas.ts'
    };
    
    let scriptsAdded = 0;
    
    for (const [scriptName, scriptCommand] of Object.entries(scriptsToAdd)) {
      if (!packageJson.scripts[scriptName]) {
        packageJson.scripts[scriptName] = scriptCommand;
        scriptsAdded++;
      }
    }
    
    if (scriptsAdded > 0) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(`✅ ${scriptsAdded} scripts npm ajoutés`);
    } else {
      console.log('ℹ️ Scripts npm déjà configurés');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Erreur lors de la configuration des scripts: ${error.message}`);
    return false;
  }
}

/**
 * Affiche les instructions d'utilisation
 */
function showUsageInstructions() {
  console.log('\n📚 HOOKS GIT CONFIGURÉS - Instructions d\'utilisation:');
  console.log('==================================================');
  console.log('');
  console.log('🔒 Pre-commit Hook:');
  console.log('   • Se déclenche automatiquement avant chaque commit');
  console.log('   • Vérifie TypeScript, sécurité des endpoints, imports');
  console.log('   • Bloque le commit si des erreurs critiques sont détectées');
  console.log('');
  console.log('💬 Commit-msg Hook:');
  console.log('   • Valide que les messages de commit sont informatifs');
  console.log('   • Suggère l\'utilisation de préfixes conventionnels');
  console.log('');
  console.log('🚀 Scripts NPM disponibles:');
  console.log('   npm run setup:hooks      - Reconfigure les hooks Git');
  console.log('   npm run security:check   - Exécute la vérification manuelle');
  console.log('   npm run security:analyze - Analyse la sécurité des endpoints');
  console.log('   npm run security:test    - Teste les schémas de validation');
  console.log('');
  console.log('💡 Conseils:');
  console.log('   • Les hooks se déclenchent automatiquement');
  console.log('   • Pour bypasser temporairement: git commit --no-verify');
  console.log('   • Testez manuellement avec: npm run security:check');
  console.log('');
}

/**
 * Exécution principale
 */
function main() {
  // Vérifier qu'on est dans un repo Git
  if (!isGitRepository()) {
    console.log('❌ Ce script doit être exécuté dans un repository Git');
    process.exit(1);
  }
  
  let allSuccess = true;
  
  // Configuration des hooks
  console.log('📦 Configuration des hooks Git...');
  if (!setupPreCommitHook()) allSuccess = false;
  if (!setupCommitMsgHook()) allSuccess = false;
  
  console.log('');
  
  // Configuration des scripts npm
  console.log('📝 Configuration des scripts npm...');
  if (!setupNpmScripts()) allSuccess = false;
  
  console.log('');
  
  // Résultat final
  if (allSuccess) {
    console.log('✅ CONFIGURATION TERMINÉE AVEC SUCCÈS!');
    showUsageInstructions();
  } else {
    console.log('⚠️ Configuration partiellement réussie');
    console.log('💡 Vérifiez les erreurs ci-dessus et réessayez si nécessaire');
  }
}

// Exécution
main();