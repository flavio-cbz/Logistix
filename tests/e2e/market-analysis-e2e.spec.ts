// IMPORTANT : Avant de lancer les tests E2E, démarrez le serveur Next.js avec : npm run dev
import { test, expect } from '@playwright/test'

test.describe('Market Analysis End-to-End Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto('/login')
    
    // Fill in login credentials (using admin credentials)
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard')
    
    // Navigate to market analysis page
    await page.goto('/analyse-marche')
    await page.waitForLoadState('networkidle')
  })

  test('should create new market analysis from frontend', async ({ page }) => {
    // Test creating new market analysis
    const productName = `Test Product ${Date.now()}`
    
    // Fill in product name
    await page.fill('input[id="product-search"]', productName)
    
    // Click analyze button
    await page.click('button:has-text("Analyser")')
    
    // Verify loading state appears
    await expect(page.locator('button:has-text("Analyse...")')).toBeVisible()
    
    // Wait for analysis to be created and appear in the table
    await expect(page.locator(`text=${productName}`)).toBeVisible({ timeout: 10000 })
    
    // Verify the analysis appears in the table with pending status
    const tableRow = page.locator('table tbody tr').filter({ hasText: productName })
    await expect(tableRow).toBeVisible()
    await expect(tableRow.locator('text=En attente')).toBeVisible()
  })

  test('should verify data persistence and retrieval', async ({ page }) => {
    const productName = `Persistent Product ${Date.now()}`
    
    // Create an analysis
    await page.fill('input[id="product-search"]', productName)
    await page.click('button:has-text("Analyser")')
    
    // Wait for analysis to appear
    await expect(page.locator(`text=${productName}`)).toBeVisible({ timeout: 10000 })
    
    // Refresh the page to test persistence
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify the analysis is still there after refresh
    await expect(page.locator(`text=${productName}`)).toBeVisible()
    
    // Verify the analysis data is properly retrieved
    const tableRow = page.locator('table tbody tr').filter({ hasText: productName })
    await expect(tableRow).toBeVisible()
    
    // Check that created date is displayed
    await expect(tableRow.locator('td').nth(2)).toContainText('/')
  })

  test('should test real-time status updates and polling', async ({ page }) => {
    const productName = `Polling Test ${Date.now()}`
    
    // Create an analysis
    await page.fill('input[id="product-search"]', productName)
    await page.click('button:has-text("Analyser")')
    
    // Wait for analysis to appear with pending status
    const tableRow = page.locator('table tbody tr').filter({ hasText: productName })
    await expect(tableRow).toBeVisible()
    await expect(tableRow.locator('text=En attente')).toBeVisible()
    
    // Wait for status to change to completed (polling should update this)
    await expect(tableRow.locator('text=Terminé')).toBeVisible({ timeout: 15000 })
    
    // Click on the completed analysis to view details
    await tableRow.click()
    
    // Verify that analysis results are displayed
    await expect(page.locator('text=Prix Moyen Marché')).toBeVisible()
    await expect(page.locator('text=Volume des Ventes')).toBeVisible()
    await expect(page.locator('text=Concurrents Actifs')).toBeVisible()
    
    // Verify that charts and visualizations are loaded
    await expect(page.locator('[data-testid="market-analysis-chart"], .recharts-wrapper')).toBeVisible()
  })

  test('should validate error handling across the entire flow', async ({ page }) => {
    // Test empty input validation
    await page.click('button:has-text("Analyser")')
    
    // Verify error toast appears
    await expect(page.locator('text=Veuillez entrer un nom de produit à analyser')).toBeVisible()
    
    // Test with invalid characters or very long input
    const invalidProductName = 'a'.repeat(1000) // Very long name
    await page.fill('input[id="product-search"]', invalidProductName)
    await page.click('button:has-text("Analyser")')
    
    // Should either show error or handle gracefully
    // Wait a moment to see if any error handling occurs
    await page.waitForTimeout(2000)
    
    // Test network error handling by intercepting API calls
    await page.route('/api/v1/market-analysis', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      })
    })
    
    const errorTestProduct = `Error Test ${Date.now()}`
    await page.fill('input[id="product-search"]', errorTestProduct)
    await page.click('button:has-text("Analyser")')
    
    // Verify error handling
    await expect(page.locator('text=Internal server error, text=Erreur')).toBeVisible()
  })

  test('should test delete functionality', async ({ page }) => {
    const productName = `Delete Test ${Date.now()}`
    
    // Create an analysis
    await page.fill('input[id="product-search"]', productName)
    await page.click('button:has-text("Analyser")')
    
    // Wait for analysis to appear
    await expect(page.locator(`text=${productName}`)).toBeVisible({ timeout: 10000 })
    
    // Find the delete button for this analysis
    const tableRow = page.locator('table tbody tr').filter({ hasText: productName })
    const deleteButton = tableRow.locator('button:has([data-testid="trash-icon"], svg)')
    
    // Click delete button
    await deleteButton.click()
    
    // Verify the analysis is removed from the table
    await expect(page.locator(`text=${productName}`)).not.toBeVisible({ timeout: 5000 })
    
    // Verify success toast
    await expect(page.locator('text=Analyse supprimée')).toBeVisible()
  })

  test('should test CSV export functionality', async ({ page }) => {
    const productName = `Export Test ${Date.now()}`
    
    // Create an analysis first
    await page.fill('input[id="product-search"]', productName)
    await page.click('button:has-text("Analyser")')
    
    // Wait for analysis to complete
    const tableRow = page.locator('table tbody tr').filter({ hasText: productName })
    await expect(tableRow.locator('text=Terminé')).toBeVisible({ timeout: 15000 })
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download')
    
    // Click export button
    await page.click('button:has-text("Exporter CSV")')
    
    // Wait for download
    const download = await downloadPromise
    
    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/analyse-marche-\d{4}-\d{2}-\d{2}\.csv/)
    
    // Verify success toast
    await expect(page.locator('text=Export réussi')).toBeVisible()
  })

  test('should test complete user journey with multiple analyses', async ({ page }) => {
    const products = [
      `Journey Product 1 ${Date.now()}`,
      `Journey Product 2 ${Date.now()}`,
      `Journey Product 3 ${Date.now()}`
    ]
    
    // Create multiple analyses
    for (const product of products) {
      await page.fill('input[id="product-search"]', product)
      await page.click('button:has-text("Analyser")')
      await page.waitForTimeout(1000) // Small delay between creations
    }
    
    // Verify all analyses appear in the table
    for (const product of products) {
      await expect(page.locator(`text=${product}`)).toBeVisible()
    }
    
    // Wait for at least one to complete
    await expect(page.locator('text=Terminé')).toBeVisible({ timeout: 20000 })
    
    // Click on a completed analysis
    const completedRow = page.locator('table tbody tr').filter({ hasText: 'Terminé' }).first()
    await completedRow.click()
    
    // Navigate through different tabs
    await page.click('button[data-state="inactive"]:has-text("Concurrence")')
    await expect(page.locator('text=Analyse de la Concurrence, text=Concurrents')).toBeVisible()
    
    await page.click('button[data-state="inactive"]:has-text("Tendances")')
    await expect(page.locator('text=Tendances du Marché, text=Évolution')).toBeVisible()
    
    await page.click('button[data-state="inactive"]:has-text("Recommandation")')
    await expect(page.locator('text=Recommandation de Prix, text=Prix Recommandé')).toBeVisible()
    
    // Go back to overview
    await page.click('button[data-state="inactive"]:has-text("Vue d\'ensemble")')
    await expect(page.locator('text=Prix Moyen Marché')).toBeVisible()
  })

  test('should handle authentication and authorization', async ({ page }) => {
    // Test that unauthenticated users cannot access the API
    await page.goto('/login')
    
    // Make direct API call without authentication
    const response = await page.request.get('/api/v1/market-analysis')
    expect(response.status()).toBe(401)
    
    // Login and verify access
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    // Now API should be accessible
    const authenticatedResponse = await page.request.get('/api/v1/market-analysis')
    expect(authenticatedResponse.status()).toBe(200)
  })
})