import { Page } from 'puppeteer'
import { BasePage } from './base-page'

export class NavigationPage extends BasePage {
  // Selectors
  private selectors = {
    // Main navigation
    mainNav: '[data-testid="main-nav"], .main-nav, nav[role="navigation"]',
    navItem: '[data-testid="nav-item"], .nav-item, nav a',
    activeNavItem: '[data-testid="nav-item-active"], .nav-item-active, nav a.active, nav a[aria-current="page"]',
    
    // Sidebar navigation
    sidebar: '[data-testid="sidebar"], .sidebar, aside',
    sidebarToggle: '[data-testid="sidebar-toggle"], .sidebar-toggle, button[aria-label*="menu"]',
    sidebarCollapsed: '[data-testid="sidebar-collapsed"], .sidebar-collapsed',
    
    // Navigation items
    dashboardLink: '[data-testid="nav-dashboard"], a[href*="dashboard"], a:has-text("Tableau de bord")',
    parcellesLink: '[data-testid="nav-parcelles"], a[href*="parcelles"], a:has-text("Parcelles")',
    produitsLink: '[data-testid="nav-produits"], a[href*="produits"], a:has-text("Produits")',
    statistiquesLink: '[data-testid="nav-statistiques"], a[href*="statistiques"], a:has-text("Statistiques")',
    analyseLink: '[data-testid="nav-analyse"], a[href*="analyse"], a:has-text("Analyse")',
    profileLink: '[data-testid="nav-profile"], a[href*="profile"], a:has-text("Profil")',
    
    // Breadcrumbs
    breadcrumbs: '[data-testid="breadcrumbs"], .breadcrumbs, nav[aria-label*="breadcrumb"]',
    breadcrumbItem: '[data-testid="breadcrumb-item"], .breadcrumb-item, .breadcrumb > *',
    breadcrumbSeparator: '[data-testid="breadcrumb-separator"], .breadcrumb-separator',
    breadcrumbCurrent: '[data-testid="breadcrumb-current"], .breadcrumb-current, [aria-current="page"]',
    
    // Mobile navigation
    mobileMenuButton: '[data-testid="mobile-menu"], .mobile-menu, button[aria-label*="menu"]',
    mobileNav: '[data-testid="mobile-nav"], .mobile-nav',
    mobileNavOverlay: '[data-testid="mobile-nav-overlay"], .mobile-nav-overlay, .overlay',
    
    // User menu
    userMenu: '[data-testid="user-menu"], .user-menu',
    userMenuTrigger: '[data-testid="user-menu-trigger"], .user-menu-trigger, button[aria-haspopup="menu"]',
    userMenuDropdown: '[data-testid="user-menu-dropdown"], .user-menu-dropdown, [role="menu"]',
    logoutButton: '[data-testid="logout-button"], .logout-button, button:has-text("Déconnexion")',
    
    // Theme toggle
    themeToggle: '[data-testid="theme-toggle"], .theme-toggle',
    
    // Loading states
    navLoading: '[data-testid="nav-loading"], .nav-loading, .loading',
    
    // Skip links
    skipLink: '[data-testid="skip-link"], .skip-link, a[href="#main"]'
  }

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl)
  }

  getPageIdentifier(): string {
    return 'navigation-page'
  }

  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.selectors.mainNav)
  }

  // Main navigation interactions
  async clickDashboard() {
    await this.click(this.selectors.dashboardLink, true)
  }

  async clickParcelles() {
    await this.click(this.selectors.parcellesLink, true)
  }

  async clickProduits() {
    await this.click(this.selectors.produitsLink, true)
  }

  async clickStatistiques() {
    await this.click(this.selectors.statistiquesLink, true)
  }

  async clickAnalyse() {
    await this.click(this.selectors.analyseLink, true)
  }

  async clickProfile() {
    await this.click(this.selectors.profileLink, true)
  }

  async getActiveNavItem(): Promise<string> {
    if (await this.isVisible(this.selectors.activeNavItem)) {
      return await this.getText(this.selectors.activeNavItem)
    }
    return ''
  }

  async isNavItemActive(itemText: string): Promise<boolean> {
    const activeItem = await this.getActiveNavItem()
    return activeItem.toLowerCase().includes(itemText.toLowerCase())
  }

  // Sidebar interactions
  async toggleSidebar() {
    if (await this.isVisible(this.selectors.sidebarToggle)) {
      await this.click(this.selectors.sidebarToggle)
    }
  }

  async isSidebarCollapsed(): Promise<boolean> {
    return await this.isVisible(this.selectors.sidebarCollapsed)
  }

  async isSidebarVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.sidebar)
  }

  // Breadcrumb interactions
  async getBreadcrumbs(): Promise<string[]> {
    if (await this.isVisible(this.selectors.breadcrumbs)) {
      return await this.page.$$eval(this.selectors.breadcrumbItem, (items) => {
        return items.map(item => item.textContent?.trim() || '').filter(text => text !== '')
      })
    }
    return []
  }

  async getCurrentBreadcrumb(): Promise<string> {
    if (await this.isVisible(this.selectors.breadcrumbCurrent)) {
      return await this.getText(this.selectors.breadcrumbCurrent)
    }
    return ''
  }

  async clickBreadcrumb(index: number) {
    const breadcrumbSelector = `${this.selectors.breadcrumbItem}:nth-child(${index + 1})`
    if (await this.isVisible(breadcrumbSelector)) {
      await this.click(breadcrumbSelector, true)
    }
  }

  async clickBreadcrumbByText(text: string) {
    const breadcrumbs = await this.getBreadcrumbs()
    const targetIndex = breadcrumbs.findIndex(b => b.includes(text))
    
    if (targetIndex >= 0) {
      await this.clickBreadcrumb(targetIndex)
    } else {
      throw new Error(`Breadcrumb with text "${text}" not found`)
    }
  }

  // Mobile navigation
  async openMobileMenu() {
    if (await this.isVisible(this.selectors.mobileMenuButton)) {
      await this.click(this.selectors.mobileMenuButton)
      await this.waitForSelector(this.selectors.mobileNav)
    }
  }

  async closeMobileMenu() {
    if (await this.isVisible(this.selectors.mobileNavOverlay)) {
      await this.click(this.selectors.mobileNavOverlay)
    } else if (await this.isVisible(this.selectors.mobileMenuButton)) {
      await this.click(this.selectors.mobileMenuButton)
    }
    
    await this.waitForSelector(this.selectors.mobileNav, 1000)
  }

  async isMobileMenuOpen(): Promise<boolean> {
    return await this.isVisible(this.selectors.mobileNav)
  }

  // User menu interactions
  async openUserMenu() {
    if (await this.isVisible(this.selectors.userMenuTrigger)) {
      await this.click(this.selectors.userMenuTrigger)
      await this.waitForSelector(this.selectors.userMenuDropdown)
    }
  }

  async closeUserMenu() {
    // Click outside to close
    await this.page.click('body')
    await this.waitForSelector(this.selectors.userMenuDropdown, 1000)
  }

  async isUserMenuOpen(): Promise<boolean> {
    return await this.isVisible(this.selectors.userMenuDropdown)
  }

  async logout() {
    await this.openUserMenu()
    await this.click(this.selectors.logoutButton, true)
  }

  // Theme toggle
  async toggleTheme() {
    if (await this.isVisible(this.selectors.themeToggle)) {
      await this.click(this.selectors.themeToggle)
    }
  }

  async getCurrentTheme(): Promise<string> {
    return await this.page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    })
  }

  // Navigation workflows
  async navigateToPage(pageName: string) {
    const navigationMap: Record<string, () => Promise<void>> = {
      'dashboard': () => this.clickDashboard(),
      'parcelles': () => this.clickParcelles(),
      'produits': () => this.clickProduits(),
      'statistiques': () => this.clickStatistiques(),
      'analyse': () => this.clickAnalyse(),
      'profile': () => this.clickProfile()
    }

    const navigationFn = navigationMap[pageName.toLowerCase()]
    if (navigationFn) {
      await navigationFn()
    } else {
      throw new Error(`Unknown page: ${pageName}`)
    }
  }

  async verifyNavigation(expectedPage: string) {
    // Wait for navigation to complete
    await this.waitForPageLoad()
    
    // Check URL
    const currentUrl = this.getCurrentUrl()
    const urlMatches = currentUrl.includes(expectedPage.toLowerCase())
    
    // Check active nav item
    const activeNavMatches = await this.isNavItemActive(expectedPage)
    
    // Check breadcrumbs if available
    const breadcrumbs = await this.getBreadcrumbs()
    const breadcrumbMatches = breadcrumbs.some(b => 
      b.toLowerCase().includes(expectedPage.toLowerCase())
    )

    return {
      urlMatches,
      activeNavMatches,
      breadcrumbMatches,
      currentUrl,
      breadcrumbs
    }
  }

  // Keyboard navigation
  async navigateWithTab() {
    await this.page.keyboard.press('Tab')
  }

  async navigateWithShiftTab() {
    await this.page.keyboard.down('Shift')
    await this.page.keyboard.press('Tab')
    await this.page.keyboard.up('Shift')
  }

  async activateWithEnter() {
    await this.page.keyboard.press('Enter')
  }

  async activateWithSpace() {
    await this.page.keyboard.press('Space')
  }

  async getFocusedElement(): Promise<string> {
    return await this.page.evaluate(() => {
      const focused = document.activeElement
      if (!focused) return ''
      
      const tagName = focused.tagName.toLowerCase()
      const id = focused.id ? `#${focused.id}` : ''
      const className = focused.className ? `.${focused.className.split(' ').join('.')}` : ''
      const text = focused.textContent?.trim().substring(0, 20) || ''
      
      return `${tagName}${id}${className} "${text}"`
    })
  }

  async testKeyboardNavigation(): Promise<{
    canNavigateWithTab: boolean
    canActivateWithEnter: boolean
    canActivateWithSpace: boolean
    focusVisible: boolean
  }> {
    const results = {
      canNavigateWithTab: false,
      canActivateWithEnter: false,
      canActivateWithSpace: false,
      focusVisible: false
    }

    try {
      // Test tab navigation
      const initialFocus = await this.getFocusedElement()
      await this.navigateWithTab()
      const afterTabFocus = await this.getFocusedElement()
      results.canNavigateWithTab = initialFocus !== afterTabFocus

      // Test focus visibility
      results.focusVisible = await this.page.evaluate(() => {
        const focused = document.activeElement
        if (!focused) return false
        
        const styles = window.getComputedStyle(focused)
        return styles.outline !== 'none' || 
               styles.boxShadow.includes('focus') ||
               focused.matches(':focus-visible')
      })

      // Test Enter activation (on a safe element)
      if (await this.isVisible(this.selectors.dashboardLink)) {
        await this.page.focus(this.selectors.dashboardLink)
        const currentUrl = this.getCurrentUrl()
        await this.activateWithEnter()
        await this.waitForPageLoad()
        const newUrl = this.getCurrentUrl()
        results.canActivateWithEnter = currentUrl !== newUrl
      }

    } catch (error) {
      console.error('Keyboard navigation test error:', error)
    }

    return results
  }

  // Skip links
  async useSkipLink() {
    if (await this.isVisible(this.selectors.skipLink)) {
      await this.click(this.selectors.skipLink)
    }
  }

  async hasSkipLink(): Promise<boolean> {
    return await this.isVisible(this.selectors.skipLink)
  }

  // Accessibility testing
  async checkNavigationAccessibility() {
    const accessibility = {
      hasSkipLinks: false,
      navHasRole: false,
      linksHaveAccessibleNames: false,
      keyboardNavigable: false,
      focusVisible: false,
      hasLandmarks: false
    }

    // Check skip links
    accessibility.hasSkipLinks = await this.hasSkipLink()

    // Check navigation role
    accessibility.navHasRole = await this.page.evaluate(() => {
      const nav = document.querySelector('nav')
      return nav ? nav.getAttribute('role') === 'navigation' || nav.tagName === 'NAV' : false
    })

    // Check accessible names
    accessibility.linksHaveAccessibleNames = await this.page.evaluate(() => {
      const links = document.querySelectorAll('nav a')
      return Array.from(links).every(link => {
        const text = link.textContent?.trim()
        const ariaLabel = link.getAttribute('aria-label')
        const title = link.getAttribute('title')
        return text || ariaLabel || title
      })
    })

    // Test keyboard navigation
    const keyboardTest = await this.testKeyboardNavigation()
    accessibility.keyboardNavigable = keyboardTest.canNavigateWithTab
    accessibility.focusVisible = keyboardTest.focusVisible

    // Check landmarks
    accessibility.hasLandmarks = await this.page.evaluate(() => {
      const landmarks = document.querySelectorAll('nav, main, aside, header, footer, [role="navigation"], [role="main"], [role="complementary"]')
      return landmarks.length > 0
    })

    return accessibility
  }

  // Responsive design testing
  async testResponsiveNavigation() {
    const results = {
      desktop: { sidebarVisible: false, mobileMenuVisible: false },
      tablet: { sidebarVisible: false, mobileMenuVisible: false },
      mobile: { sidebarVisible: false, mobileMenuVisible: false }
    }

    // Test desktop
    await this.emulateDevice('desktop')
    await this.reload()
    results.desktop.sidebarVisible = await this.isSidebarVisible()
    results.desktop.mobileMenuVisible = await this.isVisible(this.selectors.mobileMenuButton)

    // Test tablet
    await this.emulateDevice('tablet')
    await this.reload()
    results.tablet.sidebarVisible = await this.isSidebarVisible()
    results.tablet.mobileMenuVisible = await this.isVisible(this.selectors.mobileMenuButton)

    // Test mobile
    await this.emulateDevice('mobile')
    await this.reload()
    results.mobile.sidebarVisible = await this.isSidebarVisible()
    results.mobile.mobileMenuVisible = await this.isVisible(this.selectors.mobileMenuButton)

    return results
  }

  // Performance testing
  async measureNavigationPerformance(targetPage: string) {
    const startTime = Date.now()
    
    await this.navigateToPage(targetPage)
    
    const endTime = Date.now()
    const navigationTime = endTime - startTime
    
    const performanceMetrics = await this.measurePerformance()
    
    return {
      navigationTime,
      ...performanceMetrics
    }
  }

  // Error handling
  async handleNavigationErrors(): Promise<string[]> {
    const errors = []

    // Test broken links
    const navLinks = await this.page.$$eval(this.selectors.navItem, (links) => {
      return links.map(link => ({
        href: (link as HTMLAnchorElement).href,
        text: link.textContent?.trim() || ''
      }))
    })

    for (const link of navLinks) {
      if (link.href && !link.href.includes('javascript:')) {
        try {
          const response = await this.page.goto(link.href, { waitUntil: 'networkidle0' })
          if (response && response.status() >= 400) {
            errors.push(`Broken link: ${link.text} (${link.href}) - Status: ${response.status()}`)
          }
        } catch (error) {
          errors.push(`Navigation error for ${link.text}: ${error.message}`)
        }
      }
    }

    return errors
  }

  // Complete navigation workflow test
  async testCompleteNavigationWorkflow(): Promise<{
    navigationResults: Array<{ page: string; success: boolean; error?: string }>
    breadcrumbsWork: boolean
    themeToggleWorks: boolean
    mobileMenuWorks: boolean
    keyboardNavigationWorks: boolean
  }> {
    const pages = ['dashboard', 'parcelles', 'produits', 'statistiques', 'analyse', 'profile']
    const navigationResults = []

    // Test navigation to each page
    for (const page of pages) {
      try {
        await this.navigateToPage(page)
        const verification = await this.verifyNavigation(page)
        navigationResults.push({
          page,
          success: verification.urlMatches || verification.activeNavMatches,
          verification
        })
      } catch (error) {
        navigationResults.push({
          page,
          success: false,
          error: error.message
        })
      }
    }

    // Test breadcrumbs
    let breadcrumbsWork = false
    try {
      await this.navigateToPage('produits')
      const breadcrumbs = await this.getBreadcrumbs()
      breadcrumbsWork = breadcrumbs.length > 0
    } catch (error) {
      // Breadcrumbs test failed
    }

    // Test theme toggle
    let themeToggleWorks = false
    try {
      const initialTheme = await this.getCurrentTheme()
      await this.toggleTheme()
      await new Promise(resolve => setTimeout(resolve, 500)) // Wait for theme change
      const newTheme = await this.getCurrentTheme()
      themeToggleWorks = initialTheme !== newTheme
    } catch (error) {
      // Theme toggle test failed
    }

    // Test mobile menu
    let mobileMenuWorks = false
    try {
      await this.emulateDevice('mobile')
      await this.reload()
      
      if (await this.isVisible(this.selectors.mobileMenuButton)) {
        await this.openMobileMenu()
        mobileMenuWorks = await this.isMobileMenuOpen()
        await this.closeMobileMenu()
      }
    } catch (error) {
      // Mobile menu test failed
    }

    // Test keyboard navigation
    const keyboardTest = await this.testKeyboardNavigation()
    const keyboardNavigationWorks = keyboardTest.canNavigateWithTab && keyboardTest.focusVisible

    return {
      navigationResults,
      breadcrumbsWork,
      themeToggleWorks,
      mobileMenuWorks,
      keyboardNavigationWorks
    }
  }
}