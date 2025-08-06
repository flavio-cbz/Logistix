import puppeteer, { Browser, Page, LaunchOptions } from 'puppeteer'

// Puppeteer test configuration
export const PUPPETEER_CONFIG: LaunchOptions = {
  headless: process.env.CI ? true : 'new', // Use new headless mode, show browser in dev
  slowMo: process.env.CI ? 0 : 50, // Slow down actions in development
  devtools: !process.env.CI, // Open devtools in development
  defaultViewport: {
    width: 1280,
    height: 720
  },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
}

// Test environment configuration
export const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  slowMo: process.env.CI ? 0 : 100,
  retries: process.env.CI ? 2 : 0,
  screenshots: {
    enabled: true,
    path: './test-results/screenshots',
    onFailure: true,
    onSuccess: false
  },
  videos: {
    enabled: process.env.RECORD_VIDEOS === 'true',
    path: './test-results/videos'
  }
}

// Browser and page management
export class PuppeteerTestManager {
  private browser: Browser | null = null
  private pages: Page[] = []

  async setupBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser
    }

    this.browser = await puppeteer.launch(PUPPETEER_CONFIG)
    return this.browser
  }

  async createPage(): Promise<Page> {
    if (!this.browser) {
      await this.setupBrowser()
    }

    const page = await this.browser!.newPage()
    
    // Set default timeout
    page.setDefaultTimeout(TEST_CONFIG.timeout)
    page.setDefaultNavigationTimeout(TEST_CONFIG.timeout)

    // Set viewport
    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 1
    })

    // Enable request interception for mocking
    await page.setRequestInterception(true)

    // Add console logging in development
    if (!process.env.CI) {
      page.on('console', (msg) => {
        console.log(`PAGE LOG: ${msg.text()}`)
      })

      page.on('pageerror', (error) => {
        console.error(`PAGE ERROR: ${error.message}`)
      })
    }

    // Store page reference
    this.pages.push(page)

    return page
  }

  async closePage(page: Page) {
    const index = this.pages.indexOf(page)
    if (index > -1) {
      this.pages.splice(index, 1)
    }
    
    if (!page.isClosed()) {
      await page.close()
    }
  }

  async closeAllPages() {
    for (const page of this.pages) {
      if (!page.isClosed()) {
        await page.close()
      }
    }
    this.pages = []
  }

  async closeBrowser() {
    await this.closeAllPages()
    
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async takeScreenshot(page: Page, name: string): Promise<string> {
    const screenshotPath = `${TEST_CONFIG.screenshots.path}/${name}-${Date.now()}.png` as `${string}.png`
    
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    })

    return screenshotPath
  }

  async capturePageState(page: Page, testName: string) {
    const timestamp = Date.now()
    const basePath = `./test-results/debug/${testName}-${timestamp}`

    // Take screenshot
    const screenshotPath = `${basePath}-screenshot.png` as `${string}.png`
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    })

    // Save HTML content
    const htmlPath = `${basePath}-content.html`
    const content = await page.content()
    require('fs').writeFileSync(htmlPath, content)

    // Save console logs
    const logsPath = `${basePath}-logs.json`
    const logs = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    })
    require('fs').writeFileSync(logsPath, JSON.stringify(logs, null, 2))

    return {
      screenshot: screenshotPath,
      html: htmlPath,
      logs: logsPath
    }
  }
}

// Global test manager instance
export const puppeteerManager = new PuppeteerTestManager()

// Test utilities
export class PuppeteerTestUtils {
  static async waitForSelector(page: Page, selector: string, timeout = 5000) {
    try {
      await page.waitForSelector(selector, { timeout })
      return true
    } catch (error) {
      return false
    }
  }

  static async waitForText(page: Page, text: string, timeout = 5000) {
    try {
      await page.waitForFunction(
        (searchText) => document.body.innerText.includes(searchText),
        { timeout },
        text
      )
      return true
    } catch (error) {
      return false
    }
  }

  static async waitForNavigation(page: Page, timeout = 10000) {
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle0',
        timeout 
      })
      return true
    } catch (error) {
      return false
    }
  }

  static async fillForm(page: Page, formData: Record<string, string>) {
    for (const [selector, value] of Object.entries(formData)) {
      await page.waitForSelector(selector)
      await page.focus(selector)
      await page.evaluate((sel) => {
        const element = document.querySelector(sel) as HTMLInputElement
        if (element) element.value = ''
      }, selector)
      await page.type(selector, value)
    }
  }

  static async clickAndWait(page: Page, selector: string, waitForNavigation = false) {
    await page.waitForSelector(selector)
    
    if (waitForNavigation) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click(selector)
      ])
    } else {
      await page.click(selector)
    }
  }

  static async scrollToElement(page: Page, selector: string) {
    await page.waitForSelector(selector)
    await page.evaluate((sel) => {
      const element = document.querySelector(sel)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, selector)
    
    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  static async getElementText(page: Page, selector: string): Promise<string> {
    await page.waitForSelector(selector)
    return page.$eval(selector, (el) => el.textContent?.trim() || '')
  }

  static async getElementAttribute(page: Page, selector: string, attribute: string): Promise<string> {
    await page.waitForSelector(selector)
    return page.$eval(selector, (el, attr) => el.getAttribute(attr) || '', attribute)
  }

  static async isElementVisible(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: 1000 })
      return true
    } catch {
      return false
    }
  }

  static async isElementHidden(page: Page, selector: string): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { hidden: true, timeout: 1000 })
      return true
    } catch {
      return false
    }
  }

  static async waitForLoadingToFinish(page: Page) {
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[aria-label="Loading"]'
    ]

    for (const selector of loadingSelectors) {
      try {
        await page.waitForSelector(selector, { hidden: true, timeout: 2000 })
      } catch {
        // Ignore if selector doesn't exist
      }
    }

    // Wait for network to be idle
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  static async mockApiResponse(page: Page, url: string, response: any) {
    await page.setRequestInterception(true)
    page.on('request', (request) => {
      if (request.url().includes(url)) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        })
      } else {
        request.continue()
      }
    })
  }

  static async interceptRequests(page: Page, urlPattern: string, handler: (request: any) => void) {
    await page.setRequestInterception(true)
    page.on('request', handler)
  }

  static async clearBrowserData(page: Page) {
    // Clear localStorage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Clear cookies
    const cookies = await page.cookies()
    for (const cookie of cookies) {
      await page.deleteCookie(cookie)
    }
  }

  static async emulateDevice(page: Page, device: 'mobile' | 'tablet' | 'desktop') {
    const devices = {
      mobile: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
      tablet: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
      desktop: { width: 1280, height: 720, deviceScaleFactor: 1, isMobile: false }
    }

    const deviceConfig = devices[device]
    await page.setViewport(deviceConfig)
    
    if (deviceConfig.isMobile) {
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15')
    }
  }

  static async measurePerformance(page: Page) {
    const metrics = await page.metrics()
    const performanceTiming = await page.evaluate(() => {
      const timing = performance.timing
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0
      }
    })

    return {
      ...metrics,
      ...performanceTiming
    }
  }
}

// Error capture utilities
export class ErrorCaptureUtils {
  static async captureError(page: Page, error: Error, testName: string) {
    const timestamp = Date.now()
    const errorDir = `./test-results/errors/${testName}-${timestamp}`

    // Create directory
    require('fs').mkdirSync(errorDir, { recursive: true })

    // Capture screenshot
    const screenshotPath = `${errorDir}/error-screenshot.png`
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    })

    // Capture page content
    const htmlPath = `${errorDir}/error-page.html`
    const content = await page.content()
    require('fs').writeFileSync(htmlPath, content)

    // Capture console logs
    const logsPath = `${errorDir}/console-logs.json`
    const logs = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      }
    })
    require('fs').writeFileSync(logsPath, JSON.stringify(logs, null, 2))

    // Save error details
    const errorPath = `${errorDir}/error-details.json`
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      testName,
      url: page.url()
    }
    require('fs').writeFileSync(errorPath, JSON.stringify(errorDetails, null, 2))

    return {
      screenshot: screenshotPath,
      html: htmlPath,
      logs: logsPath,
      error: errorPath
    }
  }

  static async setupErrorHandling(page: Page, testName: string) {
    // Capture uncaught exceptions
    page.on('pageerror', async (error) => {
      console.error(`Page error in ${testName}:`, error.message)
      await this.captureError(page, error, testName)
    })

    // Capture failed requests
    page.on('requestfailed', (request) => {
      console.error(`Request failed in ${testName}:`, request.url(), request.failure()?.errorText)
    })

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Console error in ${testName}:`, msg.text())
      }
    })
  }
}

// Setup and teardown helpers
export async function setupPuppeteerTest(testName?: string) {
  const page = await puppeteerManager.createPage()
  
  if (testName) {
    await ErrorCaptureUtils.setupErrorHandling(page, testName)
  }

  return page
}

export async function teardownPuppeteerTest(page: Page) {
  await puppeteerManager.closePage(page)
}

export async function setupPuppeteerSuite() {
  await puppeteerManager.setupBrowser()
}

export async function teardownPuppeteerSuite() {
  await puppeteerManager.closeBrowser()
}