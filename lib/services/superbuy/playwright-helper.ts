import { Page } from 'playwright';
import { logger } from '@/lib/utils/logging/logger';

export class PlaywrightHelper {
  constructor(private page: Page) {}

  async goto(url: string, options: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {}) {
    try {
      await this.page.goto(url, {
        timeout: options.timeout || 30000,
        waitUntil: options.waitUntil || 'domcontentloaded'
      });
      return true;
    } catch (error) {
      logger.error(`[Playwright] Failed to navigate to ${url}`, { error });
      return false;
    }
  }

  async safeClick(selector: string, options: { timeout?: number; force?: boolean } = {}): Promise<boolean> {
    try {
      const locator = this.page.locator(selector).first();
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 5000 });
      await locator.click({ force: options.force });
      return true;
    } catch (_) {
      return false;
    }
  }

  async clickAny(selectors: string[] | readonly string[], options: { timeout?: number } = {}): Promise<boolean> {
    for (const selector of selectors) {
      if (await this.safeClick(selector, options)) {
        return true;
      }
    }
    return false;
  }

  async fillWhenVisible(selector: string, value: string, options: { timeout?: number } = {}): Promise<boolean> {
    try {
      const locator = this.page.locator(selector).first();
      await locator.waitFor({ state: 'visible', timeout: options.timeout || 5000 });
      await locator.fill(value);
      return true;
    } catch (_) {
      return false;
    }
  }

  async fillAny(selectors: string[] | readonly string[], value: string, options: { timeout?: number } = {}): Promise<boolean> {
    for (const selector of selectors) {
      if (await this.fillWhenVisible(selector, value, options)) {
        return true;
      }
    }
    return false;
  }

  async waitForAny(selectors: string[] | readonly string[], timeout: number = 30000): Promise<boolean> {
    try {
      await Promise.any(
        selectors.map(selector =>
          this.page.waitForSelector(selector, { timeout }).then(() => true)
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  async getText(selector: string): Promise<string | null> {
    try {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible()) {
        return (await locator.textContent())?.trim() ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }
}
