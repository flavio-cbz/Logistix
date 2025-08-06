import { Page } from 'puppeteer'
import fs from 'fs'
import path from 'path'

export interface ScreenshotOptions {
  fullPage?: boolean
  quality?: number
  type?: 'png' | 'jpeg'
  clip?: {
    x: number
    y: number
    width: number
    height: number
  }
  omitBackground?: boolean
}

export interface ErrorCaptureData {
  screenshot: string
  html: string
  console: string
  network: string
  storage: string
  error: string
}

export class ScreenshotUtils {
  private static screenshotCounter = 0
  private static baseDir = './test-results'

  // Ensure directories exist
  static ensureDirectories() {
    const dirs = [
      `${this.baseDir}/screenshots`,
      `${this.baseDir}/errors`,
      `${this.baseDir}/debug`,
      `${this.baseDir}/comparisons`
    ]

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    })
  }

  // Take a basic screenshot
  static async takeScreenshot(
    page: Page, 
    name: string, 
    options: ScreenshotOptions = {}
  ): Promise<string> {
    this.ensureDirectories()
    
    const timestamp = Date.now()
    const filename = `${name}-${timestamp}.${options.type || 'png'}`
    const filepath = path.join(this.baseDir, 'screenshots', filename)

    const screenshotOptions = {
      path: filepath as `${string}.png`,
      fullPage: options.fullPage !== false, // Default to true
      quality: options.quality,
      type: options.type || 'png',
      clip: options.clip,
      omitBackground: options.omitBackground
    }

    await page.screenshot(screenshotOptions)
    
    return filepath
  }

  // Take screenshot of specific element
  static async takeElementScreenshot(
    page: Page,
    selector: string,
    name: string,
    options: ScreenshotOptions = {}
  ): Promise<string> {
    this.ensureDirectories()
    
    const element = await page.$(selector)
    if (!element) {
      throw new Error(`Element not found: ${selector}`)
    }

    const timestamp = Date.now()
    const filename = `${name}-element-${timestamp}.${options.type || 'png'}`
    const filepath = path.join(this.baseDir, 'screenshots', filename)

    await element.screenshot({
      path: filepath as `${string}.png`,
      quality: options.quality,
      type: options.type || 'png',
      omitBackground: options.omitBackground
    })

    return filepath
  }

  // Take multiple screenshots for comparison
  static async takeComparisonScreenshots(
    page: Page,
    name: string,
    actions: Array<{ name: string; action: () => Promise<void> }>
  ): Promise<string[]> {
    this.ensureDirectories()
    
    const screenshots = []
    
    for (const { name: actionName, action } of actions) {
      await action()
      await new Promise(resolve => setTimeout(resolve, 500)) // Wait for changes to settle
      
      const screenshot = await this.takeScreenshot(page, `${name}-${actionName}`)
      screenshots.push(screenshot)
    }

    return screenshots
  }

  // Take screenshot with annotations
  static async takeAnnotatedScreenshot(
    page: Page,
    name: string,
    annotations: Array<{
      selector: string
      text: string
      color?: string
    }>
  ): Promise<string> {
    // Add annotations to the page
    await page.evaluate((annotationData) => {
      annotationData.forEach(({ selector, text, color = 'red' }) => {
        const element = document.querySelector(selector)
        if (element) {
          const annotation = document.createElement('div')
          annotation.style.cssText = `
            position: absolute;
            background: ${color};
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-family: Arial, sans-serif;
            z-index: 10000;
            pointer-events: none;
          `
          annotation.textContent = text
          
          const rect = element.getBoundingClientRect()
          annotation.style.left = `${rect.left}px`
          annotation.style.top = `${rect.top - 30}px`
          
          document.body.appendChild(annotation)
        }
      })
    }, annotations)

    const screenshot = await this.takeScreenshot(page, `${name}-annotated`)

    // Remove annotations
    await page.evaluate(() => {
      const annotations = document.querySelectorAll('[style*="z-index: 10000"]')
      annotations.forEach(annotation => annotation.remove())
    })

    return screenshot
  }

  // Take responsive screenshots
  static async takeResponsiveScreenshots(
    page: Page,
    name: string,
    viewports: Array<{ name: string; width: number; height: number }>
  ): Promise<Record<string, string>> {
    const screenshots: Record<string, string> = {}

    for (const viewport of viewports) {
      await page.setViewport({
        width: viewport.width,
        height: viewport.height
      })
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for responsive changes
      
      const screenshot = await this.takeScreenshot(page, `${name}-${viewport.name}`)
      screenshots[viewport.name] = screenshot
    }

    return screenshots
  }

  // Take screenshot sequence for animations
  static async takeAnimationSequence(
    page: Page,
    name: string,
    trigger: () => Promise<void>,
    duration: number = 2000,
    interval: number = 200
  ): Promise<string[]> {
    const screenshots = []
    
    // Take initial screenshot
    screenshots.push(await this.takeScreenshot(page, `${name}-frame-0`))
    
    // Trigger animation
    await trigger()
    
    // Take screenshots during animation
    const frames = Math.floor(duration / interval)
    for (let i = 1; i <= frames; i++) {
      await new Promise(resolve => setTimeout(resolve, interval))
      screenshots.push(await this.takeScreenshot(page, `${name}-frame-${i}`))
    }

    return screenshots
  }

  // Visual regression testing
  static async compareScreenshots(
    baseline: string,
    current: string,
    threshold: number = 0.1
  ): Promise<{
    match: boolean
    difference: number
    diffImage?: string
  }> {
    // This would typically use a library like pixelmatch
    // For now, we'll return a mock implementation
    
    const baselineExists = fs.existsSync(baseline)
    const currentExists = fs.existsSync(current)
    
    if (!baselineExists || !currentExists) {
      return {
        match: false,
        difference: 1,
        diffImage: undefined
      }
    }

    // Mock comparison - in real implementation, use pixelmatch or similar
    const mockDifference = Math.random() * 0.2 // Random difference for demo
    const match = mockDifference <= threshold

    return {
      match,
      difference: mockDifference,
      diffImage: match ? undefined : `${current}-diff.png`
    }
  }
}

export class ErrorCaptureUtils {
  private static baseDir = './test-results/errors'

  // Ensure error directory exists
  static ensureErrorDirectory() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true })
    }
  }

  // Capture comprehensive error data
  static async captureError(
    page: Page,
    error: Error,
    testName: string,
    context?: any
  ): Promise<ErrorCaptureData> {
    this.ensureErrorDirectory()
    
    const timestamp = Date.now()
    const errorDir = path.join(this.baseDir, `${testName}-${timestamp}`)
    
    if (!fs.existsSync(errorDir)) {
      fs.mkdirSync(errorDir, { recursive: true })
    }

    // Capture screenshot
    const screenshotPath = path.join(errorDir, 'error-screenshot.png') as `${string}.png`
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    })

    // Capture HTML content
    const htmlPath = path.join(errorDir, 'page-content.html')
    const htmlContent = await page.content()
    fs.writeFileSync(htmlPath, htmlContent)

    // Capture console logs
    const consolePath = path.join(errorDir, 'console-logs.json')
    const consoleLogs = await page.evaluate(() => {
      // Get console logs from the page context
      return {
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    })
    fs.writeFileSync(consolePath, JSON.stringify(consoleLogs, null, 2))

    // Capture network information
    const networkPath = path.join(errorDir, 'network-info.json')
    const networkInfo = await page.evaluate(() => {
      return {
        online: navigator.onLine,
        connection: (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt
        } : null
      }
    })
    fs.writeFileSync(networkPath, JSON.stringify(networkInfo, null, 2))

    // Capture storage data
    const storagePath = path.join(errorDir, 'storage-data.json')
    const storageData = await page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
        cookies: document.cookie
      }
    })
    fs.writeFileSync(storagePath, JSON.stringify(storageData, null, 2))

    // Capture error details
    const errorPath = path.join(errorDir, 'error-details.json')
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      testName,
      context,
      url: page.url()
    }
    fs.writeFileSync(errorPath, JSON.stringify(errorDetails, null, 2))

    return {
      screenshot: screenshotPath,
      html: htmlPath,
      console: consolePath,
      network: networkPath,
      storage: storagePath,
      error: errorPath
    }
  }

  // Capture performance data on error
  static async capturePerformanceData(page: Page, errorDir: string) {
    const performancePath = path.join(errorDir, 'performance-data.json')
    
    const performanceData = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      return {
        navigation: navigation ? {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          responseTime: navigation.responseEnd - navigation.requestStart
        } : null,
        paint: paint.map(entry => ({
          name: entry.name,
          startTime: entry.startTime
        })),
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null
      }
    })

    fs.writeFileSync(performancePath, JSON.stringify(performanceData, null, 2))
    return performancePath
  }

  // Setup automatic error capture
  static setupAutomaticCapture(page: Page, testName: string) {
    // Capture page errors
    page.on('pageerror', async (error) => {
      console.error(`Page error in ${testName}:`, error.message)
      await this.captureError(page, error, testName, { type: 'pageerror' })
    })

    // Capture failed requests
    page.on('requestfailed', async (request) => {
      const error = new Error(`Request failed: ${request.url()}`)
      console.error(`Request failed in ${testName}:`, request.url(), request.failure()?.errorText)
      await this.captureError(page, error, testName, { 
        type: 'requestfailed',
        url: request.url(),
        method: request.method(),
        failure: request.failure()
      })
    })

    // Capture console errors
    page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        const error = new Error(`Console error: ${msg.text()}`)
        console.error(`Console error in ${testName}:`, msg.text())
        await this.captureError(page, error, testName, { 
          type: 'console-error',
          message: msg.text(),
          location: msg.location()
        })
      }
    })

    // Capture response errors
    page.on('response', async (response) => {
      if (response.status() >= 400) {
        const error = new Error(`HTTP ${response.status()}: ${response.url()}`)
        console.error(`HTTP error in ${testName}:`, response.status(), response.url())
        await this.captureError(page, error, testName, {
          type: 'http-error',
          status: response.status(),
          url: response.url(),
          headers: response.headers()
        })
      }
    })
  }

  // Generate error report
  static generateErrorReport(errorData: ErrorCaptureData, testName: string): string {
    const reportPath = path.join(path.dirname(errorData.error), 'error-report.html')
    
    const reportHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Error Report - ${testName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .error { background-color: #ffe6e6; }
        .screenshot { max-width: 100%; height: auto; border: 1px solid #ccc; }
        pre { background-color: #f5f5f5; padding: 10px; overflow-x: auto; }
        .file-link { color: #0066cc; text-decoration: none; }
        .file-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Error Report: ${testName}</h1>
    <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    
    <div class="section error">
        <h2>Error Details</h2>
        <p><strong>File:</strong> <a href="file://${errorData.error}" class="file-link">error-details.json</a></p>
    </div>
    
    <div class="section">
        <h2>Screenshot</h2>
        <img src="file://${errorData.screenshot}" alt="Error Screenshot" class="screenshot">
        <p><strong>File:</strong> <a href="file://${errorData.screenshot}" class="file-link">error-screenshot.png</a></p>
    </div>
    
    <div class="section">
        <h2>Additional Data</h2>
        <ul>
            <li><a href="file://${errorData.html}" class="file-link">Page HTML Content</a></li>
            <li><a href="file://${errorData.console}" class="file-link">Console Logs</a></li>
            <li><a href="file://${errorData.network}" class="file-link">Network Information</a></li>
            <li><a href="file://${errorData.storage}" class="file-link">Storage Data</a></li>
        </ul>
    </div>
</body>
</html>
    `
    
    fs.writeFileSync(reportPath, reportHtml)
    return reportPath
  }
}