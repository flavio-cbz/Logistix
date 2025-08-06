import { Page } from 'puppeteer';
import { PuppeteerTestUtils } from '../utils/puppeteer-test-utils';

export class AdminDebugPage {
  constructor(private page: Page) {}

  async navigateToDebugPage(): Promise<void> {
    await this.page.goto(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/debug`);
    await PuppeteerTestUtils.waitForLoadingToFinish(this.page);
  }

  async waitForDataToLoad(): Promise<void> {
    // Wait for all cards to finish loading
    await this.page.waitForTimeout(2000);
    
    // Wait for session data to load
    await this.page.waitForFunction(() => {
      const sessionPre = document.querySelector('.card:has-text("Session") pre');
      return sessionPre && 
             sessionPre.textContent !== 'Chargement...' && 
             sessionPre.textContent !== 'Aucune donnée';
    }, { timeout: 10000 }).catch(() => {
      // Ignore timeout - data might not be available
    });

    // Wait for database data to load
    await this.page.waitForFunction(() => {
      const databasePre = document.querySelector('.card:has-text("Base de données") pre');
      return databasePre && 
             databasePre.textContent !== 'Chargement...' && 
             databasePre.textContent !== 'Aucune donnée';
    }, { timeout: 10000 }).catch(() => {
      // Ignore timeout - data might not be available
    });
  }

  async getPageTitle(): Promise<string> {
    return await this.page.$eval('h1', el => el.textContent || '');
  }

  async getSessionData(): Promise<any> {
    try {
      const sessionContent = await this.page.$eval('.card:has-text("Session") pre', el => el.textContent);
      return JSON.parse(sessionContent || '{}');
    } catch (error) {
      return { error: 'Could not parse session data' };
    }
  }

  async getDatabaseData(): Promise<any> {
    try {
      const databaseContent = await this.page.$eval('.card:has-text("Base de données") pre', el => el.textContent);
      return JSON.parse(databaseContent || '{}');
    } catch (error) {
      return { error: 'Could not parse database data' };
    }
  }

  async getCookiesData(): Promise<any> {
    try {
      const cookiesContent = await this.page.$eval('.card:has-text("Cookies") pre', el => el.textContent);
      return JSON.parse(cookiesContent || '{}');
    } catch (error) {
      return { error: 'Could not parse cookies data' };
    }
  }

  async refreshSessionData(): Promise<void> {
    const refreshButton = await this.page.$('.card:has-text("Session") button:has-text("Rafraîchir")');
    if (refreshButton) {
      await refreshButton.click();
      
      // Wait for loading state
      await this.page.waitForSelector('.card:has-text("Session") button:has-text("Chargement...")', { timeout: 2000 }).catch(() => {});
      
      // Wait for loading to finish
      await this.page.waitForSelector('.card:has-text("Session") button:has-text("Rafraîchir")', { timeout: 10000 });
    }
  }

  async refreshDatabaseData(): Promise<void> {
    const refreshButton = await this.page.$('.card:has-text("Base de données") button:has-text("Rafraîchir")');
    if (refreshButton) {
      await refreshButton.click();
      
      // Wait for loading to finish
      await this.page.waitForSelector('.card:has-text("Base de données") button:has-text("Rafraîchir")', { timeout: 10000 });
    }
  }

  async refreshCookiesData(): Promise<void> {
    const refreshButton = await this.page.$('.card:has-text("Cookies") button:has-text("Rafraîchir")');
    if (refreshButton) {
      await refreshButton.click();
      
      // Wait for loading to finish
      await this.page.waitForSelector('.card:has-text("Cookies") button:has-text("Rafraîchir")', { timeout: 10000 });
    }
  }

  async deleteSessionCookie(): Promise<void> {
    const deleteButton = await this.page.$('button:has-text("Supprimer le cookie de session")');
    if (deleteButton) {
      await deleteButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async setTestCookie(): Promise<void> {
    const setTestButton = await this.page.$('button:has-text("Définir un cookie de test direct")');
    if (setTestButton) {
      await setTestButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async setSessionCookieManually(): Promise<void> {
    const setSessionButton = await this.page.$('button:has-text("Définir le cookie de session manuellement")');
    if (setSessionButton) {
      await setSessionButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async navigateToDashboard(): Promise<void> {
    const dashboardButton = await this.page.$('button:has-text("Aller au tableau de bord")');
    if (dashboardButton) {
      await dashboardButton.click();
      await PuppeteerTestUtils.waitForNavigation(this.page);
    }
  }

  async navigateToLogin(): Promise<void> {
    const loginButton = await this.page.$('button:has-text("Aller à la page de connexion")');
    if (loginButton) {
      await loginButton.click();
      await PuppeteerTestUtils.waitForNavigation(this.page);
    }
  }

  async isSessionCardVisible(): Promise<boolean> {
    const sessionCard = await this.page.$('.card:has-text("Session")');
    return !!sessionCard;
  }

  async isDatabaseCardVisible(): Promise<boolean> {
    const databaseCard = await this.page.$('.card:has-text("Base de données")');
    return !!databaseCard;
  }

  async isCookiesCardVisible(): Promise<boolean> {
    const cookiesCard = await this.page.$('.card:has-text("Cookies")');
    return !!cookiesCard;
  }

  async getAllRefreshButtons(): Promise<any[]> {
    return await this.page.$$('button:has-text("Rafraîchir")');
  }

  async getAllCards(): Promise<any[]> {
    return await this.page.$$('.card');
  }

  async getErrorMessages(): Promise<string[]> {
    const errorElements = await this.page.$$('[class*="error"], .text-red-500, .text-destructive');
    const errorMessages: string[] = [];
    
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text) {
        errorMessages.push(text);
      }
    }
    
    return errorMessages;
  }

  async hasLoadingState(): Promise<boolean> {
    const loadingButtons = await this.page.$$('button:has-text("Chargement...")');
    return loadingButtons.length > 0;
  }

  async waitForAllDataToLoad(): Promise<void> {
    // Wait for all refresh buttons to be available (not in loading state)
    await this.page.waitForFunction(() => {
      const loadingButtons = document.querySelectorAll('button:has-text("Chargement...")');
      return loadingButtons.length === 0;
    }, { timeout: 15000 }).catch(() => {
      // Ignore timeout - some data might still be loading
    });
  }

  async getSystemHealthStatus(): Promise<any> {
    return await this.page.evaluate(async () => {
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
  }

  async getDatabaseMetrics(): Promise<any> {
    return await this.page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/database/metrics');
        return {
          status: response.status,
          data: response.ok ? await response.json() : null
        };
      } catch (error) {
        return { error: error.message };
      }
    });
  }

  async getDatabaseHealthCheck(): Promise<any> {
    return await this.page.evaluate(async () => {
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
  }

  async testEndpointAccess(endpoint: string): Promise<any> {
    return await this.page.evaluate(async (url) => {
      try {
        const response = await fetch(url);
        return {
          status: response.status,
          ok: response.ok,
          data: response.ok ? await response.json() : null
        };
      } catch (error) {
        return { error: error.message };
      }
    }, endpoint);
  }

  async validateDatabaseStructure(): Promise<{
    hasExpectedTables: boolean;
    tables: string[];
    counts: Record<string, any>;
    users: any[];
    sessions: any[];
  }> {
    const databaseData = await this.getDatabaseData();
    
    if (databaseData.error || !databaseData.database) {
      return {
        hasExpectedTables: false,
        tables: [],
        counts: {},
        users: [],
        sessions: []
      };
    }

    const expectedTables = ['users', 'sessions', 'parcelles', 'produits'];
    const hasExpectedTables = expectedTables.every(table => 
      databaseData.database.tables.includes(table)
    );

    return {
      hasExpectedTables,
      tables: databaseData.database.tables || [],
      counts: databaseData.database.counts || {},
      users: databaseData.users || [],
      sessions: databaseData.sessions || []
    };
  }

  async performConcurrentRefresh(): Promise<void> {
    const refreshButtons = await this.getAllRefreshButtons();
    
    if (refreshButtons.length > 0) {
      // Click all refresh buttons simultaneously
      const clickPromises = refreshButtons.map(button => button.click());
      await Promise.all(clickPromises);

      // Wait for all operations to complete
      await this.waitForAllDataToLoad();
    }
  }

  async checkResponsiveDesign(viewport: { width: number; height: number }): Promise<{
    cardsVisible: boolean;
    buttonsClickable: boolean;
    contentAccessible: boolean;
  }> {
    await this.page.setViewport(viewport);
    await this.page.reload();
    await this.waitForDataToLoad();

    const cards = await this.getAllCards();
    const cardsVisible = cards.length > 0;

    const buttons = await this.page.$$('button');
    let buttonsClickable = true;
    
    // Check first few buttons for clickability
    for (const button of buttons.slice(0, 3)) {
      const isVisible = await button.isIntersectingViewport();
      if (!isVisible) {
        buttonsClickable = false;
        break;
      }
    }

    const contentAccessible = cardsVisible && buttonsClickable;

    return {
      cardsVisible,
      buttonsClickable,
      contentAccessible
    };
  }
}