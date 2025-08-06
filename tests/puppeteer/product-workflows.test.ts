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

describe('Product Management Workflows - Puppeteer UI Tests', () => {
    let page: Page
    let loginPage: LoginPage

    beforeAll(async () => {
        await setupPuppeteerSuite()
    })

    afterAll(async () => {
        await teardownPuppeteerSuite()
    })

    beforeEach(async () => {
        page = await setupPuppeteerTest('product-workflows')
        loginPage = new LoginPage(page)
        
        // Login before each test
        await loginPage.navigateToLogin()
        await loginPage.login('admin', 'password123')
        await PuppeteerTestUtils.waitForNavigation(page)
    })

    afterEach(async () => {
        await teardownPuppeteerTest(page)
    })

    describe('Product Creation Workflows', () => {
        test('should create product with complete information', async () => {
            // Navigate to products page
            await page.goto('http://localhost:3000/produits')
            await PuppeteerTestUtils.waitForLoadingToFinish(page)

            // Click create product button
            const createButton = await page.waitForSelector('[data-testid="create-product-btn"], .create-product-btn, button:has-text("Créer"), button:has-text("Nouveau")')
            await createButton?.click()

            // Wait for form to appear
            await page.waitForSelector('form, [data-testid="product-form"]')

            // Fill product form
            const productData = {
                '[name="nom"], [data-testid="product-name"]': 'Test Product UI',
                '[name="prixArticle"], [data-testid="product-price"]': '25.50',
                '[name="prixLivraison"], [data-testid="delivery-price"]': '5.00',
                '[name="poids"], [data-testid="product-weight"]': '250',
                '[name="commandeId"], [data-testid="command-id"]': 'CMD-UI-001',
                '[name="details"], [data-testid="product-details"]': 'Product created via UI test'
            }

            for (const [selector, value] of Object.entries(productData)) {
                const field = await page.$(selector)
                if (field) {
                    await field.click()
                    await field.evaluate(el => (el as HTMLInputElement).value = '')
                    await field.type(value)
                }
            }

            // Submit form
            const submitButton = await page.waitForSelector('button[type="submit"], [data-testid="submit-btn"], button:has-text("Créer"), button:has-text("Enregistrer")')
            await submitButton?.click()

            // Wait for success message or redirect
            await Promise.race([
                page.waitForSelector('.success-message, [data-testid="success-message"]', { timeout: 5000 }),
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }),
                PuppeteerTestUtils.waitForText(page, 'créé avec succès', 5000)
            ]).catch(() => {
                // If no success indicator, continue - the product might still be created
            })

            // Verify product appears in list
            await page.goto('http://localhost:3000/produits')
            await PuppeteerTestUtils.waitForLoadingToFinish(page)

            const productExists = await PuppeteerTestUtils.waitForText(page, 'Test Product UI', 5000)
            expect(productExists).toBe(true)
        })

        test('should validate required fields on product creation', async () => {
            await page.goto('http://localhost:3000/produits')
            await PuppeteerTestUtils.waitForLoadingToFinish(page)

            // Click create product button
            const createButton = await page.waitForSelector('[data-testid="create-product-btn"], .create-product-btn, button:has-text("Créer"), button:has-text("Nouveau")')
            await createButton?.click()

            // Wait for form
            await page.waitForSelector('form, [data-testid="product-form"]')

            // Try to submit empty form
            const submitButton = await page.waitForSelector('button[type="submit"], [data-testid="submit-btn"], button:has-text("Créer"), button:has-text("Enregistrer")')
            await submitButton?.click()

            // Check for validation errors
            const hasValidationErrors = await Promise.race([
                PuppeteerTestUtils.waitForText(page, 'requis', 3000),
                PuppeteerTestUtils.waitForText(page, 'obligatoire', 3000),
                PuppeteerTestUtils.waitForText(page, 'required', 3000),
                page.waitForSelector('.error, .invalid, [data-testid="error"]', { timeout: 3000 })
            ]).then(() => true).catch(() => false)

            expect(hasValidationErrors).toBe(true)
        })
    })

    describe('Sales Recording Workflows', () => {
        test('should record product sale with platform selection', async () => {
            // Navigate to products page
            await page.goto('http://localhost:3000/produits')
            await PuppeteerTestUtils.waitForLoadingToFinish(page)

            // Create a product first if needed
            const createButton = await page.$('[data-testid="create-product-btn"], .create-product-btn, button:has-text("Créer"), button:has-text("Nouveau")')
            if (createButton) {
                await createButton.click()
                await page.waitForSelector('form, [data-testid="product-form"]')

                const productData = {
                    '[name="nom"], [data-testid="product-name"]': 'Product for Sale',
                    '[name="prixArticle"], [data-testid="product-price"]': '30.00',
                    '[name="prixLivraison"], [data-testid="delivery-price"]': '6.00',
                    '[name="poids"], [data-testid="product-weight"]': '300',
                    '[name="commandeId"], [data-testid="command-id"]': 'CMD-SALE-001'
                }

                for (const [selector, value] of Object.entries(productData)) {
                    const field = await page.$(selector)
                    if (field) {
                        await field.click()
                        await field.evaluate(el => (el as HTMLInputElement).value = '')
                        await field.type(value)
                    }
                }

                const submitButton = await page.waitForSelector('button[type="submit"], [data-testid="submit-btn"]')
                await submitButton?.click()
                await new Promise(resolve => setTimeout(resolve, 1000))
            }

            // Now record the sale
            await page.goto('http://localhost:3000/produits')
            await PuppeteerTestUtils.waitForLoadingToFinish(page)

            // Find sell button or edit to mark as sold
            const sellButton = await page.waitForSelector('[data-testid="sell-btn"], .sell-btn, button:has-text("Vendre"), [data-testid="edit-btn"]')
            await sellButton?.click()

            // Wait for sale form or edit form
            await page.waitForSelector('form, [data-testid="product-form"], [data-testid="sale-form"]')

            // Mark as sold
            const soldCheckbox = await page.$('[name="vendu"], [data-testid="sold-checkbox"], input[type="checkbox"]')
            if (soldCheckbox) {
                await soldCheckbox.click()
            }

            // Fill sale details
            const saleData = {
                '[name="prixVente"], [data-testid="sale-price"]': '50.00',
                '[name="dateVente"], [data-testid="sale-date"]': '2024-01-20',
                '[name="tempsEnLigne"], [data-testid="time-online"]': '5 days'
            }

            for (const [selector, value] of Object.entries(saleData)) {
                const field = await page.$(selector)
                if (field) {
                    await field.click()
                    await field.evaluate(el => (el as HTMLInputElement).value = '')
                    await field.type(value)
                }
            }

            // Select platform
            const platformSelect = await page.$('[name="plateforme"], [data-testid="platform-select"], select')
            if (platformSelect) {
                await platformSelect.select('Vinted')
            } else {
                // Try radio buttons or other platform selection
                const vintedOption = await page.$('input[value="Vinted"], [data-value="Vinted"]')
                if (vintedOption) {
                    await vintedOption.click()
                }
            }

            // Submit sale
            const submitButton = await page.waitForSelector('button[type="submit"], [data-testid="submit-btn"], button:has-text("Enregistrer")')
            await submitButton?.click()

            // Wait for completion
            await Promise.race([
                page.waitForSelector('.success-message, [data-testid="success-message"]', { timeout: 5000 }),
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }),
                PuppeteerTestUtils.waitForText(page, 'vendu', 5000)
            ]).catch(() => {})

            // Verify sale is recorded
            await page.goto('http://localhost:3000/produits')
            await PuppeteerTestUtils.waitForLoadingToFinish(page)

            // Look for sold indicator
            const saleRecorded = await Promise.race([
                PuppeteerTestUtils.waitForText(page, 'Vendu', 3000),
                PuppeteerTestUtils.waitForText(page, '50.00', 3000),
                page.waitForSelector('.sold-indicator, [data-testid="sold-badge"]', { timeout: 3000 })
            ]).then(() => true).catch(() => false)

            expect(saleRecorded).toBe(true)
        })
    })

    describe('Product Statistics and Visualization', () => {
        test('should display product statistics dashboard', async () => {
            // Navigate to statistics or dashboard page
            await page.goto('http://localhost:3000/statistiques')
            await PuppeteerTestUtils.waitForLoadingToFinish(page)

            // Look for statistics widgets
            const statsVisible = await Promise.race([
                page.waitForSelector('[data-testid="total-products"], .total-products', { timeout: 3000 }),
                page.waitForSelector('[data-testid="sold-products"], .sold-products', { timeout: 3000 }),
                page.waitForSelector('[data-testid="revenue"], .revenue', { timeout: 3000 }),
                PuppeteerTestUtils.waitForText(page, 'statistiques', 3000),
                PuppeteerTestUtils.waitForText(page, 'revenus', 3000)
            ]).then(() => true).catch(() => false)

            if (statsVisible) {
                // Verify some statistics are displayed
                const hasStats = await Promise.race([
                    PuppeteerTestUtils.waitForText(page, 'Total', 3000),
                    PuppeteerTestUtils.waitForText(page, 'Vendu', 3000),
                    page.waitForSelector('[data-testid="stats-widget"], .stats-widget', { timeout: 3000 })
                ]).then(() => true).catch(() => false)

                expect(hasStats).toBe(true)
            } else {
                // If no statistics page found, check products page for stats
                await page.goto('http://localhost:3000/produits')
                await PuppeteerTestUtils.waitForLoadingToFinish(page)

                const productStatsVisible = await Promise.race([
                    page.waitForSelector('[data-testid="product-stats"], .product-stats', { timeout: 3000 }),
                    PuppeteerTestUtils.waitForText(page, 'Total:', 3000),
                    PuppeteerTestUtils.waitForText(page, 'Vendu:', 3000)
                ]).then(() => true).catch(() => false)

                expect(productStatsVisible).toBe(true)
            }
        })
    })

    describe('Responsive Design', () => {
        test('should display products correctly on mobile devices', async () => {
            // Emulate mobile device
            await PuppeteerTestUtils.emulateDevice(page, 'mobile')
            
            await page.goto('http://localhost:3000/produits')
            await PuppeteerTestUtils.waitForLoadingToFinish(page)

            // Verify mobile layout
            const mobileLayoutVisible = await Promise.race([
                page.waitForSelector('[data-testid="mobile-layout"], .mobile-layout', { timeout: 3000 }),
                page.waitForSelector('.responsive-grid', { timeout: 3000 }),
                PuppeteerTestUtils.waitForText(page, 'Produits', 3000)
            ]).then(() => true).catch(() => false)

            expect(mobileLayoutVisible).toBe(true)
        })
    })
})