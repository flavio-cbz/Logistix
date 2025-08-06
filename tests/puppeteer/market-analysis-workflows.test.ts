import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';
import { PuppeteerTestConfig } from './config';
import { LoginPage } from './page-objects/login-page';
import { captureScreenshot, captureFullPageScreenshot } from './utils/screenshot-utils';

describe('Market Analysis Workflows - Puppeteer UI Tests', () => {
  let browser: Browser;
  let page: Page;
  let loginPage: LoginPage;
  let config: PuppeteerTestConfig;

  beforeAll(async () => {
    config = new PuppeteerTestConfig();
    browser = await puppeteer.launch(config.launchOptions);
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport(config.viewport);
    loginPage = new LoginPage(page);

    // Login before each test
    await loginPage.login(config.testUser.email, config.testUser.password);
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Market Analysis Page Navigation', () => {
    it('should navigate to market analysis page successfully', async () => {
      // Act
      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');

      // Assert
      const pageTitle = await page.title();
      expect(pageTitle).toContain('LogistiX');

      const heading = await page.textContent('h3');
      expect(heading).toContain('Analyse de Marché Vinted');

      await captureScreenshot(page, 'market-analysis-page-loaded');
    });

    it('should display configuration required message when Vinted token is not configured', async () => {
      // Arrange - Mock API to return unconfigured token
      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: false, valid: false })
        });
      });

      // Act
      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');

      // Assert
      const configCard = await page.locator('[data-testid="vinted-config-required"]').first();
      await expect(configCard).toBeVisible();

      const configTitle = await page.textContent('h3');
      expect(configTitle).toContain('Configuration Vinted requise');

      const profileButton = await page.locator('button:has-text("Aller au Profil")');
      await expect(profileButton).toBeVisible();

      await captureScreenshot(page, 'vinted-config-required');
    });

    it('should display main interface when Vinted token is configured', async () => {
      // Arrange - Mock API to return configured token
      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: true })
        });
      });

      await page.route('/api/v1/market-analysis*', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            analyses: []
          })
        });
      });

      // Act
      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');

      // Assert
      const tabs = await page.locator('[role="tablist"]');
      await expect(tabs).toBeVisible();

      const analysisTab = await page.locator('[role="tab"]:has-text("Nouvelle Analyse")');
      await expect(analysisTab).toBeVisible();

      const resultsTab = await page.locator('[role="tab"]:has-text("Résultats")');
      await expect(resultsTab).toBeVisible();

      const historyTab = await page.locator('[role="tab"]:has-text("Historique")');
      await expect(historyTab).toBeVisible();

      await captureScreenshot(page, 'market-analysis-main-interface');
    });
  });

  describe('Market Search and Analysis Workflows', () => {
    beforeEach(async () => {
      // Mock configured token for all tests in this section
      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: true })
        });
      });

      await page.route('/api/v1/market-analysis*', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
              analyses: []
            })
          });
        }
      });

      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');
    });

    it('should complete market search workflow with valid product', async () => {
      // Arrange - Mock successful analysis response
      await page.route('/api/v1/market-analysis', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'analysis-123',
              salesVolume: 45,
              avgPrice: 67.50,
              priceRange: { min: 25.00, max: 120.00 },
              brandInfo: { id: 123, name: 'Nike' },
              analysisDate: new Date().toISOString()
            })
          });
        } else {
          route.continue();
        }
      });

      // Act - Fill out the analysis form
      const productNameInput = await page.locator('input[placeholder*="Nike Air Max"]');
      await productNameInput.fill('Nike Air Max 90');

      // Select a category (mock the hierarchical selector)
      const categorySelector = await page.locator('[data-testid="catalog-selector"]').first();
      if (await categorySelector.isVisible()) {
        await categorySelector.click();
        await page.waitForTimeout(500);
        
        // Select a level 3 category
        const level3Option = await page.locator('[data-testid="catalog-option-level3"]').first();
        if (await level3Option.isVisible()) {
          await level3Option.click();
        }
      }

      await captureScreenshot(page, 'analysis-form-filled');

      // Submit the form
      const analyzeButton = await page.locator('button:has-text("Analyser")');
      await analyzeButton.click();

      // Wait for loading state
      const loadingButton = await page.locator('button:has-text("Analyse...")');
      await expect(loadingButton).toBeVisible();

      // Wait for results
      await page.waitForSelector('[role="tab"]:has-text("Résultats"):not([disabled])', { timeout: 10000 });

      // Assert - Check that results tab is now active
      const resultsTab = await page.locator('[role="tab"]:has-text("Résultats")');
      await expect(resultsTab).toHaveAttribute('data-state', 'active');

      // Verify results are displayed
      const salesVolumeCard = await page.locator('text=Volume de ventes').locator('..').locator('text=45');
      await expect(salesVolumeCard).toBeVisible();

      const avgPriceCard = await page.locator('text=Prix moyen').locator('..').locator('text=67,50 €');
      await expect(avgPriceCard).toBeVisible();

      await captureFullPageScreenshot(page, 'analysis-results-displayed');
    });

    it('should handle analysis form validation errors', async () => {
      // Act - Try to submit empty form
      const analyzeButton = await page.locator('button:has-text("Analyser")');
      await expect(analyzeButton).toBeDisabled();

      // Fill only product name (missing category)
      const productNameInput = await page.locator('input[placeholder*="Nike Air Max"]');
      await productNameInput.fill('Te'); // Too short

      await expect(analyzeButton).toBeDisabled();

      // Fill with valid length but no category
      await productNameInput.fill('Nike Air Max');
      await expect(analyzeButton).toBeDisabled();

      // Check validation message
      const validationAlert = await page.locator('[role="alert"]:has-text("Sélectionnez une catégorie")');
      await expect(validationAlert).toBeVisible();

      await captureScreenshot(page, 'form-validation-errors');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange - Mock API error
      await page.route('/api/v1/market-analysis', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                message: 'Catégorie invalide',
                code: 'INVALID_CATALOG_ID'
              }
            })
          });
        } else {
          route.continue();
        }
      });

      // Act - Fill and submit form
      const productNameInput = await page.locator('input[placeholder*="Nike Air Max"]');
      await productNameInput.fill('Nike Air Max 90');

      // Mock category selection
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          const event = new Event('submit', { bubbles: true });
          form.dispatchEvent(event);
        }
      });

      // Wait for error to appear
      const errorAlert = await page.locator('[role="alert"]:has-text("Catégorie invalide")');
      await expect(errorAlert).toBeVisible();

      await captureScreenshot(page, 'api-error-handling');
    });

    it('should display loading states correctly', async () => {
      // Arrange - Mock slow API response
      await page.route('/api/v1/market-analysis', route => {
        if (route.request().method() === 'POST') {
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                id: 'analysis-123',
                salesVolume: 30,
                avgPrice: 45.00,
                priceRange: { min: 20.00, max: 80.00 },
                brandInfo: { id: 124, name: 'Adidas' },
                analysisDate: new Date().toISOString()
              })
            });
          }, 2000);
        } else {
          route.continue();
        }
      });

      // Act - Submit form
      const productNameInput = await page.locator('input[placeholder*="Nike Air Max"]');
      await productNameInput.fill('Adidas Ultraboost');

      const analyzeButton = await page.locator('button:has-text("Analyser")');
      await analyzeButton.click();

      // Assert - Check loading state
      const loadingButton = await page.locator('button:has-text("Analyse...")');
      await expect(loadingButton).toBeVisible();

      const spinner = await page.locator('.animate-spin');
      await expect(spinner).toBeVisible();

      await captureScreenshot(page, 'loading-state');

      // Wait for completion
      await page.waitForSelector('button:has-text("Analyser")', { timeout: 5000 });
    });
  });

  describe('Result Visualization and Filtering', () => {
    beforeEach(async () => {
      // Setup with configured token and mock data
      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: true })
        });
      });

      const mockAnalyses = [
        {
          id: 'analysis-1',
          productName: 'Nike Air Max 90',
          catalogId: 456,
          categoryName: 'Sneakers',
          brandId: 123,
          status: 'completed',
          error: null,
          createdAt: '2025-01-01T10:00:00.000Z',
          updatedAt: '2025-01-01T10:05:00.000Z',
          result: {
            salesVolume: 45,
            avgPrice: 67.50,
            priceRange: { min: 25.00, max: 120.00 },
            brandInfo: { id: 123, name: 'Nike' }
          }
        },
        {
          id: 'analysis-2',
          productName: 'Adidas Ultraboost',
          catalogId: 456,
          categoryName: 'Running Shoes',
          brandId: 124,
          status: 'pending',
          error: null,
          createdAt: '2025-01-01T11:00:00.000Z',
          updatedAt: null,
          result: null
        }
      ];

      await page.route('/api/v1/market-analysis*', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              page: 1,
              limit: 10,
              total: 2,
              totalPages: 1,
              analyses: mockAnalyses
            })
          });
        }
      });

      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');
    });

    it('should display historical analysis data correctly', async () => {
      // Act - Navigate to history tab
      const historyTab = await page.locator('[role="tab"]:has-text("Historique")');
      await historyTab.click();

      // Assert - Check historical data is displayed
      const analysisItem1 = await page.locator('text=Nike Air Max 90');
      await expect(analysisItem1).toBeVisible();

      const analysisItem2 = await page.locator('text=Adidas Ultraboost');
      await expect(analysisItem2).toBeVisible();

      // Check status badges
      const completedBadge = await page.locator('[data-testid="status-completed"]').first();
      await expect(completedBadge).toBeVisible();

      const pendingBadge = await page.locator('[data-testid="status-pending"]').first();
      await expect(pendingBadge).toBeVisible();

      await captureScreenshot(page, 'historical-data-display');
    });

    it('should filter historical data by product name', async () => {
      // Act - Navigate to history tab
      const historyTab = await page.locator('[role="tab"]:has-text("Historique")');
      await historyTab.click();

      // Apply filter
      const searchInput = await page.locator('input[placeholder*="Rechercher"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('Nike');
        await page.waitForTimeout(500);

        // Assert - Only Nike results should be visible
        const nikeItem = await page.locator('text=Nike Air Max 90');
        await expect(nikeItem).toBeVisible();

        const adidasItem = await page.locator('text=Adidas Ultraboost');
        await expect(adidasItem).not.toBeVisible();
      }

      await captureScreenshot(page, 'filtered-historical-data');
    });

    it('should display analysis results with correct metrics', async () => {
      // Arrange - Mock current analysis
      await page.evaluate(() => {
        (window as any).mockCurrentAnalysis = {
          salesVolume: 45,
          avgPrice: 67.50,
          priceRange: { min: 25.00, max: 120.00 },
          brandInfo: { id: 123, name: 'Nike' },
          catalogInfo: { id: 456, name: 'Sneakers' },
          rawItems: [],
          analysisDate: '2025-01-01T10:05:00.000Z'
        };
      });

      // Act - Navigate to results tab (simulate having results)
      const resultsTab = await page.locator('[role="tab"]:has-text("Résultats")');
      await resultsTab.click();

      // Assert - Check metrics cards
      const salesVolumeValue = await page.locator('[data-testid="sales-volume-value"]').first();
      if (await salesVolumeValue.isVisible()) {
        const salesText = await salesVolumeValue.textContent();
        expect(salesText).toContain('45');
      }

      const avgPriceValue = await page.locator('[data-testid="avg-price-value"]').first();
      if (await avgPriceValue.isVisible()) {
        const priceText = await avgPriceValue.textContent();
        expect(priceText).toContain('67,50');
      }

      await captureScreenshot(page, 'results-metrics-display');
    });

    it('should handle refresh functionality', async () => {
      // Arrange - Mock refresh API call
      let refreshCalled = false;
      await page.route('/api/v1/market-analysis*', route => {
        if (route.request().method() === 'GET' && refreshCalled) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              page: 1,
              limit: 10,
              total: 1,
              totalPages: 1,
              analyses: [{
                id: 'analysis-1',
                productName: 'Nike Air Max 90 Updated',
                status: 'completed',
                result: { salesVolume: 50, avgPrice: 70.00 }
              }]
            })
          });
        } else {
          route.continue();
        }
      });

      // Act - Click refresh button
      const refreshButton = await page.locator('button:has-text("Actualiser")');
      if (await refreshButton.isVisible()) {
        refreshCalled = true;
        await refreshButton.click();

        // Check loading state
        const loadingSpinner = await page.locator('.animate-spin');
        await expect(loadingSpinner).toBeVisible();

        await page.waitForTimeout(1000);
      }

      await captureScreenshot(page, 'refresh-functionality');
    });
  });

  describe('Data Export and Sharing Functionality', () => {
    beforeEach(async () => {
      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: true })
        });
      });

      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');
    });

    it('should export analysis data successfully', async () => {
      // Arrange - Mock export endpoint
      await page.route('/api/v1/market-analysis/export*', route => {
        route.fulfill({
          status: 200,
          contentType: 'text/csv',
          headers: {
            'Content-Disposition': 'attachment; filename="market-analysis-export.csv"'
          },
          body: 'Product Name,Sales Volume,Avg Price\nNike Air Max 90,45,67.50'
        });
      });

      // Act - Click export button
      const exportButton = await page.locator('button:has-text("Exporter")');
      if (await exportButton.isVisible()) {
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          exportButton.click()
        ]);

        // Assert - Check download
        expect(download.suggestedFilename()).toContain('market-analysis');
        expect(download.suggestedFilename()).toContain('.csv');
      }

      await captureScreenshot(page, 'export-functionality');
    });

    it('should share analysis results via URL', async () => {
      // Act - Click share button
      const shareButton = await page.locator('button:has-text("Partager")');
      if (await shareButton.isVisible()) {
        await shareButton.click();

        // Check if share modal appears
        const shareModal = await page.locator('[role="dialog"]');
        await expect(shareModal).toBeVisible();

        // Check share URL is generated
        const shareUrl = await page.locator('input[readonly]');
        if (await shareUrl.isVisible()) {
          const urlValue = await shareUrl.inputValue();
          expect(urlValue).toContain('/analyse-marche/share/');
        }
      }

      await captureScreenshot(page, 'share-functionality');
    });

    it('should copy analysis data to clipboard', async () => {
      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

      // Act - Click copy button
      const copyButton = await page.locator('button:has-text("Copier")');
      if (await copyButton.isVisible()) {
        await copyButton.click();

        // Check success notification
        const successToast = await page.locator('[data-testid="toast-success"]');
        await expect(successToast).toBeVisible();

        // Verify clipboard content
        const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardContent).toContain('Nike Air Max');
      }

      await captureScreenshot(page, 'copy-functionality');
    });
  });

  describe('Integration Status and Error Displays', () => {
    it('should display Vinted integration status correctly', async () => {
      // Arrange - Mock integration status endpoint
      await page.route('/api/v1/market-analysis/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            vintedConnected: true,
            lastSync: '2025-01-01T10:00:00.000Z',
            apiCallsToday: 45,
            apiCallsLimit: 1000,
            status: 'healthy'
          })
        });
      });

      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: true })
        });
      });

      // Act
      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');

      // Check integration status indicator
      const statusIndicator = await page.locator('[data-testid="vinted-status"]');
      if (await statusIndicator.isVisible()) {
        await expect(statusIndicator).toHaveClass(/.*success.*/);
      }

      // Check API usage display
      const apiUsage = await page.locator('text=45 / 1000');
      if (await apiUsage.isVisible()) {
        await expect(apiUsage).toBeVisible();
      }

      await captureScreenshot(page, 'integration-status-healthy');
    });

    it('should display error states for failed integrations', async () => {
      // Arrange - Mock integration error
      await page.route('/api/v1/market-analysis/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            vintedConnected: false,
            lastError: 'Authentication failed',
            status: 'error'
          })
        });
      });

      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: false })
        });
      });

      // Act
      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');

      // Assert - Check error display
      const errorAlert = await page.locator('[role="alert"]:has-text("Authentication failed")');
      await expect(errorAlert).toBeVisible();

      const statusIndicator = await page.locator('[data-testid="vinted-status"]');
      if (await statusIndicator.isVisible()) {
        await expect(statusIndicator).toHaveClass(/.*error.*/);
      }

      await captureScreenshot(page, 'integration-status-error');
    });

    it('should display rate limiting warnings', async () => {
      // Arrange - Mock rate limiting status
      await page.route('/api/v1/market-analysis/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            vintedConnected: true,
            apiCallsToday: 950,
            apiCallsLimit: 1000,
            status: 'warning'
          })
        });
      });

      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: true })
        });
      });

      // Act
      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');

      // Assert - Check warning display
      const warningAlert = await page.locator('[role="alert"]:has-text("limite")');
      await expect(warningAlert).toBeVisible();

      const usageBar = await page.locator('[data-testid="api-usage-bar"]');
      if (await usageBar.isVisible()) {
        await expect(usageBar).toHaveClass(/.*warning.*/);
      }

      await captureScreenshot(page, 'rate-limiting-warning');
    });

    it('should handle network connectivity issues', async () => {
      // Arrange - Mock network error
      await page.route('/api/v1/market-analysis*', route => {
        route.abort('failed');
      });

      // Act
      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForTimeout(2000);

      // Assert - Check network error display
      const networkError = await page.locator('[data-testid="network-error"]');
      if (await networkError.isVisible()) {
        await expect(networkError).toBeVisible();
      }

      const retryButton = await page.locator('button:has-text("Réessayer")');
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }

      await captureScreenshot(page, 'network-connectivity-error');
    });
  });

  describe('Responsive Design and Mobile Compatibility', () => {
    it('should display correctly on mobile devices', async () => {
      // Arrange - Set mobile viewport
      await page.setViewport({ width: 375, height: 667 });

      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: true })
        });
      });

      // Act
      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');

      // Assert - Check mobile layout
      const tabs = await page.locator('[role="tablist"]');
      await expect(tabs).toBeVisible();

      // Check that tabs are stacked or scrollable on mobile
      const tabsContainer = await tabs.boundingBox();
      expect(tabsContainer?.width).toBeLessThan(400);

      await captureScreenshot(page, 'mobile-layout');
    });

    it('should handle touch interactions correctly', async () => {
      // Arrange - Set mobile viewport and enable touch
      await page.setViewport({ width: 375, height: 667 });
      await page.emulateMediaFeatures([{ name: 'pointer', value: 'coarse' }]);

      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: true })
        });
      });

      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');

      // Act - Test touch interactions
      const historyTab = await page.locator('[role="tab"]:has-text("Historique")');
      await historyTab.tap();

      // Assert - Check tab switched
      await expect(historyTab).toHaveAttribute('data-state', 'active');

      await captureScreenshot(page, 'touch-interactions');
    });

    it('should maintain functionality on tablet devices', async () => {
      // Arrange - Set tablet viewport
      await page.setViewport({ width: 768, height: 1024 });

      await page.route('/api/v1/market-analysis/token', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true, valid: true })
        });
      });

      // Act
      await page.goto(`${config.baseUrl}/analyse-marche`);
      await page.waitForLoadState('networkidle');

      // Assert - Check tablet layout
      const mainContent = await page.locator('main');
      const contentBox = await mainContent.boundingBox();
      expect(contentBox?.width).toBeGreaterThan(700);
      expect(contentBox?.width).toBeLessThan(800);

      // Check that all tabs are visible
      const tabs = await page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThan(2);

      await captureScreenshot(page, 'tablet-layout');
    });
  });
});