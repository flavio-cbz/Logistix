/**
 * Global setup pour les tests Playwright
 * Exécuté une seule fois avant tous les tests
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Démarrage des tests E2E LogistiX');
  
  // Vérifier que le serveur est prêt
  const maxAttempts = 10;
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  
  let browser;
  let context;
  let page;
  
  try {
    // Utiliser Playwright pour tester la connexion (plus robuste que fetch)
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Essayer d'accéder à la page d'accueil (plus simple que /api/health)
        const response = await page.goto(`${baseURL}/`, {
          waitUntil: 'domcontentloaded',
          timeout: 5000
        });
        
        if (response && response.ok()) {
          console.log('✅ Serveur prêt pour les tests E2E');
          return;
        }
      } catch (error) {
        // Serveur pas encore prêt, continuer à attendre
      }
      
      console.log(`⏳ Attente du serveur... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Le serveur n'est pas accessible, mais ne pas bloquer si le serveur tourne localement
    console.log('⚠️ Le serveur n\'a pas répondu, mais les tests vont continuer...');
  } catch (error) {
    console.error('❌ Erreur lors du global setup:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default globalSetup;