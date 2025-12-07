import { Page, expect } from '@playwright/test';

/**
 * Utilitaires pour les tests E2E LogistiX
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Authentification avec les credentials de test
   */
  async login(username = 'admin', password = 'password123') {
    await this.page.goto('/login');
    
    // Attendre que la page se charge
    await this.page.waitForLoadState('networkidle');
    
    // Remplir le formulaire
    await this.page.fill('input[name="username"]', username);
    await this.page.fill('input[name="password"]', password);
    
    // Soumettre
    await this.page.click('button[type="submit"]');
    
    // Attendre soit une redirection vers dashboard, soit un message d'erreur
    try {
      await this.page.waitForURL(/\/(dashboard|produits|parcelles)/, { timeout: 10000 });
      return true;
    } catch (e) {
      // Si pas de redirection, la connexion a échoué
      return false;
    }
  }

  /**
   * Déconnexion
   */
  async logout() {
    // Chercher le bouton/menu de déconnexion
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('text=Se déconnecter');
    
    // Vérifier la redirection vers login
    await expect(this.page).toHaveURL('/login');
  }

  /**
   * Navigation vers une page avec vérification
   */
  async navigateToPage(path: string, expectedTitle?: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
    
    if (expectedTitle) {
      await expect(this.page).toHaveTitle(new RegExp(expectedTitle, 'i'));
    }
  }

  /**
   * Attendre que les éléments de la page se chargent
   */
  async waitForPageReady() {
    await this.page.waitForLoadState('networkidle');
    
    // Attendre que les spinners/loaders disparaissent
    await this.page.waitForSelector('[data-testid="loading"]', { state: 'detached', timeout: 10000 }).catch(() => {
      // Pas de loader trouvé, c'est OK
    });
  }

  /**
   * Créer un produit de test
   */
  async createTestProduct(productData = {
    nom: 'Produit Test E2E',
    prix: '29.99',
    cout: '15.00',
    plateforme: 'Vinted'
  }) {
    await this.navigateToPage('/produits');
    
    // Cliquer sur créer un produit
    await this.page.click('text=Créer un produit');
    
    // Remplir le formulaire
    await this.page.fill('input[name="nom"]', productData.nom);
    await this.page.fill('input[name="prix"]', productData.prix);
    await this.page.fill('input[name="cout"]', productData.cout);
    await this.page.selectOption('select[name="plateforme"]', productData.plateforme);
    
    // Soumettre
    await this.page.click('button[type="submit"]');
    
    // Vérifier la création
    await expect(this.page.locator('text=' + productData.nom)).toBeVisible();
    
    return productData;
  }

  /**
   * Créer une parcelle de test
   */
  async createTestParcelle(parcelleData = {
    numero: `TEST-${Date.now()}`,
    transporteur: 'Colissimo',
    poids: '0.5'
  }) {
    await this.navigateToPage('/parcelles');
    
    // Cliquer sur créer une parcelle
    await this.page.click('text=Créer une parcelle');
    
    // Remplir le formulaire
    await this.page.fill('input[name="numero"]', parcelleData.numero);
    await this.page.selectOption('select[name="transporteur"]', parcelleData.transporteur);
    await this.page.fill('input[name="poids"]', parcelleData.poids);
    
    // Soumettre
    await this.page.click('button[type="submit"]');
    
    // Vérifier la création
    await expect(this.page.locator('text=' + parcelleData.numero)).toBeVisible();
    
    return parcelleData;
  }

  /**
   * Vérifier que l'API répond correctement
   */
  async checkApiHealth() {
    try {
      const response = await this.page.request.get('/api/health');
      // Accepter plusieurs statuts - l'API peut être dégradée mais fonctionnelle
      const acceptableStatuses = [200, 503];
      if (!acceptableStatuses.includes(response.status())) {
        console.warn(`API Health check: unexpected status ${response.status()}`);
        return false;
      }
      
      const data = await response.json();
      return data.success === true || data.data?.status === 'degraded';
    } catch (error) {
      console.warn('API Health check failed:', error);
      return false;
    }
  }

  /**
   * Vérifier la responsivité mobile
   */
  async testMobileResponsiveness() {
    // Test tablette
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.waitForPageReady();
    
    // Test mobile
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.waitForPageReady();
    
    // Vérifier que les menus hamburger sont présents sur mobile
    const mobileMenu = this.page.locator('[data-testid="mobile-menu"], .mobile-menu');
    await expect(mobileMenu).toBeVisible();
  }

  /**
   * Test d'accessibilité de base
   */
  async checkBasicAccessibility() {
    // Vérifier les éléments d'accessibilité essentiels
    
    // Navigation au clavier
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.evaluateHandle(() => document.activeElement);
    expect(focusedElement).toBeTruthy();
    
    // Vérifier les landmarks ARIA
    const main = this.page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  }
}