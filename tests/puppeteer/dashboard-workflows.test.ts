import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { Page } from 'puppeteer'
import {
    setupPuppeteerTest,
    teardownPuppeteerTest,
    setupPuppeteerSuite,
    teardownPuppeteerSuite,
    PuppeteerTestUtils,
    ErrorCaptureUtils
} from './config'
import { LoginPage } from './page-objects/login-page'
import { DashboardPage } from './page-objects/dashboard-page'

describe('Dashboard Workflows - Puppeteer UI Tests', () => {
    let page: Page
    let loginPage: LoginPage
    let dashboardPage: DashboardPage

    beforeAll(async () => {
        await setupPuppeteerSuite()
    })

    afterAll(async () => {
        await teardownPuppeteerSuite()
    })

    beforeEach(async () => {
        page = await setupPuppeteerTest('dashboard-workflows')
        loginPage = new LoginPage(page)
        dashboardPage = new DashboardPage(page)
        
        // Setup test data via API
        await setupTestDashboardData()
        
        // Login before each test
        await loginPage.navigateToLogin()
        await loginPage.login('admin', 'password123')
        await PuppeteerTestUtils.waitForNavigation(page)
    })

    afterEach(async () => {
        await teardownPuppeteerTest(page)
    })

    async function setupTestDashboardData() {
        // Mock API responses for consistent test data
        await PuppeteerTestUtils.mockApiResponse(page, '/api/v1/statistiques', {
            produitsVendus: 5,
            ventesTotales: 250.00,
            beneficesTotaux: 75.00,
            nombreParcelles: 3,
            roiParProduit: [
                { produit: 'Product A', roi: 45.5 },
                { produit: 'Product B', roi: 38.2 },
                { produit: 'Product C', roi: 32.1 }
            ],
            tempsMoyenVente: [
                { categorie: 'Vinted', jours: 7 },
                { categorie: 'eBay', jours: 12 }
            ],
            heatmapVentes: Array.from({ length: 168 }, (_, i) => ({
                day: Math.floor(i / 24),
                hour: i % 24,
                value: Math.floor(Math.random() * 5)
            })),
            meilleuresPlateformes: [
                { plateforme: 'Vinted', rentabilite: 45.00 },
                { plateforme: 'eBay', rentabilite: 30.00 }
            ],
            radarPerformances: [
                { subject: 'Bénéfice Moyen', A: 75, fullMark: 100 },
                { subject: 'Vitesse Vente', A: 60, fullMark: 100 },
                { subject: 'Volume Ventes', A: 85, fullMark: 100 }
            ],
            tendancesSaisonnieres: [
                { periode: '2024-01', ventes: 120.00 },
                { periode: '2024-02', ventes: 130.00 }
            ],
            courbeTendance: [
                { mois: 'Jan 24', valeur: 120.00, min: 108.00, max: 132.00 },
                { mois: 'Fév 24', valeur: 130.00, min: 117.00, max: 143.00 }
            ],
            previsionsVentes: [
                { mois: 'Mar 24', prevision: 140.00 },
                { mois: 'Avr 24', prevision: 145.00 }
            ]
        })
    }

    describe('Dashboard Widget Display and Interaction', () => {
        test('should display main dashboard with key statistics', async () => {
            await dashboardPage.navigateToDashboard()
            
            // Verify main dashboard elements are visible
            expect(await dashboardPage.isDashboardTitleVisible()).toBe(true)
            expect(await dashboardPage.areStatCardsVisible()).toBe(true)
            
            // Verify key statistics are displayed
            const totalParcelles = await dashboardPage.getStatCardValue('Total Parcelles')
            const produitsVendus = await dashboardPage.getStatCardValue('Produits Vendus')
            const ventesTotales = await dashboardPage.getStatCardValue('Ventes Totales')
            const beneficesTotaux = await dashboardPage.getStatCardValue('Bénéfices Totaux')
            
            expect(totalParcelles).toBeDefined()
            expect(produitsVendus).toBeDefined()
            expect(ventesTotales).toContain('€')
            expect(beneficesTotaux).toContain('€')
        })

        test('should display dashboard widgets correctly', async () => {
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Verify dashboard widgets are loaded
            const widgets = await dashboardPage.getDashboardWidgets()
            expect(widgets.length).toBeGreaterThan(0)
            
            // Check for common widget types
            const widgetTitles = await dashboardPage.getWidgetTitles()
            expect(widgetTitles.length).toBeGreaterThan(0)
            
            // Verify widgets have content
            for (const widget of widgets) {
                const hasContent = await dashboardPage.widgetHasContent(widget)
                expect(hasContent).toBe(true)
            }
        })

        test('should interact with dashboard widgets', async () => {
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Test widget interactions
            const interactiveWidgets = await dashboardPage.getInteractiveWidgets()
            
            for (const widget of interactiveWidgets) {
                // Test hover effects
                await dashboardPage.hoverOverWidget(widget)
                await page.waitForTimeout(500)
                
                // Test click interactions if applicable
                const isClickable = await dashboardPage.isWidgetClickable(widget)
                if (isClickable) {
                    await dashboardPage.clickWidget(widget)
                    await page.waitForTimeout(1000)
                }
            }
        })

        test('should display statistics page with advanced analytics', async () => {
            await dashboardPage.navigateToStatistics()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Verify statistics page elements
            expect(await dashboardPage.isStatisticsPageVisible()).toBe(true)
            
            // Check for advanced statistics components
            const statisticsComponents = await dashboardPage.getStatisticsComponents()
            expect(statisticsComponents.length).toBeGreaterThan(0)
            
            // Verify specific statistics sections
            expect(await dashboardPage.isROITableVisible()).toBe(true)
            expect(await dashboardPage.isHeatmapVisible()).toBe(true)
            expect(await dashboardPage.isRadarChartVisible()).toBe(true)
            expect(await dashboardPage.isTrendChartVisible()).toBe(true)
        })

        test('should handle loading states properly', async () => {
            await dashboardPage.navigateToDashboard()
            
            // Verify loading indicators appear and disappear
            const hasLoadingIndicators = await dashboardPage.hasLoadingIndicators()
            
            if (hasLoadingIndicators) {
                // Wait for loading to complete
                await PuppeteerTestUtils.waitForLoadingToFinish(page)
                
                // Verify loading indicators are gone
                const stillLoading = await dashboardPage.hasLoadingIndicators()
                expect(stillLoading).toBe(false)
            }
            
            // Verify content is loaded
            expect(await dashboardPage.areStatCardsVisible()).toBe(true)
        })
    })

    describe('Widget Customization and Layout Changes', () => {
        test('should open dashboard configuration', async () => {
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Open dashboard configuration
            const configButton = await dashboardPage.findConfigurationButton()
            if (configButton) {
                await dashboardPage.openConfiguration()
                
                // Verify configuration panel is open
                expect(await dashboardPage.isConfigurationPanelOpen()).toBe(true)
            }
        })

        test('should customize widget visibility', async () => {
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            const configButton = await dashboardPage.findConfigurationButton()
            if (configButton) {
                await dashboardPage.openConfiguration()
                
                // Get initial widget count
                const initialWidgets = await dashboardPage.getDashboardWidgets()
                const initialCount = initialWidgets.length
                
                // Toggle a widget off
                const toggledWidget = await dashboardPage.toggleWidgetVisibility(0)
                if (toggledWidget) {
                    await dashboardPage.saveConfiguration()
                    await PuppeteerTestUtils.waitForLoadingToFinish(page)
                    
                    // Verify widget count changed
                    const updatedWidgets = await dashboardPage.getDashboardWidgets()
                    expect(updatedWidgets.length).toBeLessThan(initialCount)
                }
            }
        })

        test('should reorder dashboard widgets', async () => {
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            const configButton = await dashboardPage.findConfigurationButton()
            if (configButton) {
                await dashboardPage.openConfiguration()
                
                // Get initial widget order
                const initialOrder = await dashboardPage.getWidgetOrder()
                
                // Reorder widgets if possible
                const reordered = await dashboardPage.reorderWidgets(0, 1)
                if (reordered) {
                    await dashboardPage.saveConfiguration()
                    await PuppeteerTestUtils.waitForLoadingToFinish(page)
                    
                    // Verify order changed
                    const newOrder = await dashboardPage.getWidgetOrder()
                    expect(newOrder).not.toEqual(initialOrder)
                }
            }
        })

        test('should change dashboard grid layout', async () => {
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            const configButton = await dashboardPage.findConfigurationButton()
            if (configButton) {
                await dashboardPage.openConfiguration()
                
                // Change grid layout if option exists
                const layoutChanged = await dashboardPage.changeGridLayout('3-column')
                if (layoutChanged) {
                    await dashboardPage.saveConfiguration()
                    await PuppeteerTestUtils.waitForLoadingToFinish(page)
                    
                    // Verify layout changed
                    const currentLayout = await dashboardPage.getCurrentGridLayout()
                    expect(currentLayout).toContain('3')
                }
            }
        })
    })

    describe('Chart Rendering and Interactive Elements', () => {
        test('should render charts correctly on statistics page', async () => {
            await dashboardPage.navigateToStatistics()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Verify charts are rendered
            const charts = await dashboardPage.getRenderedCharts()
            expect(charts.length).toBeGreaterThan(0)
            
            // Check specific chart types
            expect(await dashboardPage.isHeatmapRendered()).toBe(true)
            expect(await dashboardPage.isRadarChartRendered()).toBe(true)
            expect(await dashboardPage.isTrendChartRendered()).toBe(true)
        })

        test('should interact with chart elements', async () => {
            await dashboardPage.navigateToStatistics()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Test heatmap interactions
            if (await dashboardPage.isHeatmapRendered()) {
                await dashboardPage.hoverOverHeatmapCell(3, 14) // Day 3, Hour 14
                await page.waitForTimeout(500)
                
                // Check for tooltip or hover effects
                const hasTooltip = await dashboardPage.hasChartTooltip()
                expect(hasTooltip).toBe(true)
            }
            
            // Test radar chart interactions
            if (await dashboardPage.isRadarChartRendered()) {
                await dashboardPage.hoverOverRadarPoint('Bénéfice Moyen')
                await page.waitForTimeout(500)
            }
            
            // Test trend chart interactions
            if (await dashboardPage.isTrendChartRendered()) {
                await dashboardPage.hoverOverTrendPoint(0)
                await page.waitForTimeout(500)
            }
        })

        test('should handle chart data updates', async () => {
            await dashboardPage.navigateToStatistics()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Get initial chart data
            const initialChartData = await dashboardPage.getChartDataPoints()
            
            // Simulate data refresh
            await page.reload()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Verify charts re-render with data
            const updatedChartData = await dashboardPage.getChartDataPoints()
            expect(updatedChartData.length).toBeGreaterThan(0)
        })

        test('should export chart data', async () => {
            await dashboardPage.navigateToStatistics()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Test CSV export
            const csvExported = await dashboardPage.exportStatistics('csv')
            expect(csvExported).toBe(true)
            
            // Verify download was triggered
            await page.waitForTimeout(2000)
        })

        test('should handle chart responsiveness', async () => {
            await dashboardPage.navigateToStatistics()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Test different viewport sizes
            const viewports = [
                { width: 1920, height: 1080 }, // Desktop
                { width: 1024, height: 768 },  // Tablet
                { width: 375, height: 667 }    // Mobile
            ]
            
            for (const viewport of viewports) {
                await page.setViewport(viewport)
                await page.waitForTimeout(1000)
                
                // Verify charts adapt to viewport
                const chartsVisible = await dashboardPage.areChartsVisible()
                expect(chartsVisible).toBe(true)
                
                // Check chart dimensions
                const chartDimensions = await dashboardPage.getChartDimensions()
                expect(chartDimensions.width).toBeLessThanOrEqual(viewport.width)
            }
        })
    })

    describe('Responsive Dashboard on Mobile Devices', () => {
        test('should display mobile-optimized dashboard', async () => {
            // Set mobile viewport
            await PuppeteerTestUtils.emulateDevice(page, 'mobile')
            
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Verify mobile layout
            expect(await dashboardPage.isMobileLayoutActive()).toBe(true)
            expect(await dashboardPage.areStatCardsVisible()).toBe(true)
            
            // Check mobile-specific elements
            const mobileMenu = await dashboardPage.findMobileMenu()
            expect(mobileMenu).toBeDefined()
        })

        test('should handle mobile navigation', async () => {
            await PuppeteerTestUtils.emulateDevice(page, 'mobile')
            
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Test mobile menu
            const mobileMenuToggle = await dashboardPage.findMobileMenuToggle()
            if (mobileMenuToggle) {
                await dashboardPage.toggleMobileMenu()
                
                // Verify menu is open
                expect(await dashboardPage.isMobileMenuOpen()).toBe(true)
                
                // Navigate to statistics via mobile menu
                await dashboardPage.navigateToStatisticsViaMobileMenu()
                await PuppeteerTestUtils.waitForNavigation(page)
                
                expect(await dashboardPage.isStatisticsPageVisible()).toBe(true)
            }
        })

        test('should optimize charts for mobile', async () => {
            await PuppeteerTestUtils.emulateDevice(page, 'mobile')
            
            await dashboardPage.navigateToStatistics()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Verify mobile chart optimizations
            const charts = await dashboardPage.getRenderedCharts()
            
            for (const chart of charts) {
                const dimensions = await dashboardPage.getChartDimensions(chart)
                expect(dimensions.width).toBeLessThanOrEqual(375) // Mobile width
                
                // Check for mobile-specific chart features
                const hasMobileOptimizations = await dashboardPage.hasMobileChartOptimizations(chart)
                expect(hasMobileOptimizations).toBe(true)
            }
        })

        test('should handle touch interactions on mobile', async () => {
            await PuppeteerTestUtils.emulateDevice(page, 'mobile')
            
            await dashboardPage.navigateToStatistics()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Test touch interactions
            if (await dashboardPage.isHeatmapRendered()) {
                await dashboardPage.touchHeatmapCell(2, 10)
                await page.waitForTimeout(500)
                
                // Verify touch feedback
                const hasTouchFeedback = await dashboardPage.hasTouchFeedback()
                expect(hasTouchFeedback).toBe(true)
            }
        })

        test('should handle tablet layout', async () => {
            await PuppeteerTestUtils.emulateDevice(page, 'tablet')
            
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Verify tablet-specific layout
            expect(await dashboardPage.isTabletLayoutActive()).toBe(true)
            
            // Check widget arrangement for tablet
            const widgets = await dashboardPage.getDashboardWidgets()
            const widgetLayout = await dashboardPage.getWidgetLayout()
            
            expect(widgetLayout.columns).toBeGreaterThan(1)
            expect(widgetLayout.columns).toBeLessThan(4) // Tablet should have 2-3 columns
        })
    })

    describe('Performance and Error Handling', () => {
        test('should load dashboard within acceptable time', async () => {
            const startTime = Date.now()
            
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            const loadTime = Date.now() - startTime
            expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
        })

        test('should handle API errors gracefully', async () => {
            // Mock API error
            await page.setRequestInterception(true)
            page.on('request', (request) => {
                if (request.url().includes('/api/v1/statistiques')) {
                    request.respond({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ message: 'Internal server error' })
                    })
                } else {
                    request.continue()
                }
            })
            
            await dashboardPage.navigateToStatistics()
            await page.waitForTimeout(3000)
            
            // Verify error handling
            const hasErrorMessage = await dashboardPage.hasErrorMessage()
            expect(hasErrorMessage).toBe(true)
        })

        test('should handle network timeouts', async () => {
            // Simulate slow network
            await page.setRequestInterception(true)
            page.on('request', (request) => {
                if (request.url().includes('/api/v1/statistiques')) {
                    setTimeout(() => {
                        request.continue()
                    }, 10000) // 10 second delay
                } else {
                    request.continue()
                }
            })
            
            await dashboardPage.navigateToStatistics()
            
            // Should show loading state
            expect(await dashboardPage.hasLoadingIndicators()).toBe(true)
            
            // Should eventually timeout or show error
            await page.waitForTimeout(15000)
            const hasTimeoutError = await dashboardPage.hasTimeoutError()
            expect(hasTimeoutError).toBe(true)
        })

        test('should maintain functionality with JavaScript errors', async () => {
            // Inject JavaScript error
            await page.evaluateOnNewDocument(() => {
                window.addEventListener('error', (e) => {
                    console.error('Injected error:', e.error)
                })
                
                // Simulate random errors
                setTimeout(() => {
                    throw new Error('Simulated JavaScript error')
                }, 2000)
            })
            
            await dashboardPage.navigateToDashboard()
            await PuppeteerTestUtils.waitForLoadingToFinish(page)
            
            // Dashboard should still be functional
            expect(await dashboardPage.areStatCardsVisible()).toBe(true)
        })
    })
})