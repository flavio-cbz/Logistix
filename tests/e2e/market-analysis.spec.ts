import { test, expect } from '@playwright/test';

// Mock data and states
const tasks: { [key: string]: any } = {};

test.describe('Market Analysis Page E2E Tests with Mocked API', () => {

  test.beforeEach(async ({ page }) => {
    // Intercept all API calls
    await page.route('**/api/v1/market-analysis**', (route) => {
      const request = route.request();
      const method = request.method();
      const url = request.url();

      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks: Object.values(tasks) }),
        });
      }

      if (method === 'POST') {
        const newId = `task_${Date.now()}`;
        const newAnalysis = {
          id: newId,
          status: 'pending',
          result: { productName: request.postDataJSON()[0].size_title, sampleItems: [] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        tasks[newId] = newAnalysis;

        // Simulate completion
        setTimeout(() => {
          if (tasks[newId]) {
            tasks[newId].status = 'completed';
            tasks[newId].result = {
              ...tasks[newId].result,
              priceMetrics: { minPrice: 10, maxPrice: 100, avgPrice: 50, medianPrice: 45 },
              volumeMetrics: { salesVolume: 1000, competitorCount: 5 },
              sampleItems: [{ size_title: tasks[newId].result.productName }],
            };
          }
        }, 2000);

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ task_id: newId }),
        });
      }

      if (method === 'DELETE') {
        const idToDelete = url.split('/').pop();
        if (idToDelete && tasks[idToDelete]) {
          delete tasks[idToDelete];
          return route.fulfill({ status: 200 });
        }
      }

      return route.continue();
    });

    await page.goto('/analyse-marche');
  });

  test('should launch an analysis and see it complete', async ({ page }) => {
    const productName = 'iPhone 15 Pro';

    // Launch analysis
    await page.getByPlaceholder('Ex: Nike Air Max, iPhone 15, etc.').fill(productName);
    await page.getByRole('button', { name: 'Analyser' }).click();

    // Check for pending status
    await expect(page.getByRole('row', { name: new RegExp(productName) }).getByText('En attente')).toBeVisible();

    // Check for completed status and results
    await expect(page.getByRole('row', { name: new RegExp(productName) }).getByText('Terminé')).toBeVisible({ timeout: 10000 });
    await page.getByRole('row', { name: new RegExp(productName) }).click();
    await expect(page.getByText('Prix Moyen Marché')).toBeVisible();
    await expect(page.getByText('50.00 €')).toBeVisible();
  });

  test('should delete an analysis', async ({ page }) => {
    const productName = 'Product to Delete';
    const newId = `task_${Date.now()}`;
    tasks[newId] = {
      id: newId,
      status: 'completed',
      result: { productName, sampleItems: [{size_title: productName}] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.reload();

    await expect(page.getByRole('row', { name: new RegExp(productName) })).toBeVisible();
    
    // Delete the analysis
    await page.getByRole('row', { name: new RegExp(productName) }).getByRole('button', { name: 'Trash' }).click();
    
    // Check that it's gone
    await expect(page.getByRole('row', { name: new RegExp(productName) })).not.toBeVisible();
  });

  test('should show error for empty input', async ({ page }) => {
    await page.getByRole('button', { name: 'Analyser' }).click();
    await expect(page.getByText('Veuillez entrer un nom de produit à analyser')).toBeVisible();
  });
});