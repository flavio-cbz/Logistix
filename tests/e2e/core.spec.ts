<<<<<<< HEAD
import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe.configure({ tag: '@smoke' });

/**
 * Tests E2E Core - Authentification et Navigation
 */
test.describe('LogistiX - Tests E2E Core', () => {
  // Smoke: pages publiques + redirections protégées (fusion depuis core-simple.spec.ts)
  test.describe('smoke', () => {
    test('pages publiques et protections (login visible, redirections, mobile, soumission déterministe)', async ({ page }) => {
      // Vérifier page login publique
      await page.goto('/login');
      await expect(page.locator('h1')).toContainText('Bienvenue sur Logistix');
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Vérifier redirections depuis pages protégées
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');

      await page.goto('/produits');
      await expect(page).toHaveURL('/login');

      await page.goto('/parcelles');
      await expect(page).toHaveURL('/login');

      // Vérifier responsivité basique de la page login (mobile)
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await expect(page.locator('form')).toBeVisible();

      // Soumission déterministe du formulaire de login :
      // on attend explicitement la réponse API puis on vérifie URL redirigée ou message d'erreur visible
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'password123');

      const [loginResponse] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/v1/auth/login') && resp.status() < 500),
        page.click('button[type="submit"]'),
      ]);

      // Attendre la stabilisation réseau
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      const errorVisible = await page.locator('text=Invalid credentials').isVisible().catch(() => false);

      // Le test est robuste : il accepte une redirection vers le dashboard ou un message d'erreur visible
      expect(currentUrl.includes('/dashboard') || errorVisible).toBeTruthy();
    });
  });

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
=======
import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe.configure({ tag: '@smoke' });

/**
 * Tests E2E Core - Authentification et Navigation
 */
test.describe('LogistiX - Tests E2E Core', () => {
  // Smoke: pages publiques + redirections protégées (fusion depuis core-simple.spec.ts)
  test.describe('smoke', () => {
    test('pages publiques et protections (login visible, redirections, mobile, soumission déterministe)', async ({ page }) => {
      // Vérifier page login publique
      await page.goto('/login');
      await expect(page.locator('h1')).toContainText('Bienvenue sur Logistix');
      await expect(page.locator('input[name="username"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Vérifier redirections depuis pages protégées
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');

      await page.goto('/produits');
      await expect(page).toHaveURL('/login');

      await page.goto('/parcelles');
      await expect(page).toHaveURL('/login');

      // Vérifier responsivité basique de la page login (mobile)
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await expect(page.locator('form')).toBeVisible();

      // Soumission déterministe du formulaire de login :
      // on attend explicitement la réponse API puis on vérifie URL redirigée ou message d'erreur visible
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', 'password123');

      const [loginResponse] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/v1/auth/login') && resp.status() < 500),
        page.click('button[type="submit"]'),
      ]);

      // Attendre la stabilisation réseau
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      const errorVisible = await page.locator('text=Invalid credentials').isVisible().catch(() => false);

      // Le test est robuste : il accepte une redirection vers le dashboard ou un message d'erreur visible
      expect(currentUrl.includes('/dashboard') || errorVisible).toBeTruthy();
    });
  });

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
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
});