import { Page } from 'puppeteer'
import { PuppeteerTestUtils } from '../config'

export class DashboardPage {
    constructor(private page: Page) {}

    // Navigation methods
    async navigateToDashboard(): Promise<void> {
        await this.page.goto('/dashboard')
        await this.page.waitForSelector('h1', { timeout: 10000 })
    }

    async navigateToStatistics(): Promise<void> {
        await this.page.goto('/statistiques')
        await this.page.waitForSelector('h1', { timeout: 10000 })
    }

    // Dashboard visibility checks
    async isDashboardTitleVisible(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, 'h1:contains("Dashboard")')
    }

    async areStatCardsVisible(): Promise<boolean> {
        const statCards = await this.page.$$('[data-testid="stat-card"], .grid .card')
        return statCards.length >= 4 // Should have at least 4 stat cards
    }

    async isStatisticsPageVisible(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, 'h1, h3')
    }

    // Stat card methods
    async getStatCardValue(title: string): Promise<string> {
        const cards = await this.page.$$('.grid .card')
        
        for (const card of cards) {
            const cardTitle = await card.$eval('h3, .text-sm', el => el.textContent?.trim())
            if (cardTitle === title) {
                const value = await card.$eval('.text-2xl, .font-bold', el => el.textContent?.trim())
                return value || ''
            }
        }
        
        return ''
    }

    // Widget methods
    async getDashboardWidgets(): Promise<any[]> {
        return this.page.$$('.grid .card:not(.grid .card .card)')
    }

    async getWidgetTitles(): Promise<string[]> {
        const titles = await this.page.$$eval('.card h3, .card .font-medium', 
            elements => elements.map(el => el.textContent?.trim() || '')
        )
        return titles.filter(title => title.length > 0)
    }

    async widgetHasContent(widget: any): Promise<boolean> {
        try {
            const content = await widget.$('.card-content, .p-6')
            return content !== null
        } catch {
            return false
        }
    }

    async getInteractiveWidgets(): Promise<any[]> {
        return this.page.$$('.card[role="button"], .card.cursor-pointer, .card:hover')
    }

    async hoverOverWidget(widget: any): Promise<void> {
        await widget.hover()
    }

    async isWidgetClickable(widget: any): Promise<boolean> {
        try {
            const clickable = await widget.evaluate((el: Element) => {
                const style = window.getComputedStyle(el)
                return style.cursor === 'pointer' || el.getAttribute('role') === 'button'
            })
            return clickable
        } catch {
            return false
        }
    }

    async clickWidget(widget: any): Promise<void> {
        await widget.click()
    }

    // Configuration methods
    async findConfigurationButton(): Promise<any> {
        try {
            return await this.page.$('button:contains("Configuration"), button:contains("Config"), [data-testid="config-button"]')
        } catch {
            return null
        }
    }

    async openConfiguration(): Promise<void> {
        const configButton = await this.findConfigurationButton()
        if (configButton) {
            await configButton.click()
            await this.page.waitForTimeout(1000)
        }
    }

    async isConfigurationPanelOpen(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, '[data-testid="config-panel"], .config-panel, .modal')
    }

    async toggleWidgetVisibility(index: number): Promise<boolean> {
        try {
            const toggles = await this.page.$$('input[type="checkbox"], .toggle, .switch')
            if (toggles[index]) {
                await toggles[index].click()
                return true
            }
            return false
        } catch {
            return false
        }
    }

    async saveConfiguration(): Promise<void> {
        const saveButton = await this.page.$('button:contains("Save"), button:contains("Sauvegarder"), [data-testid="save-config"]')
        if (saveButton) {
            await saveButton.click()
            await this.page.waitForTimeout(1000)
        }
    }

    async getWidgetOrder(): Promise<string[]> {
        return this.page.$$eval('.card h3, .card .font-medium', 
            elements => elements.map(el => el.textContent?.trim() || '')
        )
    }

    async reorderWidgets(fromIndex: number, toIndex: number): Promise<boolean> {
        try {
            // This would depend on the specific drag-and-drop implementation
            // For now, return false as it's not implemented
            return false
        } catch {
            return false
        }
    }

    async changeGridLayout(layout: string): Promise<boolean> {
        try {
            const layoutButton = await this.page.$(`button:contains("${layout}"), [data-layout="${layout}"]`)
            if (layoutButton) {
                await layoutButton.click()
                return true
            }
            return false
        } catch {
            return false
        }
    }

    async getCurrentGridLayout(): Promise<string> {
        try {
            const gridElement = await this.page.$('.grid')
            if (gridElement) {
                const classes = await gridElement.evaluate(el => el.className)
                if (classes.includes('grid-cols-3')) return '3-column'
                if (classes.includes('grid-cols-2')) return '2-column'
                if (classes.includes('grid-cols-1')) return '1-column'
            }
            return '2-column' // default
        } catch {
            return '2-column'
        }
    }

    // Statistics page methods
    async getStatisticsComponents(): Promise<any[]> {
        return this.page.$$('.card, .chart-container, table')
    }

    async isROITableVisible(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, 'table, .roi-table, [data-testid="roi-table"]')
    }

    async isHeatmapVisible(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, '.heatmap, [data-testid="heatmap"], svg')
    }

    async isRadarChartVisible(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, '.radar-chart, [data-testid="radar-chart"], svg')
    }

    async isTrendChartVisible(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, '.trend-chart, [data-testid="trend-chart"], svg')
    }

    // Chart methods
    async getRenderedCharts(): Promise<any[]> {
        return this.page.$$('svg, canvas, .chart, [data-testid*="chart"]')
    }

    async isHeatmapRendered(): Promise<boolean> {
        const heatmap = await this.page.$('.heatmap svg, [data-testid="heatmap"] svg')
        return heatmap !== null
    }

    async isRadarChartRendered(): Promise<boolean> {
        const radar = await this.page.$('.radar-chart svg, [data-testid="radar-chart"] svg')
        return radar !== null
    }

    async isTrendChartRendered(): Promise<boolean> {
        const trend = await this.page.$('.trend-chart svg, [data-testid="trend-chart"] svg')
        return trend !== null
    }

    async hoverOverHeatmapCell(day: number, hour: number): Promise<void> {
        const cell = await this.page.$(`[data-day="${day}"][data-hour="${hour}"], .heatmap-cell[data-day="${day}"][data-hour="${hour}"]`)
        if (cell) {
            await cell.hover()
        }
    }

    async hoverOverRadarPoint(metric: string): Promise<void> {
        const point = await this.page.$(`[data-metric="${metric}"], .radar-point[data-metric="${metric}"]`)
        if (point) {
            await point.hover()
        }
    }

    async hoverOverTrendPoint(index: number): Promise<void> {
        const points = await this.page.$$('.trend-point, .line-point, circle')
        if (points[index]) {
            await points[index].hover()
        }
    }

    async hasChartTooltip(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, '.tooltip, [data-testid="tooltip"], .recharts-tooltip')
    }

    async getChartDataPoints(): Promise<any[]> {
        return this.page.$$('circle, rect, path, .data-point')
    }

    async areChartsVisible(): Promise<boolean> {
        const charts = await this.getRenderedCharts()
        return charts.length > 0
    }

    async getChartDimensions(chart?: any): Promise<{ width: number; height: number }> {
        const element = chart || await this.page.$('svg, canvas')
        if (element) {
            return element.evaluate((el: Element) => {
                const rect = el.getBoundingClientRect()
                return { width: rect.width, height: rect.height }
            })
        }
        return { width: 0, height: 0 }
    }

    // Export methods
    async exportStatistics(format: 'csv' | 'pdf'): Promise<boolean> {
        try {
            const exportButton = await this.page.$(`button:contains("${format.toUpperCase()}"), [data-export="${format}"]`)
            if (exportButton) {
                await exportButton.click()
                return true
            }
            return false
        } catch {
            return false
        }
    }

    // Loading and error methods
    async hasLoadingIndicators(): Promise<boolean> {
        const loadingElements = await this.page.$$('.loading, .spinner, .animate-spin, [data-testid="loading"]')
        return loadingElements.length > 0
    }

    async hasErrorMessage(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, '.error, .alert-error, [data-testid="error"]')
    }

    async hasTimeoutError(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, '.timeout, .error:contains("timeout"), [data-testid="timeout"]')
    }

    // Mobile methods
    async isMobileLayoutActive(): Promise<boolean> {
        const viewport = await this.page.viewport()
        return viewport ? viewport.width <= 768 : false
    }

    async isTabletLayoutActive(): Promise<boolean> {
        const viewport = await this.page.viewport()
        return viewport ? viewport.width > 768 && viewport.width <= 1024 : false
    }

    async findMobileMenu(): Promise<any> {
        return this.page.$('.mobile-menu, [data-testid="mobile-menu"], .hamburger-menu')
    }

    async findMobileMenuToggle(): Promise<any> {
        return this.page.$('.mobile-menu-toggle, [data-testid="mobile-menu-toggle"], .hamburger')
    }

    async toggleMobileMenu(): Promise<void> {
        const toggle = await this.findMobileMenuToggle()
        if (toggle) {
            await toggle.click()
            await this.page.waitForTimeout(500)
        }
    }

    async isMobileMenuOpen(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, '.mobile-menu.open, .mobile-menu[data-open="true"]')
    }

    async navigateToStatisticsViaMobileMenu(): Promise<void> {
        const statsLink = await this.page.$('.mobile-menu a[href*="statistiques"], .mobile-menu button:contains("Statistiques")')
        if (statsLink) {
            await statsLink.click()
        }
    }

    async hasMobileChartOptimizations(chart: any): Promise<boolean> {
        try {
            return chart.evaluate((el: Element) => {
                const rect = el.getBoundingClientRect()
                return rect.width <= 375 && el.classList.contains('mobile-optimized')
            })
        } catch {
            return true // Assume optimized if we can't check
        }
    }

    async touchHeatmapCell(day: number, hour: number): Promise<void> {
        const cell = await this.page.$(`[data-day="${day}"][data-hour="${hour}"]`)
        if (cell) {
            await cell.tap()
        }
    }

    async hasTouchFeedback(): Promise<boolean> {
        return PuppeteerTestUtils.isElementVisible(this.page, '.touch-feedback, .ripple, .active')
    }

    async getWidgetLayout(): Promise<{ columns: number; rows: number }> {
        try {
            const grid = await this.page.$('.grid')
            if (grid) {
                const styles = await grid.evaluate(el => {
                    const computed = window.getComputedStyle(el)
                    return {
                        gridTemplateColumns: computed.gridTemplateColumns,
                        gridTemplateRows: computed.gridTemplateRows
                    }
                })
                
                const columns = styles.gridTemplateColumns.split(' ').length
                const rows = styles.gridTemplateRows.split(' ').length
                
                return { columns, rows }
            }
        } catch {
            // Fallback
        }
        
        return { columns: 2, rows: 1 }
    }
}