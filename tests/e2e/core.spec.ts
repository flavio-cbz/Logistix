import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * Tests E2E Core - Authentification et Navigation
 */
test.describe('LogistiX - Tests E2E Core', () => {

  test.describe('Authentification', () => {
    test('devrait permettre la connexion avec des identifiants valides', async ({ page }) => {
      const helpers = new TestHelpers(page);
      const loginSuccess = await helpers.login('admin', 'password123');
      expect(loginSuccess).toBeTruthy();
      
      // Vérifier la redirection après connexion
      await expect(page).toHaveURL('/dashboard');
    });

    test('devrait échouer avec des identifiants invalides', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[name=username]', 'invalid');
      await page.fill('[name=password]', 'invalid');
      await page.click('button[type=submit]');
      
      // Vérifier le message d'erreur ou rester sur la page login
      await expect(page.locator('text=Invalid credentials').or(page.locator('[name=username]'))).toBeVisible();
    });

    test('devrait rediriger vers login si non authentifié', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Navigation', () => {
    test('devrait naviguer vers la page dashboard', async ({ page }) => {
      const helpers = new TestHelpers(page);
      await helpers.login();
      await helpers.navigateToPage('/dashboard');
      
      // Vérifier les éléments du dashboard
      await expect(page.locator('h1, h2').filter({ hasText: /dashboard|tableau de bord/i })).toBeVisible();
    });

    test('devrait naviguer vers la page produits', async ({ page }) => {
      const helpers = new TestHelpers(page);
      await helpers.login();
      await helpers.navigateToPage('/produits');
      
      // Vérifier les éléments de la page produits
      await expect(page.locator('text=Créer un produit')).toBeVisible();
    });

    test('devrait naviguer vers la page parcelles', async ({ page }) => {
      const helpers = new TestHelpers(page);
      await helpers.login();
      await helpers.navigateToPage('/parcelles');
      
      // Vérifier les éléments de la page parcelles
      await expect(page.locator('text=Créer une parcelle')).toBeVisible();
    });
  });

  test.describe('Fonctionnalités CRUD', () => {
    test('devrait créer un nouveau produit', async ({ page }) => {
      const helpers = new TestHelpers(page);
      await helpers.login();
      const productData = await helpers.createTestProduct({
        nom: 'Test E2E Produit',
        prix: '49.99',
        cout: '25.00',
        plateforme: 'Vinted'
      });
      
      // Vérifier que le produit apparaît dans la liste
      await expect(page.locator(`text=${productData.nom}`)).toBeVisible();
    });

    test('devrait créer une nouvelle parcelle', async ({ page }) => {
      const helpers = new TestHelpers(page);
      await helpers.login();
      const parcelleData = await helpers.createTestParcelle({
        numero: `E2E-${Date.now()}`,
        transporteur: 'Colissimo',
        poids: '0.8'
      });
      
      // Vérifier que la parcelle apparaît dans la liste
      await expect(page.locator(`text=${parcelleData.numero}`)).toBeVisible();
    });
  });

  test.describe('Responsivité', () => {
    test('devrait être responsive sur mobile', async ({ page }) => {
      const helpers = new TestHelpers(page);
      await helpers.login();
      await helpers.testMobileResponsiveness();
      
      // Le test passera si testMobileResponsiveness ne lance pas d'exception
      expect(true).toBeTruthy();
    });
  });

  test.describe('Accessibilité', () => {
    test('devrait respecter les standards d\'accessibilité de base', async ({ page }) => {
      const helpers = new TestHelpers(page);
      await helpers.login();
      await helpers.checkBasicAccessibility();
      
      // Le test passera si checkBasicAccessibility ne lance pas d'exception
      expect(true).toBeTruthy();
    });
  });
});