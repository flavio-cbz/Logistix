/**
 * Cross-Browser Compatibility E2E Tests
 * Tests application functionality across different browsers and devices
 */

import { test, expect, devices } from '@playwright/test';

// Test configurations for different browsers and devices
const browserConfigs = [
  { name: 'Desktop Chrome', ...devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', ...devices['Desktop Firefox'] },
  { name: 'Desktop Safari', ...devices['Desktop Safari'] },
  { name: 'Mobile Chrome', ...devices['Pixel 5'] },
  { name: 'Mobile Safari', ...devices['iPhone 12'] },
  { name: 'Tablet', ...devices['iPad Pro'] }
];

browserConfigs.forEach(config => {
  test.describe(`Cross-Browser Tests - ${config.name}`, () => {
    test.use(config);

    test.beforeEach(async ({ page }) => {
      // Login for authenticated tests
      await page.goto('/auth/login');
      await page.fill('[data-testid="login-email"]', 'test@example.com');
      await page.fill('[data-testid="login-password"]', 'password123');
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should render dashboard correctly', async ({ page }) => {
      // Check main dashboard elements
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
      
      // Check responsive layout
      if (config.name.includes('Mobile')) {
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
      }
    });

    test('should handle form interactions', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="create-product-button"]');
      
      // Fill form
      await page.fill('[data-testid="product-name"]', 'Cross-Browser Test Product');
      await page.fill('[data-testid="product-price"]', '15.99');
      await page.fill('[data-testid="product-quantity"]', '50');
      await page.selectOption('[data-testid="product-parcelle"]', 'parcelle-1');
      
      // Submit form
      await page.click('[data-testid="submit-product"]');
      
      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should handle navigation', async ({ page }) => {
      // Test main navigation
      await page.click('[data-testid="nav-produits"]');
      await expect(page).toHaveURL('/produits');
      
      await page.click('[data-testid="nav-parcelles"]');
      await expect(page).toHaveURL('/parcelles');
      
      await page.click('[data-testid="nav-statistiques"]');
      await expect(page).toHaveURL('/statistiques');
      
      // Test breadcrumb navigation
      await page.click('[data-testid="breadcrumb-dashboard"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle modal dialogs', async ({ page }) => {
      await page.goto('/produits');
      
      // Open delete confirmation modal
      await page.click('[data-testid="product-item"]').first().locator('[data-testid="delete-product"]');
      
      // Modal should be visible and functional
      await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
      
      // Test modal interactions
      await page.click('[data-testid="cancel-delete"]');
      await expect(page.locator('[data-testid="delete-confirmation"]')).not.toBeVisible();
    });

    test('should handle dropdown menus', async ({ page }) => {
      // Test user menu dropdown
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
      
      // Test sort dropdown
      await page.goto('/produits');
      await page.click('[data-testid="sort-dropdown"]');
      await expect(page.locator('[data-testid="sort-options"]')).toBeVisible();
      
      // Select option
      await page.click('[data-testid="sort-price-asc"]');
      await expect(page.locator('[data-testid="sort-dropdown"]')).toContainText('Price (Low to High)');
    });

    test('should handle data tables', async ({ page }) => {
      await page.goto('/produits');
      
      // Table should be visible and functional
      await expect(page.locator('[data-testid="products-table"]')).toBeVisible();
      
      // Test table sorting
      await page.click('[data-testid="sort-header-name"]');
      await page.waitForTimeout(500);
      
      // Test table pagination if present
      if (await page.locator('[data-testid="pagination"]').isVisible()) {
        await page.click('[data-testid="next-page"]');
        await expect(page.locator('[data-testid="current-page"]')).toContainText('2');
      }
    });

    test('should handle search functionality', async ({ page }) => {
      await page.goto('/produits');
      
      // Test search input
      await page.fill('[data-testid="search-input"]', 'test');
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(500);
      
      // Verify search functionality
      const searchResults = page.locator('[data-testid="product-item"]');
      if (await searchResults.count() > 0) {
        const firstResult = await searchResults.first().locator('[data-testid="product-name"]').textContent();
        expect(firstResult?.toLowerCase()).toContain('test');
      }
    });

    test('should handle date pickers', async ({ page }) => {
      await page.goto('/statistiques');
      
      // Test date picker functionality
      await page.click('[data-testid="date-range-picker"]');
      await expect(page.locator('[data-testid="date-picker-calendar"]')).toBeVisible();
      
      // Select date
      await page.click('[data-testid="date-picker-today"]');
      
      // Verify date selection
      const selectedDate = await page.locator('[data-testid="selected-date"]').textContent();
      expect(selectedDate).toBeTruthy();
    });

    test('should handle file uploads', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="import-products"]');
      
      // Test file upload
      const fileInput = page.locator('[data-testid="csv-file-input"]');
      await expect(fileInput).toBeVisible();
      
      // Simulate file selection (without actual file)
      await fileInput.click();
      
      // Verify upload interface is functional
      await expect(page.locator('[data-testid="upload-area"]')).toBeVisible();
    });

    test('should handle charts and visualizations', async ({ page }) => {
      await page.goto('/statistiques');
      
      // Charts should render properly
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="products-chart"]')).toBeVisible();
      
      // Test chart interactions
      if (!config.name.includes('Mobile')) {
        // Hover interactions (desktop only)
        await page.hover('[data-testid="chart-data-point"]');
        await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      }
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await page.goto('/produits');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="create-product-button"]')).toBeFocused();
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="product-form"]')).toBeVisible();
      
      // Test Escape key
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="product-form"]')).not.toBeVisible();
    });

    test('should handle touch interactions', async ({ page }) => {
      if (config.name.includes('Mobile') || config.name.includes('Tablet')) {
        await page.goto('/produits');
        
        // Test touch scrolling
        await page.touchscreen.tap(200, 300);
        
        // Test swipe gestures on mobile
        if (config.name.includes('Mobile')) {
          // Swipe to open mobile menu
          await page.touchscreen.tap(20, 50); // Tap hamburger menu
          await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
        }
        
        // Test touch-friendly button sizes
        const buttons = page.locator('[data-testid*="button"]');
        const buttonCount = await buttons.count();
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = buttons.nth(i);
          if (await button.isVisible()) {
            const boundingBox = await button.boundingBox();
            if (boundingBox) {
              // Buttons should be at least 44px for touch targets
              expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44);
            }
          }
        }
      }
    });

    test('should handle print styles', async ({ page }) => {
      await page.goto('/produits');
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      // Check that print-specific styles are applied
      const printHiddenElements = page.locator('[data-testid="print-hidden"]');
      if (await printHiddenElements.count() > 0) {
        await expect(printHiddenElements.first()).toHaveCSS('display', 'none');
      }
      
      // Reset to screen media
      await page.emulateMedia({ media: 'screen' });
    });

    test('should handle reduced motion preferences', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.goto('/dashboard');
      
      // Animations should be reduced or disabled
      const animatedElements = page.locator('[data-testid*="animated"]');
      if (await animatedElements.count() > 0) {
        const element = animatedElements.first();
        const animationDuration = await element.evaluate(el => 
          getComputedStyle(el).animationDuration
        );
        // Should be 0s or very short for reduced motion
        expect(animationDuration === '0s' || parseFloat(animationDuration) < 0.1).toBeTruthy();
      }
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Emulate high contrast preference
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
      
      await page.goto('/dashboard');
      
      // Elements should maintain visibility in high contrast
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
      
      // Text should have sufficient contrast
      const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span');
      const textCount = await textElements.count();
      
      for (let i = 0; i < Math.min(textCount, 5); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          const color = await element.evaluate(el => getComputedStyle(el).color);
          const backgroundColor = await element.evaluate(el => getComputedStyle(el).backgroundColor);
          
          // Basic check that color values exist
          expect(color).toBeTruthy();
          expect(backgroundColor).toBeTruthy();
        }
      }
    });

    test('should handle network conditions', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // Add 100ms delay
      });
      
      await page.goto('/produits');
      
      // Page should still load and be functional
      await expect(page.locator('[data-testid="products-list"]')).toBeVisible({ timeout: 10000 });
      
      // Loading states should be shown
      await page.click('[data-testid="create-product-button"]');
      await page.fill('[data-testid="product-name"]', 'Slow Network Test');
      await page.fill('[data-testid="product-price"]', '10.00');
      await page.fill('[data-testid="product-quantity"]', '100');
      await page.selectOption('[data-testid="product-parcelle"]', 'parcelle-1');
      
      await page.click('[data-testid="submit-product"]');
      
      // Should show loading state
      await expect(page.locator('[data-testid="submit-product"]')).toContainText('Creating...');
    });

    test('should handle JavaScript disabled scenarios', async ({ page }) => {
      // Disable JavaScript
      await page.setJavaScriptEnabled(false);
      
      await page.goto('/');
      
      // Basic HTML should still be accessible
      await expect(page.locator('body')).toBeVisible();
      
      // Should show no-JS fallback message if implemented
      const noJsMessage = page.locator('[data-testid="no-js-message"]');
      if (await noJsMessage.count() > 0) {
        await expect(noJsMessage).toBeVisible();
      }
      
      // Re-enable JavaScript for other tests
      await page.setJavaScriptEnabled(true);
    });

    test('should handle viewport size changes', async ({ page }) => {
      // Start with desktop size
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/dashboard');
      
      // Should show desktop layout
      if (!config.name.includes('Mobile')) {
        await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
      }
      
      // Resize to tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);
      
      // Layout should adapt
      const adaptiveElement = page.locator('[data-testid="responsive-container"]');
      if (await adaptiveElement.count() > 0) {
        await expect(adaptiveElement).toBeVisible();
      }
      
      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Should show mobile layout
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu).toBeVisible();
      }
    });

    test('should handle focus management', async ({ page }) => {
      await page.goto('/produits');
      
      // Open modal
      await page.click('[data-testid="create-product-button"]');
      
      // Focus should be trapped in modal
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toContain('product-');
      
      // Close modal with Escape
      await page.keyboard.press('Escape');
      
      // Focus should return to trigger button
      const returnedFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(returnedFocus).toBe('create-product-button');
    });

    test('should handle error states gracefully', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/v1/produits', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      
      await page.goto('/produits');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load products');
      
      // Should show retry option
      if (await page.locator('[data-testid="retry-button"]').count() > 0) {
        await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      }
    });
  });
});

// Browser-specific tests
test.describe('Browser-Specific Features', () => {
  test('Chrome - should handle Chrome-specific features', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test');
    
    await page.goto('/dashboard');
    
    // Test Chrome-specific APIs if used
    const hasNotificationAPI = await page.evaluate(() => 'Notification' in window);
    expect(hasNotificationAPI).toBe(true);
  });

  test('Firefox - should handle Firefox-specific features', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');
    
    await page.goto('/dashboard');
    
    // Test Firefox-specific behavior
    const userAgent = await page.evaluate(() => navigator.userAgent);
    expect(userAgent).toContain('Firefox');
  });

  test('Safari - should handle Safari-specific features', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test');
    
    await page.goto('/dashboard');
    
    // Test Safari-specific behavior
    const userAgent = await page.evaluate(() => navigator.userAgent);
    expect(userAgent).toContain('Safari');
  });
});

// Performance tests across browsers
test.describe('Cross-Browser Performance', () => {
  test('should load pages within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/produits');
    
    // Simulate large dataset
    await page.route('**/api/v1/produits', route => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `prod-${i}`,
        nom: `Product ${i}`,
        prix: Math.random() * 100,
        quantite: Math.floor(Math.random() * 1000)
      }));
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { produits: largeDataset } })
      });
    });
    
    const startTime = Date.now();
    await page.reload();
    await expect(page.locator('[data-testid="products-list"]')).toBeVisible();
    const renderTime = Date.now() - startTime;
    
    // Should render large dataset within reasonable time
    expect(renderTime).toBeLessThan(10000);
  });
});