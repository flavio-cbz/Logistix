#!/usr/bin/env node

/**
 * 📊 SECURITY DASHBOARD - LogistiX Real-time
 * ==========================================
 * 
 * Dashboard en temps réel de la sécurité des endpoints API.
 * Affiche les métriques, tendances et alertes de sécurité.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG_PATH = 'config/security-config.json';
const REPORTS_DIR = 'reports';

/**
 * Charge la configuration de sécurité
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (error) {
    console.log(`⚠️ Erreur de chargement de config: ${error.message}`);
  }
  
  // Configuration par défaut
  return {
    security: { minimumEndpointSecurityPercentage: 35 },
    validation: { maxValidationTimeMs: 1 },
    reporting: { includeEndpointDetails: true }
  };
}

/**
 * Exécute l'analyse de sécurité et retourne les résultats
 */
function runSecurityAnalysis() {
  try {
    const output = execSync('node scripts/analyze-api-security.js', { encoding: 'utf8' });
    
    // Parser les résultats
    const securedMatch = output.match(/Endpoints sécurisés: (\d+)/);
    const totalMatch = output.match(/Total endpoints: (\d+)/);
    const percentageMatch = output.match(/Pourcentage sécurisé: ([\d.]+)%/);
    
    return {
      secured: securedMatch ? parseInt(securedMatch[1]) : 0,
      total: totalMatch ? parseInt(totalMatch[1]) : 0,
      percentage: percentageMatch ? parseFloat(percentageMatch[1]) : 0,
      rawOutput: output
    };
  } catch (error) {
    return {
      secured: 0,
      total: 0,
      percentage: 0,
      error: error.message
    };
  }
}

/**
 * Teste les performances des validations Zod
 */
function runValidationPerformanceTest() {
  try {
    const output = execSync('npx tsx scripts/test-validation-schemas.ts', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Extraire les métriques de performance
    const performanceMatch = output.match(/([\d.]+)ms par validation/);
    const passRateMatch = output.match(/(\d+)\/(\d+) tests/);
    
    return {
      avgTime: performanceMatch ? parseFloat(performanceMatch[1]) : null,
      passRate: passRateMatch ? {
        passed: parseInt(passRateMatch[1]),
        total: parseInt(passRateMatch[2])
      } : null,
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Génère le dashboard formaté
 */
function generateDashboard() {
  const config = loadConfig();
  const securityData = runSecurityAnalysis();
  const validationData = runValidationPerformanceTest();
  const timestamp = new Date().toISOString();
  
  console.clear();
  console.log('📊 LOGISTIX SECURITY DASHBOARD');
  console.log('═'.repeat(50));
  console.log(`🕐 Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}`);
  console.log('');
  
  // Section Sécurité des Endpoints
  console.log('🔒 SÉCURITÉ DES ENDPOINTS');
  console.log('─'.repeat(30));
  
  if (securityData.error) {
    console.log(`❌ Erreur d'analyse: ${securityData.error}`);
  } else {
    const percentage = securityData.percentage;
    const status = percentage >= config.security.minimumEndpointSecurityPercentage ? '✅' : '❌';
    const level = percentage >= 80 ? 'EXCELLENT' : percentage >= 50 ? 'BON' : percentage >= 35 ? 'ACCEPTABLE' : 'CRITIQUE';
    
    console.log(`${status} Score: ${percentage}% (${level})`);
    console.log(`📊 Endpoints: ${securityData.secured}/${securityData.total} sécurisés`);
    console.log(`🎯 Seuil: ${config.security.minimumEndpointSecurityPercentage}% ${status}`);
    
    // Barre de progression visuelle
    const barLength = 30;
    const filled = Math.round((percentage / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`📈 [${bar}] ${percentage}%`);
  }
  
  console.log('');
  
  // Section Performance des Validations
  console.log('⚡ PERFORMANCE DES VALIDATIONS');
  console.log('─'.repeat(30));
  
  if (validationData.success) {
    if (validationData.avgTime !== null) {
      const timeStatus = validationData.avgTime < config.validation.maxValidationTimeMs ? '✅' : '⚠️';
      console.log(`${timeStatus} Temps moyen: ${validationData.avgTime}ms`);
      console.log(`🎯 Objectif: < ${config.validation.maxValidationTimeMs}ms`);
    }
    
    if (validationData.passRate) {
      const passPercentage = (validationData.passRate.passed / validationData.passRate.total * 100).toFixed(1);
      const passStatus = passPercentage >= 80 ? '✅' : passPercentage >= 60 ? '⚠️' : '❌';
      console.log(`${passStatus} Tests: ${validationData.passRate.passed}/${validationData.passRate.total} (${passPercentage}%)`);
    }
  } else {
    console.log(`⚠️ Tests indisponibles: ${validationData.error}`);
  }
  
  console.log('');
  
  // Section Alertes et Recommandations
  console.log('🚨 ALERTES & RECOMMANDATIONS');
  console.log('─'.repeat(30));
  
  const alerts = [];
  
  if (securityData.percentage < config.security.minimumEndpointSecurityPercentage) {
    alerts.push(`🔴 CRITIQUE: Sécurité en dessous du seuil (${securityData.percentage}% < ${config.security.minimumEndpointSecurityPercentage}%)`);
  }
  
  if (validationData.avgTime && validationData.avgTime > config.validation.maxValidationTimeMs) {
    alerts.push(`🟡 PERFORMANCE: Validations lentes (${validationData.avgTime}ms > ${config.validation.maxValidationTimeMs}ms)`);
  }
  
  if (validationData.passRate && validationData.passRate.passed / validationData.passRate.total < 0.8) {
    alerts.push(`🟠 QUALITÉ: Taux de réussite des tests bas (${(validationData.passRate.passed / validationData.passRate.total * 100).toFixed(1)}%)`);
  }
  
  if (alerts.length === 0) {
    console.log('✅ Aucune alerte - Système en bonne santé');
  } else {
    alerts.forEach(alert => console.log(`   ${alert}`));
  }
  
  console.log('');
  
  // Section Actions Rapides
  console.log('🚀 ACTIONS RAPIDES');
  console.log('─'.repeat(30));
  console.log('   npm run security:analyze  - Analyse détaillée');
  console.log('   npm run security:test     - Tests de validation');
  console.log('   npm run security:check    - Vérification complète');
  console.log('   Ctrl+C                    - Quitter le dashboard');
  console.log('');
  
  // Sauvegarder le rapport
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const reportData = {
    timestamp,
    security: securityData,
    validation: validationData,
    config: config.security,
    alerts: alerts
  };
  
  const reportFile = path.join(REPORTS_DIR, `security-dashboard-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
  
  console.log(`💾 Rapport sauvegardé: ${reportFile}`);
}

/**
 * Mode dashboard en continu (refresh automatique)
 */
function startContinuousDashboard() {
  console.log('🎯 Dashboard en mode continu (refresh toutes les 30s)');
  console.log('📝 Appuyez sur Ctrl+C pour quitter\n');
  
  // Affichage initial
  generateDashboard();
  
  // Refresh périodique
  const interval = setInterval(() => {
    generateDashboard();
  }, 30000); // 30 secondes
  
  // Nettoyage à la sortie
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n👋 Dashboard arrêté - Au revoir !');
    process.exit(0);
  });
}

/**
 * Mode dashboard unique (one-shot)
 */
function generateSingleDashboard() {
  generateDashboard();
  console.log('\n📝 Pour un dashboard en continu: npm run security:dashboard --watch');
}

/**
 * Fonction principale
 */
function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch') || args.includes('-w');
  
  if (watchMode) {
    startContinuousDashboard();
  } else {
    generateSingleDashboard();
  }
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur dashboard:', error.message);
  process.exit(1);
});

// Exécution
main();