/**
 * Global teardown pour les tests Playwright
 * Exécuté une seule fois après tous les tests
 */

async function globalTeardown() {
  console.log('🧹 Nettoyage après tests E2E LogistiX');
  
  // Ici on peut ajouter du nettoyage global si nécessaire
  // Par exemple : nettoyer la base de données de test, arrêter des services, etc.
  
  console.log('✅ Nettoyage terminé');
}

export default globalTeardown;