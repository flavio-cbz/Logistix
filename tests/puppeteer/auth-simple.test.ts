import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { Page } from 'puppeteer'
import {
    setupPuppeteerSuite,
    teardownPuppeteerSuite,
    setupPuppeteerTest,
    teardownPuppeteerTest,
    PuppeteerTestUtils
} from './config'
import { LoginPage } from './page-objects/login-page'
import { ScreenshotUtils } from './utils/screenshot-utils'

describe('Simple Authentication Test', () => {
    let page: Page
    let loginPage: LoginPage

    beforeAll(async () => {
        await setupPuppeteerSuite()
    })

    afterAll(async () => {
        await teardownPuppeteerSuite()
    })

    beforeEach(async () => {
        page = await setupPuppeteerTest('simple-auth')
        loginPage = new LoginPage(page)

        // Clear browser data before each test
        await PuppeteerTestUtils.clearBrowserData(page)
    })

    afterEach(async () => {
        if (page) {
            await teardownPuppeteerTest(page)
        }
    })

    test('should load login page successfully', async () => {
        // Navigate to login page
        await loginPage.navigateToLogin()

        // Check if page loaded
        const isLoaded = await loginPage.isLoaded()
        expect(isLoaded).toBe(true)

        // Take screenshot
        await ScreenshotUtils.takeScreenshot(page, 'login-page-simple-test')

        // Check URL
        const currentUrl = loginPage.getCurrentUrl()
        expect(currentUrl).toContain('/login')
    })

    test('should have login form elements', async () => {
        await loginPage.navigateToLogin()

        // Check for form elements
        const hasEmailInput = await PuppeteerTestUtils.isElementVisible(page, '[data-testid="email-input"], input[name="email"], input[type="email"]')
        const hasPasswordInput = await PuppeteerTestUtils.isElementVisible(page, '[data-testid="password-input"], input[name="password"], input[type="password"]')
        const hasLoginButton = await PuppeteerTestUtils.isElementVisible(page, '[data-testid="login-button"], button[type="submit"], .login-button')

        expect(hasEmailInput).toBe(true)
        expect(hasPasswordInput).toBe(true)
        expect(hasLoginButton).toBe(true)

        await ScreenshotUtils.takeScreenshot(page, 'login-form-elements')
    })
})