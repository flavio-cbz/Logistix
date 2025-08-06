import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { Page } from 'puppeteer'
import {
  setupPuppeteerSuite,
  teardownPuppeteerSuite,
  setupPuppeteerTest,
  teardownPuppeteerTest,
  PuppeteerTestUtils
} from './config'
import { SearchPage } from './page-objects/search-page'
import { NavigationPage } from './page-objects/navigation-page'
import { LoginPage } from './page-objects/login-page'

describe('Search and Navigation - Puppeteer UI Tests', () => {
  let page: Page
  let searchPage: SearchPage
  let navigationPage: NavigationPage
  let loginPage: LoginPage

  beforeAll(async () => {
    await setupPuppeteerSuite()
  })

  afterAll(async () => {
    await teardownPuppeteerSuite()
  })

  beforeEach(async () => {
    page = await setupPuppeteerTest('search-navigation')
    searchPage = new SearchPage(page)
    navigationPage = new NavigationPage(page)
    loginPage = new LoginPage(page)

    // Login before each test
    await loginPage.navigateToLogin()
    await loginPage.loginAsAdmin()
    await navigationPage.waitForPageLoad()
  })

  afterEach(async () => {
    await teardownPuppeteerTest(page)
  })

  describe('Global Search Functionality', () => {
    test('should open global search with click', async () => {
      await searchPage.openGlobalSearch()
      
      expect(await searchPage.isGlobalSearchOpen()).toBe(true)
      
      await searchPage.closeGlobalSearch()
      expect(await searchPage.isGlobalSearchOpen()).toBe(false)
    })

    test('should open global search with keyboard shortcut Ctrl+K', async () => {
      await searchPage.openGlobalSearchWithKeyboard()
      
      expect(await searchPage.isGlobalSearchOpen()).toBe(true)
      
      // Close with Escape
      await page.keyboard.press('Escape')
      expect(await searchPage.isGlobalSearchOpen()).toBe(false)
    })

    test('should open global search with keyboard shortcut Cmd+K on Mac', async () => {
      // Simulate Mac environment
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'platform', {
          value: 'MacIntel',
          configurable: true
        })
      })

      await searchPage.openGlobalSearchWithMacKeyboard()
      
      expect(await searchPage.isGlobalSearchOpen()).toBe(true)
      
      await searchPage.closeGlobalSearch()
    })

    test('should perform search and display results', async () => {
      // First create some test data by navigating to create forms
      await navigationPage.clickParcelles()
      await navigationPage.waitForPageLoad()
      
      // Now test search
      const results = await searchPage.performSearch('Parcelles')
      
      expect(results.length).toBeGreaterThan(0)
      
      // Should find the Parcelles page
      const pageResult = results.find(r => r.title.includes('Parcelles'))
      expect(pageResult).toBeDefined()
      expect(pageResult?.type).toBe('page')
    })

    test('should search for pages and navigate correctly', async () => {
      const results = await searchPage.performSearch('Tableau')
      
      expect(results.length).toBeGreaterThan(0)
      
      const dashboardResult = results.find(r => r.title.includes('Tableau'))
      expect(dashboardResult).toBeDefined()
      
      // Click on the dashboard result
      await searchPage.clickSearchResultByTitle('Tableau de bord')
      
      // Verify navigation
      const verification = await navigationPage.verifyNavigation('dashboard')
      expect(verification.urlMatches || verification.activeNavMatches).toBe(true)
    })

    test('should handle empty search gracefully', async () => {
      await searchPage.openGlobalSearch()
      await searchPage.enterSearchQuery('')
      await searchPage.waitForSearchResults()
      
      const resultsCount = await searchPage.getSearchResultsCount()
      expect(resultsCount).toBe(0)
      
      await searchPage.closeGlobalSearch()
    })

    test('should display no results message for non-matching queries', async () => {
      await searchPage.openGlobalSearch()
      await searchPage.enterSearchQuery('nonexistentquery12345')
      await searchPage.waitForSearchResults()
      
      const hasNoResults = await searchPage.hasNoResults()
      expect(hasNoResults).toBe(true)
      
      const noResultsMessage = await searchPage.getNoResultsMessage()
      expect(noResultsMessage).toContain('Aucun résultat')
      
      await searchPage.closeGlobalSearch()
    })

    test('should generate search suggestions', async () => {
      await searchPage.openGlobalSearch()
      await searchPage.enterSearchQuery('Tab')
      await searchPage.waitForSearchResults()
      
      const hasSuggestions = await searchPage.hasSuggestions()
      if (hasSuggestions) {
        const suggestions = await searchPage.getSuggestions()
        expect(suggestions.length).toBeGreaterThan(0)
        
        const tableauSuggestion = suggestions.find(s => s.includes('Tableau'))
        expect(tableauSuggestion).toBeDefined()
      }
      
      await searchPage.closeGlobalSearch()
    })

    test('should support keyboard navigation in search results', async () => {
      const results = await searchPage.performSearch('Pro')
      
      if (results.length > 1) {
        // Navigate with arrow keys
        await searchPage.navigateResultsWithArrows()
        
        const focusedIndex = await searchPage.getFocusedResult()
        expect(focusedIndex).toBeGreaterThanOrEqual(0)
        
        // Navigate up
        await searchPage.navigateResultsUp()
        
        // Select with Enter
        await searchPage.selectResultWithEnter()
        
        // Should navigate to the selected result
        await navigationPage.waitForPageLoad()
      }
    })

    test('should group search results by type', async () => {
      const results = await searchPage.performSearch('test')
      
      // Check if different result groups are present
      const hasPageResults = await searchPage.hasPageResults()
      const hasParcelleResults = await searchPage.hasParcelleResults()
      const hasProduitResults = await searchPage.hasProduitResults()
      
      // At least pages should be found
      expect(hasPageResults).toBe(true)
      
      if (hasPageResults) {
        const pageResults = await searchPage.getPageResults()
        expect(pageResults.length).toBeGreaterThan(0)
      }
    })

    test('should handle case insensitive search', async () => {
      const lowerCaseResults = await searchPage.performSearch('tableau')
      const upperCaseResults = await searchPage.performSearch('TABLEAU')
      
      expect(lowerCaseResults.length).toBeGreaterThan(0)
      expect(upperCaseResults.length).toBeGreaterThan(0)
      expect(lowerCaseResults.length).toBe(upperCaseResults.length)
    })

    test('should handle special characters in search', async () => {
      const specialQueries = ['test@#$%', 'test & more', 'test/path']
      
      for (const query of specialQueries) {
        await searchPage.openGlobalSearch()
        await searchPage.enterSearchQuery(query)
        await searchPage.waitForSearchResults()
        
        // Should not crash
        const isOpen = await searchPage.isGlobalSearchOpen()
        expect(isOpen).toBe(true)
        
        await searchPage.closeGlobalSearch()
      }
    })
  })

  describe('Navigation Menu and Breadcrumbs', () => {
    test('should navigate to all main pages', async () => {
      const pages = ['dashboard', 'parcelles', 'produits', 'statistiques', 'analyse']
      
      for (const pageName of pages) {
        await navigationPage.navigateToPage(pageName)
        
        const verification = await navigationPage.verifyNavigation(pageName)
        expect(verification.urlMatches || verification.activeNavMatches).toBe(true)
        
        // Check that the correct nav item is active
        const isActive = await navigationPage.isNavItemActive(pageName)
        expect(isActive).toBe(true)
      }
    })

    test('should display correct breadcrumbs', async () => {
      await navigationPage.clickParcelles()
      await navigationPage.waitForPageLoad()
      
      const breadcrumbs = await navigationPage.getBreadcrumbs()
      expect(breadcrumbs.length).toBeGreaterThan(0)
      
      // Should contain current page
      const currentBreadcrumb = await navigationPage.getCurrentBreadcrumb()
      expect(currentBreadcrumb.toLowerCase()).toContain('parcelles')
    })

    test('should navigate using breadcrumbs', async () => {
      await navigationPage.clickProduits()
      await navigationPage.waitForPageLoad()
      
      const breadcrumbs = await navigationPage.getBreadcrumbs()
      
      if (breadcrumbs.length > 1) {
        // Click on first breadcrumb (should be home/dashboard)
        await navigationPage.clickBreadcrumb(0)
        
        const verification = await navigationPage.verifyNavigation('dashboard')
        expect(verification.urlMatches || verification.activeNavMatches).toBe(true)
      }
    })

    test('should toggle sidebar correctly', async () => {
      const initialSidebarState = await navigationPage.isSidebarVisible()
      
      await navigationPage.toggleSidebar()
      await new Promise(resolve => setTimeout(resolve, 500)) // Wait for animation
      
      const newSidebarState = await navigationPage.isSidebarVisible()
      expect(newSidebarState).not.toBe(initialSidebarState)
    })

    test('should handle user menu interactions', async () => {
      await navigationPage.openUserMenu()
      
      const isOpen = await navigationPage.isUserMenuOpen()
      expect(isOpen).toBe(true)
      
      await navigationPage.closeUserMenu()
      
      const isClosed = !await navigationPage.isUserMenuOpen()
      expect(isClosed).toBe(true)
    })

    test('should toggle theme correctly', async () => {
      const initialTheme = await navigationPage.getCurrentTheme()
      
      await navigationPage.toggleTheme()
      await new Promise(resolve => setTimeout(resolve, 500)) // Wait for theme change
      
      const newTheme = await navigationPage.getCurrentTheme()
      expect(newTheme).not.toBe(initialTheme)
      
      // Toggle back
      await navigationPage.toggleTheme()
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const finalTheme = await navigationPage.getCurrentTheme()
      expect(finalTheme).toBe(initialTheme)
    })

    test('should maintain navigation state across page reloads', async () => {
      await navigationPage.clickParcelles()
      await navigationPage.waitForPageLoad()
      
      const beforeReload = await navigationPage.getActiveNavItem()
      
      await page.reload({ waitUntil: 'networkidle0' })
      await navigationPage.waitForPageLoad()
      
      const afterReload = await navigationPage.getActiveNavItem()
      expect(afterReload).toBe(beforeReload)
    })
  })

  describe('Keyboard Shortcuts and Accessibility', () => {
    test('should support keyboard navigation in main menu', async () => {
      const keyboardTest = await navigationPage.testKeyboardNavigation()
      
      expect(keyboardTest.canNavigateWithTab).toBe(true)
      expect(keyboardTest.focusVisible).toBe(true)
    })

    test('should have proper accessibility attributes', async () => {
      const accessibility = await navigationPage.checkNavigationAccessibility()
      
      expect(accessibility.navHasRole).toBe(true)
      expect(accessibility.linksHaveAccessibleNames).toBe(true)
      expect(accessibility.keyboardNavigable).toBe(true)
    })

    test('should support skip links for accessibility', async () => {
      const hasSkipLink = await navigationPage.hasSkipLink()
      
      if (hasSkipLink) {
        await navigationPage.useSkipLink()
        
        // Should focus on main content
        const focusedElement = await navigationPage.getFocusedElement()
        expect(focusedElement).toContain('main')
      }
    })

    test('should check search accessibility', async () => {
      const accessibility = await searchPage.checkSearchAccessibility()
      
      expect(accessibility.searchInputHasLabel).toBe(true)
      expect(accessibility.hasKeyboardShortcut).toBe(true)
    })

    test('should support keyboard shortcuts in search', async () => {
      // Test Ctrl+K shortcut
      await searchPage.openGlobalSearchWithKeyboard()
      expect(await searchPage.isGlobalSearchOpen()).toBe(true)
      
      // Test Escape to close
      await page.keyboard.press('Escape')
      expect(await searchPage.isGlobalSearchOpen()).toBe(false)
    })

    test('should handle focus management in search dialog', async () => {
      await searchPage.openGlobalSearch()
      
      // Focus should be on search input
      const focusedElement = await navigationPage.getFocusedElement()
      expect(focusedElement.toLowerCase()).toContain('input')
      
      await searchPage.closeGlobalSearch()
    })
  })

  describe('Mobile Navigation and Responsive Design', () => {
    test('should adapt navigation for mobile devices', async () => {
      const responsiveTest = await navigationPage.testResponsiveNavigation()
      
      // Desktop should show sidebar
      expect(responsiveTest.desktop.sidebarVisible).toBe(true)
      expect(responsiveTest.desktop.mobileMenuVisible).toBe(false)
      
      // Mobile should show mobile menu button
      expect(responsiveTest.mobile.mobileMenuVisible).toBe(true)
    })

    test('should handle mobile menu interactions', async () => {
      await PuppeteerTestUtils.emulateDevice(page, 'mobile')
      await page.reload({ waitUntil: 'networkidle0' })
      await navigationPage.waitForPageLoad()
      
      // Open mobile menu
      await navigationPage.openMobileMenu()
      expect(await navigationPage.isMobileMenuOpen()).toBe(true)
      
      // Close mobile menu
      await navigationPage.closeMobileMenu()
      expect(await navigationPage.isMobileMenuOpen()).toBe(false)
    })

    test('should optimize search for mobile', async () => {
      const mobileSearchTest = await searchPage.testMobileSearch()
      
      expect(mobileSearchTest.isMobile).toBe(true)
      expect(mobileSearchTest.searchTriggerVisible).toBe(true)
      
      if (mobileSearchTest.searchDialog) {
        expect(mobileSearchTest.searchDialog.fitsViewport).toBe(true)
      }
    })

    test('should handle touch interactions on mobile', async () => {
      await PuppeteerTestUtils.emulateDevice(page, 'mobile')
      await page.reload({ waitUntil: 'networkidle0' })
      await navigationPage.waitForPageLoad()
      
      // Test touch navigation
      await navigationPage.clickDashboard()
      
      const verification = await navigationPage.verifyNavigation('dashboard')
      expect(verification.urlMatches || verification.activeNavMatches).toBe(true)
    })
  })

  describe('Performance and Error Handling', () => {
    test('should measure search performance', async () => {
      const performance = await searchPage.measureSearchPerformance('test')
      
      expect(performance.searchOpenTime).toBeLessThan(1000) // Should open within 1 second
      expect(performance.searchTime).toBeLessThan(2000) // Should search within 2 seconds
      expect(performance.totalTime).toBeLessThan(3000) // Total should be under 3 seconds
    })

    test('should measure navigation performance', async () => {
      const performance = await navigationPage.measureNavigationPerformance('parcelles')
      
      expect(performance.navigationTime).toBeLessThan(3000) // Should navigate within 3 seconds
    })

    test('should handle search errors gracefully', async () => {
      const errors = await searchPage.handleSearchErrors()
      
      // Should not have critical errors
      const criticalErrors = errors.filter(error => 
        error.includes('XSS') || error.includes('crash') || error.includes('exception')
      )
      expect(criticalErrors.length).toBe(0)
    })

    test('should handle navigation errors gracefully', async () => {
      const errors = await navigationPage.handleNavigationErrors()
      
      // Should not have broken links
      const brokenLinks = errors.filter(error => error.includes('Broken link'))
      expect(brokenLinks.length).toBe(0)
    })

    test('should handle network failures gracefully', async () => {
      // Simulate network failure
      await page.setOfflineMode(true)
      
      try {
        await searchPage.openGlobalSearch()
        await searchPage.enterSearchQuery('test')
        
        // Should handle gracefully without crashing
        const isOpen = await searchPage.isGlobalSearchOpen()
        expect(isOpen).toBe(true)
        
        await searchPage.closeGlobalSearch()
      } finally {
        await page.setOfflineMode(false)
      }
    })
  })

  describe('Complete Workflow Tests', () => {
    test('should complete full navigation workflow', async () => {
      const workflowTest = await navigationPage.testCompleteNavigationWorkflow()
      
      // All main pages should be navigable
      const successfulNavigations = workflowTest.navigationResults.filter(r => r.success)
      expect(successfulNavigations.length).toBeGreaterThan(3) // At least 4 pages should work
      
      // Core features should work
      expect(workflowTest.themeToggleWorks).toBe(true)
    })

    test('should complete search to navigation workflow', async () => {
      // Search for a page
      const results = await searchPage.performSearch('Produits')
      expect(results.length).toBeGreaterThan(0)
      
      // Navigate to the page via search
      await searchPage.clickSearchResultByTitle('Produits')
      
      // Verify we're on the correct page
      const verification = await navigationPage.verifyNavigation('produits')
      expect(verification.urlMatches || verification.activeNavMatches).toBe(true)
      
      // Use breadcrumbs to navigate back
      const breadcrumbs = await navigationPage.getBreadcrumbs()
      if (breadcrumbs.length > 1) {
        await navigationPage.clickBreadcrumb(0)
        
        const homeVerification = await navigationPage.verifyNavigation('dashboard')
        expect(homeVerification.urlMatches || homeVerification.activeNavMatches).toBe(true)
      }
    })

    test('should handle complex user journey', async () => {
      // 1. Start at dashboard
      await navigationPage.clickDashboard()
      await navigationPage.waitForPageLoad()
      
      // 2. Search for parcelles
      const searchResults = await searchPage.performSearch('Parcelles')
      expect(searchResults.length).toBeGreaterThan(0)
      
      // 3. Navigate to parcelles via search
      await searchPage.clickSearchResultByTitle('Parcelles')
      
      // 4. Verify navigation
      let verification = await navigationPage.verifyNavigation('parcelles')
      expect(verification.urlMatches || verification.activeNavMatches).toBe(true)
      
      // 5. Use main navigation to go to products
      await navigationPage.clickProduits()
      
      // 6. Verify navigation
      verification = await navigationPage.verifyNavigation('produits')
      expect(verification.urlMatches || verification.activeNavMatches).toBe(true)
      
      // 7. Toggle theme
      const initialTheme = await navigationPage.getCurrentTheme()
      await navigationPage.toggleTheme()
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const newTheme = await navigationPage.getCurrentTheme()
      expect(newTheme).not.toBe(initialTheme)
      
      // 8. Search again with new theme
      const themeSearchResults = await searchPage.performSearch('Statistiques')
      expect(themeSearchResults.length).toBeGreaterThan(0)
      
      // 9. Navigate to statistics
      await searchPage.clickSearchResultByTitle('Statistiques')
      
      // 10. Final verification
      verification = await navigationPage.verifyNavigation('statistiques')
      expect(verification.urlMatches || verification.activeNavMatches).toBe(true)
    })

    test('should maintain state across browser refresh', async () => {
      // Navigate to a specific page
      await navigationPage.clickParcelles()
      await navigationPage.waitForPageLoad()
      
      // Change theme
      await navigationPage.toggleTheme()
      await new Promise(resolve => setTimeout(resolve, 500))
      const themeBeforeRefresh = await navigationPage.getCurrentTheme()
      
      // Refresh browser
      await page.reload({ waitUntil: 'networkidle0' })
      await navigationPage.waitForPageLoad()
      
      // Verify state is maintained
      const verification = await navigationPage.verifyNavigation('parcelles')
      expect(verification.urlMatches || verification.activeNavMatches).toBe(true)
      
      const themeAfterRefresh = await navigationPage.getCurrentTheme()
      expect(themeAfterRefresh).toBe(themeBeforeRefresh)
    })
  })
})