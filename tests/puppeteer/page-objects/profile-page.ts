import { Page } from 'puppeteer'
import { BasePage } from './base-page'

export class ProfilePage extends BasePage {
  // Selectors
  private selectors = {
    // Profile form fields
    firstNameInput: '[data-testid="first-name-input"], input[name="firstName"], input[name="first_name"]',
    lastNameInput: '[data-testid="last-name-input"], input[name="lastName"], input[name="last_name"]',
    emailInput: '[data-testid="email-input"], input[name="email"], input[type="email"]',
    usernameInput: '[data-testid="username-input"], input[name="username"]',
    bioInput: '[data-testid="bio-input"], textarea[name="bio"], textarea[name="biography"]',
    phoneInput: '[data-testid="phone-input"], input[name="phone"], input[type="tel"]',
    
    // Avatar upload
    avatarUpload: '[data-testid="avatar-upload"], input[type="file"][name="avatar"]',
    avatarPreview: '[data-testid="avatar-preview"], .avatar-preview, .profile-image',
    avatarRemoveButton: '[data-testid="remove-avatar"], .remove-avatar-button',
    
    // Password change section
    changePasswordSection: '[data-testid="change-password-section"], .password-change-section',
    currentPasswordInput: '[data-testid="current-password-input"], input[name="currentPassword"]',
    newPasswordInput: '[data-testid="new-password-input"], input[name="newPassword"]',
    confirmNewPasswordInput: '[data-testid="confirm-new-password-input"], input[name="confirmNewPassword"]',
    changePasswordButton: '[data-testid="change-password-button"], .change-password-button',
    
    // Buttons
    saveProfileButton: '[data-testid="save-profile-button"], button[type="submit"], .save-profile-button',
    cancelButton: '[data-testid="cancel-button"], .cancel-button',
    editButton: '[data-testid="edit-button"], .edit-button',
    
    // Messages
    successMessage: '[data-testid="success-message"], .success-message, .alert-success',
    errorMessage: '[data-testid="error-message"], .error-message, .alert-error',
    fieldError: '.field-error, .input-error',
    
    // Validation errors
    emailError: '[data-testid="email-error"], .email-error',
    passwordError: '[data-testid="password-error"], .password-error',
    
    // Loading states
    loadingSpinner: '[data-testid="loading"], .loading, .spinner',
    saveSpinner: '[data-testid="save-loading"], .save-loading',
    
    // Profile sections
    personalInfoSection: '[data-testid="personal-info-section"], .personal-info-section',
    securitySection: '[data-testid="security-section"], .security-section',
    preferencesSection: '[data-testid="preferences-section"], .preferences-section',
    
    // Preferences
    themeSelector: '[data-testid="theme-selector"], select[name="theme"]',
    languageSelector: '[data-testid="language-selector"], select[name="language"]',
    notificationSettings: '[data-testid="notification-settings"], .notification-settings',
    emailNotifications: '[data-testid="email-notifications"], input[name="emailNotifications"]',
    
    // Account actions
    deleteAccountButton: '[data-testid="delete-account-button"], .delete-account-button',
    deactivateAccountButton: '[data-testid="deactivate-account-button"], .deactivate-account-button',
    
    // Navigation
    backToDashboard: '[data-testid="back-to-dashboard"], a[href*="dashboard"]',
    
    // Theme toggle
    themeToggle: '[data-testid="theme-toggle"], .theme-toggle'
  }

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl)
  }

  // Navigation
  async navigateToProfile() {
    await this.goto('/profile')
  }

  // Page identification
  getPageIdentifier(): string {
    return 'profile-page'
  }

  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.selectors.personalInfoSection) ||
           await this.isVisible(this.selectors.firstNameInput) ||
           await this.isVisible(this.selectors.saveProfileButton)
  }

  // Personal information form
  async enterFirstName(firstName: string) {
    if (await this.isVisible(this.selectors.firstNameInput)) {
      await this.clear(this.selectors.firstNameInput)
      await this.type(this.selectors.firstNameInput, firstName)
    }
  }

  async enterLastName(lastName: string) {
    if (await this.isVisible(this.selectors.lastNameInput)) {
      await this.clear(this.selectors.lastNameInput)
      await this.type(this.selectors.lastNameInput, lastName)
    }
  }

  async enterEmail(email: string) {
    if (await this.isVisible(this.selectors.emailInput)) {
      await this.clear(this.selectors.emailInput)
      await this.type(this.selectors.emailInput, email)
    }
  }

  async enterUsername(username: string) {
    if (await this.isVisible(this.selectors.usernameInput)) {
      await this.clear(this.selectors.usernameInput)
      await this.type(this.selectors.usernameInput, username)
    }
  }

  async enterBio(bio: string) {
    if (await this.isVisible(this.selectors.bioInput)) {
      await this.clear(this.selectors.bioInput)
      await this.type(this.selectors.bioInput, bio)
    }
  }

  async enterPhone(phone: string) {
    if (await this.isVisible(this.selectors.phoneInput)) {
      await this.clear(this.selectors.phoneInput)
      await this.type(this.selectors.phoneInput, phone)
    }
  }

  // Avatar management
  async uploadAvatar(filePath: string) {
    if (await this.isVisible(this.selectors.avatarUpload)) {
      await this.uploadFile(this.selectors.avatarUpload, filePath)
      await this.page.waitForTimeout(1000) // Wait for upload processing
    }
  }

  async removeAvatar() {
    if (await this.isVisible(this.selectors.avatarRemoveButton)) {
      await this.click(this.selectors.avatarRemoveButton)
    }
  }

  async hasAvatarPreview(): Promise<boolean> {
    return this.isVisible(this.selectors.avatarPreview)
  }

  async getAvatarSrc(): Promise<string> {
    if (await this.isVisible(this.selectors.avatarPreview)) {
      return this.getAttribute(this.selectors.avatarPreview, 'src')
    }
    return ''
  }

  // Password change
  async changePassword(currentPassword: string, newPassword: string, confirmPassword?: string) {
    if (await this.isVisible(this.selectors.changePasswordSection)) {
      await this.type(this.selectors.currentPasswordInput, currentPassword)
      await this.type(this.selectors.newPasswordInput, newPassword)
      
      if (confirmPassword && await this.isVisible(this.selectors.confirmNewPasswordInput)) {
        await this.type(this.selectors.confirmNewPasswordInput, confirmPassword)
      }
      
      await this.click(this.selectors.changePasswordButton)
      await this.waitForPageLoad()
    }
  }

  // Form actions
  async saveProfile() {
    await this.click(this.selectors.saveProfileButton)
    await this.waitForPageLoad()
  }

  async cancelChanges() {
    if (await this.isVisible(this.selectors.cancelButton)) {
      await this.click(this.selectors.cancelButton)
    }
  }

  async enableEdit() {
    if (await this.isVisible(this.selectors.editButton)) {
      await this.click(this.selectors.editButton)
    }
  }

  // Complete profile update workflow
  async updateProfile(profileData: {
    firstName?: string
    lastName?: string
    email?: string
    username?: string
    bio?: string
    phone?: string
  }) {
    if (profileData.firstName) {
      await this.enterFirstName(profileData.firstName)
    }
    
    if (profileData.lastName) {
      await this.enterLastName(profileData.lastName)
    }
    
    if (profileData.email) {
      await this.enterEmail(profileData.email)
    }
    
    if (profileData.username) {
      await this.enterUsername(profileData.username)
    }
    
    if (profileData.bio) {
      await this.enterBio(profileData.bio)
    }
    
    if (profileData.phone) {
      await this.enterPhone(profileData.phone)
    }
    
    await this.saveProfile()
  }

  // Get current form values
  async getFirstName(): Promise<string> {
    if (await this.isVisible(this.selectors.firstNameInput)) {
      return this.getValue(this.selectors.firstNameInput)
    }
    return ''
  }

  async getLastName(): Promise<string> {
    if (await this.isVisible(this.selectors.lastNameInput)) {
      return this.getValue(this.selectors.lastNameInput)
    }
    return ''
  }

  async getEmail(): Promise<string> {
    if (await this.isVisible(this.selectors.emailInput)) {
      return this.getValue(this.selectors.emailInput)
    }
    return ''
  }

  async getUsername(): Promise<string> {
    if (await this.isVisible(this.selectors.usernameInput)) {
      return this.getValue(this.selectors.usernameInput)
    }
    return ''
  }

  async getBio(): Promise<string> {
    if (await this.isVisible(this.selectors.bioInput)) {
      return this.getValue(this.selectors.bioInput)
    }
    return ''
  }

  async getPhone(): Promise<string> {
    if (await this.isVisible(this.selectors.phoneInput)) {
      return this.getValue(this.selectors.phoneInput)
    }
    return ''
  }

  // Messages and validation
  async getSuccessMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.successMessage)) {
      return this.getText(this.selectors.successMessage)
    }
    return ''
  }

  async getErrorMessage(): Promise<string> {
    if (await this.isVisible(this.selectors.errorMessage)) {
      return this.getText(this.selectors.errorMessage)
    }
    return ''
  }

  async hasSuccessMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.successMessage)
  }

  async hasErrorMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.errorMessage)
  }

  async hasFieldErrors(): Promise<boolean> {
    return this.isVisible(this.selectors.fieldError)
  }

  async waitForSuccessMessage(timeout = 5000): Promise<boolean> {
    return this.waitForSelector(this.selectors.successMessage, timeout)
  }

  async waitForErrorMessage(timeout = 5000): Promise<boolean> {
    return this.waitForSelector(this.selectors.errorMessage, timeout)
  }

  // Loading states
  async isLoading(): Promise<boolean> {
    return this.isVisible(this.selectors.loadingSpinner)
  }

  async isSaving(): Promise<boolean> {
    return this.isVisible(this.selectors.saveSpinner)
  }

  async waitForSaveToComplete(timeout = 10000) {
    if (await this.isSaving()) {
      await this.waitForSelector(this.selectors.saveSpinner + ':not([style*="display: none"])', timeout)
    }
  }

  // Button states
  async isSaveButtonEnabled(): Promise<boolean> {
    return this.isEnabled(this.selectors.saveProfileButton)
  }

  async isSaveButtonDisabled(): Promise<boolean> {
    return this.isDisabled(this.selectors.saveProfileButton)
  }

  // Preferences
  async setTheme(theme: 'light' | 'dark' | 'system') {
    if (await this.isVisible(this.selectors.themeSelector)) {
      await this.select(this.selectors.themeSelector, theme)
    }
  }

  async setLanguage(language: string) {
    if (await this.isVisible(this.selectors.languageSelector)) {
      await this.select(this.selectors.languageSelector, language)
    }
  }

  async toggleEmailNotifications() {
    if (await this.isVisible(this.selectors.emailNotifications)) {
      await this.click(this.selectors.emailNotifications)
    }
  }

  async getCurrentTheme(): Promise<string> {
    if (await this.isVisible(this.selectors.themeSelector)) {
      return this.getValue(this.selectors.themeSelector)
    }
    
    // Fallback to checking document class
    return this.executeScript(() => {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    })
  }

  // Theme toggle
  async toggleTheme() {
    if (await this.isVisible(this.selectors.themeToggle)) {
      await this.click(this.selectors.themeToggle)
      await this.page.waitForTimeout(300)
    }
  }

  // Account actions
  async deleteAccount() {
    if (await this.isVisible(this.selectors.deleteAccountButton)) {
      await this.click(this.selectors.deleteAccountButton)
      
      // Handle confirmation dialog
      await this.acceptAlert()
    }
  }

  async deactivateAccount() {
    if (await this.isVisible(this.selectors.deactivateAccountButton)) {
      await this.click(this.selectors.deactivateAccountButton)
      
      // Handle confirmation dialog
      await this.acceptAlert()
    }
  }

  // Navigation
  async backToDashboard() {
    if (await this.isVisible(this.selectors.backToDashboard)) {
      await this.click(this.selectors.backToDashboard, true)
    }
  }

  // Form validation testing
  async testEmailValidation() {
    const testCases = [
      { email: '', expectedValid: false },
      { email: 'invalid-email', expectedValid: false },
      { email: 'valid@example.com', expectedValid: true }
    ]

    const results = []

    for (const testCase of testCases) {
      await this.enterEmail(testCase.email)
      
      // Trigger validation by focusing another field
      await this.page.focus(this.selectors.firstNameInput)
      await this.page.waitForTimeout(500)
      
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

  async testPasswordChangeValidation() {
    const currentPassword = 'currentpass123'
    const newPassword = 'newpass123'
    const wrongConfirmPassword = 'differentpass123'
    
    await this.type(this.selectors.currentPasswordInput, currentPassword)
    await this.type(this.selectors.newPasswordInput, newPassword)
    await this.type(this.selectors.confirmNewPasswordInput, wrongConfirmPassword)
    
    // Trigger validation
    await this.page.focus(this.selectors.firstNameInput)
    await this.page.waitForTimeout(500)
    
    const hasError = await this.hasFieldErrors() || await this.isVisible(this.selectors.passwordError)
    
    return {
      passwordsMatch: false,
      validationTriggered: hasError,
      passed: hasError // Should show error for mismatched passwords
    }
  }

  // File upload testing
  async testAvatarUpload() {
    // Create a mock file for testing
    const testImagePath = './test-results/test-avatar.png'
    
    // Check if file upload is available
    const uploadAvailable = await this.isVisible(this.selectors.avatarUpload)
    
    if (uploadAvailable) {
      // In a real test, you would create or use an actual image file
      // For this test, we'll just verify the upload functionality exists
      const fileInput = await this.page.$(this.selectors.avatarUpload)
      
      return {
        uploadAvailable: true,
        fileInputExists: !!fileInput,
        canUpload: !!fileInput
      }
    }
    
    return {
      uploadAvailable: false,
      fileInputExists: false,
      canUpload: false
    }
  }

  // Accessibility testing
  async checkAccessibility() {
    const accessibilityCheck = await this.executeScript(() => {
      const form = document.querySelector('form')
      const inputs = document.querySelectorAll('input, textarea, select')
      const buttons = document.querySelectorAll('button')
      
      let inputsWithLabels = 0
      let buttonsWithAccessibleNames = 0
      
      inputs.forEach(input => {
        const hasLabel = input.labels?.length > 0 || 
                        input.getAttribute('aria-label') !== null ||
                        input.getAttribute('aria-labelledby') !== null ||
                        input.getAttribute('placeholder') !== null
        if (hasLabel) inputsWithLabels++
      })
      
      buttons.forEach(button => {
        const hasAccessibleName = button.textContent?.trim() !== '' || 
                                 button.getAttribute('aria-label') !== null
        if (hasAccessibleName) buttonsWithAccessibleNames++
      })
      
      return {
        hasForm: !!form,
        totalInputs: inputs.length,
        inputsWithLabels,
        totalButtons: buttons.length,
        buttonsWithAccessibleNames,
        hasFieldsets: document.querySelectorAll('fieldset').length > 0,
        hasRequiredIndicators: document.querySelectorAll('[required], [aria-required="true"]').length > 0,
        accessibilityScore: ((inputsWithLabels + buttonsWithAccessibleNames) / (inputs.length + buttons.length)) * 100
      }
    })

    return accessibilityCheck
  }

  // Performance testing
  async measureProfileUpdatePerformance() {
    const startTime = Date.now()
    
    await this.updateProfile({
      firstName: 'Updated',
      lastName: 'Name',
      bio: 'Updated bio information'
    })
    
    const endTime = Date.now()
    const updateTime = endTime - startTime

    const performanceMetrics = await this.measurePerformance()

    return {
      updateTime,
      ...performanceMetrics
    }
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
      // Test in different fields
      const fields = [
        { selector: this.selectors.firstNameInput, name: 'firstName' },
        { selector: this.selectors.lastNameInput, name: 'lastName' },
        { selector: this.selectors.bioInput, name: 'bio' }
      ]

      for (const field of fields) {
        if (await this.isVisible(field.selector)) {
          await this.clear(field.selector)
          await this.type(field.selector, payload)
          
          await this.saveProfile()
          await this.page.waitForTimeout(1000)

          // Check if XSS was executed (should not be)
          const xssExecuted = await this.executeScript(() => {
            return (window as any).xssExecuted === true
          })

          const hasError = await this.hasErrorMessage()
          const fieldValue = await this.getValue(field.selector)

          results.push({
            field: field.name,
            payload,
            blocked: hasError || !fieldValue.includes('<script>'),
            xssExecuted,
            safe: !xssExecuted && !fieldValue.includes('<script>')
          })
        }
      }
    }

    return results
  }

  // Data persistence testing
  async testDataPersistence() {
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      bio: 'Test bio for persistence'
    }

    // Update profile
    await this.updateProfile(testData)
    await this.waitForSuccessMessage()

    // Reload page
    await this.reload()
    await this.waitForPageLoad()

    // Check if data persisted
    const persistedData = {
      firstName: await this.getFirstName(),
      lastName: await this.getLastName(),
      bio: await this.getBio()
    }

    return {
      original: testData,
      persisted: persistedData,
      dataPersisted: testData.firstName === persistedData.firstName &&
                     testData.lastName === persistedData.lastName &&
                     testData.bio === persistedData.bio
    }
  }
}