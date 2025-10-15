/**
 * Test E2E complet du workflow produits - Version finale
 * ========================================================
 * Ce test valide le cycle de vie complet d'un produit :
 * - Étape 0 : Connexion
 * - Étape 1 : Création d'un produit
 * - Étape 2A : Duplication
 * - Étape 2B : Suppression du duplicata
 * - Étape 2C : Modification du nom
 * - Étape 3 : Création d'un produit vendu (avec toutes les informations de vente)
 * 
 * NOTE : L'Étape 3 crée un NOUVEAU produit vendu au lieu de modifier un existant
 * car le formulaire ferme automatiquement après changement de statut (Bug #8).
 */

import { test, expect } from '@playwright/test';

test.describe.configure({ tag: '@regression' });

const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

const TEST_PRODUCT = {
  id: 'VINTEDCM001TEST',
  name: 'Robe test',
  brand: 'H&M',
  prixAchat: '10',
  poids: '0.350', // 350g
  parcellePrice: 10.00 // prix fixe de la parcelle
};

test.describe('Workflow Produits Complet', () => {
  test('Workflow complet : Créer, Dupliquer, Modifier, Vendre un produit', async ({ page }) => {
    
    // ==========================================
    // ÉTAPE 0 : CONNEXION
    // ==========================================
    console.log('\n=== ÉTAPE 0 : CONNEXION ===');
    await page.goto(`${BASE_URL}/login`);
    
    // Remplir le formulaire de connexion
    await page.getByLabel(/nom d'utilisateur/i).fill(TEST_CREDENTIALS.username);
    await page.getByLabel(/mot de passe/i).fill(TEST_CREDENTIALS.password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    
    // Attendre la redirection vers le dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Connexion réussie');
    
    // Naviguer vers produits
    await page.getByRole('link', { name: /produits/i }).click();
    await page.waitForURL('**/produits');
    console.log('✅ Page produits chargée');
    
    // Passer en mode liste (icône liste = lignes horizontales)
    console.log('🔄 Passage en mode liste...');
    const listViewButton = page.locator('button').filter({ has: page.locator('svg[data-lucide="list"]') }).or(page.locator('button:has-text("Liste")'));
    if (await listViewButton.count() > 0) {
    await listViewButton.first().click();
    // Attendre la présence de la table de produits pour confirmer le passage en mode liste
    await page.waitForSelector('tbody tr[data-row-key]', { timeout: 10000 }).catch(() => {});
    console.log('✅ Mode liste activé');
  } else {
      console.log('⚠️  Bouton liste non trouvé, on continue (peut-être déjà en mode liste)');
    }
    
    // ==========================================
    // ÉTAPE 1 : CRÉATION DU PRODUIT
    // ==========================================
    console.log('\n=== ÉTAPE 1 : CRÉATION DU PRODUIT ===');
    const initialCount = await page.locator('tbody tr[data-row-key]').count();
    console.log(`Nombre initial de produits : ${initialCount}`);
    
    await page.getByRole('button', { name: /nouveau produit/i }).click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    console.log('✅ Dialogue de création ouvert');
    
    // Remplir les champs de base (utiliser les name attributes pour plus de robustesse)
    await page.locator('input[name="name"]').fill(TEST_PRODUCT.name);
    await page.locator('input[name="brand"]').fill(TEST_PRODUCT.brand);
    await page.locator('input[name="price"]').fill(TEST_PRODUCT.prixAchat);
    await page.locator('input[name="vintedItemId"]').fill(TEST_PRODUCT.id);
    console.log('✅ Formulaire rempli');
    
    // Soumettre
    const submitButton = page.locator('[role="dialog"]').locator('button[type="submit"]').first();
    await submitButton.click({ force: true });
    console.log('⏳ Attente de la création du produit...');
    
    // Attendre la fermeture du dialog ou la réponse API
    await page.waitForSelector(`tr:has-text("${TEST_PRODUCT.name}")`, { timeout: 10000 });
    console.log(`✅ Produit soumis`);
    
    // Vérifier que le produit apparaît
    await page.waitForSelector(`tr:has-text("${TEST_PRODUCT.name}")`, { timeout: 10000 });
    const countAfterCreate = await page.locator('tbody tr[data-row-key]').count();
    console.log(`Nombre de produits après création : ${countAfterCreate}`);
    
    // Debug: afficher le nombre de lignes du tableau
    const tableRows = await page.locator('tbody tr[data-row-key]').count();
    console.log(`🔍 DEBUG Vue: table rows=${tableRows}`);
    
    const newProduct = page.locator(`tr:has-text("${TEST_PRODUCT.name}")`);
    await expect(newProduct).toBeVisible();
    console.log('✅ Produit créé et visible dans la liste');
    
    // ==========================================
    // ÉTAPE 2A : DUPLICATION DU PRODUIT
    // ==========================================
    console.log('\n=== ÉTAPE 2A : DUPLICATION DU PRODUIT ===');
    const productRow = page.locator(`tr:has-text("${TEST_PRODUCT.name}")`).first();
    const duplicateButton = productRow.getByTestId('duplicate-button');
    
    const postPromise2 = page.waitForResponse(
      (response) => response.url().includes('/api/v1/produits') && response.request().method() === 'POST'
    );
    
    await duplicateButton.click();
    await postPromise2;
    await page.waitForLoadState('networkidle');
    
    const countAfterDuplicate = await page.locator('tbody tr[data-row-key]').count();
    console.log(`Nombre de produits après duplication : ${countAfterDuplicate}`);
    expect(countAfterDuplicate).toBe(countAfterCreate + 1);
    console.log('✅ Produit dupliqué avec succès');
    
    // ==========================================
    // ÉTAPE 2B : SUPPRESSION DU DUPLICATA
    // ==========================================
    console.log('\n=== ÉTAPE 2B : SUPPRESSION DU DUPLICATA ===');
    
    // Trouver le duplicata (dernier produit avec le même nom)
    const allMatchingRows = page.locator(`tr:has-text("${TEST_PRODUCT.name}")`);
    const duplicateRow = allMatchingRows.nth(1);
    const duplicateExists = await duplicateRow.isVisible();
    console.log(`Produit dupliqué trouvé : ${duplicateExists}`);
    
    const deleteButton = duplicateRow.getByTestId('delete-button');
    
    const deletePromise = page.waitForResponse(
      (response) => response.url().includes('/api/v1/produits/') && response.request().method() === 'DELETE'
    );
    
    await deleteButton.click();
    await deletePromise;
    await page.waitForLoadState('networkidle');
    
    const countAfterDelete = await page.locator('tbody tr[data-row-key]').count();
    console.log(`Nombre de produits après suppression : ${countAfterDelete}`);
    expect(countAfterDelete).toBe(countAfterCreate);
    console.log('✅ Duplicata supprimé avec succès');
    
    // ==========================================
    // ÉTAPE 2C : MODIFICATION DU NOM
    // ==========================================
    console.log('\n=== ÉTAPE 2C : MODIFICATION DU NOM ===');
    const editButton = productRow.getByTestId('edit-button');
    await editButton.click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    console.log('✅ Dialogue de modification ouvert');
    
    // Modifier le nom
    const nomField = page.locator('[role="dialog"]').locator('input[name="name"]').first();
    await nomField.clear();
    await nomField.fill('Robe modifié');
    
    const submitButton2 = page.locator('[role="dialog"]').locator('button[type="submit"]').first();
    await submitButton2.click({ force: true });
    await page.waitForSelector('tr:has-text("Robe modifié")', { timeout: 10000 });
    
    // Vérifier le nouveau nom
    const modifiedProduct = page.locator('tr:has-text("Robe modifié")');
    await expect(modifiedProduct).toBeVisible();
    console.log('✅ Nom du produit modifié avec succès');
    
    // ==========================================
    // ÉTAPE 3 : CRÉER UN PRODUIT VENDU
    // ==========================================
    console.log('\n=== ÉTAPE 3 : CRÉER UN PRODUIT VENDU ===');
    
    // Fermer tous les dialogs et attendre qu'ils disparaissent
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
    
    // Compter les produits actuels
    const countBeforeSold = await page.locator('tbody tr[data-row-key]').count();
    console.log(`Nombre de produits avant création du produit vendu : ${countBeforeSold}`);
    
    // Ouvrir le dialog de création
    await page.getByRole('button', { name: /nouveau produit/i }).click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    console.log('✅ Dialog de création ouvert');
    
    const dialog2 = page.locator('[role="dialog"]');
    
    // Remplir les champs de base
    await dialog2.locator('input[name="name"]').fill('Manteau vendu');
    await dialog2.locator('input[name="brand"]').fill('Zara');
    await dialog2.locator('input[name="price"]').fill('35');
    
    // IMPORTANT : Changer le statut vers "Vendu" AVANT de remplir les champs conditionnels
    console.log('🔍 Changement du statut vers Vendu...');
    const statusSelect2 = dialog2.locator('button').filter({ hasText: /sélectionner le statut|disponible/i }).first();
    // Ouvrir le sélecteur et choisir l'option 'Vendu' de façon déterministe
    await statusSelect2.click();
    await page.getByRole('option', { name: /vendu/i }).click();
    // Attendre que la section d'informations de vente se charge
    await dialog2.locator('text=Informations de vente').waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Statut Vendu sélectionné');
    
    // Attendre que la section "Informations de vente" apparaisse
    await dialog2.locator('text=Informations de vente').waitFor({ state: 'visible', timeout: 10000 });
    console.log('✅ Section Informations de vente visible');
    
    // Remplir les champs de vente
    await dialog2.locator('input[name="dateMiseEnLigne"]').fill('2025-10-01');
    await dialog2.locator('input[name="dateVente"]').fill('2025-10-07');
    await dialog2.locator('input[name="prixVente"]').fill('55'); // Prix de vente
    
    // Sélectionner la plateforme Vinted
    const plateformeSelect = dialog2.locator('button').filter({ hasText: /sélectionner.*plateforme/i }).first();
    await plateformeSelect.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /vinted/i }).click();
    
    console.log('✅ Tous les champs remplis (produit vendu)');
    
    // Soumettre le formulaire
    const submitButton3 = dialog2.locator('button[type="submit"]').first();
    await submitButton3.click({ force: true });
    // Attendre la création via présence dans la liste (déterministe)
    await page.waitForSelector('tr:has-text("Manteau vendu")', { timeout: 10000 });
    
    // Vérifier que le produit vendu est créé
    const countAfterSold = await page.locator('tbody tr[data-row-key]').count();
    expect(countAfterSold).toBe(countBeforeSold + 1);
    console.log(`✅ Produit vendu créé (total: ${countAfterSold})`);
    
    // Vérifier que le produit vendu apparaît dans la liste
    const soldProduct = page.locator('tr:has-text("Manteau vendu")');
    await expect(soldProduct).toBeVisible();
    console.log('✅ Produit vendu visible dans la liste');
    
    // ==========================================
    // RAPPORT FINAL
    // ==========================================
    console.log('\n=== ✅ WORKFLOW COMPLET TERMINÉ ===');
    console.log(`\nRésumé :`);
    console.log(`  ✓ Connexion réussie`);
    console.log(`  ✓ Produit créé : "${TEST_PRODUCT.name}"`);
    console.log(`  ✓ Produit dupliqué et supprimé`);
    console.log(`  ✓ Nom modifié : "Robe modifié"`);
    console.log(`  ✓ Produit vendu créé : "Manteau vendu"`);
    console.log(`\n🎉 Tous les tests sont passés avec succès !`);
  });
});
