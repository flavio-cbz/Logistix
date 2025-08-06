import { Page } from 'puppeteer'
import { BasePage } from './base-page'

export class RegistrationPage extends BasePage {
  // Selectors
  private selectors = {
    // Form fields
    usernameInput: '[data-testid="username-input"], input[name="username"]',
    emailInput: '[data-testid="email-input"], input[name="email"], input[type="email"]',
    passwordInput: '[data-testid="password-input"], input[name="password"], input[type="password"]',
    confirmPasswordInput: '[data-testid="confirm-password-input"], input[name="confirmPassword"], input[name="password_confirmation"]',
    firstNameInput: '[data-testid="first-name-input"], input[name="firstName"], input[name="first_name"]',
    lastNameInput: '[data-testid="last-name-input"], input[name="lastName"], input[name="last_name"]',
    
    // Buttons and links
    registerButton: '[data-testid="register-button"], button[type="submit"], .register-button',
    loginLink: '[data-testid="login-link"], a[href*="login"], .login-link',
    
    // Messages
    errorMessage: '[data-testid="error-message"], .error-message, .alert-error',
    successMessage: '[data-testid="success-message"], .success-message, .alert-success',
    fieldError: '.field-error, .input-error',
    
    // Validation
    emailError: '[data-testid="email-error"], .email-error',
    passwordError: '[data-testid="password-error"], .password-error',
    usernameError: '[data-testid="username-error"], .username-error',
    
    // Loading
    loadingSpinner: '[data-testid="loading"], .loading, .spinner',
    
    // Terms and conditions
    termsCheckbox: '[data-testid="terms-checkbox"], input[name="terms"], input[type="checkbox"]',
    termsLink: '[data-testid="terms-link"], a[href*="terms"]',
    
    // Theme toggle
    themeToggle: '[data-testid="theme-toggle"], .theme-toggle'
  }

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl)
  }

  // Navigation
  async navigateToRegistration() {
    await this.goto('/register')
  }

  // Page identification
  getPageIdentifier(): string {
    return 'registration-page'
  }

  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.selectors.emailInput) &&
           await this.isVisible(this.selectors.passwordInput) &&
           await this.isVisible(this.selectors.registerButton)
  }

  // Form interactions
  async enterUsername(username: string) {
    if (await this.isVisible(this.selectors.usernameInput)) {
      await this.type(this.selectors.usernameInput, username)
    }
  }

  async enterEmail(email: string) {
    await this.type(this.selectors.emailInput, email)
  }

  async enterPassword(password: string) {
    await this.type(this.selectors.passwordInput, password)
  }

  async enterConfirmPassword(password: string) {
    if (await this.isVisible(this.selectors.confirmPasswordInput)) {
      await this.type(this.selectors.confirmPasswordInput, password)
    }
  }

  async enterFirstName(firstName: string) {
    if (await this.isVisible(this.selectors.firstNameInput)) {
      await this.type(this.selectors.firstNameInput, firstName)
    }
  }

  async enterLastName(lastName: string) {
    if (await this.isVisible(this.selectors.lastNameInput)) {
      await this.type(this.selectors.lastNameInput, lastName)
    }
  }

  async acceptTerms() {
    if (await this.isVisible(this.selectors.termsCheckbox)) {
      await this.check(this.selectors.termsCheckbox)
    }
  }

  async clickRegister() {
    await this.click(this.selectors.registerButton)
    await this.waitForPageLoad()
  }

  async clickLoginLink() {
    await this.click(this.selectors.loginLink, true)
  }

  // Complete registration workflow
  async register(userData: {
    username?: string
    email: string
    password: string
    confirmPassword?: string
    firstName?: string
    lastName?: string
    acceptTerms?: boolean
  }) {
    if (userData.username) {
      await this.enterUsername(userData.username)
    }
    
    await this.enterEmail(userData.email)
    await this.enterPassword(userData.password)
    
    if (userData.confirmPassword) {
      await this.enterConfirmPassword(userData.confirmPassword)
    }
    
    if (userData.firstName) {
      await this.enterFirstName(userData.firstName)
    }
    
    if (userData.lastName) {
      await this.enterLastName(userData.lastName)
    }
    
    if (userData.acceptTerms) {
      await this.acceptTerms()
    }
    
    await this.clickRegister()
  }

  // Form validation
  async getEmailValue(): Promise<string> {
    return this.getValue(this.selectors.emailInput)
  }

  async getPasswordValue(): Promise<string> {
    return this.getValue(this.selectors.passwordInput)
  }

  async getUsernameValue(): Promise<string> {
    if (await this.isVisible(this.selectors.usernameInput)) {
      return this.getValue(this.selectors.usernameInput)
    }
    return ''
  }

  async clearForm() {
    if (await this.isVisible(this.selectors.usernameInput)) {
      await this.clear(this.selectors.usernameInput)
    }
    await this.clear(this.selectors.emailInput)
    await this.clear(this.selectors.passwordInput)
    if (await this.isVisible(this.selectors.confirmPasswordInput)) {
      await this.clear(this.selectors.confirmPasswordInput)
    }
    if (await this.isVisible(this.selectors.firstNameInput)) {
      await this.clear(this.selectors.firstNameInput)
    }
    if (await this.isVisible(this.selectors.lastNameInput)) {
      await this.clear(this.selectors.lastNameInput)
    }
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

  async getEmailError(): Promise<string> {
    if (await this.isVisible(this.selectors.emailError)) {
      return this.getText(this.selectors.emailError)
    }
    return ''
  }

  async getPasswordError(): Promise<string> {
    if (await this.isVisible(this.selectors.passwordError)) {
      return this.getText(this.selectors.passwordError)
    }
    return ''
  }

  async getUsernameError(): Promise<string> {
    if (await this.isVisible(this.selectors.usernameError)) {
      return this.getText(this.selectors.usernameError)
    }
    return ''
  }

  async hasErrorMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.errorMessage)
  }

  async hasSuccessMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.successMessage)
  }

  async hasFieldErrors(): Promise<boolean> {
    return this.isVisible(this.selectors.fieldError)
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
  async isRegisterButtonEnabled(): Promise<boolean> {
    return this.isEnabled(this.selectors.registerButton)
  }

  async isRegisterButtonDisabled(): Promise<boolean> {
    return this.isDisabled(this.selectors.registerButton)
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
      await this.clear(this.selectors.emailInput)
      await this.enterEmail(testCase.email)
      
      // Trigger validation by focusing another field
      if (await this.isVisible(this.selectors.usernameInput)) {
        await this.page.focus(this.selectors.usernameInput)
      } else {
        await this.page.focus(this.selectors.passwordInput)
      }
      
      await this.page.waitForTimeout(500) // Wait for validation
      
      const hasError = await this.hasFieldErrors() || await this.isVisible(this.selectors.emailError)
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
      { password: 'weak', expectedValid: false },
      { password: 'StrongPassword123!', expectedValid: true }
    ]

    const results = []

    for (const testCase of testCases) {
      await this.clear(this.selectors.passwordInput)
      await this.enterPassword(testCase.password)
      
      // Trigger validation
      await this.page.focus(this.selectors.emailInput)
      await this.page.waitForTimeout(500)
      
      const hasError = await this.hasFieldErrors() || await this.isVisible(this.selectors.passwordError)
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

  async testPasswordConfirmation() {
    const password = 'TestPassword123!'
    const confirmPassword = 'DifferentPassword123!'
    
    await this.enterPassword(password)
    await this.enterConfirmPassword(confirmPassword)
    
    // Trigger validation
    await this.page.focus(this.selectors.emailInput)
    await this.page.waitForTimeout(500)
    
    const hasError = await this.hasFieldErrors() || await this.isVisible(this.selectors.passwordError)
    
    return {
      passwordsMatch: false,
      validationTriggered: hasError,
      passed: hasError // Should show error for mismatched passwords
    }
  }

  // Accessibility testing
  async checkAccessibility() {
    const accessibilityCheck = await this.executeScript(() => {
      const emailInput = document.querySelector('input[type="email"], input[name="email"]') as HTMLInputElement
      const passwordInput = document.querySelector('input[type="password"], input[name="password"]') as HTMLInputElement
      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
      const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement
      
      return {
        emailHasLabel: emailInput ? (
          emailInput.labels?.length > 0 || 
          emailInput.getAttribute('aria-label') !== null ||
          emailInput.getAttribute('aria-labelledby') !== null
        ) : false,
        passwordHasLabel: passwordInput ? (
          passwordInput.labels?.length > 0 || 
          passwordInput.getAttribute('aria-label') !== null ||
          passwordInput.getAttribute('aria-labelledby') !== null
        ) : false,
        usernameHasLabel: usernameInput ? (
          usernameInput.labels?.length > 0 || 
          usernameInput.getAttribute('aria-label') !== null ||
          usernameInput.getAttribute('aria-labelledby') !== null
        ) : false,
        buttonHasAccessibleName: submitButton ? (
          submitButton.textContent?.trim() !== '' || 
          submitButton.getAttribute('aria-label') !== null
        ) : false,
        formHasFieldset: !!document.querySelector('fieldset'),
        hasRequiredIndicators: document.querySelectorAll('[required], [aria-required="true"]').length > 0
      }
    })

    return accessibilityCheck
  }

  // Theme functionality
  async toggleTheme() {
    if (await this.isVisible(this.selectors.themeToggle)) {
      await this.click(this.selectors.themeToggle)
      await this.page.waitForTimeout(300)
    }
  }

  async getCurrentTheme(): Promise<string> {
    return this.executeScript(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    })
  }

  // Security testing
  async testXSSPrevention() {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">'
    ]

    const results = []

    for (const payload of xssPayloads) {
      await this.clearForm()
      await this.enterEmail(payload)
      await this.enterPassword('password123')
      
      if (await this.isVisible(this.selectors.usernameInput)) {
        await this.enterUsername(payload)
      }
      
      await this.clickRegister()
      await this.page.waitForTimeout(1000)

      // Check if XSS was executed (should not be)
      const xssExecuted = await this.executeScript(() => {
        return (window as any).xssExecuted === true
      })

      const hasError = await this.hasErrorMessage()

      results.push({
        payload,
        blocked: hasError,
        xssExecuted,
        safe: hasError && !xssExecuted
      })
    }

    return results
  }

  // Performance testing
  async measureRegistrationPerformance() {
    const startTime = Date.now()
    
    await this.register({
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      acceptTerms: true
    })
    
    const endTime = Date.now()
    const registrationTime = endTime - startTime

    const performanceMetrics = await this.measurePerformance()

    return {
      registrationTime,
      ...performanceMetrics
    }
  }
}