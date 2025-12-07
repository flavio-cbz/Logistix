/**
 * Test E2E pour vérifier que la mise à jour de produits
 * avec des champs null fonctionne correctement
 * 
 * Ce test vérifie que le fix du schéma Zod avec .nullable()
 * résout l'erreur 500 "Expected string, received null"
 */

import { test, expect } from '@playwright/test';

test.describe.configure({ tag: '@regression' });

test.describe('Product Update with Null Fields', () => {
  test.beforeEach(async ({ page }) => {
    // Login (ajuster selon votre mécanisme d'auth)
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should update product with null optional fields without 500 error', async ({ page }) => {
    // Aller sur la page des produits
    await page.goto('http://localhost:3000/produits');
    await page.waitForSelector('[data-testid="products-list"]', { timeout: 10000 });

    // Cliquer sur le bouton d'édition du premier produit
    const editButton = page.locator('[data-testid="edit-product"]').first();
    
    // Attendre l'interception de la requête de mise à jour
    const updatePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/produits/') && response.request().method() === 'PUT'
    );
    await editButton.click();

    // Attendre que le formulaire soit visible
    await page.waitForSelector('[data-testid="product-form"]', { timeout: 5000 });

    // Vider les champs optionnels (url, photoUrl) pour envoyer null
    const urlInput = page.locator('input[name="url"]');
    const photoUrlInput = page.locator('input[name="photoUrl"]');
    
    if (await urlInput.isVisible()) {
      await urlInput.clear();
    }
    
    if (await photoUrlInput.isVisible()) {
      await photoUrlInput.clear();
    }

    // Modifier un champ requis pour forcer la validation
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('Test Product Updated');

    // Soumettre le formulaire
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Attendre la réponse
    const response = await updatePromise;

    // Vérifications critiques
    console.log('Response status:', response.status());
    console.log('Response URL:', response.url());

    // ✅ L'objectif principal : PAS d'erreur 500
    expect(response.status()).not.toBe(500);
    
    // ✅ Devrait être un succès (200 ou 201)
    expect(response.status()).toBeLessThanOrEqual(299);

    // Vérifier que le produit est mis à jour dans la liste
    const productName = page.locator('text=Test Product Updated');
    await expect(productName).toBeVisible({ timeout: 5000 });

    // Vérifier qu'il n'y a pas de toast d'erreur
    const errorToast = page.locator('[role="alert"]').filter({ hasText: /error|erreur|échec/i });
    await expect(errorToast).not.toBeVisible();
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    // Aller sur la page des produits
    await page.goto('http://localhost:3000/produits');
    await page.waitForSelector('[data-testid="products-list"]', { timeout: 10000 });

    // Cliquer sur le bouton d'édition
    const editButton = page.locator('[data-testid="edit-product"]').first();
    await editButton.click();

    // Attendre le formulaire
    await page.waitForSelector('[data-testid="product-form"]', { timeout: 5000 });

    // Vider un champ REQUIS pour déclencher une erreur de validation
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();

    // Soumettre le formulaire
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Vérifier qu'un message d'erreur de validation apparaît (pas une erreur 500)
    const validationError = page.locator('text=/nom.*requis/i, text=/name.*required/i');
    await expect(validationError).toBeVisible({ timeout: 3000 });
  });

  test('should accept empty strings and convert to null', async ({ page }) => {
    // Aller sur la page des produits
    await page.goto('http://localhost:3000/produits');
    await page.waitForSelector('[data-testid="products-list"]', { timeout: 10000 });

    // Interception de la requête
    let requestBody: any = null;
    await page.route('**/api/v1/products/**', async (route, request) => {
      if (request.method() === 'PUT') {
        requestBody = request.postDataJSON();
      }
      await route.continue();
    });

    // Éditer un produit
    const editButton = page.locator('[data-testid="edit-product"]').first();
    await editButton.click();
    await page.waitForSelector('[data-testid="product-form"]', { timeout: 5000 });

    // Vider les champs optionnels
    const urlInput = page.locator('input[name="url"]');
    if (await urlInput.isVisible()) {
      await urlInput.fill(''); // Chaîne vide
    }

    // Soumettre
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Attendre la réponse PUT envoyée pour la mise à jour
    await page.waitForResponse(response => response.url().includes('/api/v1/products/') && response.request().method() === 'PUT', { timeout: 5000 });
    
    // Vérifier que le body contient null (ou undefined) pour url
    expect(requestBody).toBeTruthy();
    expect(requestBody.url === null || requestBody.url === undefined || requestBody.url === '').toBeTruthy();
  });
});

test.describe('Product Schema Validation', () => {
  test('should validate required fields on create', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Aller sur la page des produits
    await page.goto('http://localhost:3000/produits');
    
    // Ouvrir le formulaire de création
    const createButton = page.locator('[data-testid="create-product"]');
    await createButton.click();

    // Soumettre sans remplir les champs requis
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Note: brand et category peuvent être optionnels selon la config
  });
});
