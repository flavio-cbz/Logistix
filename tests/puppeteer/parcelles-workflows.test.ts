import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { Page } from 'puppeteer'
import {
    setupPuppeteerTest,
    teardownPuppeteerTest,
    setupPuppeteerSuite,
    teardownPuppeteerSuite,
    PuppeteerTestUtils
} from './config'
import { ParcellesPage, ParcelleData } from './page-objects/parcelles-page'
import { LoginPage } from './page-objects/login-page'
import { DashboardPage } from './page-objects/dashboard-page'

describe('Parcelles Management - Puppeteer UI Tests', () => {
    let page: Page
    let parcellesPage: ParcellesPage
    let loginPage: LoginPage
    let dashboardPage: DashboardPage

    beforeAll(async () => {
        await setupPuppeteerSuite()
    })

    afterAll(async () => {
        await teardownPuppeteerSuite()
    })

    beforeEach(async () => {
        page = await setupPuppeteerTest('parcelles-workflows')
        parcellesPage = new ParcellesPage(page)
        loginPage = new LoginPage(page)
        dashboardPage = new DashboardPage(page)

        // Login before each test
        await loginPage.goto('/login')
        await loginPage.login('admin', 'password123')
        await dashboardPage.waitForPageLoad()
    })

    afterEach(async () => {
        await teardownPuppeteerTest(page)
    })

    describe('Parcelle Creation Workflows', () => {
        test('should create new parcelle with complete workflow', async () => {
            // Navigate to parcelles page
            await parcellesPage.navigateToParcellesPage()
            expect(await parcellesPage.isLoaded()).toBe(true)

            // Check initial state
            const initialCount = await parcellesPage.getParcelleCount()

            // Navigate to create form
            await parcellesPage.navigateToCreateParcelle()

            // Fill form with valid data
            const parcelleData: ParcelleData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: '1.5',
                prixAchat: '25.50'
            }

            await parcellesPage.fillParcelleForm(parcelleData)

            // Verify calculated fields are updated
            const prixTotal = await parcellesPage.getPrixTotal()
            const prixParGramme = await parcellesPage.getPrixParGramme()
            
            expect(prixTotal).toBe('25.50')
            expect(parseFloat(prixParGramme)).toBeCloseTo(17.00, 2) // 25.50 / 1.5

            // Submit form
            await parcellesPage.submitForm()

            // Verify parcelle was created
            await parcellesPage.waitForParcelleToAppear('P001')
            const newCount = await parcellesPage.getParcelleCount()
            expect(newCount).toBe(initialCount + 1)

            // Verify parcelle data in list
            const createdParcelle = await parcellesPage.getParcelleByNumero('P001')
            expect(createdParcelle).toBeTruthy()
            expect(createdParcelle?.numero).toBe('P001')
            expect(createdParcelle?.transporteur).toBe('DHL')
            expect(createdParcelle?.poids).toBe('1.5g')
            expect(createdParcelle?.prixAchat).toBe('25.50€')
        })

        test('should validate form fields during creation', async () => {
            await parcellesPage.navigateToParcellesPage()
            await parcellesPage.navigateToCreateParcelle()

            // Try to submit empty form
            await parcellesPage.submitForm()

            // Check for validation errors
            const errors = await parcellesPage.getValidationErrors()
            expect(errors.length).toBeGreaterThan(0)
            expect(errors.some(error => error.includes('numéro'))).toBe(true)
            expect(errors.some(error => error.includes('transporteur'))).toBe(true)
            expect(errors.some(error => error.includes('poids'))).toBe(true)
            expect(errors.some(error => error.includes('prix'))).toBe(true)

            // Fill invalid data
            await parcellesPage.fillParcelleForm({
                numero: 'P', // Too short
                transporteur: 'INVALID', // Invalid transporteur
                poids: '-1.5', // Negative weight
                prixAchat: '0' // Zero price
            })

            await parcellesPage.submitForm()

            // Check for specific validation errors
            const validationErrors = await parcellesPage.getValidationErrors()
            expect(validationErrors.length).toBeGreaterThan(0)
        })

        test('should handle form cancellation', async () => {
            await parcellesPage.navigateToParcellesPage()
            const initialCount = await parcellesPage.getParcelleCount()

            await parcellesPage.navigateToCreateParcelle()

            // Fill form partially
            await parcellesPage.fillParcelleForm({
                numero: 'P001',
                transporteur: 'DHL'
            })

            // Cancel form
            await parcellesPage.cancelForm()

            // Verify we're back to list and no parcelle was created
            expect(await parcellesPage.isLoaded()).toBe(true)
            const finalCount = await parcellesPage.getParcelleCount()
            expect(finalCount).toBe(initialCount)
        })

        test('should reset form when reset button is clicked', async () => {
            await parcellesPage.navigateToParcellesPage()
            await parcellesPage.navigateToCreateParcelle()

            // Fill form
            const parcelleData: ParcelleData = {
                numero: 'P001',
                transporteur: 'DHL',
                poids: '1.5',
                prixAchat: '25.50'
            }

            await parcellesPage.fillParcelleForm(parcelleData)

            // Reset form
            await parcellesPage.resetForm()

            // Verify form is cleared
            await new Promise(resolve => setTimeout(resolve, 500)) // Wait for reset
            
            const numeroValue = await parcellesPage.getValue('[data-testid="numero-input"]')
            const poidsValue = await parcellesPage.getValue('[data-testid="poids-input"]')
            const prixValue = await parcellesPage.getValue('[data-testid="prix-achat-input"]')

            expect(numeroValue).toBe('')
            expect(poidsValue).toBe('')
            expect(prixValue).toBe('')
        })

        test('should calculate price per gram in real-time', async () => {
            await parcellesPage.navigateToParcellesPage()
            await parcellesPage.navigateToCreateParcelle()

            // Test different weight and price combinations
            const testCases = [
                { poids: '1.0', prixAchat: '10.00', expectedPrixParGramme: 10.00 },
                { poids: '2.5', prixAchat: '50.00', expectedPrixParGramme: 20.00 },
                { poids: '0.5', prixAchat: '7.50', expectedPrixParGramme: 15.00 }
            ]

            for (const testCase of testCases) {
                await parcellesPage.fillParcelleForm({
                    numero: 'P001',
                    transporteur: 'DHL',
                    poids: testCase.poids,
                    prixAchat: testCase.prixAchat
                })

                // Wait for calculation
                await new Promise(resolve => setTimeout(resolve, 1000))

                const prixParGramme = await parcellesPage.getPrixParGramme()
                const calculatedValue = parseFloat(prixParGramme.replace('€/g', ''))
                
                expect(calculatedValue).toBeCloseTo(testCase.expectedPrixParGramme, 2)
            }
        })
    })

    describe('Parcelle Editing Workflows', () => {
        beforeEach(async () => {
            // Create a test parcelle for editing
            await parcellesPage.navigateToParcellesPage()
            await parcellesPage.createParcelle({
                numero: 'P001',
                transporteur: 'DHL',
                poids: '1.5',
                prixAchat: '25.50'
            })
        })

        test('should edit existing parcelle successfully', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Edit the parcelle
            await parcellesPage.editParcelle('P001', {
                numero: 'P001-UPDATED',
                transporteur: 'UPS',
                poids: '2.0',
                prixAchat: '40.00'
            })

            // Verify changes
            const updatedParcelle = await parcellesPage.getParcelleByNumero('P001-UPDATED')
            expect(updatedParcelle).toBeTruthy()
            expect(updatedParcelle?.transporteur).toBe('UPS')
            expect(updatedParcelle?.poids).toBe('2.0g')
            expect(updatedParcelle?.prixAchat).toBe('40.00€')

            // Verify old parcelle no longer exists
            const oldParcelle = await parcellesPage.getParcelleByNumero('P001')
            expect(oldParcelle).toBeNull()
        })

        test('should recalculate values when editing', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Edit with new weight and price
            await parcellesPage.clickEditButton('P001')
            
            await parcellesPage.fillParcelleForm({
                poids: '3.0',
                prixAchat: '60.00'
            })

            // Check real-time calculation
            const prixParGramme = await parcellesPage.getPrixParGramme()
            const calculatedValue = parseFloat(prixParGramme.replace('€/g', ''))
            expect(calculatedValue).toBeCloseTo(20.00, 2) // 60.00 / 3.0

            await parcellesPage.submitForm()

            // Verify in list
            const updatedParcelle = await parcellesPage.getParcelleByNumero('P001')
            expect(updatedParcelle?.prixParGramme).toContain('20.00')
        })

        test('should handle edit form validation', async () => {
            await parcellesPage.navigateToParcellesPage()
            await parcellesPage.clickEditButton('P001')

            // Clear required fields
            await parcellesPage.fillParcelleForm({
                numero: '',
                poids: '',
                prixAchat: ''
            })

            await parcellesPage.submitForm()

            // Check for validation errors
            const errors = await parcellesPage.getValidationErrors()
            expect(errors.length).toBeGreaterThan(0)
        })

        test('should cancel edit without saving changes', async () => {
            await parcellesPage.navigateToParcellesPage()
            
            // Get original data
            const originalParcelle = await parcellesPage.getParcelleByNumero('P001')
            
            await parcellesPage.clickEditButton('P001')

            // Make changes
            await parcellesPage.fillParcelleForm({
                numero: 'P001-CHANGED',
                transporteur: 'UPS'
            })

            // Cancel
            await parcellesPage.cancelForm()

            // Verify no changes were saved
            const unchangedParcelle = await parcellesPage.getParcelleByNumero('P001')
            expect(unchangedParcelle).toEqual(originalParcelle)

            const changedParcelle = await parcellesPage.getParcelleByNumero('P001-CHANGED')
            expect(changedParcelle).toBeNull()
        })
    })

    describe('Parcelle Deletion Workflows', () => {
        beforeEach(async () => {
            // Create test parcelles for deletion
            await parcellesPage.navigateToParcellesPage()
            await parcellesPage.createParcelle({
                numero: 'P001',
                transporteur: 'DHL',
                poids: '1.5',
                prixAchat: '25.50'
            })
            await parcellesPage.createParcelle({
                numero: 'P002',
                transporteur: 'UPS',
                poids: '2.0',
                prixAchat: '40.00'
            })
        })

        test('should delete single parcelle with confirmation', async () => {
            await parcellesPage.navigateToParcellesPage()
            const initialCount = await parcellesPage.getParcelleCount()

            // Delete parcelle
            await parcellesPage.deleteParcelle('P001')

            // Verify deletion
            await parcellesPage.waitForParcelleToDisappear('P001')
            const finalCount = await parcellesPage.getParcelleCount()
            expect(finalCount).toBe(initialCount - 1)

            const deletedParcelle = await parcellesPage.getParcelleByNumero('P001')
            expect(deletedParcelle).toBeNull()
        })

        test('should cancel deletion when cancel is clicked', async () => {
            await parcellesPage.navigateToParcellesPage()
            const initialCount = await parcellesPage.getParcelleCount()

            // Start deletion but cancel
            await parcellesPage.clickDeleteButton('P001')
            await parcellesPage.cancelDelete()

            // Verify parcelle still exists
            const finalCount = await parcellesPage.getParcelleCount()
            expect(finalCount).toBe(initialCount)

            const parcelle = await parcellesPage.getParcelleByNumero('P001')
            expect(parcelle).toBeTruthy()
        })

        test('should perform bulk deletion', async () => {
            await parcellesPage.navigateToParcellesPage()
            const initialCount = await parcellesPage.getParcelleCount()

            // Select multiple parcelles
            await parcellesPage.selectParcelle('P001')
            await parcellesPage.selectParcelle('P002')

            const selectedCount = await parcellesPage.getSelectedParcellesCount()
            expect(selectedCount).toBe(2)

            // Bulk delete
            await parcellesPage.bulkDeleteSelected()

            // Verify deletions
            await parcellesPage.waitForParcelleToDisappear('P001')
            await parcellesPage.waitForParcelleToDisappear('P002')
            
            const finalCount = await parcellesPage.getParcelleCount()
            expect(finalCount).toBe(initialCount - 2)
        })

        test('should select and deselect all parcelles', async () => {
            await parcellesPage.navigateToParcellesPage()
            const totalCount = await parcellesPage.getParcelleCount()

            // Select all
            await parcellesPage.selectAllParcelles()
            const selectedCount = await parcellesPage.getSelectedParcellesCount()
            expect(selectedCount).toBe(totalCount)

            // Deselect all
            await parcellesPage.deselectAllParcelles()
            const deselectedCount = await parcellesPage.getSelectedParcellesCount()
            expect(deselectedCount).toBe(0)
        })
    })

    describe('List View and Filtering Workflows', () => {
        beforeEach(async () => {
            // Create test data with different transporteurs
            await parcellesPage.navigateToParcellesPage()
            
            const testParcelles = [
                { numero: 'P001', transporteur: 'DHL', poids: '1.0', prixAchat: '10.00' },
                { numero: 'P002', transporteur: 'UPS', poids: '2.0', prixAchat: '20.00' },
                { numero: 'P003', transporteur: 'DHL', poids: '1.5', prixAchat: '15.00' },
                { numero: 'P004', transporteur: 'FedEx', poids: '2.5', prixAchat: '25.00' }
            ]

            for (const parcelle of testParcelles) {
                await parcellesPage.createParcelle(parcelle)
            }
        })

        test('should display all parcelles in list view', async () => {
            await parcellesPage.navigateToParcellesPage()

            const parcelles = await parcellesPage.getParcellesList()
            expect(parcelles.length).toBeGreaterThanOrEqual(4)

            // Verify specific parcelles exist
            const p001 = parcelles.find(p => p.numero === 'P001')
            const p002 = parcelles.find(p => p.numero === 'P002')
            
            expect(p001).toBeTruthy()
            expect(p002).toBeTruthy()
            expect(p001?.transporteur).toBe('DHL')
            expect(p002?.transporteur).toBe('UPS')
        })

        test('should search parcelles by numero', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Search for specific parcelle
            await parcellesPage.searchParcelles('P001')

            const searchResults = await parcellesPage.getParcellesList()
            expect(searchResults.length).toBe(1)
            expect(searchResults[0].numero).toBe('P001')

            // Clear search
            await parcellesPage.clearSearch()
            const allResults = await parcellesPage.getParcellesList()
            expect(allResults.length).toBeGreaterThan(1)
        })

        test('should filter parcelles by transporteur', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Filter by DHL
            await parcellesPage.filterByTransporteur('DHL')

            const dhlResults = await parcellesPage.getParcellesList()
            expect(dhlResults.length).toBe(2) // P001 and P003
            dhlResults.forEach(parcelle => {
                expect(parcelle.transporteur).toBe('DHL')
            })

            // Filter by UPS
            await parcellesPage.filterByTransporteur('UPS')

            const upsResults = await parcellesPage.getParcellesList()
            expect(upsResults.length).toBe(1) // P002
            expect(upsResults[0].transporteur).toBe('UPS')

            // Clear filters
            await parcellesPage.clearFilters()
            const allResults = await parcellesPage.getParcellesList()
            expect(allResults.length).toBeGreaterThanOrEqual(4)
        })

        test('should sort parcelles by different columns', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Sort by numero ascending
            await parcellesPage.sortBy('numero', 'asc')
            let sortedResults = await parcellesPage.getParcellesList()
            
            // Verify ascending order
            for (let i = 1; i < sortedResults.length; i++) {
                expect(sortedResults[i].numero >= sortedResults[i-1].numero).toBe(true)
            }

            // Sort by numero descending
            await parcellesPage.sortBy('numero', 'desc')
            sortedResults = await parcellesPage.getParcellesList()
            
            // Verify descending order
            for (let i = 1; i < sortedResults.length; i++) {
                expect(sortedResults[i].numero <= sortedResults[i-1].numero).toBe(true)
            }

            // Sort by price
            await parcellesPage.sortBy('prix', 'asc')
            sortedResults = await parcellesPage.getParcellesList()
            
            // Verify price sorting (convert to numbers for comparison)
            for (let i = 1; i < sortedResults.length; i++) {
                const currentPrice = parseFloat(sortedResults[i].prixAchat.replace('€', ''))
                const prevPrice = parseFloat(sortedResults[i-1].prixAchat.replace('€', ''))
                expect(currentPrice >= prevPrice).toBe(true)
            }
        })

        test('should handle empty search results', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Search for non-existent parcelle
            await parcellesPage.searchParcelles('NONEXISTENT')

            const results = await parcellesPage.getParcellesList()
            expect(results.length).toBe(0)

            // Check if empty state is shown
            const isEmpty = await parcellesPage.isEmptyState()
            expect(isEmpty).toBe(true)
        })
    })

    describe('Export and Data Operations', () => {
        beforeEach(async () => {
            // Create test data for export
            await parcellesPage.navigateToParcellesPage()
            
            const testParcelles = [
                { numero: 'P001', transporteur: 'DHL', poids: '1.0', prixAchat: '10.00' },
                { numero: 'P002', transporteur: 'UPS', poids: '2.0', prixAchat: '20.00' }
            ]

            for (const parcelle of testParcelles) {
                await parcellesPage.createParcelle(parcelle)
            }
        })

        test('should export all parcelles', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Test different export formats
            const formats: ('csv' | 'json' | 'pdf')[] = ['csv', 'json', 'pdf']
            
            for (const format of formats) {
                await parcellesPage.exportParcelles(format)
                
                // Wait for export to complete
                await new Promise(resolve => setTimeout(resolve, 2000))
                
                // Note: In a real test, you might check for download completion
                // or verify the exported file content
            }
        })

        test('should export selected parcelles only', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Select specific parcelles
            await parcellesPage.selectParcelle('P001')
            
            const selectedCount = await parcellesPage.getSelectedParcellesCount()
            expect(selectedCount).toBe(1)

            // Export selected
            await parcellesPage.bulkExportSelected()
            
            // Wait for export modal and confirm
            await new Promise(resolve => setTimeout(resolve, 1000))
        })
    })

    describe('Statistics and Summary Display', () => {
        beforeEach(async () => {
            // Create test data for statistics
            await parcellesPage.navigateToParcellesPage()
            
            const testParcelles = [
                { numero: 'P001', transporteur: 'DHL', poids: '1.0', prixAchat: '10.00' },
                { numero: 'P002', transporteur: 'UPS', poids: '2.0', prixAchat: '30.00' },
                { numero: 'P003', transporteur: 'DHL', poids: '1.5', prixAchat: '20.00' }
            ]

            for (const parcelle of testParcelles) {
                await parcellesPage.createParcelle(parcelle)
            }
        })

        test('should display correct statistics', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Check total count
            const totalCount = await parcellesPage.getTotalParcellesCount()
            expect(parseInt(totalCount)).toBeGreaterThanOrEqual(3)

            // Check total value (10 + 30 + 20 = 60)
            const totalValue = await parcellesPage.getTotalValue()
            expect(parseFloat(totalValue.replace('€', ''))).toBeGreaterThanOrEqual(60)

            // Check average weight ((1.0 + 2.0 + 1.5) / 3 = 1.5)
            const avgWeight = await parcellesPage.getAverageWeight()
            expect(parseFloat(avgWeight.replace('g', ''))).toBeCloseTo(1.5, 1)

            // Check average price per gram
            const avgPricePerGram = await parcellesPage.getAveragePricePerGram()
            expect(parseFloat(avgPricePerGram.replace('€/g', ''))).toBeGreaterThan(0)
        })

        test('should update statistics when parcelles are added/removed', async () => {
            await parcellesPage.navigateToParcellesPage()

            const initialCount = parseInt(await parcellesPage.getTotalParcellesCount())
            const initialValue = parseFloat((await parcellesPage.getTotalValue()).replace('€', ''))

            // Add new parcelle
            await parcellesPage.createParcelle({
                numero: 'P004',
                transporteur: 'FedEx',
                poids: '3.0',
                prixAchat: '45.00'
            })

            // Check updated statistics
            const newCount = parseInt(await parcellesPage.getTotalParcellesCount())
            const newValue = parseFloat((await parcellesPage.getTotalValue()).replace('€', ''))

            expect(newCount).toBe(initialCount + 1)
            expect(newValue).toBeCloseTo(initialValue + 45.00, 2)
        })
    })

    describe('Responsive Design Tests', () => {
        test('should work correctly on mobile devices', async () => {
            // Emulate mobile device
            await parcellesPage.emulateDevice('mobile')
            await parcellesPage.navigateToParcellesPage()

            // Check if mobile-specific elements are visible
            const hasMobileMenu = await parcellesPage.isVisible('[data-testid="mobile-menu"]')
            if (hasMobileMenu) {
                await parcellesPage.openMobileMenu()
            }

            // Test basic functionality on mobile
            await parcellesPage.navigateToCreateParcelle()
            
            await parcellesPage.fillParcelleForm({
                numero: 'P001',
                transporteur: 'DHL',
                poids: '1.5',
                prixAchat: '25.50'
            })

            await parcellesPage.submitForm()

            // Verify creation worked on mobile
            const parcelle = await parcellesPage.getParcelleByNumero('P001')
            expect(parcelle).toBeTruthy()
        })

        test('should work correctly on tablet devices', async () => {
            // Emulate tablet device
            await parcellesPage.emulateDevice('tablet')
            await parcellesPage.navigateToParcellesPage()

            // Test tablet-specific functionality
            const parcelles = await parcellesPage.getParcellesList()
            expect(Array.isArray(parcelles)).toBe(true)

            // Test form functionality on tablet
            await parcellesPage.navigateToCreateParcelle()
            
            await parcellesPage.fillParcelleForm({
                numero: 'P002',
                transporteur: 'UPS',
                poids: '2.0',
                prixAchat: '40.00'
            })

            await parcellesPage.submitForm()

            const parcelle = await parcellesPage.getParcelleByNumero('P002')
            expect(parcelle).toBeTruthy()
        })

        test('should maintain functionality across different screen sizes', async () => {
            const devices: ('mobile' | 'tablet' | 'desktop')[] = ['mobile', 'tablet', 'desktop']

            for (const device of devices) {
                await parcellesPage.emulateDevice(device)
                await parcellesPage.navigateToParcellesPage()

                // Test basic functionality on each device
                expect(await parcellesPage.isLoaded()).toBe(true)

                const count = await parcellesPage.getParcelleCount()
                expect(typeof count).toBe('number')

                // Test search functionality
                await parcellesPage.searchParcelles('P001')
                const searchResults = await parcellesPage.getParcellesList()
                expect(Array.isArray(searchResults)).toBe(true)

                await parcellesPage.clearSearch()
            }
        })
    })

    describe('Error Handling and Edge Cases', () => {
        test('should handle network errors gracefully', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Mock network failure
            await page.setRequestInterception(true)
            page.on('request', (request) => {
                if (request.url().includes('/api/v1/parcelles')) {
                    request.abort()
                } else {
                    request.continue()
                }
            })

            // Try to create parcelle with network failure
            await parcellesPage.navigateToCreateParcelle()
            
            await parcellesPage.fillParcelleForm({
                numero: 'P001',
                transporteur: 'DHL',
                poids: '1.5',
                prixAchat: '25.50'
            })

            await parcellesPage.submitForm()

            // Check if error message is displayed
            const hasError = await parcellesPage.hasErrorMessage()
            if (hasError) {
                const errorMessage = await parcellesPage.getErrorMessage()
                expect(errorMessage.length).toBeGreaterThan(0)
            }
        })

        test('should handle loading states correctly', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Check if loading spinner appears and disappears
            await parcellesPage.refreshPage()
            
            // Wait for loading to finish
            await parcellesPage.waitForLoadingToFinish()
            
            // Verify page is loaded
            expect(await parcellesPage.isLoaded()).toBe(true)
            expect(await parcellesPage.isLoadingVisible()).toBe(false)
        })

        test('should handle empty state correctly', async () => {
            // Navigate to fresh page (assuming no parcelles exist)
            await parcellesPage.navigateToParcellesPage()

            // If there are existing parcelles, delete them all
            const existingCount = await parcellesPage.getParcelleCount()
            if (existingCount > 0) {
                await parcellesPage.selectAllParcelles()
                await parcellesPage.bulkDeleteSelected()
            }

            // Check empty state
            const isEmpty = await parcellesPage.isEmptyState()
            expect(isEmpty).toBe(true)

            const count = await parcellesPage.getParcelleCount()
            expect(count).toBe(0)
        })

        test('should handle form validation edge cases', async () => {
            await parcellesPage.navigateToParcellesPage()
            await parcellesPage.navigateToCreateParcelle()

            // Test edge cases for numeric fields
            const edgeCases = [
                { poids: '0', prixAchat: '25.50' }, // Zero weight
                { poids: '1.5', prixAchat: '0' }, // Zero price
                { poids: '-1.5', prixAchat: '25.50' }, // Negative weight
                { poids: '1.5', prixAchat: '-25.50' }, // Negative price
                { poids: 'abc', prixAchat: '25.50' }, // Non-numeric weight
                { poids: '1.5', prixAchat: 'xyz' }, // Non-numeric price
            ]

            for (const testCase of edgeCases) {
                await parcellesPage.fillParcelleForm({
                    numero: 'P001',
                    transporteur: 'DHL',
                    ...testCase
                })

                await parcellesPage.submitForm()

                // Should have validation errors
                const hasErrors = await parcellesPage.hasValidationErrors()
                expect(hasErrors).toBe(true)

                // Reset form for next test
                await parcellesPage.resetForm()
            }
        })

        test('should handle concurrent operations', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Create multiple parcelles concurrently (simulate multiple users)
            const createPromises = []
            
            for (let i = 1; i <= 3; i++) {
                const promise = parcellesPage.createParcelle({
                    numero: `P00${i}`,
                    transporteur: 'DHL',
                    poids: '1.5',
                    prixAchat: '25.50'
                })
                createPromises.push(promise)
            }

            // Wait for all operations to complete
            await Promise.allSettled(createPromises)

            // Verify at least some parcelles were created
            const finalCount = await parcellesPage.getParcelleCount()
            expect(finalCount).toBeGreaterThan(0)
        })
    })

    describe('Performance Tests', () => {
        test('should handle large datasets efficiently', async () => {
            await parcellesPage.navigateToParcellesPage()

            // Create multiple parcelles to test performance
            const startTime = Date.now()
            
            for (let i = 1; i <= 10; i++) {
                await parcellesPage.createParcelle({
                    numero: `P${String(i).padStart(3, '0')}`,
                    transporteur: i % 2 === 0 ? 'DHL' : 'UPS',
                    poids: (1.0 + i * 0.1).toString(),
                    prixAchat: (10.0 + i * 2.5).toString()
                })
            }

            const creationTime = Date.now() - startTime

            // Test list loading performance
            const listStartTime = Date.now()
            await parcellesPage.refreshPage()
            const parcelles = await parcellesPage.getParcellesList()
            const listLoadTime = Date.now() - listStartTime

            // Performance assertions (adjust thresholds as needed)
            expect(creationTime).toBeLessThan(60000) // 60 seconds for 10 creates
            expect(listLoadTime).toBeLessThan(5000) // 5 seconds for list load
            expect(parcelles.length).toBeGreaterThanOrEqual(10)
        })

        test('should measure page load performance', async () => {
            const startTime = Date.now()
            await parcellesPage.navigateToParcellesPage()
            const loadTime = Date.now() - startTime

            // Measure performance metrics
            const metrics = await parcellesPage.measurePerformance()
            
            // Basic performance checks
            expect(loadTime).toBeLessThan(10000) // 10 seconds max
            expect(metrics.JSHeapUsedSize).toBeLessThan(50 * 1024 * 1024) // 50MB max
        })
    })
})