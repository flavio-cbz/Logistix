import { Page } from 'puppeteer'
import { BasePage } from './base-page'

export interface ParcelleData {
  numero: string
  transporteur: string
  poids: string
  prixAchat: string
}

export interface ParcelleListItem {
  numero: string
  transporteur: string
  poids: string
  prixAchat: string
  prixTotal: string
  prixParGramme: string
  dateCreation: string
}

export class ParcellesPage extends BasePage {
  private selectors = {
    // Page elements
    pageTitle: '[data-testid="parcelles-title"], h1',
    loadingSpinner: '[data-testid="loading"], .loading-spinner',
    errorMessage: '[data-testid="error-message"], .error-message',
    emptyState: '[data-testid="empty-state"], .empty-state',
    
    // List view
    parcellesList: '[data-testid="parcelles-list"], .parcelles-list',
    parcelleItem: '[data-testid="parcelle-item"], .parcelle-item',
    parcelleRow: '[data-testid="parcelle-row"], .parcelle-row',
    
    // Table headers
    tableHeader: '[data-testid="parcelles-table-header"], .table-header',
    numeroHeader: '[data-testid="numero-header"], th[data-column="numero"]',
    transporteurHeader: '[data-testid="transporteur-header"], th[data-column="transporteur"]',
    poidsHeader: '[data-testid="poids-header"], th[data-column="poids"]',
    prixHeader: '[data-testid="prix-header"], th[data-column="prix"]',
    actionsHeader: '[data-testid="actions-header"], th[data-column="actions"]',
    
    // Table cells
    numeroCell: '[data-testid="numero-cell"], td[data-column="numero"]',
    transporteurCell: '[data-testid="transporteur-cell"], td[data-column="transporteur"]',
    poidsCell: '[data-testid="poids-cell"], td[data-column="poids"]',
    prixAchatCell: '[data-testid="prix-achat-cell"], td[data-column="prix-achat"]',
    prixTotalCell: '[data-testid="prix-total-cell"], td[data-column="prix-total"]',
    prixParGrammeCell: '[data-testid="prix-par-gramme-cell"], td[data-column="prix-par-gramme"]',
    dateCreationCell: '[data-testid="date-creation-cell"], td[data-column="date-creation"]',
    actionsCell: '[data-testid="actions-cell"], td[data-column="actions"]',
    
    // Action buttons
    addParcelleButton: '[data-testid="add-parcelle-button"], .add-parcelle-btn',
    editButton: '[data-testid="edit-parcelle-button"], .edit-btn',
    deleteButton: '[data-testid="delete-parcelle-button"], .delete-btn',
    viewButton: '[data-testid="view-parcelle-button"], .view-btn',
    
    // Bulk actions
    selectAllCheckbox: '[data-testid="select-all-checkbox"], .select-all',
    parcelleCheckbox: '[data-testid="parcelle-checkbox"], .parcelle-checkbox',
    bulkActionsBar: '[data-testid="bulk-actions-bar"], .bulk-actions',
    bulkDeleteButton: '[data-testid="bulk-delete-button"], .bulk-delete-btn',
    bulkExportButton: '[data-testid="bulk-export-button"], .bulk-export-btn',
    
    // Search and filters
    searchInput: '[data-testid="search-input"], input[placeholder*="Rechercher"]',
    searchButton: '[data-testid="search-button"], .search-btn',
    clearSearchButton: '[data-testid="clear-search-button"], .clear-search-btn',
    filterDropdown: '[data-testid="filter-dropdown"], .filter-dropdown',
    transporteurFilter: '[data-testid="transporteur-filter"], select[name="transporteur"]',
    dateRangeFilter: '[data-testid="date-range-filter"], .date-range-filter',
    priceRangeFilter: '[data-testid="price-range-filter"], .price-range-filter',
    
    // Sorting
    sortDropdown: '[data-testid="sort-dropdown"], .sort-dropdown',
    sortAscButton: '[data-testid="sort-asc"], .sort-asc',
    sortDescButton: '[data-testid="sort-desc"], .sort-desc',
    
    // Pagination
    pagination: '[data-testid="pagination"], .pagination',
    prevPageButton: '[data-testid="prev-page"], .prev-page',
    nextPageButton: '[data-testid="next-page"], .next-page',
    pageNumbers: '[data-testid="page-number"], .page-number',
    itemsPerPageSelect: '[data-testid="items-per-page"], .items-per-page',
    
    // Create/Edit form
    parcelleForm: '[data-testid="parcelle-form"], .parcelle-form',
    numeroInput: '[data-testid="numero-input"], input[name="numero"]',
    transporteurSelect: '[data-testid="transporteur-select"], select[name="transporteur"]',
    poidsInput: '[data-testid="poids-input"], input[name="poids"]',
    prixAchatInput: '[data-testid="prix-achat-input"], input[name="prixAchat"]',
    
    // Form buttons
    saveButton: '[data-testid="save-button"], .save-btn',
    cancelButton: '[data-testid="cancel-button"], .cancel-btn',
    resetButton: '[data-testid="reset-button"], .reset-btn',
    
    // Form validation
    validationError: '[data-testid="validation-error"], .validation-error',
    numeroError: '[data-testid="numero-error"], .numero-error',
    transporteurError: '[data-testid="transporteur-error"], .transporteur-error',
    poidsError: '[data-testid="poids-error"], .poids-error',
    prixAchatError: '[data-testid="prix-achat-error"], .prix-achat-error',
    
    // Calculated fields display
    prixTotalDisplay: '[data-testid="prix-total-display"], .prix-total-display',
    prixParGrammeDisplay: '[data-testid="prix-par-gramme-display"], .prix-par-gramme-display',
    
    // Modals and dialogs
    deleteConfirmModal: '[data-testid="delete-confirm-modal"], .delete-confirm-modal',
    confirmDeleteButton: '[data-testid="confirm-delete"], .confirm-delete-btn',
    cancelDeleteButton: '[data-testid="cancel-delete"], .cancel-delete-btn',
    
    // Export functionality
    exportButton: '[data-testid="export-button"], .export-btn',
    exportModal: '[data-testid="export-modal"], .export-modal',
    exportFormatSelect: '[data-testid="export-format"], select[name="exportFormat"]',
    exportConfirmButton: '[data-testid="export-confirm"], .export-confirm-btn',
    
    // Statistics and summary
    totalParcellesCount: '[data-testid="total-parcelles"], .total-parcelles',
    totalValueSum: '[data-testid="total-value"], .total-value',
    averageWeight: '[data-testid="average-weight"], .average-weight',
    averagePricePerGram: '[data-testid="average-price-per-gram"], .average-price-per-gram',
    
    // Responsive elements
    mobileMenuButton: '[data-testid="mobile-menu"], .mobile-menu-btn',
    mobileFiltersButton: '[data-testid="mobile-filters"], .mobile-filters-btn',
    mobileActionsButton: '[data-testid="mobile-actions"], .mobile-actions-btn'
  }

  constructor(page: Page, baseUrl?: string) {
    super(page, baseUrl)
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.waitForSelector(this.selectors.pageTitle, 3000)
      await this.waitForSelector(this.selectors.parcellesList, 3000)
      return true
    } catch {
      return false
    }
  }

  getPageIdentifier(): string {
    return 'parcelles-page'
  }

  // Navigation
  async navigateToParcellesPage() {
    await this.goto('/parcelles')
    await this.waitForPageLoad()
  }

  async navigateToCreateParcelle() {
    await this.click(this.selectors.addParcelleButton, true)
    await this.waitForPageLoad()
  }

  // List operations
  async getParcellesList(): Promise<ParcelleListItem[]> {
    await this.waitForSelector(this.selectors.parcellesList)
    
    const parcelles = await this.page.$$eval(this.selectors.parcelleRow, (rows) => {
      return rows.map((row: any) => {
        const cells = row.querySelectorAll('td')
        return {
          numero: cells[0]?.textContent?.trim() || '',
          transporteur: cells[1]?.textContent?.trim() || '',
          poids: cells[2]?.textContent?.trim() || '',
          prixAchat: cells[3]?.textContent?.trim() || '',
          prixTotal: cells[4]?.textContent?.trim() || '',
          prixParGramme: cells[5]?.textContent?.trim() || '',
          dateCreation: cells[6]?.textContent?.trim() || ''
        }
      })
    })

    return parcelles
  }

  async getParcelleCount(): Promise<number> {
    await this.waitForSelector(this.selectors.parcellesList)
    const rows = await this.page.$$(this.selectors.parcelleRow)
    return rows.length
  }

  async isEmptyState(): Promise<boolean> {
    return await this.isVisible(this.selectors.emptyState)
  }

  async getParcelleByNumero(numero: string): Promise<ParcelleListItem | null> {
    const parcelles = await this.getParcellesList()
    return parcelles.find(p => p.numero === numero) || null
  }

  // CRUD operations
  async createParcelle(data: ParcelleData): Promise<void> {
    await this.navigateToCreateParcelle()
    await this.fillParcelleForm(data)
    await this.submitForm()
  }

  async editParcelle(numero: string, data: Partial<ParcelleData>): Promise<void> {
    await this.clickEditButton(numero)
    await this.fillParcelleForm(data)
    await this.submitForm()
  }

  async deleteParcelle(numero: string): Promise<void> {
    await this.clickDeleteButton(numero)
    await this.confirmDelete()
  }

  async viewParcelle(numero: string): Promise<void> {
    await this.clickViewButton(numero)
    await this.waitForPageLoad()
  }

  // Form operations
  async fillParcelleForm(data: Partial<ParcelleData>): Promise<void> {
    await this.waitForSelector(this.selectors.parcelleForm)

    if (data.numero) {
      await this.clear(this.selectors.numeroInput)
      await this.type(this.selectors.numeroInput, data.numero)
    }

    if (data.transporteur) {
      await this.select(this.selectors.transporteurSelect, data.transporteur)
    }

    if (data.poids) {
      await this.clear(this.selectors.poidsInput)
      await this.type(this.selectors.poidsInput, data.poids)
    }

    if (data.prixAchat) {
      await this.clear(this.selectors.prixAchatInput)
      await this.type(this.selectors.prixAchatInput, data.prixAchat)
    }

    // Wait for calculations to update
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  async submitForm(): Promise<void> {
    await this.click(this.selectors.saveButton, true)
    await this.waitForPageLoad()
  }

  async cancelForm(): Promise<void> {
    await this.click(this.selectors.cancelButton, true)
    await this.waitForPageLoad()
  }

  async resetForm(): Promise<void> {
    await this.click(this.selectors.resetButton)
  }

  // Validation
  async getValidationErrors(): Promise<string[]> {
    const errors: string[] = []
    
    const errorSelectors = [
      this.selectors.numeroError,
      this.selectors.transporteurError,
      this.selectors.poidsError,
      this.selectors.prixAchatError
    ]

    for (const selector of errorSelectors) {
      if (await this.isVisible(selector)) {
        const errorText = await this.getText(selector)
        if (errorText) {
          errors.push(errorText)
        }
      }
    }

    return errors
  }

  async hasValidationErrors(): Promise<boolean> {
    const errors = await this.getValidationErrors()
    return errors.length > 0
  }

  // Calculated fields
  async getPrixTotal(): Promise<string> {
    if (await this.isVisible(this.selectors.prixTotalDisplay)) {
      return await this.getText(this.selectors.prixTotalDisplay)
    }
    return ''
  }

  async getPrixParGramme(): Promise<string> {
    if (await this.isVisible(this.selectors.prixParGrammeDisplay)) {
      return await this.getText(this.selectors.prixParGrammeDisplay)
    }
    return ''
  }

  // Action buttons
  async clickEditButton(numero: string): Promise<void> {
    const row = await this.findParcelleRow(numero)
    if (row) {
      const editButton = await row.$(this.selectors.editButton)
      if (editButton) {
        await editButton.click()
        await this.waitForPageLoad()
      }
    }
  }

  async clickDeleteButton(numero: string): Promise<void> {
    const row = await this.findParcelleRow(numero)
    if (row) {
      const deleteButton = await row.$(this.selectors.deleteButton)
      if (deleteButton) {
        await deleteButton.click()
        await this.waitForSelector(this.selectors.deleteConfirmModal)
      }
    }
  }

  async clickViewButton(numero: string): Promise<void> {
    const row = await this.findParcelleRow(numero)
    if (row) {
      const viewButton = await row.$(this.selectors.viewButton)
      if (viewButton) {
        await viewButton.click()
        await this.waitForPageLoad()
      }
    }
  }

  async confirmDelete(): Promise<void> {
    await this.waitForSelector(this.selectors.deleteConfirmModal)
    await this.click(this.selectors.confirmDeleteButton, true)
    await this.waitForPageLoad()
  }

  async cancelDelete(): Promise<void> {
    await this.waitForSelector(this.selectors.deleteConfirmModal)
    await this.click(this.selectors.cancelDeleteButton)
  }

  // Search and filtering
  async searchParcelles(query: string): Promise<void> {
    await this.clear(this.selectors.searchInput)
    await this.type(this.selectors.searchInput, query)
    await this.click(this.selectors.searchButton)
    await this.waitForPageLoad()
  }

  async clearSearch(): Promise<void> {
    await this.click(this.selectors.clearSearchButton)
    await this.waitForPageLoad()
  }

  async filterByTransporteur(transporteur: string): Promise<void> {
    await this.select(this.selectors.transporteurFilter, transporteur)
    await this.waitForPageLoad()
  }

  async clearFilters(): Promise<void> {
    // Reset all filters to default values
    await this.select(this.selectors.transporteurFilter, '')
    await this.clear(this.selectors.searchInput)
    await this.waitForPageLoad()
  }

  // Sorting
  async sortBy(column: string, direction: 'asc' | 'desc' = 'asc'): Promise<void> {
    const headerSelector = `[data-column="${column}"]`
    await this.click(headerSelector)
    
    if (direction === 'desc') {
      await this.click(headerSelector) // Click again for descending
    }
    
    await this.waitForPageLoad()
  }

  // Pagination
  async goToNextPage(): Promise<void> {
    if (await this.isEnabled(this.selectors.nextPageButton)) {
      await this.click(this.selectors.nextPageButton, true)
      await this.waitForPageLoad()
    }
  }

  async goToPreviousPage(): Promise<void> {
    if (await this.isEnabled(this.selectors.prevPageButton)) {
      await this.click(this.selectors.prevPageButton, true)
      await this.waitForPageLoad()
    }
  }

  async goToPage(pageNumber: number): Promise<void> {
    const pageButton = `[data-testid="page-${pageNumber}"]`
    if (await this.isVisible(pageButton)) {
      await this.click(pageButton, true)
      await this.waitForPageLoad()
    }
  }

  async setItemsPerPage(count: number): Promise<void> {
    await this.select(this.selectors.itemsPerPageSelect, count.toString())
    await this.waitForPageLoad()
  }

  // Bulk operations
  async selectAllParcelles(): Promise<void> {
    await this.check(this.selectors.selectAllCheckbox)
  }

  async deselectAllParcelles(): Promise<void> {
    await this.uncheck(this.selectors.selectAllCheckbox)
  }

  async selectParcelle(numero: string): Promise<void> {
    const row = await this.findParcelleRow(numero)
    if (row) {
      const checkbox = await row.$(this.selectors.parcelleCheckbox)
      if (checkbox) {
        await checkbox.click()
      }
    }
  }

  async getSelectedParcellesCount(): Promise<number> {
    const checkboxes = await this.page.$$(this.selectors.parcelleCheckbox)
    let selectedCount = 0
    
    for (const checkbox of checkboxes) {
      const isChecked = await checkbox.evaluate((el: any) => el.checked)
      if (isChecked) {
        selectedCount++
      }
    }
    
    return selectedCount
  }

  async bulkDeleteSelected(): Promise<void> {
    await this.click(this.selectors.bulkDeleteButton)
    await this.confirmDelete()
  }

  async bulkExportSelected(): Promise<void> {
    await this.click(this.selectors.bulkExportButton)
    await this.waitForSelector(this.selectors.exportModal)
  }

  // Export functionality
  async exportParcelles(format: 'csv' | 'json' | 'pdf' = 'csv'): Promise<void> {
    await this.click(this.selectors.exportButton)
    await this.waitForSelector(this.selectors.exportModal)
    await this.select(this.selectors.exportFormatSelect, format)
    await this.click(this.selectors.exportConfirmButton)
  }

  // Statistics
  async getTotalParcellesCount(): Promise<string> {
    if (await this.isVisible(this.selectors.totalParcellesCount)) {
      return await this.getText(this.selectors.totalParcellesCount)
    }
    return '0'
  }

  async getTotalValue(): Promise<string> {
    if (await this.isVisible(this.selectors.totalValueSum)) {
      return await this.getText(this.selectors.totalValueSum)
    }
    return '0'
  }

  async getAverageWeight(): Promise<string> {
    if (await this.isVisible(this.selectors.averageWeight)) {
      return await this.getText(this.selectors.averageWeight)
    }
    return '0'
  }

  async getAveragePricePerGram(): Promise<string> {
    if (await this.isVisible(this.selectors.averagePricePerGram)) {
      return await this.getText(this.selectors.averagePricePerGram)
    }
    return '0'
  }

  // Responsive design
  async openMobileMenu(): Promise<void> {
    if (await this.isVisible(this.selectors.mobileMenuButton)) {
      await this.click(this.selectors.mobileMenuButton)
    }
  }

  async openMobileFilters(): Promise<void> {
    if (await this.isVisible(this.selectors.mobileFiltersButton)) {
      await this.click(this.selectors.mobileFiltersButton)
    }
  }

  async openMobileActions(): Promise<void> {
    if (await this.isVisible(this.selectors.mobileActionsButton)) {
      await this.click(this.selectors.mobileActionsButton)
    }
  }

  // Helper methods
  private async findParcelleRow(numero: string) {
    const rows = await this.page.$$(this.selectors.parcelleRow)
    
    for (const row of rows) {
      const numeroCell = await row.$(this.selectors.numeroCell)
      if (numeroCell) {
        const cellText = await numeroCell.evaluate((el: any) => el.textContent?.trim())
        if (cellText === numero) {
          return row
        }
      }
    }
    
    return null
  }

  async waitForParcelleToAppear(numero: string, timeout = 5000): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const parcelle = await this.getParcelleByNumero(numero)
      if (parcelle) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    return false
  }

  async waitForParcelleToDisappear(numero: string, timeout = 5000): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const parcelle = await this.getParcelleByNumero(numero)
      if (!parcelle) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    return false
  }

  async refreshPage(): Promise<void> {
    await this.reload()
    await this.waitForPageLoad()
  }

  async isLoadingVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.loadingSpinner)
  }

  async waitForLoadingToFinish(timeout = 10000): Promise<void> {
    try {
      await this.waitForSelector(this.selectors.loadingSpinner, 1000)
      await this.page.waitForSelector(this.selectors.loadingSpinner, { 
        hidden: true, 
        timeout 
      })
    } catch {
      // Loading spinner might not appear, which is fine
    }
  }

  async hasErrorMessage(): Promise<boolean> {
    return await this.isVisible(this.selectors.errorMessage)
  }

  async getErrorMessage(): Promise<string> {
    if (await this.hasErrorMessage()) {
      return await this.getText(this.selectors.errorMessage)
    }
    return ''
  }
}