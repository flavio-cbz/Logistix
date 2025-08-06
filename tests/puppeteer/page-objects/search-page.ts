import { Page } from 'puppeteer'
import { BasePage } from './base-page'

export class SearchPage extends BasePage {
  // Selectors
  private selectors = {
    // Global search
    globalSearchTrigger: '[data-testid="global-search-trigger"], .global-search-trigger, button:has-text("Recherche")',
    globalSearchDialog: '[data-testid="global-search-dialog"], .global-search-dialog, [role="dialog"]',
    globalSearchInput: '[data-testid="global-search-input"], .global-search-input, input[placeholder*="Rechercher"]',
    searchResults: '[data-testid="search-results"], .search-results, [role="listbox"]',
    searchResultItem: '[data-testid="search-result-item"], .search-result-item, [role="option"]',
    searchResultTitle: '[data-testid="search-result-title"], .search-result-title',
    searchResultDescription: '[data-testid="search-result-description"], .search-result-description',
    searchResultType: '[data-testid="search-result-type"], .search-result-type',
    noResults: '[data-testid="no-results"], .no-results, .empty-state',
    searchSuggestions: '[data-testid="search-suggestions"], .search-suggestions',
    suggestionItem: '[data-testid="suggestion-item"], .suggestion-item',
    
    // Search groups
    pagesGroup: '[data-testid="pages-group"], .pages-group, [data-group="pages"]',
    parcellesGroup: '[data-testid="parcelles-group"], .parcelles-group, [data-group="parcelles"]',
    produitsGroup: '[data-testid="produits-group"], .produits-group, [data-group="produits"]',
    
    // Keyboard shortcuts
    keyboardShortcut: '[data-testid="keyboard-shortcut"], .keyboard-shortcut, kbd',
    
    // Loading states
    searchLoading: '[data-testid="search-loading"], .search-loading, .loading',
    
    // Close button
    closeButton: '[data-testid="close-search"], .close-search, button[aria-label*="Close"]'
  }

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl)
  }

  getPageIdentifier(): string {
    return 'search-page'
  }

  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.selectors.globalSearchTrigger)
  }

  // Global search interactions
  async openGlobalSearch() {
    await this.click(this.selectors.globalSearchTrigger)
    await this.waitForSelector(this.selectors.globalSearchDialog)
  }

  async openGlobalSearchWithKeyboard() {
    await this.page.keyboard.down('Control')
    await this.page.keyboard.press('KeyK')
    await this.page.keyboard.up('Control')
    await this.waitForSelector(this.selectors.globalSearchDialog)
  }

  async openGlobalSearchWithMacKeyboard() {
    await this.page.keyboard.down('Meta')
    await this.page.keyboard.press('KeyK')
    await this.page.keyboard.up('Meta')
    await this.waitForSelector(this.selectors.globalSearchDialog)
  }

  async closeGlobalSearch() {
    if (await this.isVisible(this.selectors.closeButton)) {
      await this.click(this.selectors.closeButton)
    } else {
      await this.page.keyboard.press('Escape')
    }
    await this.waitForSelector(this.selectors.globalSearchDialog, 1000)
  }

  async isGlobalSearchOpen(): Promise<boolean> {
    return await this.isVisible(this.selectors.globalSearchDialog)
  }

  // Search input interactions
  async enterSearchQuery(query: string) {
    await this.waitForSelector(this.selectors.globalSearchInput)
    await this.clear(this.selectors.globalSearchInput)
    await this.type(this.selectors.globalSearchInput, query)
  }

  async getSearchQuery(): Promise<string> {
    return await this.getValue(this.selectors.globalSearchInput)
  }

  async clearSearchQuery() {
    await this.clear(this.selectors.globalSearchInput)
  }

  // Search results interactions
  async getSearchResults(): Promise<Array<{
    title: string
    description: string
    type: string
    index: number
  }>> {
    await this.waitForSelector(this.selectors.searchResults)
    
    const results = await this.page.$$eval(this.selectors.searchResultItem, (items) => {
      return items.map((item, index) => {
        const titleEl = item.querySelector('[data-testid="search-result-title"], .search-result-title')
        const descEl = item.querySelector('[data-testid="search-result-description"], .search-result-description')
        const typeEl = item.querySelector('[data-testid="search-result-type"], .search-result-type')
        
        return {
          title: titleEl?.textContent?.trim() || '',
          description: descEl?.textContent?.trim() || '',
          type: typeEl?.textContent?.trim() || '',
          index
        }
      })
    })

    return results
  }

  async getSearchResultsCount(): Promise<number> {
    if (await this.isVisible(this.selectors.searchResultItem)) {
      return await this.page.$$eval(this.selectors.searchResultItem, items => items.length)
    }
    return 0
  }

  async clickSearchResult(index: number) {
    const resultSelector = `${this.selectors.searchResultItem}:nth-child(${index + 1})`
    await this.click(resultSelector, true)
  }

  async clickSearchResultByTitle(title: string) {
    const results = await this.getSearchResults()
    const targetResult = results.find(r => r.title.includes(title))
    
    if (targetResult) {
      await this.clickSearchResult(targetResult.index)
    } else {
      throw new Error(`Search result with title "${title}" not found`)
    }
  }

  async hasNoResults(): Promise<boolean> {
    return await this.isVisible(this.selectors.noResults)
  }

  async getNoResultsMessage(): Promise<string> {
    if (await this.hasNoResults()) {
      return await this.getText(this.selectors.noResults)
    }
    return ''
  }

  // Search groups
  async hasPageResults(): Promise<boolean> {
    return await this.isVisible(this.selectors.pagesGroup)
  }

  async hasParcelleResults(): Promise<boolean> {
    return await this.isVisible(this.selectors.parcellesGroup)
  }

  async hasProduitResults(): Promise<boolean> {
    return await this.isVisible(this.selectors.produitsGroup)
  }

  async getPageResults(): Promise<Array<{ title: string; description: string }>> {
    if (await this.hasPageResults()) {
      return await this.page.$$eval(
        `${this.selectors.pagesGroup} ${this.selectors.searchResultItem}`,
        (items) => {
          return items.map(item => ({
            title: item.querySelector('[data-testid="search-result-title"], .search-result-title')?.textContent?.trim() || '',
            description: item.querySelector('[data-testid="search-result-description"], .search-result-description')?.textContent?.trim() || ''
          }))
        }
      )
    }
    return []
  }

  async getParcelleResults(): Promise<Array<{ title: string; description: string }>> {
    if (await this.hasParcelleResults()) {
      return await this.page.$$eval(
        `${this.selectors.parcellesGroup} ${this.selectors.searchResultItem}`,
        (items) => {
          return items.map(item => ({
            title: item.querySelector('[data-testid="search-result-title"], .search-result-title')?.textContent?.trim() || '',
            description: item.querySelector('[data-testid="search-result-description"], .search-result-description')?.textContent?.trim() || ''
          }))
        }
      )
    }
    return []
  }

  async getProduitResults(): Promise<Array<{ title: string; description: string }>> {
    if (await this.hasProduitResults()) {
      return await this.page.$$eval(
        `${this.selectors.produitsGroup} ${this.selectors.searchResultItem}`,
        (items) => {
          return items.map(item => ({
            title: item.querySelector('[data-testid="search-result-title"], .search-result-title')?.textContent?.trim() || '',
            description: item.querySelector('[data-testid="search-result-description"], .search-result-description')?.textContent?.trim() || ''
          }))
        }
      )
    }
    return []
  }

  // Search suggestions
  async hasSuggestions(): Promise<boolean> {
    return await this.isVisible(this.selectors.searchSuggestions)
  }

  async getSuggestions(): Promise<string[]> {
    if (await this.hasSuggestions()) {
      return await this.page.$$eval(this.selectors.suggestionItem, (items) => {
        return items.map(item => item.textContent?.trim() || '')
      })
    }
    return []
  }

  async clickSuggestion(index: number) {
    const suggestionSelector = `${this.selectors.suggestionItem}:nth-child(${index + 1})`
    await this.click(suggestionSelector)
  }

  // Keyboard navigation
  async navigateResultsWithArrows() {
    await this.page.keyboard.press('ArrowDown')
  }

  async navigateResultsUp() {
    await this.page.keyboard.press('ArrowUp')
  }

  async selectResultWithEnter() {
    await this.page.keyboard.press('Enter')
    await this.waitForNavigation()
  }

  async getFocusedResult(): Promise<number> {
    const focusedIndex = await this.page.evaluate(() => {
      const results = document.querySelectorAll('[data-testid="search-result-item"], .search-result-item')
      for (let i = 0; i < results.length; i++) {
        if (results[i].matches(':focus, [aria-selected="true"], .focused')) {
          return i
        }
      }
      return -1
    })
    return focusedIndex
  }

  // Loading states
  async isSearchLoading(): Promise<boolean> {
    return await this.isVisible(this.selectors.searchLoading)
  }

  async waitForSearchResults(timeout = 5000) {
    // Wait for loading to finish
    if (await this.isSearchLoading()) {
      await this.waitForSelector(this.selectors.searchLoading, timeout)
    }
    
    // Wait for results or no results message
    await this.page.waitForFunction(() => {
      const results = document.querySelector('[data-testid="search-results"], .search-results')
      const noResults = document.querySelector('[data-testid="no-results"], .no-results')
      return results || noResults
    }, { timeout })
  }

  // Search workflows
  async performSearch(query: string): Promise<Array<{
    title: string
    description: string
    type: string
    index: number
  }>> {
    await this.openGlobalSearch()
    await this.enterSearchQuery(query)
    await this.waitForSearchResults()
    return await this.getSearchResults()
  }

  async performSearchWithKeyboard(query: string): Promise<Array<{
    title: string
    description: string
    type: string
    index: number
  }>> {
    await this.openGlobalSearchWithKeyboard()
    await this.enterSearchQuery(query)
    await this.waitForSearchResults()
    return await this.getSearchResults()
  }

  async searchAndSelectFirst(query: string) {
    const results = await this.performSearch(query)
    if (results.length > 0) {
      await this.clickSearchResult(0)
    } else {
      throw new Error(`No search results found for query: ${query}`)
    }
  }

  async searchAndSelectByTitle(query: string, title: string) {
    await this.performSearch(query)
    await this.clickSearchResultByTitle(title)
  }

  // Accessibility testing
  async checkSearchAccessibility() {
    const accessibility = {
      hasKeyboardShortcut: false,
      searchInputHasLabel: false,
      resultsHaveRoles: false,
      keyboardNavigable: false
    }

    // Check keyboard shortcut display
    accessibility.hasKeyboardShortcut = await this.isVisible(this.selectors.keyboardShortcut)

    // Check search input accessibility
    accessibility.searchInputHasLabel = await this.page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement
      return input ? (
        input.labels?.length > 0 || 
        input.getAttribute('aria-label') !== null ||
        input.getAttribute('placeholder') !== null
      ) : false
    })

    // Check results have proper roles
    accessibility.resultsHaveRoles = await this.page.evaluate(() => {
      const results = document.querySelector('[role="listbox"]')
      const options = document.querySelectorAll('[role="option"]')
      return results !== null && options.length > 0
    })

    // Test keyboard navigation
    try {
      await this.openGlobalSearch()
      await this.enterSearchQuery('test')
      await this.waitForSearchResults()
      
      if (await this.getSearchResultsCount() > 0) {
        await this.navigateResultsWithArrows()
        const focusedIndex = await this.getFocusedResult()
        accessibility.keyboardNavigable = focusedIndex >= 0
      }
      
      await this.closeGlobalSearch()
    } catch (error) {
      // Keyboard navigation test failed
    }

    return accessibility
  }

  // Performance testing
  async measureSearchPerformance(query: string) {
    const startTime = Date.now()
    
    await this.openGlobalSearch()
    const searchOpenTime = Date.now() - startTime
    
    const searchStartTime = Date.now()
    await this.enterSearchQuery(query)
    await this.waitForSearchResults()
    const searchTime = Date.now() - searchStartTime
    
    const resultsCount = await this.getSearchResultsCount()
    
    await this.closeGlobalSearch()
    
    return {
      searchOpenTime,
      searchTime,
      totalTime: Date.now() - startTime,
      resultsCount
    }
  }

  // Mobile testing
  async testMobileSearch() {
    await this.emulateDevice('mobile')
    await this.reload()
    
    const isMobileOptimized = await this.page.evaluate(() => {
      const searchTrigger = document.querySelector('[data-testid="global-search-trigger"], .global-search-trigger')
      const viewport = window.innerWidth
      
      return {
        viewport,
        searchTriggerVisible: searchTrigger ? window.getComputedStyle(searchTrigger).display !== 'none' : false,
        isMobile: viewport <= 768
      }
    })

    // Test mobile search interaction
    if (isMobileOptimized.searchTriggerVisible) {
      await this.openGlobalSearch()
      const searchDialogMobile = await this.page.evaluate(() => {
        const dialog = document.querySelector('[data-testid="global-search-dialog"], .global-search-dialog')
        if (!dialog) return null
        
        const rect = dialog.getBoundingClientRect()
        const viewport = { width: window.innerWidth, height: window.innerHeight }
        
        return {
          width: rect.width,
          height: rect.height,
          fitsViewport: rect.width <= viewport.width * 0.95 && rect.height <= viewport.height * 0.95
        }
      })
      
      await this.closeGlobalSearch()
      
      return {
        ...isMobileOptimized,
        searchDialog: searchDialogMobile
      }
    }

    return isMobileOptimized
  }

  // Error handling
  async handleSearchErrors() {
    const errors = []

    // Test empty search
    try {
      await this.openGlobalSearch()
      await this.enterSearchQuery('')
      await this.waitForSearchResults()
      
      const hasResults = await this.getSearchResultsCount() > 0
      const hasNoResults = await this.hasNoResults()
      
      if (hasResults && !hasNoResults) {
        errors.push('Empty search should not return results')
      }
      
      await this.closeGlobalSearch()
    } catch (error) {
      errors.push(`Empty search error: ${error.message}`)
    }

    // Test invalid characters
    try {
      const invalidQuery = '<script>alert("xss")</script>'
      await this.openGlobalSearch()
      await this.enterSearchQuery(invalidQuery)
      await this.waitForSearchResults()
      
      // Should handle gracefully without XSS
      const currentQuery = await this.getSearchQuery()
      if (currentQuery.includes('<script>')) {
        errors.push('Search input vulnerable to XSS')
      }
      
      await this.closeGlobalSearch()
    } catch (error) {
      errors.push(`Invalid character test error: ${error.message}`)
    }

    return errors
  }
}