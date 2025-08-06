import { Page } from 'puppeteer'
import { PuppeteerTestUtils } from '../config'

// Base page object class
export abstract class BasePage {
  protected page: Page
  protected baseUrl: string

  constructor(page: Page, baseUrl: string = 'http://localhost:3000') {
    this.page = page
    this.baseUrl = baseUrl
  }

  // Navigation methods
  async goto(path: string = '') {
    const url = `${this.baseUrl}${path}`
    await this.page.goto(url, { waitUntil: 'networkidle0' })
    await this.waitForPageLoad()
  }

  async reload() {
    await this.page.reload({ waitUntil: 'networkidle0' })
    await this.waitForPageLoad()
  }

  async goBack() {
    await this.page.goBack({ waitUntil: 'networkidle0' })
    await this.waitForPageLoad()
  }

  async goForward() {
    await this.page.goForward({ waitUntil: 'networkidle0' })
    await this.waitForPageLoad()
  }

  // Wait methods
  async waitForPageLoad() {
    await PuppeteerTestUtils.waitForLoadingToFinish(this.page)
  }

  async waitForSelector(selector: string, timeout = 5000) {
    return PuppeteerTestUtils.waitForSelector(this.page, selector, timeout)
  }

  async waitForText(text: string, timeout = 5000) {
    return PuppeteerTestUtils.waitForText(this.page, text, timeout)
  }

  async waitForNavigation(timeout = 10000) {
    return PuppeteerTestUtils.waitForNavigation(this.page, timeout)
  }

  // Element interaction methods
  async click(selector: string, waitForNavigation = false) {
    return PuppeteerTestUtils.clickAndWait(this.page, selector, waitForNavigation)
  }

  async type(selector: string, text: string) {
    await this.waitForSelector(selector)
    await this.page.focus(selector)
    await this.page.keyboard.down('Control')
    await this.page.keyboard.press('KeyA')
    await this.page.keyboard.up('Control')
    await this.page.type(selector, text)
  }

  async clear(selector: string) {
    await this.waitForSelector(selector)
    await this.page.focus(selector)
    await this.page.keyboard.down('Control')
    await this.page.keyboard.press('KeyA')
    await this.page.keyboard.up('Control')
    await this.page.keyboard.press('Delete')
  }

  async select(selector: string, value: string) {
    await this.waitForSelector(selector)
    await this.page.select(selector, value)
  }

  async check(selector: string) {
    await this.waitForSelector(selector)
    const isChecked = await this.page.$eval(selector, (el: any) => el.checked)
    if (!isChecked) {
      await this.page.click(selector)
    }
  }

  async uncheck(selector: string) {
    await this.waitForSelector(selector)
    const isChecked = await this.page.$eval(selector, (el: any) => el.checked)
    if (isChecked) {
      await this.page.click(selector)
    }
  }

  async uploadFile(selector: string, filePath: string) {
    await this.waitForSelector(selector)
    const input = await this.page.$(selector)
    if (input) {
      await input.uploadFile(filePath)
    }
  }

  // Element query methods
  async getText(selector: string): Promise<string> {
    return PuppeteerTestUtils.getElementText(this.page, selector)
  }

  async getAttribute(selector: string, attribute: string): Promise<string> {
    return PuppeteerTestUtils.getElementAttribute(this.page, selector, attribute)
  }

  async getValue(selector: string): Promise<string> {
    await this.waitForSelector(selector)
    return this.page.$eval(selector, (el: any) => el.value || '')
  }

  async isVisible(selector: string): Promise<boolean> {
    return PuppeteerTestUtils.isElementVisible(this.page, selector)
  }

  async isHidden(selector: string): Promise<boolean> {
    return PuppeteerTestUtils.isElementHidden(this.page, selector)
  }

  async isEnabled(selector: string): Promise<boolean> {
    await this.waitForSelector(selector)
    return this.page.$eval(selector, (el: any) => !el.disabled)
  }

  async isDisabled(selector: string): Promise<boolean> {
    return !(await this.isEnabled(selector))
  }

  async isChecked(selector: string): Promise<boolean> {
    await this.waitForSelector(selector)
    return this.page.$eval(selector, (el: any) => el.checked || false)
  }

  async getElementCount(selector: string): Promise<number> {
    const elements = await this.page.$$(selector)
    return elements.length
  }

  // Form methods
  async fillForm(formData: Record<string, string>) {
    return PuppeteerTestUtils.fillForm(this.page, formData)
  }

  async submitForm(formSelector: string = 'form') {
    await this.waitForSelector(formSelector)
    await this.page.$eval(formSelector, (form: any) => form.submit())
  }

  async resetForm(formSelector: string = 'form') {
    await this.waitForSelector(formSelector)
    await this.page.$eval(formSelector, (form: any) => form.reset())
  }

  // Scroll methods
  async scrollTo(x: number, y: number) {
    await this.page.evaluate((scrollX, scrollY) => {
      window.scrollTo(scrollX, scrollY)
    }, x, y)
  }

  async scrollToTop() {
    await this.scrollTo(0, 0)
  }

  async scrollToBottom() {
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
  }

  async scrollToElement(selector: string) {
    return PuppeteerTestUtils.scrollToElement(this.page, selector)
  }

  // Screenshot methods
  async takeScreenshot(name?: string): Promise<string> {
    const screenshotName = name || `${this.constructor.name}-${Date.now()}`
    const screenshotPath = `./test-results/screenshots/${screenshotName}.png` as `${string}.png`
    
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true
    })

    return screenshotPath
  }

  // URL and page info methods
  getCurrentUrl(): string {
    return this.page.url()
  }

  async getTitle(): Promise<string> {
    return this.page.title()
  }

  async getPageSource(): Promise<string> {
    return this.page.content()
  }

  // Cookie methods
  async getCookies() {
    return this.page.cookies()
  }

  async setCookie(name: string, value: string, options?: any) {
    await this.page.setCookie({
      name,
      value,
      url: this.baseUrl,
      ...options
    })
  }

  async deleteCookie(name: string) {
    const cookies = await this.page.cookies()
    const cookie = cookies.find(c => c.name === name)
    if (cookie) {
      await this.page.deleteCookie(cookie)
    }
  }

  async clearCookies() {
    const cookies = await this.page.cookies()
    for (const cookie of cookies) {
      await this.page.deleteCookie(cookie)
    }
  }

  // Local storage methods
  async getLocalStorage(key: string): Promise<string | null> {
    return this.page.evaluate((storageKey) => {
      return localStorage.getItem(storageKey)
    }, key)
  }

  async setLocalStorage(key: string, value: string) {
    await this.page.evaluate((storageKey, storageValue) => {
      localStorage.setItem(storageKey, storageValue)
    }, key, value)
  }

  async removeLocalStorage(key: string) {
    await this.page.evaluate((storageKey) => {
      localStorage.removeItem(storageKey)
    }, key)
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => {
      localStorage.clear()
    })
  }

  // Session storage methods
  async getSessionStorage(key: string): Promise<string | null> {
    return this.page.evaluate((storageKey) => {
      return sessionStorage.getItem(storageKey)
    }, key)
  }

  async setSessionStorage(key: string, value: string) {
    await this.page.evaluate((storageKey, storageValue) => {
      sessionStorage.setItem(storageKey, storageValue)
    }, key, value)
  }

  async clearSessionStorage() {
    await this.page.evaluate(() => {
      sessionStorage.clear()
    })
  }

  // JavaScript execution
  async executeScript(script: any, ...args: any[]) {
    return this.page.evaluate(script, ...args)
  }

  // Wait for conditions
  async waitForCondition(condition: () => boolean | Promise<boolean>, timeout = 5000) {
    const start = Date.now()
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    throw new Error(`Condition not met within ${timeout}ms`)
  }

  // Alert handling
  async acceptAlert() {
    this.page.once('dialog', async dialog => {
      await dialog.accept()
    })
  }

  async dismissAlert() {
    this.page.once('dialog', async dialog => {
      await dialog.dismiss()
    })
  }

  async getAlertText(): Promise<string> {
    return new Promise((resolve) => {
      this.page.once('dialog', async dialog => {
        const message = dialog.message()
        await dialog.accept()
        resolve(message)
      })
    })
  }

  // Network methods
  async mockApiResponse(url: string, response: any) {
    return PuppeteerTestUtils.mockApiResponse(this.page, url, response)
  }

  async interceptRequests(urlPattern: string, handler: (request: any) => void) {
    return PuppeteerTestUtils.interceptRequests(this.page, urlPattern, handler)
  }

  // Performance methods
  async measurePerformance() {
    return PuppeteerTestUtils.measurePerformance(this.page)
  }

  // Device emulation
  async emulateDevice(device: 'mobile' | 'tablet' | 'desktop') {
    return PuppeteerTestUtils.emulateDevice(this.page, device)
  }

  // Cleanup methods
  async clearBrowserData() {
    return PuppeteerTestUtils.clearBrowserData(this.page)
  }

  // Abstract methods that subclasses should implement
  abstract isLoaded(): Promise<boolean>
  abstract getPageIdentifier(): string
}