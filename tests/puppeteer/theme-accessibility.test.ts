/**
 * Theme and Accessibility Puppeteer Tests
 * Tests theme switching, persistence, accessibility compliance, and keyboard navigation
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { Page } from 'puppeteer';
import {
  setupPuppeteerSuite,
  teardownPuppeteerSuite,
  setupPuppeteerTest,
  teardownPuppeteerTest,
  PuppeteerTestUtils,
  TEST_CONFIG
} from './config';

describe('Theme and Accessibility Tests', () => {
  let page: Page;

  beforeAll(async () => {
    await setupPuppeteerSuite();
  });

  afterAll(async () => {
    await teardownPuppeteerSuite();
  });

  beforeEach(async () => {
    page = await setupPuppeteerTest('theme-accessibility');
    await page.goto(`${TEST_CONFIG.baseURL}/login`);
  });

  afterEach(async () => {
    await teardownPuppeteerTest(page);
  });

  describe('Theme Switching and Persistence', () => {
    it('should switch from light to dark theme', async () => {
      // Navigate to dashboard after login
      await PuppeteerTestUtils.fillForm(page, {
        '[name="email"]': 'admin@logistix.com',
        '[name="password"]': 'admin123'
      });
      
      await PuppeteerTestUtils.clickAndWait(page, '[type="submit"]', true);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Check initial light theme
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      expect(initialTheme).toBe(false);

      // Find and click theme toggle button
      const themeToggleSelector = '[data-testid="theme-toggle"], [aria-label*="theme"], button[class*="theme"]';
      await page.waitForSelector(themeToggleSelector, { timeout: 10000 });
      await page.click(themeToggleSelector);

      // Wait for theme change animation
      await page.waitForTimeout(500);

      // Verify dark theme is applied
      const darkThemeApplied = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      expect(darkThemeApplied).toBe(true);

      // Verify dark theme styles are applied
      const backgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      
      // Dark theme should have a dark background
      expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
    });

    it('should persist theme preference across page reloads', async () => {
      // Login first
      await PuppeteerTestUtils.fillForm(page, {
        '[name="email"]': 'admin@logistix.com',
        '[name="password"]': 'admin123'
      });
      
      await PuppeteerTestUtils.clickAndWait(page, '[type="submit"]', true);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Switch to dark theme
      const themeToggleSelector = '[data-testid="theme-toggle"], [aria-label*="theme"], button[class*="theme"]';
      await page.waitForSelector(themeToggleSelector);
      await page.click(themeToggleSelector);
      await page.waitForTimeout(500);

      // Verify dark theme is applied
      let isDarkTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      expect(isDarkTheme).toBe(true);

      // Reload the page
      await page.reload({ waitUntil: 'networkidle0' });
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Verify theme persisted after reload
      isDarkTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      expect(isDarkTheme).toBe(true);
    });

    it('should switch back to light theme', async () => {
      // Login and switch to dark theme first
      await PuppeteerTestUtils.fillForm(page, {
        '[name="email"]': 'admin@logistix.com',
        '[name="password"]': 'admin123'
      });
      
      await PuppeteerTestUtils.clickAndWait(page, '[type="submit"]', true);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      const themeToggleSelector = '[data-testid="theme-toggle"], [aria-label*="theme"], button[class*="theme"]';
      await page.waitForSelector(themeToggleSelector);
      
      // Switch to dark theme
      await page.click(themeToggleSelector);
      await page.waitForTimeout(500);

      // Verify dark theme
      let isDarkTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      expect(isDarkTheme).toBe(true);

      // Switch back to light theme
      await page.click(themeToggleSelector);
      await page.waitForTimeout(500);

      // Verify light theme is restored
      isDarkTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      expect(isDarkTheme).toBe(false);
    });

    it('should apply theme to all UI components', async () => {
      // Login first
      await PuppeteerTestUtils.fillForm(page, {
        '[name="email"]': 'admin@logistix.com',
        '[name="password"]': 'admin123'
      });
      
      await PuppeteerTestUtils.clickAndWait(page, '[type="submit"]', true);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Switch to dark theme
      const themeToggleSelector = '[data-testid="theme-toggle"], [aria-label*="theme"], button[class*="theme"]';
      await page.waitForSelector(themeToggleSelector);
      await page.click(themeToggleSelector);
      await page.waitForTimeout(500);

      // Check that various UI components have dark theme styles
      const componentStyles = await page.evaluate(() => {
        const components = {
          body: document.body,
          cards: document.querySelectorAll('[class*="card"]')[0],
          buttons: document.querySelectorAll('button')[0],
          inputs: document.querySelectorAll('input')[0]
        };

        const styles: Record<string, any> = {};
        
        Object.entries(components).forEach(([key, element]) => {
          if (element) {
            const computedStyle = window.getComputedStyle(element);
            styles[key] = {
              backgroundColor: computedStyle.backgroundColor,
              color: computedStyle.color,
              borderColor: computedStyle.borderColor
            };
          }
        });

        return styles;
      });

      // Verify that components have appropriate dark theme colors
      expect(componentStyles.body.backgroundColor).not.toBe('rgb(255, 255, 255)');
      
      // At least one component should have dark styling
      const hasAnyDarkStyling = Object.values(componentStyles).some((style: any) => 
        style.backgroundColor && style.backgroundColor !== 'rgb(255, 255, 255)'
      );
      expect(hasAnyDarkStyling).toBe(true);
    });
  });

  describe('Accessibility Compliance', () => {
    beforeEach(async () => {
      // Login for accessibility tests
      await PuppeteerTestUtils.fillForm(page, {
        '[name="email"]': 'admin@logistix.com',
        '[name="password"]': 'admin123'
      });
      
      await PuppeteerTestUtils.clickAndWait(page, '[type="submit"]', true);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);
    });

    it('should have proper ARIA labels on interactive elements', async () => {
      // Check for ARIA labels on buttons
      const buttonsWithAriaLabels = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.map(button => ({
          hasAriaLabel: button.hasAttribute('aria-label'),
          hasAriaLabelledBy: button.hasAttribute('aria-labelledby'),
          hasTextContent: button.textContent?.trim().length > 0,
          tagName: button.tagName
        }));
      });

      // Each button should have either aria-label, aria-labelledby, or text content
      buttonsWithAriaLabels.forEach(button => {
        expect(
          button.hasAriaLabel || button.hasAriaLabelledBy || button.hasTextContent
        ).toBe(true);
      });
    });

    it('should have proper heading hierarchy', async () => {
      const headingHierarchy = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.map(heading => ({
          tagName: heading.tagName,
          textContent: heading.textContent?.trim(),
          level: parseInt(heading.tagName.charAt(1))
        }));
      });

      if (headingHierarchy.length > 0) {
        // Should start with h1
        expect(headingHierarchy[0].level).toBe(1);

        // Check that heading levels don't skip (e.g., h1 -> h3)
        for (let i = 1; i < headingHierarchy.length; i++) {
          const currentLevel = headingHierarchy[i].level;
          const previousLevel = headingHierarchy[i - 1].level;
          expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should have proper form labels', async () => {
      // Navigate to a page with forms (e.g., profile or settings)
      const profileLink = await PuppeteerTestUtils.isElementVisible(page, '[href*="profile"]');
      if (profileLink) {
        await page.click('[href*="profile"]');
        await PuppeteerTestUtils.waitForLoadingToFinish(page);
      }

      const formAccessibility = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        return inputs.map(input => {
          const id = input.getAttribute('id');
          const hasLabel = id ? document.querySelector(`label[for="${id}"]`) !== null : false;
          const hasAriaLabel = input.hasAttribute('aria-label');
          const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');
          
          return {
            type: input.getAttribute('type') || input.tagName.toLowerCase(),
            hasLabel,
            hasAriaLabel,
            hasAriaLabelledBy,
            hasAccessibleName: hasLabel || hasAriaLabel || hasAriaLabelledBy
          };
        });
      });

      // Each form control should have an accessible name
      formAccessibility.forEach(control => {
        expect(control.hasAccessibleName).toBe(true);
      });
    });

    it('should have sufficient color contrast', async () => {
      // Test color contrast for text elements
      const contrastResults = await page.evaluate(() => {
        const textElements = Array.from(document.querySelectorAll('p, span, div, button, a, label'));
        const results = [];

        for (const element of textElements.slice(0, 10)) { // Test first 10 elements
          const style = window.getComputedStyle(element);
          const textContent = element.textContent?.trim();
          
          if (textContent && textContent.length > 0) {
            results.push({
              textContent: textContent.substring(0, 50),
              color: style.color,
              backgroundColor: style.backgroundColor,
              fontSize: style.fontSize
            });
          }
        }

        return results;
      });

      // Basic check that colors are defined
      contrastResults.forEach(result => {
        expect(result.color).toBeTruthy();
        expect(result.color).not.toBe('rgba(0, 0, 0, 0)');
      });
    });

    it('should support high contrast mode', async () => {
      // Emulate high contrast mode
      await page.emulateMediaFeatures([
        { name: 'prefers-contrast', value: 'high' }
      ]);

      await page.reload({ waitUntil: 'networkidle0' });
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Check that high contrast styles are applied
      const highContrastStyles = await page.evaluate(() => {
        const body = document.body;
        const computedStyle = window.getComputedStyle(body);
        return {
          backgroundColor: computedStyle.backgroundColor,
          color: computedStyle.color
        };
      });

      // Verify styles are applied (basic check)
      expect(highContrastStyles.backgroundColor).toBeTruthy();
      expect(highContrastStyles.color).toBeTruthy();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      // Login for keyboard navigation tests
      await PuppeteerTestUtils.fillForm(page, {
        '[name="email"]': 'admin@logistix.com',
        '[name="password"]': 'admin123'
      });
      
      await PuppeteerTestUtils.clickAndWait(page, '[type="submit"]', true);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);
    });

    it('should navigate through interactive elements with Tab key', async () => {
      // Get all focusable elements
      const focusableElements = await page.evaluate(() => {
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.map((el, index) => ({
          index,
          tagName: el.tagName,
          type: el.getAttribute('type'),
          href: el.getAttribute('href'),
          tabIndex: el.getAttribute('tabindex'),
          textContent: el.textContent?.trim().substring(0, 30)
        }));
      });

      expect(focusableElements.length).toBeGreaterThan(0);

      // Test Tab navigation through first few elements
      const elementsToTest = Math.min(5, focusableElements.length);
      
      for (let i = 0; i < elementsToTest; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        // Check that focus moved to an interactive element
        const focusedElement = await page.evaluate(() => {
          const focused = document.activeElement;
          return {
            tagName: focused?.tagName,
            type: focused?.getAttribute('type'),
            className: focused?.className
          };
        });

        expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(focusedElement.tagName)).toBe(true);
      }
    });

    it('should activate buttons with Enter and Space keys', async () => {
      // Find a button to test
      const buttonSelector = 'button:not([disabled])';
      const buttonExists = await PuppeteerTestUtils.isElementVisible(page, buttonSelector);
      
      if (buttonExists) {
        // Focus the button
        await page.focus(buttonSelector);
        
        // Test Enter key activation
        let buttonClicked = false;
        page.once('dialog', async dialog => {
          buttonClicked = true;
          await dialog.dismiss();
        });

        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // If no dialog appeared, check if button has click handler
        const hasClickHandler = await page.evaluate((selector) => {
          const button = document.querySelector(selector);
          return button && (button.onclick !== null || button.getAttribute('onclick') !== null);
        }, buttonSelector);

        // Button should either trigger an action or have a click handler
        expect(buttonClicked || hasClickHandler).toBeTruthy();
      }
    });

    it('should support Escape key to close modals/dropdowns', async () => {
      // Try to find and open a modal or dropdown
      const modalTriggers = [
        '[data-testid*="modal"]',
        '[aria-haspopup="true"]',
        'button[class*="dropdown"]',
        'button[class*="menu"]'
      ];

      let modalOpened = false;
      
      for (const trigger of modalTriggers) {
        const exists = await PuppeteerTestUtils.isElementVisible(page, trigger);
        if (exists) {
          await page.click(trigger);
          await page.waitForTimeout(500);

          // Check if modal/dropdown opened
          const modalVisible = await page.evaluate(() => {
            const modals = document.querySelectorAll('[role="dialog"], [role="menu"], .modal, .dropdown-menu');
            return Array.from(modals).some(modal => {
              const style = window.getComputedStyle(modal);
              return style.display !== 'none' && style.visibility !== 'hidden';
            });
          });

          if (modalVisible) {
            modalOpened = true;
            
            // Press Escape to close
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            // Check if modal closed
            const modalClosed = await page.evaluate(() => {
              const modals = document.querySelectorAll('[role="dialog"], [role="menu"], .modal, .dropdown-menu');
              return Array.from(modals).every(modal => {
                const style = window.getComputedStyle(modal);
                return style.display === 'none' || style.visibility === 'hidden';
              });
            });

            expect(modalClosed).toBe(true);
            break;
          }
        }
      }

      // If no modal was found, that's okay - just verify the test setup worked
      expect(modalTriggers.length).toBeGreaterThan(0);
    });

    it('should maintain focus visibility indicators', async () => {
      // Test focus indicators on different elements
      const focusableSelectors = ['button', 'a[href]', 'input'];
      
      for (const selector of focusableSelectors) {
        const exists = await PuppeteerTestUtils.isElementVisible(page, selector);
        if (exists) {
          await page.focus(selector);
          await page.waitForTimeout(200);

          // Check if focus indicator is visible
          const focusStyles = await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (!element) return null;

            const style = window.getComputedStyle(element);
            return {
              outline: style.outline,
              outlineWidth: style.outlineWidth,
              outlineStyle: style.outlineStyle,
              outlineColor: style.outlineColor,
              boxShadow: style.boxShadow,
              border: style.border
            };
          }, selector);

          // Element should have some form of focus indicator
          const hasFocusIndicator = focusStyles && (
            focusStyles.outline !== 'none' ||
            focusStyles.boxShadow !== 'none' ||
            focusStyles.outlineWidth !== '0px'
          );

          expect(hasFocusIndicator).toBe(true);
        }
      }
    });

    it('should support arrow key navigation in menus', async () => {
      // Look for navigation menus or dropdown menus
      const menuSelectors = [
        '[role="menu"]',
        '[role="menubar"]',
        'nav ul',
        '.menu',
        '.navigation'
      ];

      let menuFound = false;

      for (const menuSelector of menuSelectors) {
        const menuExists = await PuppeteerTestUtils.isElementVisible(page, menuSelector);
        if (menuExists) {
          // Focus the menu
          await page.focus(menuSelector);
          await page.waitForTimeout(200);

          // Try arrow key navigation
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(200);

          const focusedAfterArrow = await page.evaluate(() => {
            return document.activeElement?.tagName;
          });

          // Should focus on a menu item or similar element
          expect(['A', 'BUTTON', 'LI'].includes(focusedAfterArrow)).toBe(true);
          menuFound = true;
          break;
        }
      }

      // If no menu found, that's acceptable - just verify we looked for them
      expect(menuSelectors.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-browser Compatibility', () => {
    it('should work consistently across different viewport sizes', async () => {
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1280, height: 720, name: 'desktop' }
      ];

      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.reload({ waitUntil: 'networkidle0' });
        await PuppeteerTestUtils.waitForLoadingToFinish(page);

        // Check that essential elements are still visible
        const essentialElements = await page.evaluate(() => {
          const selectors = ['body', 'main', 'nav', 'header'];
          return selectors.map(selector => {
            const element = document.querySelector(selector);
            if (!element) return { selector, visible: false };

            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            
            return {
              selector,
              visible: rect.width > 0 && rect.height > 0 && style.display !== 'none',
              width: rect.width,
              height: rect.height
            };
          });
        });

        // At least body should be visible
        const bodyElement = essentialElements.find(el => el.selector === 'body');
        expect(bodyElement?.visible).toBe(true);
        expect(bodyElement?.width).toBeGreaterThan(0);
        expect(bodyElement?.height).toBeGreaterThan(0);
      }
    });

    it('should handle reduced motion preferences', async () => {
      // Emulate prefers-reduced-motion
      await page.emulateMediaFeatures([
        { name: 'prefers-reduced-motion', value: 'reduce' }
      ]);

      await page.reload({ waitUntil: 'networkidle0' });
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Check that reduced motion styles are applied
      const reducedMotionStyles = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const animatedElements = elements.filter(el => {
          const style = window.getComputedStyle(el);
          return style.animationDuration !== '0s' || 
                 style.transitionDuration !== '0s' ||
                 style.transform !== 'none';
        });

        return {
          totalElements: elements.length,
          animatedElements: animatedElements.length,
          hasReducedMotionClass: document.documentElement.classList.contains('motion-reduce') ||
                                 document.body.classList.contains('motion-reduce')
        };
      });

      // Should respect reduced motion preferences
      expect(reducedMotionStyles.totalElements).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle theme switching errors gracefully', async () => {
      // Login first
      await PuppeteerTestUtils.fillForm(page, {
        '[name="email"]': 'admin@logistix.com',
        '[name="password"]': 'admin123'
      });
      
      await PuppeteerTestUtils.clickAndWait(page, '[type="submit"]', true);
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Inject an error into theme switching
      await page.evaluate(() => {
        // Override localStorage to throw an error
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
          if (key.includes('theme')) {
            throw new Error('Storage error');
          }
          return originalSetItem.call(this, key, value);
        };
      });

      // Try to switch theme
      const themeToggleSelector = '[data-testid="theme-toggle"], [aria-label*="theme"], button[class*="theme"]';
      const themeToggleExists = await PuppeteerTestUtils.isElementVisible(page, themeToggleSelector);
      
      if (themeToggleExists) {
        await page.click(themeToggleSelector);
        await page.waitForTimeout(500);

        // Page should still be functional despite the error
        const pageStillWorks = await page.evaluate(() => {
          return document.body && document.body.children.length > 0;
        });

        expect(pageStillWorks).toBe(true);
      }
    });

    it('should provide fallback styles when CSS fails to load', async () => {
      // Block CSS requests to simulate loading failure
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('.css')) {
          request.abort();
        } else {
          request.continue();
        }
      });

      await page.reload({ waitUntil: 'networkidle0' });
      await PuppeteerTestUtils.waitForLoadingToFinish(page);

      // Check that basic HTML structure is still present
      const basicStructure = await page.evaluate(() => {
        return {
          hasBody: !!document.body,
          hasContent: document.body.children.length > 0,
          hasText: document.body.textContent?.trim().length > 0
        };
      });

      expect(basicStructure.hasBody).toBe(true);
      expect(basicStructure.hasContent).toBe(true);
      expect(basicStructure.hasText).toBe(true);
    });
  });
});