import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { ServiceMockFactory } from './mocks/service-mocks'
import type { Produit } from '@/types/database'

// Mock the database service
const mockDatabaseService = ServiceMockFactory.getDatabaseService()

// Mock product service implementation
class ProductService {
  private db: any

  constructor(databaseService: any) {
    this.db = databaseService
  }

  async createProduct(productData: Partial<Produit>, userId: string): Promise<Produit> {
    const product: Produit = {
      id: `product-${Date.now()}`,
      userId,
      commandeId: productData.commandeId!,
      nom: productData.nom!,
      details: productData.details || null,
      prixArticle: productData.prixArticle!,
      poids: productData.poids!,
      prixLivraison: productData.prixLivraison!,
      vendu: productData.vendu || false,
      dateVente: productData.dateVente,
      tempsEnLigne: productData.tempsEnLigne,
      prixVente: productData.prixVente,
      plateforme: productData.plateforme,
      parcelleId: productData.parcelleId!,
      benefices: this.calculateBenefits(productData.prixVente, productData.prixArticle!, productData.prixLivraison!),
      pourcentageBenefice: this.calculateBenefitPercentage(productData.prixVente, productData.prixArticle!, productData.prixLivraison!),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await this.db.products.create(product)
    return product
  }

  async getProductById(id: string, userId: string): Promise<Produit | null> {
    const product = await this.db.products.findById(id)
    if (!product || product.userId !== userId) {
      return null
    }
    return product
  }

  async getProductsByUserId(userId: string): Promise<Produit[]> {
    return await this.db.products.findByUserId(userId)
  }

  async getProductsByParcelleId(parcelleId: string, userId: string): Promise<Produit[]> {
    const products = await this.db.products.findByParcelleId(parcelleId)
    return products.filter((p: Produit) => p.userId === userId)
  }

  async updateProduct(id: string, updateData: Partial<Produit>, userId: string): Promise<Produit | null> {
    const existingProduct = await this.getProductById(id, userId)
    if (!existingProduct) {
      return null
    }

    const finalPrixVente = updateData.prixVente !== undefined ? updateData.prixVente : existingProduct.prixVente
    const finalPrixArticle = updateData.prixArticle ?? existingProduct.prixArticle
    const finalPrixLivraison = updateData.prixLivraison ?? existingProduct.prixLivraison

    const updatedProduct = {
      ...existingProduct,
      ...updateData,
      benefices: this.calculateBenefits(finalPrixVente, finalPrixArticle, finalPrixLivraison),
      pourcentageBenefice: this.calculateBenefitPercentage(finalPrixVente, finalPrixArticle, finalPrixLivraison),
      updatedAt: new Date().toISOString()
    }

    await this.db.products.update(id, updatedProduct)
    return updatedProduct
  }

  async deleteProduct(id: string, userId: string): Promise<boolean> {
    const product = await this.getProductById(id, userId)
    if (!product) {
      return false
    }

    await this.db.products.delete(id)
    return true
  }

  async markAsSold(id: string, saleData: {
    prixVente: number
    dateVente?: string
    plateforme?: string
    tempsEnLigne?: string
  }, userId: string): Promise<Produit | null> {
    return await this.updateProduct(id, {
      vendu: true,
      ...saleData
    }, userId)
  }

  async markAsAvailable(id: string, userId: string): Promise<Produit | null> {
    return await this.updateProduct(id, {
      vendu: false,
      prixVente: null,
      dateVente: null,
      plateforme: null,
      tempsEnLigne: null
    }, userId)
  }

  async searchProducts(query: string, userId: string): Promise<Produit[]> {
    if (!query || query.trim().length === 0) {
      return []
    }
    
    const allProducts = await this.getProductsByUserId(userId)
    const searchTerm = query.toLowerCase().trim()
    
    return allProducts.filter(product => 
      product.nom?.toLowerCase().includes(searchTerm) ||
      product.details?.toLowerCase().includes(searchTerm) ||
      product.plateforme?.toLowerCase().includes(searchTerm)
    )
  }

  async getProductStatistics(userId: string): Promise<{
    total: number
    sold: number
    available: number
    totalRevenue: number
    totalBenefits: number
    averageBenefitPercentage: number
  }> {
    const products = await this.getProductsByUserId(userId)
    const soldProducts = products.filter(p => p.vendu)
    
    const totalRevenue = soldProducts.reduce((sum, p) => sum + (p.prixVente || 0), 0)
    const totalBenefits = soldProducts.reduce((sum, p) => sum + (p.benefices || 0), 0)
    const averageBenefitPercentage = soldProducts.length > 0 
      ? soldProducts.reduce((sum, p) => sum + (p.pourcentageBenefice || 0), 0) / soldProducts.length
      : 0

    return {
      total: products.length,
      sold: soldProducts.length,
      available: products.length - soldProducts.length,
      totalRevenue,
      totalBenefits,
      averageBenefitPercentage
    }
  }

  private calculateBenefits(prixVente?: number, prixArticle?: number, prixLivraison?: number): number | null {
    if (prixVente == null || prixArticle == null || prixLivraison == null) {
      return null
    }
    return prixVente - (prixArticle + prixLivraison)
  }

  private calculateBenefitPercentage(prixVente?: number, prixArticle?: number, prixLivraison?: number): number | null {
    const benefits = this.calculateBenefits(prixVente, prixArticle, prixLivraison)
    if (benefits == null || prixArticle == null || prixLivraison == null) {
      return null
    }
    
    const totalCost = prixArticle + prixLivraison
    if (totalCost === 0) {
      return null
    }
    
    return (benefits / totalCost) * 100
  }

  async validateProductData(productData: Partial<Produit>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    if (!productData.nom || typeof productData.nom !== 'string' || productData.nom.trim().length === 0) {
      errors.push('Product name is required')
    }

    if (productData.prixArticle == null || productData.prixArticle < 0) {
      errors.push('Article price must be a positive number')
    }

    if (productData.prixLivraison == null || productData.prixLivraison < 0) {
      errors.push('Delivery price must be a positive number')
    }

    if (productData.poids == null || productData.poids <= 0) {
      errors.push('Weight must be a positive number')
    }

    if (!productData.commandeId || typeof productData.commandeId !== 'string' || productData.commandeId.trim().length === 0) {
      errors.push('Command ID is required')
    }

    if (productData.prixVente != null && productData.prixVente < 0) {
      errors.push('Sale price must be a positive number')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  async getProductsByDateRange(userId: string, startDate: string, endDate: string): Promise<Produit[]> {
    const products = await this.getProductsByUserId(userId)
    return products.filter(product => {
      if (!product.createdAt) return false
      const productDate = new Date(product.createdAt)
      const start = new Date(startDate + 'T00:00:00Z')
      const end = new Date(endDate + 'T23:59:59Z')
      return productDate >= start && productDate <= end
    })
  }

  async getSoldProductsByDateRange(userId: string, startDate: string, endDate: string): Promise<Produit[]> {
    const products = await this.getProductsByUserId(userId)
    return products.filter(product => {
      if (!product.vendu || !product.dateVente) return false
      const saleDate = new Date(product.dateVente)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return saleDate >= start && saleDate <= end
    })
  }
}

// Mock sales service implementation
class SalesService {
  private productService: ProductService

  constructor(productService: ProductService) {
    this.productService = productService
  }

  async recordSale(productId: string, saleData: {
    prixVente: number
    dateVente?: string
    plateforme?: string
    tempsEnLigne?: string
  }, userId: string): Promise<Produit | null> {
    const product = await this.productService.markAsSold(productId, saleData, userId)
    if (product) {
      // Log the sale transaction
      await this.logSaleTransaction(product, saleData)
    }
    return product
  }

  async cancelSale(productId: string, userId: string): Promise<Produit | null> {
    return await this.productService.markAsAvailable(productId, userId)
  }

  async updateSaleDetails(productId: string, saleData: {
    prixVente?: number
    dateVente?: string
    plateforme?: string
    tempsEnLigne?: string
  }, userId: string): Promise<Produit | null> {
    return await this.productService.updateProduct(productId, saleData, userId)
  }

  async getSalesHistory(userId: string): Promise<Produit[]> {
    const products = await this.productService.getProductsByUserId(userId)
    return products.filter(p => p.vendu)
  }

  async getSalesByPlatform(userId: string, platform: string): Promise<Produit[]> {
    const soldProducts = await this.getSalesHistory(userId)
    return soldProducts.filter(p => p.plateforme === platform)
  }

  async calculateROI(productId: string, userId: string): Promise<number | null> {
    const product = await this.productService.getProductById(productId, userId)
    if (!product || !product.vendu || product.benefices == null) {
      return null
    }

    const totalCost = product.prixArticle + product.prixLivraison
    if (totalCost === 0) {
      return null
    }

    return (product.benefices / totalCost) * 100
  }

  async calculateMargins(productId: string, userId: string): Promise<{
    grossMargin: number | null
    netMargin: number | null
    markup: number | null
  }> {
    const product = await this.productService.getProductById(productId, userId)
    if (!product || !product.vendu || product.prixVente == null) {
      return { grossMargin: null, netMargin: null, markup: null }
    }

    const totalCost = product.prixArticle + product.prixLivraison
    const grossMargin = totalCost > 0 ? ((product.prixVente - totalCost) / product.prixVente) * 100 : null
    const netMargin = product.prixVente > 0 ? (product.benefices! / product.prixVente) * 100 : null
    const markup = totalCost > 0 ? ((product.prixVente - totalCost) / totalCost) * 100 : null

    return { grossMargin, netMargin, markup }
  }

  private async logSaleTransaction(product: Produit, saleData: any): Promise<void> {
    // Mock logging implementation
    console.log(`Sale recorded for product ${product.id}:`, {
      productName: product.nom,
      salePrice: saleData.prixVente,
      benefits: product.benefices,
      platform: saleData.plateforme,
      date: saleData.dateVente
    })
  }
}

describe('Product Services - Classic Backend Tests', () => {
  let productService: ProductService
  let salesService: SalesService
  const testUserId = 'test-user-123'

  beforeAll(() => {
    productService = new ProductService(mockDatabaseService)
    salesService = new SalesService(productService)
  })

  beforeEach(() => {
    ServiceMockFactory.resetAllMocks()
    
    // Setup default mock implementations
    mockDatabaseService.products.create.mockResolvedValue(true)
    mockDatabaseService.products.findById.mockResolvedValue(null)
    mockDatabaseService.products.findByUserId.mockResolvedValue([])
    mockDatabaseService.products.findByParcelleId.mockResolvedValue([])
    mockDatabaseService.products.update.mockResolvedValue(true)
    mockDatabaseService.products.delete.mockResolvedValue(true)
  })

  describe('ProductService - CRUD Operations', () => {
    test('should create product with valid data', async () => {
      const productData = {
        nom: 'Test Product',
        prixArticle: 25.00,
        prixLivraison: 5.00,
        poids: 250,
        commandeId: 'cmd-123',
        parcelleId: 'parcelle-456'
      }

      const result = await productService.createProduct(productData, testUserId)

      expect(result).toMatchObject({
        id: expect.any(String),
        userId: testUserId,
        nom: productData.nom,
        prixArticle: productData.prixArticle,
        prixLivraison: productData.prixLivraison,
        poids: productData.poids,
        commandeId: productData.commandeId,
        parcelleId: productData.parcelleId,
        vendu: false,
        benefices: null,
        pourcentageBenefice: null
      })

      expect(mockDatabaseService.products.create).toHaveBeenCalledWith(
        expect.objectContaining(productData)
      )
    })

    test('should create product with sale data and calculate benefits', async () => {
      const productData = {
        nom: 'Sold Product',
        prixArticle: 20.00,
        prixLivraison: 5.00,
        poids: 200,
        commandeId: 'cmd-sold',
        parcelleId: 'parcelle-123',
        vendu: true,
        prixVente: 35.00,
        plateforme: 'Vinted'
      }

      const result = await productService.createProduct(productData, testUserId)

      expect(result).toMatchObject({
        vendu: true,
        prixVente: 35.00,
        benefices: 10.00, // 35 - (20 + 5)
        pourcentageBenefice: 40.00, // (10 / 25) * 100
        plateforme: 'Vinted'
      })
    })

    test('should get product by ID for authorized user', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        nom: 'Test Product',
        prixArticle: 15.00,
        prixLivraison: 3.00,
        poids: 150
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const result = await productService.getProductById('product-123', testUserId)

      expect(result).toEqual(mockProduct)
      expect(mockDatabaseService.products.findById).toHaveBeenCalledWith('product-123')
    })

    test('should return null for product belonging to different user', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: 'other-user',
        nom: 'Other User Product'
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const result = await productService.getProductById('product-123', testUserId)

      expect(result).toBeNull()
    })

    test('should get products by user ID', async () => {
      const mockProducts = [
        { id: 'product-1', userId: testUserId, nom: 'Product 1' },
        { id: 'product-2', userId: testUserId, nom: 'Product 2' }
      ]

      mockDatabaseService.products.findByUserId.mockResolvedValue(mockProducts)

      const result = await productService.getProductsByUserId(testUserId)

      expect(result).toEqual(mockProducts)
      expect(mockDatabaseService.products.findByUserId).toHaveBeenCalledWith(testUserId)
    })

    test('should update product with recalculated benefits', async () => {
      const existingProduct = {
        id: 'product-123',
        userId: testUserId,
        nom: 'Original Product',
        prixArticle: 20.00,
        prixLivraison: 4.00,
        poids: 200,
        vendu: false,
        benefices: null,
        pourcentageBenefice: null
      }

      const updateData = {
        vendu: true,
        prixVente: 35.00,
        plateforme: 'Vinted'
      }

      mockDatabaseService.products.findById.mockResolvedValue(existingProduct)

      const result = await productService.updateProduct('product-123', updateData, testUserId)

      expect(result).toMatchObject({
        ...existingProduct,
        ...updateData,
        benefices: 11.00, // 35 - (20 + 4)
        pourcentageBenefice: expect.closeTo(45.83, 1) // (11 / 24) * 100
      })

      expect(mockDatabaseService.products.update).toHaveBeenCalledWith(
        'product-123',
        expect.objectContaining(updateData)
      )
    })

    test('should delete product for authorized user', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        nom: 'Product to Delete'
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const result = await productService.deleteProduct('product-123', testUserId)

      expect(result).toBe(true)
      expect(mockDatabaseService.products.delete).toHaveBeenCalledWith('product-123')
    })

    test('should not delete product for unauthorized user', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: 'other-user',
        nom: 'Other User Product'
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const result = await productService.deleteProduct('product-123', testUserId)

      expect(result).toBe(false)
      expect(mockDatabaseService.products.delete).not.toHaveBeenCalled()
    })
  })  
describe('ProductService - Business Logic and Calculations', () => {
    test('should calculate benefits correctly for profitable sale', async () => {
      const productData = {
        nom: 'Profitable Product',
        prixArticle: 30.00,
        prixLivraison: 8.00,
        poids: 300,
        commandeId: 'cmd-profit',
        parcelleId: 'parcelle-123',
        vendu: true,
        prixVente: 55.00
      }

      const result = await productService.createProduct(productData, testUserId)

      expect(result.benefices).toBe(17.00) // 55 - (30 + 8)
      expect(result.pourcentageBenefice).toBeCloseTo(44.74, 1) // (17 / 38) * 100
    })

    test('should calculate benefits correctly for loss scenario', async () => {
      const productData = {
        nom: 'Loss Product',
        prixArticle: 40.00,
        prixLivraison: 10.00,
        poids: 400,
        commandeId: 'cmd-loss',
        parcelleId: 'parcelle-123',
        vendu: true,
        prixVente: 35.00
      }

      const result = await productService.createProduct(productData, testUserId)

      expect(result.benefices).toBe(-15.00) // 35 - (40 + 10)
      expect(result.pourcentageBenefice).toBe(-30.00) // (-15 / 50) * 100
    })

    test('should handle zero cost scenario', async () => {
      const productData = {
        nom: 'Free Product',
        prixArticle: 0.00,
        prixLivraison: 0.00,
        poids: 100,
        commandeId: 'cmd-free',
        parcelleId: 'parcelle-123',
        vendu: true,
        prixVente: 20.00
      }

      const result = await productService.createProduct(productData, testUserId)

      expect(result.benefices).toBe(20.00)
      expect(result.pourcentageBenefice).toBeNull() // Division by zero
    })

    test('should handle break-even scenario', async () => {
      const productData = {
        nom: 'Break Even Product',
        prixArticle: 25.00,
        prixLivraison: 5.00,
        poids: 200,
        commandeId: 'cmd-break-even',
        parcelleId: 'parcelle-123',
        vendu: true,
        prixVente: 30.00
      }

      const result = await productService.createProduct(productData, testUserId)

      expect(result.benefices).toBe(0.00)
      expect(result.pourcentageBenefice).toBe(0.00)
    })

    test('should validate product data correctly', async () => {
      const validData = {
        nom: 'Valid Product',
        prixArticle: 20.00,
        prixLivraison: 4.00,
        poids: 200,
        commandeId: 'cmd-valid'
      }

      const result = await productService.validateProductData(validData)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should detect validation errors', async () => {
      const invalidData = {
        nom: '', // Empty name
        prixArticle: -10.00, // Negative price
        prixLivraison: -2.00, // Negative delivery
        poids: 0, // Zero weight
        commandeId: '', // Empty command ID
        prixVente: -5.00 // Negative sale price
      }

      const result = await productService.validateProductData(invalidData)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Product name is required')
      expect(result.errors).toContain('Article price must be a positive number')
      expect(result.errors).toContain('Delivery price must be a positive number')
      expect(result.errors).toContain('Weight must be a positive number')
      expect(result.errors).toContain('Command ID is required')
      expect(result.errors).toContain('Sale price must be a positive number')
    })

    test('should search products by name and description', async () => {
      const mockProducts = [
        { id: '1', nom: 'Red Shirt', details: 'Cotton fabric', plateforme: 'Vinted' },
        { id: '2', nom: 'Blue Jeans', details: 'Denim material', plateforme: 'Leboncoin' },
        { id: '3', nom: 'Green Jacket', details: 'Waterproof cotton', plateforme: 'Vinted' }
      ]

      mockDatabaseService.products.findByUserId.mockResolvedValue(mockProducts)

      // Search by name
      const nameResults = await productService.searchProducts('shirt', testUserId)
      expect(nameResults).toHaveLength(1)
      expect(nameResults[0].nom).toBe('Red Shirt')

      // Search by description
      const descResults = await productService.searchProducts('cotton', testUserId)
      expect(descResults).toHaveLength(2)

      // Search by platform
      const platformResults = await productService.searchProducts('vinted', testUserId)
      expect(platformResults).toHaveLength(2)
    })

    test('should get product statistics correctly', async () => {
      const mockProducts = [
        { 
          id: '1', 
          vendu: true, 
          prixVente: 30.00, 
          benefices: 10.00, 
          pourcentageBenefice: 50.00 
        },
        { 
          id: '2', 
          vendu: true, 
          prixVente: 25.00, 
          benefices: 5.00, 
          pourcentageBenefice: 25.00 
        },
        { 
          id: '3', 
          vendu: false, 
          prixVente: null, 
          benefices: null, 
          pourcentageBenefice: null 
        }
      ]

      mockDatabaseService.products.findByUserId.mockResolvedValue(mockProducts)

      const stats = await productService.getProductStatistics(testUserId)

      expect(stats).toEqual({
        total: 3,
        sold: 2,
        available: 1,
        totalRevenue: 55.00,
        totalBenefits: 15.00,
        averageBenefitPercentage: 37.50
      })
    })

    test('should get products by date range', async () => {
      const mockProducts = [
        { id: '1', createdAt: '2024-01-15T10:00:00Z' },
        { id: '2', createdAt: '2024-01-20T10:00:00Z' },
        { id: '3', createdAt: '2024-01-25T10:00:00Z' }
      ]

      mockDatabaseService.products.findByUserId.mockResolvedValue(mockProducts)

      const results = await productService.getProductsByDateRange(
        testUserId, 
        '2024-01-18', 
        '2024-01-22'
      )

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('2')
    })

    test('should get sold products by date range', async () => {
      const mockProducts = [
        { id: '1', vendu: true, dateVente: '2024-01-15' },
        { id: '2', vendu: true, dateVente: '2024-01-20' },
        { id: '3', vendu: false, dateVente: null },
        { id: '4', vendu: true, dateVente: '2024-01-25' }
      ]

      mockDatabaseService.products.findByUserId.mockResolvedValue(mockProducts)

      const results = await productService.getSoldProductsByDateRange(
        testUserId, 
        '2024-01-18', 
        '2024-01-22'
      )

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('2')
    })
  })

  describe('SalesService - Transaction Recording', () => {
    test('should record sale successfully', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        nom: 'Test Product',
        prixArticle: 20.00,
        prixLivraison: 4.00,
        vendu: false
      }

      const saleData = {
        prixVente: 35.00,
        dateVente: '2024-01-20',
        plateforme: 'Vinted',
        tempsEnLigne: '5 days'
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const result = await salesService.recordSale('product-123', saleData, testUserId)

      expect(result).toMatchObject({
        vendu: true,
        prixVente: 35.00,
        dateVente: '2024-01-20',
        plateforme: 'Vinted',
        tempsEnLigne: '5 days',
        benefices: 11.00,
        pourcentageBenefice: expect.closeTo(45.83, 1)
      })
    })

    test('should cancel sale successfully', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        nom: 'Sold Product',
        prixArticle: 20.00,
        prixLivraison: 4.00,
        vendu: true,
        prixVente: 35.00,
        plateforme: 'Vinted'
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const result = await salesService.cancelSale('product-123', testUserId)

      expect(result).toMatchObject({
        vendu: false,
        prixVente: null,
        dateVente: null,
        plateforme: null,
        tempsEnLigne: null,
        benefices: null,
        pourcentageBenefice: null
      })
    })

    test('should update sale details', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        nom: 'Sold Product',
        prixArticle: 20.00,
        prixLivraison: 4.00,
        vendu: true,
        prixVente: 30.00,
        plateforme: 'Vinted'
      }

      const updateData = {
        prixVente: 32.00,
        plateforme: 'Leboncoin'
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const result = await salesService.updateSaleDetails('product-123', updateData, testUserId)

      expect(result).toMatchObject({
        prixVente: 32.00,
        plateforme: 'Leboncoin',
        benefices: 8.00, // 32 - (20 + 4)
        pourcentageBenefice: expect.closeTo(33.33, 1)
      })
    })

    test('should get sales history', async () => {
      const mockProducts = [
        { id: '1', vendu: true, prixVente: 30.00 },
        { id: '2', vendu: false, prixVente: null },
        { id: '3', vendu: true, prixVente: 25.00 }
      ]

      mockDatabaseService.products.findByUserId.mockResolvedValue(mockProducts)

      const result = await salesService.getSalesHistory(testUserId)

      expect(result).toHaveLength(2)
      expect(result.every(p => p.vendu)).toBe(true)
    })

    test('should get sales by platform', async () => {
      const mockProducts = [
        { id: '1', vendu: true, plateforme: 'Vinted' },
        { id: '2', vendu: true, plateforme: 'Leboncoin' },
        { id: '3', vendu: true, plateforme: 'Vinted' }
      ]

      mockDatabaseService.products.findByUserId.mockResolvedValue(mockProducts)

      const vintedSales = await salesService.getSalesByPlatform(testUserId, 'Vinted')
      const leboncoinSales = await salesService.getSalesByPlatform(testUserId, 'Leboncoin')

      expect(vintedSales).toHaveLength(2)
      expect(leboncoinSales).toHaveLength(1)
    })

    test('should calculate ROI correctly', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        vendu: true,
        prixArticle: 20.00,
        prixLivraison: 5.00,
        prixVente: 35.00,
        benefices: 10.00
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const roi = await salesService.calculateROI('product-123', testUserId)

      expect(roi).toBeCloseTo(40.00, 1) // (10 / 25) * 100
    })

    test('should return null ROI for unsold product', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        vendu: false,
        benefices: null
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const roi = await salesService.calculateROI('product-123', testUserId)

      expect(roi).toBeNull()
    })

    test('should calculate margins correctly', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        vendu: true,
        prixArticle: 20.00,
        prixLivraison: 5.00,
        prixVente: 35.00,
        benefices: 10.00
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const margins = await salesService.calculateMargins('product-123', testUserId)

      expect(margins.grossMargin).toBeCloseTo(28.57, 1) // ((35-25)/35)*100
      expect(margins.netMargin).toBeCloseTo(28.57, 1) // (10/35)*100
      expect(margins.markup).toBeCloseTo(40.00, 1) // ((35-25)/25)*100
    })

    test('should return null margins for unsold product', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        vendu: false,
        prixVente: null
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      const margins = await salesService.calculateMargins('product-123', testUserId)

      expect(margins.grossMargin).toBeNull()
      expect(margins.netMargin).toBeNull()
      expect(margins.markup).toBeNull()
    })
  })

  describe('ProductService - Inventory Management and Stock Tracking', () => {
    test('should track product status transitions', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        nom: 'Status Test Product',
        prixArticle: 25.00,
        prixLivraison: 5.00,
        vendu: false
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      // Mark as sold
      const soldProduct = await productService.markAsSold('product-123', {
        prixVente: 40.00,
        dateVente: '2024-01-20',
        plateforme: 'Vinted'
      }, testUserId)

      expect(soldProduct).toMatchObject({
        vendu: true,
        prixVente: 40.00,
        benefices: 10.00
      })

      // Mark as available again
      const availableProduct = await productService.markAsAvailable('product-123', testUserId)

      expect(availableProduct).toMatchObject({
        vendu: false,
        prixVente: null,
        benefices: null
      })
    })

    test('should get products by parcelle with user authorization', async () => {
      const mockProducts = [
        { id: '1', parcelleId: 'parcelle-123', userId: testUserId },
        { id: '2', parcelleId: 'parcelle-123', userId: 'other-user' },
        { id: '3', parcelleId: 'parcelle-123', userId: testUserId }
      ]

      mockDatabaseService.products.findByParcelleId.mockResolvedValue(mockProducts)

      const result = await productService.getProductsByParcelleId('parcelle-123', testUserId)

      expect(result).toHaveLength(2)
      expect(result.every(p => p.userId === testUserId)).toBe(true)
    })

    test('should handle concurrent product updates', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        nom: 'Concurrent Test',
        prixArticle: 20.00,
        prixLivraison: 4.00,
        vendu: false
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      // Simulate concurrent updates
      const update1Promise = productService.updateProduct('product-123', {
        prixVente: 30.00,
        vendu: true
      }, testUserId)

      const update2Promise = productService.updateProduct('product-123', {
        plateforme: 'Vinted'
      }, testUserId)

      const [result1, result2] = await Promise.all([update1Promise, update2Promise])

      // Both updates should succeed (in real implementation, this would need proper concurrency control)
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(mockDatabaseService.products.update).toHaveBeenCalledTimes(2)
    })

    test('should validate business rules for product updates', async () => {
      const mockProduct = {
        id: 'product-123',
        userId: testUserId,
        nom: 'Business Rule Test',
        prixArticle: 20.00,
        prixLivraison: 4.00,
        vendu: true,
        prixVente: 30.00
      }

      mockDatabaseService.products.findById.mockResolvedValue(mockProduct)

      // Test updating sold product with invalid sale price
      const invalidUpdate = {
        prixVente: -10.00 // Negative price
      }

      const validation = await productService.validateProductData(invalidUpdate)
      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Sale price must be a positive number')
    })

    test('should handle database transaction integrity', async () => {
      const productData = {
        nom: 'Transaction Test',
        prixArticle: 15.00,
        prixLivraison: 3.00,
        poids: 150,
        commandeId: 'cmd-transaction',
        parcelleId: 'parcelle-123'
      }

      // Mock database error
      mockDatabaseService.products.create.mockRejectedValue(new Error('Database error'))

      await expect(productService.createProduct(productData, testUserId))
        .rejects.toThrow('Database error')

      // Verify rollback behavior would be handled by database service
      expect(mockDatabaseService.products.create).toHaveBeenCalledOnce()
    })

    test('should handle edge cases in benefit calculations', async () => {
      // Test with very small numbers
      const smallNumberProduct = {
        nom: 'Small Numbers',
        prixArticle: 0.01,
        prixLivraison: 0.01,
        poids: 1,
        commandeId: 'cmd-small',
        parcelleId: 'parcelle-123',
        vendu: true,
        prixVente: 0.05
      }

      const result1 = await productService.createProduct(smallNumberProduct, testUserId)
      expect(result1.benefices).toBeCloseTo(0.03, 2)
      expect(result1.pourcentageBenefice).toBeCloseTo(150.00, 1)

      // Test with very large numbers
      const largeNumberProduct = {
        nom: 'Large Numbers',
        prixArticle: 999999.99,
        prixLivraison: 0.01,
        poids: 1000,
        commandeId: 'cmd-large',
        parcelleId: 'parcelle-123',
        vendu: true,
        prixVente: 1500000.00
      }

      const result2 = await productService.createProduct(largeNumberProduct, testUserId)
      expect(result2.benefices).toBeCloseTo(500000.00, 2)
      expect(result2.pourcentageBenefice).toBeCloseTo(50.00, 1)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle null and undefined values gracefully', async () => {
      const productWithNulls = {
        nom: 'Null Test',
        prixArticle: 10.00,
        prixLivraison: 2.00,
        poids: 100,
        commandeId: 'cmd-null',
        parcelleId: 'parcelle-123',
        details: null,
        prixVente: null,
        dateVente: undefined,
        plateforme: undefined
      }

      const result = await productService.createProduct(productWithNulls, testUserId)

      expect(result.details).toBeNull()
      expect(result.benefices).toBeNull()
      expect(result.pourcentageBenefice).toBeNull()
    })

    test('should handle database service failures', async () => {
      mockDatabaseService.products.findByUserId.mockRejectedValue(new Error('Database connection failed'))

      await expect(productService.getProductsByUserId(testUserId))
        .rejects.toThrow('Database connection failed')
    })

    test('should handle invalid user IDs', async () => {
      const invalidUserIds = ['', null, undefined, 'invalid-user-id']

      for (const invalidId of invalidUserIds) {
        mockDatabaseService.products.findByUserId.mockResolvedValue([])
        
        const result = await productService.getProductsByUserId(invalidId as string)
        expect(result).toEqual([])
      }
    })

    test('should handle malformed product data', async () => {
      const malformedData = {
        nom: 123, // Should be string
        prixArticle: 'invalid', // Should be number
        prixLivraison: true, // Should be number
        poids: [], // Should be number
        commandeId: {}, // Should be string
        parcelleId: null
      }

      const validation = await productService.validateProductData(malformedData as any)
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    test('should handle empty search queries', async () => {
      mockDatabaseService.products.findByUserId.mockResolvedValue([
        { id: '1', nom: 'Product 1', details: 'Description 1' },
        { id: '2', nom: 'Product 2', details: 'Description 2' }
      ])

      const emptyResults = await productService.searchProducts('', testUserId)
      const spaceResults = await productService.searchProducts('   ', testUserId)

      // Empty search should return no results
      expect(emptyResults).toHaveLength(0)
      expect(spaceResults).toHaveLength(0)
    })

    test('should handle date range edge cases', async () => {
      const mockProducts = [
        { id: '1', createdAt: '2024-01-15T23:59:59Z' },
        { id: '2', createdAt: '2024-01-16T00:00:00Z' },
        { id: '3', createdAt: '2024-01-16T23:59:59Z' },
        { id: '4', createdAt: '2024-01-17T00:00:00Z' }
      ]

      mockDatabaseService.products.findByUserId.mockResolvedValue(mockProducts)

      // Test exact boundary dates
      const results = await productService.getProductsByDateRange(
        testUserId,
        '2024-01-16',
        '2024-01-16'
      )

      expect(results).toHaveLength(2)
      expect(results.map(p => p.id)).toEqual(['2', '3'])
    })
  })
})