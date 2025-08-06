import { Page } from 'puppeteer'
import { BasePage } from './base-page'

export class LoginPage extends BasePage {
  // Selectors
  private selectors = {
    emailInput: '[data-testid="email-input"], input[name="email"], input[type="email"]',
    passwordInput: '[data-testid="password-input"], input[name="password"], input[type="password"]',
    loginButton: '[data-testid="login-button"], button[type="submit"], .login-button',
    registerLink: '[data-testid="register-link"], a[href*="register"], .register-link',
    forgotPasswordLink: '[data-testid="forgot-password-link"], a[href*="forgot"], .forgot-password-link',
    errorMessage: '[data-testid="error-message"], .error-message, .alert-error',
    successMessage: '[data-testid="success-message"], .success-message, .alert-success',
    loadingSpinner: '[data-testid="loading"], .loading, .spinner',
    themeToggle: '[data-testid="theme-toggle"], .theme-toggle',
    languageSelector: '[data-testid="language-selector"], .language-selector'
  }

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl)
  }

  // Navigation
  async navigateToLogin() {
    await this.goto('/login')
  }

  // Page identification
  getPageIdentifier(): string {
    return 'login-page'
  }

  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.selectors.emailInput) &&
           await this.isVisible(this.selectors.passwordInput) &&
           await this.isVisible(this.selectors.loginButton)
  }

  // Form interactions
  async enterEmail(email: string) {
    await this.type(this.selectors.emailInput, email)
  }

  async enterPassword(password: string) {
    await this.type(this.selectors.passwordInput, password)
  }

  async clickLogin() {
    await this.click(this.selectors.loginButton)
    await this.waitForPageLoad()
  }

  async clickRegisterLink() {
    await this.click(this.selectors.registerLink, true)
  }

  async clickForgotPasswordLink() {
    await this.click(this.selectors.forgotPasswordLink, true)
  }

  // Complete login workflow
  async login(email: string, password: string) {
    await this.enterEmail(email)
    await this.enterPassword(password)
    await this.clickLogin()
  }

  // Quick login with default credentials
  async loginWithDefaults() {
    await this.login('test@example.com', 'password123')
  }

  async loginAsAdmin() {
    await this.login('admin', 'admin123')
  }

  // Form validation
  async getEmailValue(): Promise<string> {
    return this.getValue(this.selectors.emailInput)
  }

  async getPasswordValue(): Promise<string> {
    return this.getValue(this.selectors.passwordInput)
  }

  async clearEmail() {
    await this.clear(this.selectors.emailInput)
  }

  async clearPassword() {
    await this.clear(this.selectors.passwordInput)
  }

  async clearForm() {
    await this.clearEmail()
    await this.clearPassword()
  }

  // Error and success messages
  async getErrorMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.errorMessage)) {
      return this.getText(this.selectors.errorMessage)
    }
    return ''
  }

  async getSuccessMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.successMessage)) {
      return this.getText(this.selectors.successMessage)
    }
    return ''
  }

  async hasErrorMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.errorMessage)
  }

  async hasSuccessMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.successMessage)
  }

  async waitForErrorMessage(timeout = 5000): Promise<boolean> {
    return this.waitForSelector(this.selectors.errorMessage, timeout)
  }

  async waitForSuccessMessage(timeout = 5000): Promise<boolean> {
    return this.waitForSelector(this.selectors.successMessage, timeout)
  }

  // Loading states
  async isLoading(): Promise<boolean> {
    return this.isVisible(this.selectors.loadingSpinner)
  }

  async waitForLoadingToFinish(timeout = 10000) {
    if (await this.isVisible(this.selectors.loadingSpinner)) {
      await this.waitForSelector(this.selectors.loadingSpinner + ':not([style*="display: none"])', timeout)
    }
  }

  // Button states
  async isLoginButtonEnabled(): Promise<boolean> {
    return this.isEnabled(this.selectors.loginButton)
  }

  async isLoginButtonDisabled(): Promise<boolean> {
    return this.isDisabled(this.selectors.loginButton)
  }

  // Theme and UI
  async toggleTheme() {
    if (await this.isVisible(this.selectors.themeToggle)) {
      await this.click(this.selectors.themeToggle)
    }
  }

  async getCurrentTheme(): Promise<string> {
    return this.page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    })
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

  async submitWithEnter() {
    await this.page.keyboard.press('Enter')
    await this.waitForPageLoad()
  }

  // Accessibility
  async getFocusedElement(): Promise<string> {
    return this.page.evaluate(() => {
      const focused = document.activeElement
      return focused ? focused.tagName + (focused.id ? '#' + focused.id : '') : ''
    })
  }

  async checkAccessibility() {
    // Check for proper labels
    const emailHasLabel = await this.page.evaluate(() => {
      const input = document.querySelector('input[type="email"]') as HTMLInputElement
      return input ? (input.labels?.length > 0 || input.getAttribute('aria-label') !== null) : false
    })

    const passwordHasLabel = await this.page.evaluate(() => {
      const input = document.querySelector('input[type="password"]') as HTMLInputElement
      return input ? (input.labels?.length > 0 || input.getAttribute('aria-label') !== null) : false
    })

    const buttonHasAccessibleName = await this.page.evaluate(() => {
      const button = document.querySelector('button[type="submit"]') as HTMLButtonElement
      return button ? (button.textContent?.trim() !== '' || button.getAttribute('aria-label') !== null) : false
    })

    return {
      emailHasLabel,
      passwordHasLabel,
      buttonHasAccessibleName
    }
  }

  // Form validation testing
  async testEmailValidation() {
    const testCases = [
      { email: '', expectedValid: false },
      { email: 'invalid', expectedValid: false },
      { email: 'invalid@', expectedValid: false },
      { email: '@invalid.com', expectedValid: false },
      { email: 'valid@example.com', expectedValid: true }
    ]

    const results = []

    for (const testCase of testCases) {
      await this.clearEmail()
      await this.enterEmail(testCase.email)
      
      // Trigger validation by clicking outside or pressing tab
      await this.navigateWithTab()
      
      const hasError = await this.hasErrorMessage()
      const isValid = !hasError
      
      results.push({
        email: testCase.email,
        expected: testCase.expectedValid,
        actual: isValid,
        passed: testCase.expectedValid === isValid
      })
    }

    return results
  }

  async testPasswordValidation() {
    const testCases = [
      { password: '', expectedValid: false },
      { password: '123', expectedValid: false },
      { password: 'password123', expectedValid: true }
    ]

    const results = []

    for (const testCase of testCases) {
      await this.clearPassword()
      await this.enterPassword(testCase.password)
      
      // Trigger validation
      await this.navigateWithTab()
      
      const hasError = await this.hasErrorMessage()
      const isValid = !hasError
      
      results.push({
        password: testCase.password.replace(/./g, '*'), // Hide password in results
        expected: testCase.expectedValid,
        actual: isValid,
        passed: testCase.expectedValid === isValid
      })
    }

    return results
  }

  // Security testing
  async testSQLInjection() {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users --"
    ]

    const results = []

    for (const input of maliciousInputs) {
      await this.clearForm()
      await this.enterEmail(input)
      await this.enterPassword('password')
      await this.clickLogin()

      const hasError = await this.hasErrorMessage()
      const errorMessage = await this.getErrorMessage()

      results.push({
        input,
        blocked: hasError,
        errorMessage,
        safe: hasError && !errorMessage.includes('SQL')
      })

      // Wait a bit between attempts
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return results
  }

  async testXSSAttempts() {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">'
    ]

    const results = []

    for (const payload of xssPayloads) {
      await this.clearForm()
      await this.enterEmail(payload)
      await this.enterPassword('password')
      await this.clickLogin()

      // Check if XSS was executed (should not be)
      const alertTriggered = await this.page.evaluate(() => {
        return window.alert.toString().includes('[native code]')
      })

      const hasError = await this.hasErrorMessage()

      results.push({
        payload,
        blocked: hasError,
        xssExecuted: !alertTriggered,
        safe: hasError && !alertTriggered
      })

      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return results
  }

  // Performance testing
  async measureLoginPerformance() {
    const startTime = Date.now()
    
    await this.login('test@example.com', 'password123')
    
    const endTime = Date.now()
    const loginTime = endTime - startTime

    const performanceMetrics = await this.measurePerformance()

    return {
      loginTime,
      ...performanceMetrics
    }
  }

  // Mobile testing
  async testMobileLayout() {
    await this.emulateDevice('mobile')
    await this.reload()

    const isMobileOptimized = await this.page.evaluate(() => {
      const viewport = window.innerWidth
      const form = document.querySelector('form')
      const formWidth = form ? form.offsetWidth : 0
      
      return {
        viewport,
        formWidth,
        isResponsive: formWidth <= viewport * 0.9
      }
    })

    return isMobileOptimized
  }
}