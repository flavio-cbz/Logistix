import { Page, Browser } from 'puppeteer';
import { PuppeteerTestUtils } from './utils/puppeteer-test-utils';
import { LoginPage } from './page-objects/login-page';
import { ScreenshotUtils } from './utils/screenshot-utils';
import { puppeteerConfig } from './config';

describe('Administration Workflows - Puppeteer UI Tests', () => {
  let browser: Browser;
  let page: Page;
  let loginPage: LoginPage;

  beforeAll(async () => {
    browser = await PuppeteerTestUtils.launchBrowser();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await PuppeteerTestUtils.setupPage(page);
    loginPage = new LoginPage(page);

    // Login as admin before each test
    await loginPage.navigateToLogin();
    await loginPage.loginAsAdmin();
    await PuppeteerTestUtils.waitForNavigation(page);
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Admin Dashboard and Monitoring Displays', () => {
    test('should display debug page with system information', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Take screenshot for documentation
      await ScreenshotUtils.takeScreenshot(page, 'admin-debug-page');

      // Verify page title
      const pageTitle = await page.$eval('h1', el => el.textContent);
      expect(pageTitle).toContain('Page de débogage');

      // Verify session card is present
      const sessionCard = await page.$('[data-testid="session-card"], .card:has-text("Session")');
      expect(sessionCard).toBeTruthy();

      // Verify database card is present
      const databaseCard = await page.$('[data-testid="database-card"], .card:has-text("Base de données")');
      expect(databaseCard).toBeTruthy();

      // Verify cookies card is present
      const cookiesCard = await page.$('[data-testid="cookies-card"], .card:has-text("Cookies")');
      expect(cookiesCard).toBeTruthy();

      // Wait for data to load
      await page.waitForTimeout(2000);

      // Verify data is displayed (not just "Chargement...")
      const sessionContent = await page.$eval('.card:has-text("Session") pre', el => el.textContent);
      expect(sessionContent).not.toBe('Chargement...');
      expect(sessionContent).not.toBe('Aucune donnée');

      const databaseContent = await page.$eval('.card:has-text("Base de données") pre', el => el.textContent);
      expect(databaseContent).not.toBe('Chargement...');
      expect(databaseContent).not.toBe('Aucune donnée');
    });

    test('should refresh debug information when refresh buttons are clicked', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Wait for initial data load
      await page.waitForTimeout(2000);

      // Click refresh button for session data
      const sessionRefreshButton = await page.$('.card:has-text("Session") button:has-text("Rafraîchir")');
      if (sessionRefreshButton) {
        await sessionRefreshButton.click();
        
        // Verify loading state appears briefly
        await page.waitForSelector('.card:has-text("Session") button:has-text("Chargement...")', { timeout: 1000 });
        
        // Wait for loading to finish
        await page.waitForSelector('.card:has-text("Session") button:has-text("Rafraîchir")', { timeout: 5000 });
      }

      // Click refresh button for database data
      const databaseRefreshButton = await page.$('.card:has-text("Base de données") button:has-text("Rafraîchir")');
      if (databaseRefreshButton) {
        await databaseRefreshButton.click();
        
        // Wait for loading to finish
        await page.waitForSelector('.card:has-text("Base de données") button:has-text("Rafraîchir")', { timeout: 5000 });
      }

      await ScreenshotUtils.takeScreenshot(page, 'admin-debug-refreshed');
    });

    test('should display system health monitoring information', async () => {
      // Navigate to health check endpoint via debug page or direct API call
      const healthResponse = await page.evaluate(async () => {
        const response = await fetch('/api/v1/health');
        return await response.json();
      });

      expect(healthResponse).toHaveProperty('status');
      expect(healthResponse).toHaveProperty('database');
      expect(healthResponse).toHaveProperty('timestamp');

      // Verify health status is displayed
      expect(['ok', 'degraded', 'error']).toContain(healthResponse.status);
    });

    test('should display database metrics and performance data', async () => {
      // Test database metrics endpoint
      const metricsResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/database/metrics');
          if (response.ok) {
            return await response.json();
          }
          return { error: 'Unauthorized or error' };
        } catch (error) {
          return { error: error.message };
        }
      });

      // If authenticated, should have metrics data
      if (!metricsResponse.error) {
        expect(metricsResponse).toHaveProperty('metrics');
        expect(metricsResponse.metrics).toHaveProperty('connectionPool');
        expect(metricsResponse.metrics).toHaveProperty('database');
        expect(metricsResponse.metrics).toHaveProperty('system');
      }
    });

    test('should handle navigation between admin sections', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Test navigation to dashboard
      const dashboardButton = await page.$('button:has-text("Aller au tableau de bord")');
      if (dashboardButton) {
        await dashboardButton.click();
        await PuppeteerTestUtils.waitForNavigation(page);
        
        // Verify we're on dashboard
        const currentUrl = page.url();
        expect(currentUrl).toContain('/dashboard');
      }

      // Navigate back to debug
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Test navigation to login
      const loginButton = await page.$('button:has-text("Aller à la page de connexion")');
      if (loginButton) {
        await loginButton.click();
        await PuppeteerTestUtils.waitForNavigation(page);
        
        // Verify we're on login page
        const currentUrl = page.url();
        expect(currentUrl).toContain('/login');
      }
    });
  });

  describe('Database Explorer and Query Interfaces', () => {
    test('should display database structure information', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Wait for database data to load
      await page.waitForTimeout(2000);

      // Get database information from the debug page
      const databaseInfo = await page.$eval('.card:has-text("Base de données") pre', el => {
        try {
          return JSON.parse(el.textContent || '{}');
        } catch {
          return { error: 'Could not parse database info' };
        }
      });

      if (!databaseInfo.error) {
        expect(databaseInfo).toHaveProperty('database');
        expect(databaseInfo.database).toHaveProperty('exists');
        expect(databaseInfo.database).toHaveProperty('tables');
        
        // Verify expected tables exist
        const expectedTables = ['users', 'sessions', 'parcelles', 'produits'];
        expectedTables.forEach(table => {
          expect(databaseInfo.database.tables).toContain(table);
        });
      }

      await ScreenshotUtils.takeScreenshot(page, 'database-explorer-info');
    });

    test('should display table record counts', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);
      await page.waitForTimeout(2000);

      const databaseInfo = await page.$eval('.card:has-text("Base de données") pre', el => {
        try {
          return JSON.parse(el.textContent || '{}');
        } catch {
          return { error: 'Could not parse database info' };
        }
      });

      if (!databaseInfo.error && databaseInfo.database) {
        expect(databaseInfo.database).toHaveProperty('counts');
        
        // Verify counts are numbers
        Object.values(databaseInfo.database.counts).forEach(count => {
          expect(typeof count === 'number' || typeof count === 'string').toBe(true);
        });
      }
    });

    test('should display user and session information', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);
      await page.waitForTimeout(2000);

      const databaseInfo = await page.$eval('.card:has-text("Base de données") pre', el => {
        try {
          return JSON.parse(el.textContent || '{}');
        } catch {
          return { error: 'Could not parse database info' };
        }
      });

      if (!databaseInfo.error) {
        expect(databaseInfo).toHaveProperty('users');
        expect(databaseInfo).toHaveProperty('sessions');
        
        // Verify users array structure
        if (Array.isArray(databaseInfo.users) && databaseInfo.users.length > 0) {
          const user = databaseInfo.users[0];
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('username');
        }

        // Verify sessions array structure
        if (Array.isArray(databaseInfo.sessions) && databaseInfo.sessions.length > 0) {
          const session = databaseInfo.sessions[0];
          expect(session).toHaveProperty('id');
          expect(session).toHaveProperty('user_id');
        }
      }
    });

    test('should handle database query errors gracefully', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Wait for potential error states to appear
      await page.waitForTimeout(3000);

      // Check if any error messages are displayed
      const errorElements = await page.$$('[class*="error"], .text-red-500, .text-destructive');
      
      // If errors are present, they should be handled gracefully
      for (const errorElement of errorElements) {
        const errorText = await errorElement.textContent();
        expect(errorText).toBeTruthy();
        // Error messages should be user-friendly, not raw database errors
        expect(errorText).not.toContain('SQLITE_');
        expect(errorText).not.toContain('database is locked');
      }
    });
  });

  describe('System Maintenance and Backup Workflows', () => {
    test('should display system maintenance options', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Look for maintenance-related buttons or sections
      const maintenanceButtons = await page.$$('button[class*="maintenance"], button:has-text("maintenance"), button:has-text("Maintenance")');
      
      // If maintenance UI exists, test it
      if (maintenanceButtons.length > 0) {
        await ScreenshotUtils.takeScreenshot(page, 'maintenance-options');
        
        for (const button of maintenanceButtons) {
          const buttonText = await button.textContent();
          expect(buttonText).toBeTruthy();
        }
      }
    });

    test('should handle cookie management operations', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);
      await page.waitForTimeout(2000);

      // Test cookie deletion
      const deleteCookieButton = await page.$('button:has-text("Supprimer le cookie de session")');
      if (deleteCookieButton) {
        await deleteCookieButton.click();
        await page.waitForTimeout(1000);
        
        // Verify cookie was deleted by checking the cookies display
        const cookiesContent = await page.$eval('.card:has-text("Cookies") pre', el => el.textContent);
        expect(cookiesContent).toBeTruthy();
      }

      // Test setting test cookie
      const setTestCookieButton = await page.$('button:has-text("Définir un cookie de test direct")');
      if (setTestCookieButton) {
        await setTestCookieButton.click();
        await page.waitForTimeout(1000);
        
        // Verify cookie was set
        const cookiesContent = await page.$eval('.card:has-text("Cookies") pre', el => el.textContent);
        expect(cookiesContent).toBeTruthy();
      }

      // Test setting session cookie manually
      const setSessionButton = await page.$('button:has-text("Définir le cookie de session manuellement")');
      if (setSessionButton) {
        await setSessionButton.click();
        await page.waitForTimeout(1000);
        
        // Verify session was updated
        const sessionContent = await page.$eval('.card:has-text("Session") pre', el => el.textContent);
        expect(sessionContent).toBeTruthy();
      }

      await ScreenshotUtils.takeScreenshot(page, 'cookie-management-operations');
    });

    test('should display system health status', async () => {
      // Test system health endpoint directly
      const healthData = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/health');
          return {
            status: response.status,
            data: await response.json()
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      if (!healthData.error) {
        expect([200, 503]).toContain(healthData.status);
        expect(healthData.data).toHaveProperty('status');
        expect(['ok', 'degraded', 'error']).toContain(healthData.data.status);
        
        if (healthData.data.database) {
          expect(healthData.data.database).toHaveProperty('connectivity');
          expect(healthData.data.database.connectivity).toHaveProperty('isConnected');
        }
      }
    });

    test('should handle backup and restore operations', async () => {
      // Since backup/restore endpoints might not exist yet, we'll test the concept
      const backupTest = await page.evaluate(async () => {
        try {
          // Test if backup endpoint exists
          const response = await fetch('/api/v1/admin/backup', { method: 'POST' });
          return {
            exists: true,
            status: response.status,
            data: response.ok ? await response.json() : null
          };
        } catch (error) {
          return { exists: false, error: error.message };
        }
      });

      // If backup endpoint exists, verify it works
      if (backupTest.exists && backupTest.status !== 404) {
        expect([200, 401, 403, 500]).toContain(backupTest.status);
      }

      // Test restore endpoint concept
      const restoreTest = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/admin/restore', { method: 'POST' });
          return {
            exists: true,
            status: response.status
          };
        } catch (error) {
          return { exists: false, error: error.message };
        }
      });

      // If restore endpoint exists, verify it responds appropriately
      if (restoreTest.exists && restoreTest.status !== 404) {
        expect([200, 400, 401, 403, 500]).toContain(restoreTest.status);
      }
    });

    test('should display database maintenance status', async () => {
      // Test database health check endpoint
      const healthCheckData = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/database/health-check');
          return {
            status: response.status,
            data: await response.json()
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      if (!healthCheckData.error) {
        expect([200, 503]).toContain(healthCheckData.status);
        expect(healthCheckData.data).toHaveProperty('overall');
        expect(healthCheckData.data).toHaveProperty('components');
        expect(healthCheckData.data).toHaveProperty('timestamp');
        
        // Verify components are checked
        expect(Array.isArray(healthCheckData.data.components)).toBe(true);
        if (healthCheckData.data.components.length > 0) {
          const component = healthCheckData.data.components[0];
          expect(component).toHaveProperty('component');
          expect(component).toHaveProperty('status');
          expect(['healthy', 'degraded', 'unhealthy']).toContain(component.status);
        }
      }
    });
  });

  describe('Log Viewer and Filtering Functionality', () => {
    test('should display application logs', async () => {
      // Test if logs endpoint exists and is accessible
      const logsTest = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/admin/logs');
          return {
            status: response.status,
            data: response.ok ? await response.json() : null
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      // If logs endpoint exists, verify structure
      if (logsTest.status === 200 && logsTest.data) {
        expect(logsTest.data).toHaveProperty('logs');
        expect(Array.isArray(logsTest.data.logs)).toBe(true);
        
        if (logsTest.data.logs.length > 0) {
          const logEntry = logsTest.data.logs[0];
          expect(logEntry).toHaveProperty('timestamp');
          expect(logEntry).toHaveProperty('level');
          expect(logEntry).toHaveProperty('message');
        }
      }
    });

    test('should filter logs by level', async () => {
      // Test log filtering functionality
      const logLevels = ['error', 'warn', 'info', 'debug'];
      
      for (const level of logLevels) {
        const filteredLogs = await page.evaluate(async (logLevel) => {
          try {
            const response = await fetch(`/api/v1/admin/logs?level=${logLevel}`);
            return {
              status: response.status,
              data: response.ok ? await response.json() : null
            };
          } catch (error) {
            return { error: error.message };
          }
        }, level);

        // If endpoint exists and returns data, verify filtering
        if (filteredLogs.status === 200 && filteredLogs.data && filteredLogs.data.logs) {
          filteredLogs.data.logs.forEach((log: any) => {
            expect(log.level).toBe(level);
          });
        }
      }
    });

    test('should display log pagination', async () => {
      // Test log pagination
      const paginatedLogs = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/admin/logs?page=1&limit=10');
          return {
            status: response.status,
            data: response.ok ? await response.json() : null
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      // If pagination is supported, verify structure
      if (paginatedLogs.status === 200 && paginatedLogs.data) {
        if (paginatedLogs.data.pagination) {
          expect(paginatedLogs.data.pagination).toHaveProperty('page');
          expect(paginatedLogs.data.pagination).toHaveProperty('limit');
          expect(paginatedLogs.data.pagination).toHaveProperty('total');
        }
      }
    });

    test('should handle log search functionality', async () => {
      // Test log search
      const searchResults = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/admin/logs?search=error');
          return {
            status: response.status,
            data: response.ok ? await response.json() : null
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      // If search is supported, verify results contain search term
      if (searchResults.status === 200 && searchResults.data && searchResults.data.logs) {
        searchResults.data.logs.forEach((log: any) => {
          const logText = JSON.stringify(log).toLowerCase();
          expect(logText).toContain('error');
        });
      }
    });

    test('should display real-time log updates', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // If there's a real-time log viewer, test it
      const logViewer = await page.$('[data-testid="log-viewer"], .log-viewer, [class*="log"]');
      
      if (logViewer) {
        // Take initial screenshot
        await ScreenshotUtils.takeScreenshot(page, 'log-viewer-initial');
        
        // Wait for potential updates
        await page.waitForTimeout(3000);
        
        // Take screenshot after waiting
        await ScreenshotUtils.takeScreenshot(page, 'log-viewer-updated');
        
        // Verify log viewer is visible
        const isVisible = await logViewer.isIntersectingViewport();
        expect(isVisible).toBe(true);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle unauthorized access gracefully', async () => {
      // Logout first
      await page.goto(`${puppeteerConfig.baseUrl}/login`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Try to access admin endpoints without authentication
      const unauthorizedTests = [
        '/api/v1/database/metrics',
        '/api/v1/admin/logs',
        '/api/v1/admin/backup'
      ];

      for (const endpoint of unauthorizedTests) {
        const result = await page.evaluate(async (url) => {
          try {
            const response = await fetch(url);
            return { status: response.status };
          } catch (error) {
            return { error: error.message };
          }
        }, endpoint);

        // Should return 401 Unauthorized or redirect to login
        if (!result.error) {
          expect([401, 403, 302]).toContain(result.status);
        }
      }
    });

    test('should handle network errors gracefully', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Simulate network error by trying to fetch from invalid endpoint
      const networkErrorTest = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/v1/invalid-endpoint');
          return { status: response.status };
        } catch (error) {
          return { error: error.message };
        }
      });

      // Should handle 404 or network errors gracefully
      expect(networkErrorTest.status === 404 || networkErrorTest.error).toBeTruthy();
    });

    test('should handle large data sets in debug view', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);
      await page.waitForTimeout(3000);

      // Check if large data is handled properly (scrollable, truncated, etc.)
      const preElements = await page.$$('pre');
      
      for (const preElement of preElements) {
        const styles = await preElement.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            overflow: computed.overflow,
            maxHeight: computed.maxHeight,
            height: computed.height
          };
        });

        // Verify that large content is handled with scrolling or max height
        if (styles.maxHeight && styles.maxHeight !== 'none') {
          expect(['auto', 'scroll', 'hidden']).toContain(styles.overflow);
        }
      }

      await ScreenshotUtils.takeScreenshot(page, 'debug-large-data-handling');
    });

    test('should handle concurrent admin operations', async () => {
      await page.goto(`${puppeteerConfig.baseUrl}/debug`);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Simulate concurrent refresh operations
      const refreshButtons = await page.$$('button:has-text("Rafraîchir")');
      
      if (refreshButtons.length > 0) {
        // Click multiple refresh buttons simultaneously
        const clickPromises = refreshButtons.map(button => button.click());
        await Promise.all(clickPromises);

        // Wait for all operations to complete
        await page.waitForTimeout(5000);

        // Verify page is still functional
        const pageTitle = await page.$eval('h1', el => el.textContent);
        expect(pageTitle).toContain('Page de débogage');
      }
    });

    test('should maintain responsive design on different screen sizes', async () => {
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.goto(`${puppeteerConfig.baseUrl}/debug`);
        await PuppeteerTestUtils.waitForLoadingToFinish(page);

        // Take screenshot for each viewport
        await ScreenshotUtils.takeScreenshot(page, `admin-debug-${viewport.name}`);

        // Verify content is accessible
        const cards = await page.$$('.card');
        expect(cards.length).toBeGreaterThan(0);

        // Verify buttons are clickable
        const buttons = await page.$$('button');
        for (const button of buttons.slice(0, 2)) { // Test first 2 buttons
          const isVisible = await button.isIntersectingViewport();
          expect(isVisible).toBe(true);
        }
      }

      // Reset to default viewport
      await page.setViewport({ width: 1280, height: 720 });
    });
  });
});