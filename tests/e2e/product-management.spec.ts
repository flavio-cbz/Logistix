/**
 * Product Management E2E Tests
 * Tests the complete product management workflow
 */

import { test, expect } from '@playwright/test';

test.describe('Product Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('[data-testid="login-email"]', 'test@example.com');
    await page.fill('[data-testid="login-password"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Product List View', () => {
    test('should display products list', async ({ page }) => {
      await page.goto('/produits');
      
      await expect(page.locator('[data-testid="products-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount.greaterThan(0);
    });

    test('should show product details in list', async ({ page }) => {
      await page.goto('/produits');
      
      const firstProduct = page.locator('[data-testid="product-item"]').first();
      
      await expect(firstProduct.locator('[data-testid="product-name"]')).toBeVisible();
      await expect(firstProduct.locator('[data-testid="product-price"]')).toBeVisible();
      await expect(firstProduct.locator('[data-testid="product-quantity"]')).toBeVisible();
      await expect(firstProduct.locator('[data-testid="product-parcelle"]')).toBeVisible();
    });

    test('should allow sorting products', async ({ page }) => {
      await page.goto('/produits');
      
      // Sort by price
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('[data-testid="sort-price-asc"]');
      
      // Wait for sorting to apply
      await page.waitForTimeout(500);
      
      // Check if products are sorted by price
      const prices = await page.locator('[data-testid="product-price"]').allTextContents();
      const numericPrices = prices.map(price => parseFloat(price.replace('€', '').replace(',', '.')));
      
      for (let i = 1; i < numericPrices.length; i++) {
        expect(numericPrices[i]).toBeGreaterThanOrEqual(numericPrices[i - 1]);
      }
    });

    test('should allow filtering products', async ({ page }) => {
      await page.goto('/produits');
      
      // Filter by parcelle
      await page.click('[data-testid="filter-parcelle"]');
      await page.click('[data-testid="parcelle-option-1"]');
      
      // Wait for filtering to apply
      await page.waitForTimeout(500);
      
      // All visible products should belong to selected parcelle
      const parcelleNames = await page.locator('[data-testid="product-parcelle"]').allTextContents();
      parcelleNames.forEach(name => {
        expect(name).toContain('Parcelle 1');
      });
    });

    test('should allow searching products', async ({ page }) => {
      await page.goto('/produits');
      
      // Search for specific product
      await page.fill('[data-testid="search-input"]', 'Tomates');
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(500);
      
      // All visible products should match search term
      const productNames = await page.locator('[data-testid="product-name"]').allTextContents();
      productNames.forEach(name => {
        expect(name.toLowerCase()).toContain('tomates');
      });
    });

    test('should show empty state when no products match filters', async ({ page }) => {
      await page.goto('/produits');
      
      // Search for non-existent product
      await page.fill('[data-testid="search-input"]', 'NonExistentProduct');
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(500);
      
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="empty-state"]')).toContainText('No products found');
    });
  });

  test.describe('Product Creation', () => {
    test('should allow creating new product', async ({ page }) => {
      await page.goto('/produits');
      
      // Click create product button
      await page.click('[data-testid="create-product-button"]');
      
      // Should open create product modal/page
      await expect(page.locator('[data-testid="product-form"]')).toBeVisible();
      
      // Fill product form
      await page.fill('[data-testid="product-name"]', 'Nouvelles Tomates');
      await page.fill('[data-testid="product-price"]', '3.50');
      await page.fill('[data-testid="product-quantity"]', '100');
      await page.selectOption('[data-testid="product-parcelle"]', 'parcelle-1');
      await page.fill('[data-testid="product-description"]', 'Tomates fraîches du jardin');
      
      // Submit form
      await page.click('[data-testid="submit-product"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Product created successfully');
      
      // Should redirect to products list
      await expect(page).toHaveURL('/produits');
      
      // New product should appear in list
      await expect(page.locator('[data-testid="product-name"]').filter({ hasText: 'Nouvelles Tomates' })).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="create-product-button"]');
      
      // Try to submit empty form
      await page.click('[data-testid="submit-product"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="error-name"]')).toContainText('Name is required');
      await expect(page.locator('[data-testid="error-price"]')).toContainText('Price is required');
      await expect(page.locator('[data-testid="error-quantity"]')).toContainText('Quantity is required');
      await expect(page.locator('[data-testid="error-parcelle"]')).toContainText('Parcelle is required');
    });

    test('should validate price format', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="create-product-button"]');
      
      await page.fill('[data-testid="product-name"]', 'Test Product');
      await page.fill('[data-testid="product-price"]', 'invalid-price');
      await page.fill('[data-testid="product-quantity"]', '100');
      await page.selectOption('[data-testid="product-parcelle"]', 'parcelle-1');
      
      await page.click('[data-testid="submit-product"]');
      
      await expect(page.locator('[data-testid="error-price"]')).toContainText('Please enter a valid price');
    });

    test('should validate negative price', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="create-product-button"]');
      
      await page.fill('[data-testid="product-name"]', 'Test Product');
      await page.fill('[data-testid="product-price"]', '-10');
      await page.fill('[data-testid="product-quantity"]', '100');
      await page.selectOption('[data-testid="product-parcelle"]', 'parcelle-1');
      
      await page.click('[data-testid="submit-product"]');
      
      await expect(page.locator('[data-testid="error-price"]')).toContainText('Price must be positive');
    });

    test('should validate quantity format', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="create-product-button"]');
      
      await page.fill('[data-testid="product-name"]', 'Test Product');
      await page.fill('[data-testid="product-price"]', '10.50');
      await page.fill('[data-testid="product-quantity"]', 'invalid-quantity');
      await page.selectOption('[data-testid="product-parcelle"]', 'parcelle-1');
      
      await page.click('[data-testid="submit-product"]');
      
      await expect(page.locator('[data-testid="error-quantity"]')).toContainText('Please enter a valid quantity');
    });

    test('should show loading state during creation', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="create-product-button"]');
      
      await page.fill('[data-testid="product-name"]', 'Test Product');
      await page.fill('[data-testid="product-price"]', '10.50');
      await page.fill('[data-testid="product-quantity"]', '100');
      await page.selectOption('[data-testid="product-parcelle"]', 'parcelle-1');
      
      // Click submit and immediately check loading state
      await page.click('[data-testid="submit-product"]');
      
      await expect(page.locator('[data-testid="submit-product"]')).toContainText('Creating...');
      await expect(page.locator('[data-testid="submit-product"]')).toBeDisabled();
    });
  });

  test.describe('Product Editing', () => {
    test('should allow editing existing product', async ({ page }) => {
      await page.goto('/produits');
      
      // Click edit button on first product
      await page.click('[data-testid="product-item"]').first().locator('[data-testid="edit-product"]');
      
      // Should open edit form
      await expect(page.locator('[data-testid="product-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="form-title"]')).toContainText('Edit Product');
      
      // Form should be pre-filled with existing data
      await expect(page.locator('[data-testid="product-name"]')).not.toHaveValue('');
      await expect(page.locator('[data-testid="product-price"]')).not.toHaveValue('');
      
      // Update product name
      await page.fill('[data-testid="product-name"]', 'Updated Product Name');
      
      // Submit changes
      await page.click('[data-testid="submit-product"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Product updated successfully');
      
      // Should reflect changes in list
      await expect(page.locator('[data-testid="product-name"]').filter({ hasText: 'Updated Product Name' })).toBeVisible();
    });

    test('should allow canceling edit', async ({ page }) => {
      await page.goto('/produits');
      
      await page.click('[data-testid="product-item"]').first().locator('[data-testid="edit-product"]');
      
      // Make some changes
      await page.fill('[data-testid="product-name"]', 'Changed Name');
      
      // Cancel edit
      await page.click('[data-testid="cancel-edit"]');
      
      // Should close form without saving
      await expect(page.locator('[data-testid="product-form"]')).not.toBeVisible();
      
      // Changes should not be reflected
      await expect(page.locator('[data-testid="product-name"]').filter({ hasText: 'Changed Name' })).not.toBeVisible();
    });

    test('should show confirmation dialog for unsaved changes', async ({ page }) => {
      await page.goto('/produits');
      
      await page.click('[data-testid="product-item"]').first().locator('[data-testid="edit-product"]');
      
      // Make changes
      await page.fill('[data-testid="product-name"]', 'Changed Name');
      
      // Try to navigate away
      await page.click('[data-testid="products-nav"]');
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="unsaved-changes-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="unsaved-changes-dialog"]')).toContainText('You have unsaved changes');
    });
  });

  test.describe('Product Deletion', () => {
    test('should allow deleting product with confirmation', async ({ page }) => {
      await page.goto('/produits');
      
      // Get initial product count
      const initialCount = await page.locator('[data-testid="product-item"]').count();
      
      // Click delete button on first product
      await page.click('[data-testid="product-item"]').first().locator('[data-testid="delete-product"]');
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-confirmation"]')).toContainText('Are you sure you want to delete this product?');
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Product deleted successfully');
      
      // Product count should decrease
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(initialCount - 1);
    });

    test('should allow canceling deletion', async ({ page }) => {
      await page.goto('/produits');
      
      const initialCount = await page.locator('[data-testid="product-item"]').count();
      
      await page.click('[data-testid="product-item"]').first().locator('[data-testid="delete-product"]');
      
      // Cancel deletion
      await page.click('[data-testid="cancel-delete"]');
      
      // Dialog should close
      await expect(page.locator('[data-testid="delete-confirmation"]')).not.toBeVisible();
      
      // Product count should remain the same
      await expect(page.locator('[data-testid="product-item"]')).toHaveCount(initialCount);
    });

    test('should handle bulk deletion', async ({ page }) => {
      await page.goto('/produits');
      
      // Select multiple products
      await page.check('[data-testid="product-item"]').first().locator('[data-testid="select-product"]');
      await page.check('[data-testid="product-item"]').nth(1).locator('[data-testid="select-product"]');
      
      // Click bulk delete
      await page.click('[data-testid="bulk-delete"]');
      
      // Should show bulk delete confirmation
      await expect(page.locator('[data-testid="bulk-delete-confirmation"]')).toBeVisible();
      await expect(page.locator('[data-testid="bulk-delete-confirmation"]')).toContainText('Delete 2 selected products?');
      
      // Confirm bulk deletion
      await page.click('[data-testid="confirm-bulk-delete"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('2 products deleted successfully');
    });
  });

  test.describe('Product Details View', () => {
    test('should show detailed product information', async ({ page }) => {
      await page.goto('/produits');
      
      // Click on first product to view details
      await page.click('[data-testid="product-item"]').first().locator('[data-testid="view-product"]');
      
      // Should navigate to product details page
      await expect(page).toHaveURL(/\/produits\/[^\/]+$/);
      
      // Should show product details
      await expect(page.locator('[data-testid="product-detail-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-detail-price"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-detail-quantity"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-detail-parcelle"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-detail-description"]')).toBeVisible();
    });

    test('should show product history', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="product-item"]').first().locator('[data-testid="view-product"]');
      
      // Navigate to history tab
      await page.click('[data-testid="history-tab"]');
      
      // Should show product history
      await expect(page.locator('[data-testid="product-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="history-item"]')).toHaveCount.greaterThan(0);
    });

    test('should allow editing from details view', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="product-item"]').first().locator('[data-testid="view-product"]');
      
      // Click edit button
      await page.click('[data-testid="edit-product-detail"]');
      
      // Should show edit form
      await expect(page.locator('[data-testid="product-form"]')).toBeVisible();
    });
  });

  test.describe('Product Import/Export', () => {
    test('should allow exporting products to CSV', async ({ page }) => {
      await page.goto('/produits');
      
      // Click export button
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-products"]');
      
      const download = await downloadPromise;
      
      // Should download CSV file
      expect(download.suggestedFilename()).toContain('.csv');
    });

    test('should allow importing products from CSV', async ({ page }) => {
      await page.goto('/produits');
      
      // Click import button
      await page.click('[data-testid="import-products"]');
      
      // Should show import dialog
      await expect(page.locator('[data-testid="import-dialog"]')).toBeVisible();
      
      // Upload CSV file
      const fileInput = page.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles('tests/fixtures/products.csv');
      
      // Submit import
      await page.click('[data-testid="submit-import"]');
      
      // Should show import success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Products imported successfully');
    });

    test('should validate CSV format during import', async ({ page }) => {
      await page.goto('/produits');
      await page.click('[data-testid="import-products"]');
      
      // Upload invalid CSV file
      const fileInput = page.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles('tests/fixtures/invalid-products.csv');
      
      await page.click('[data-testid="submit-import"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="import-errors"]')).toBeVisible();
      await expect(page.locator('[data-testid="import-errors"]')).toContainText('Invalid CSV format');
    });
  });

  test.describe('Product Statistics', () => {
    test('should show product statistics dashboard', async ({ page }) => {
      await page.goto('/produits/stats');
      
      // Should show various statistics
      await expect(page.locator('[data-testid="total-products"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-value"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-price"]')).toBeVisible();
      await expect(page.locator('[data-testid="low-stock-count"]')).toBeVisible();
    });

    test('should show product charts', async ({ page }) => {
      await page.goto('/produits/stats');
      
      // Should show price distribution chart
      await expect(page.locator('[data-testid="price-distribution-chart"]')).toBeVisible();
      
      // Should show quantity by parcelle chart
      await expect(page.locator('[data-testid="quantity-by-parcelle-chart"]')).toBeVisible();
    });

    test('should allow filtering statistics by date range', async ({ page }) => {
      await page.goto('/produits/stats');
      
      // Set date range
      await page.fill('[data-testid="start-date"]', '2024-01-01');
      await page.fill('[data-testid="end-date"]', '2024-12-31');
      await page.click('[data-testid="apply-filter"]');
      
      // Statistics should update
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="date-range-info"]')).toContainText('2024-01-01 to 2024-12-31');
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/produits');
      
      // Should show mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-product-list"]')).toBeVisible();
      
      // Should show hamburger menu
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    });

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/produits');
      
      // Should show tablet-optimized layout
      await expect(page.locator('[data-testid="tablet-product-grid"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/produits');
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="create-product-button"]')).toBeFocused();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/produits');
      
      await expect(page.locator('[data-testid="products-list"]')).toHaveAttribute('aria-label', 'Products list');
      await expect(page.locator('[data-testid="search-input"]')).toHaveAttribute('aria-label', 'Search products');
    });

    test('should announce actions to screen readers', async ({ page }) => {
      await page.goto('/produits');
      
      // Create product
      await page.click('[data-testid="create-product-button"]');
      await page.fill('[data-testid="product-name"]', 'Test Product');
      await page.fill('[data-testid="product-price"]', '10.50');
      await page.fill('[data-testid="product-quantity"]', '100');
      await page.selectOption('[data-testid="product-parcelle"]', 'parcelle-1');
      await page.click('[data-testid="submit-product"]');
      
      // Success message should have proper role
      await expect(page.locator('[data-testid="success-message"]')).toHaveAttribute('role', 'alert');
    });
  });
});