#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script pour configurer automatiquement l'environnement
 * et supprimer les warnings webpack
 */

const envLocalPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.local.example');

function setupEnvironment() {
  console.log('🔧 Configuration de l\'environnement...');

  // Créer .env.local s'il n'existe pas
  if (!fs.existsSync(envLocalPath) && fs.existsSync(envExamplePath)) {
    try {
      fs.copyFileSync(envExamplePath, envLocalPath);
      console.log('✅ Fichier .env.local créé depuis .env.local.example');
    } catch (error) {
      console.warn('⚠️  Impossible de créer .env.local:', error.message);
    }
  }

  // Vérifier et ajouter les variables pour supprimer les warnings
  if (fs.existsSync(envLocalPath)) {
    try {
      let envContent = fs.readFileSync(envLocalPath, 'utf8');
      
      const requiredVars = [
        'SUPPRESS_WEBPACK_WARNINGS=true',
        'NEXT_TELEMETRY_DISABLED=1',
        'LOG_LEVEL=error'
      ];

      let modified = false;
      
      requiredVars.forEach(varLine => {
        const [varName] = varLine.split('=');
        if (!envContent.includes(varName)) {
          envContent += `\n${varLine}`;
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(envLocalPath, envContent);
        console.log('✅ Variables d\'environnement ajoutées pour supprimer les warnings');
      }
    } catch (error) {
      console.warn('⚠️  Impossible de modifier .env.local:', error.message);
    }
  }

  console.log('🎉 Configuration terminée!');
  console.log('');
  console.log('Pour un développement plus propre, utilisez:');
  console.log('  npm run dev:quiet    # Mode silencieux');
  console.log('  npm run dev:clean    # Avec suppression des warnings');
  console.log('  npm run build:clean  # Build propre');
}

// Exécuter si appelé directement
if (require.main === module) {
  setupEnvironment();
}

module.exports = { setupEnvironment };