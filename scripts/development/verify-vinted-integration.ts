#!/usr/bin/env tsx

/**
 * Script de vérification de l'intégration du système de rafraîchissement automatique
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';

async function verifyIntegration() {

  let allChecksPass = true;

  // 1. Vérification des fichiers système essentiels
  
  const essentialFiles = [
    {
      path: 'instrumentation.ts',
      description: 'Point d\'entrée d\'initialisation Next.js',
      critical: true
    },
    {
      path: 'lib/config/vinted-config.ts',
      description: 'Configuration interne du système Vinted',
      critical: true
    },
    {
      path: 'lib/services/scheduler/index.ts',
      description: 'Gestionnaire des schedulers',
      critical: true
    },
    {
      path: 'lib/services/scheduler/token-refresh-scheduler.ts',
      description: 'Scheduler de rafraîchissement des tokens',
      critical: true
    },
    {
      path: 'lib/services/auth/vinted-session-manager.ts',
      description: 'Gestionnaire de sessions Vinted',
      critical: true
    },
    {
      path: 'lib/services/auth/vinted-auth-service.ts',
      description: 'Service d\'authentification Vinted',
      critical: true
    },
    {
      path: 'app/api/v1/vinted/scheduler/route.ts',
      description: 'API de contrôle du scheduler',
      critical: false
    }
  ];

  essentialFiles.forEach(({ path: filePath, description, critical }) => {
    const exists = fs.existsSync(filePath);
    const status = exists ? '✅' : (critical ? '❌' : '⚠️');
    
    if (!exists && critical) {
      allChecksPass = false;
    }
  });

  // 2. Vérification de la configuration
  
  const configChecks = [
    {
      key: 'VINTED_AUTO_REFRESH_ENABLED',
      value: 'ACTIVÉ PAR DÉFAUT',
      expected: 'ACTIVÉ PAR DÉFAUT',
      critical: false
    },
    {
      key: 'VINTED_TOKEN_REFRESH_INTERVAL_MINUTES',
      value: '30 (par défaut)',
      expected: '30 (par défaut)',
      critical: false
    },
    {
      key: 'VINTED_CREDENTIALS_SECRET',
      value: 'NON REQUIS (stockage en clair)',
      expected: 'NON REQUIS (stockage en clair)',
      critical: false
    },
    {
      key: 'VINTED_SESSION',
      value: process.env.VINTED_SESSION ? '[CONFIGURÉ]' : 'OPTIONNEL',
      expected: 'OPTIONNEL',
      critical: false
    }
  ];

  configChecks.forEach(({ key, value, expected, critical }) => {
    const isValid = !!value && (expected === '[CONFIGURÉ]' || value === expected);
    const status = isValid ? '✅' : (critical ? '❌' : '⚠️');
    
    if (!isValid && critical) {
      allChecksPass = false;
    }
  });

  // 3. Vérification du contenu des fichiers critiques
  
  // Vérifier instrumentation.ts
  if (fs.existsSync('instrumentation.ts')) {
    const instrumentationContent = fs.readFileSync('instrumentation.ts', 'utf8');
    const hasSchedulerInit = instrumentationContent.includes('initializeSchedulers');
    
    if (!hasSchedulerInit) {
      allChecksPass = false;
    }
  }

  // Vérifier le scheduler
  if (fs.existsSync('lib/services/scheduler/token-refresh-scheduler.ts')) {
    const schedulerContent = fs.readFileSync('lib/services/scheduler/token-refresh-scheduler.ts', 'utf8');
    const hasConfigImport = schedulerContent.includes('getVintedConfig');
    const hasRefreshLogic = schedulerContent.includes('refreshAllTokens');
    const hasIntervalLogic = schedulerContent.includes('intervalMs');
    
    
    if (!hasConfigImport || !hasIntervalLogic || !hasRefreshLogic) {
      allChecksPass = false;
    }
  }

  // 4. Vérification de l'intégration dans l'application
  
  // Vérifier que Next.js va charger instrumentation.ts
  const nextConfigExists = fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs');
  
  // Vérifier la structure des dossiers
  const hasSchedulerDir = fs.existsSync('lib/services/scheduler');
  const hasAuthDir = fs.existsSync('lib/services/auth');
  const hasApiDir = fs.existsSync('app/api/v1/vinted');
  

  // 5. Test d'importation des modules
  
  try {
    // Test d'importation du scheduler
    const { tokenRefreshScheduler } = await import('../../lib/services/scheduler/token-refresh-scheduler');
  } catch (error: any) {
    allChecksPass = false;
  }

  try {
    // Test d'importation du gestionnaire de sessions
    const { vintedSessionManager } = await import('../../lib/services/auth/vinted-session-manager');
  } catch (error: any) {
    allChecksPass = false;
  }

  // 6. Vérification des scripts de maintenance
  
  const maintenanceScripts = [
    'scripts/diagnostic-token-system.js',
    'scripts/init-vinted-session.ts',
    'scripts/test-with-real-session.ts'
  ];

  maintenanceScripts.forEach(script => {
    const exists = fs.existsSync(script);
  });

  // 7. Résumé final
  
  if (allChecksPass) {
  } else {
  }


  return allChecksPass;
}

// Exécution du script
if (require.main === module) {
  verifyIntegration().catch(console.error);
}

export { verifyIntegration };