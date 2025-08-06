import { faker } from '@faker-js/faker'

// User test data factory
export class UserFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: faker.string.uuid(),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      role: faker.helpers.arrayElement(['admin', 'user']),
      profile: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        avatar: faker.image.avatar(),
        theme: faker.helpers.arrayElement(['light', 'dark', 'system'])
      },
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides
    }
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, () => this.create(overrides))
  }

  static createAdmin(overrides: Partial<any> = {}) {
    return this.create({ role: 'admin', ...overrides })
  }

  static createRegularUser(overrides: Partial<any> = {}) {
    return this.create({ role: 'user', ...overrides })
  }
}

// Parcelle test data factory
export class ParcelleFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: faker.string.uuid(),
      numero: `P${faker.string.numeric(3)}`,
      transporteur: faker.helpers.arrayElement(['DHL', 'UPS', 'FedEx', 'Colissimo', 'Chronopost']),
      poids: parseFloat(faker.number.float({ min: 0.1, max: 10, fractionDigits: 2 }).toFixed(2)),
      prixAchat: parseFloat(faker.number.float({ min: 5, max: 500, fractionDigits: 2 }).toFixed(2)),
      dateCreation: faker.date.past().toISOString(),
      userId: faker.string.uuid(),
      notes: faker.lorem.sentence(),
      status: faker.helpers.arrayElement(['active', 'completed', 'cancelled']),
      ...overrides
    }
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, () => this.create(overrides))
  }

  static createWithProducts(productCount: number = 3, overrides: Partial<any> = {}) {
    const parcelle = this.create(overrides)
    const products = ProductFactory.createMany(productCount, { parcelleId: parcelle.id })
    return { ...parcelle, products }
  }
}

// Product test data factory
export class ProductFactory {
  static create(overrides: Partial<any> = {}) {
    const prix = parseFloat(faker.number.float({ min: 1, max: 200, fractionDigits: 2 }).toFixed(2))
    return {
      id: faker.string.uuid(),
      nom: faker.commerce.productName(),
      prix,
      quantite: faker.number.int({ min: 1, max: 10 }),
      parcelleId: faker.string.uuid(),
      description: faker.commerce.productDescription(),
      status: faker.helpers.arrayElement(['available', 'sold', 'reserved']),
      dateCreation: faker.date.past().toISOString(),
      dateVente: null,
      prixVente: null,
      plateforme: null,
      fraisVente: 0,
      benefice: null,
      images: [],
      tags: faker.helpers.arrayElements(['vintage', 'rare', 'popular', 'trending'], { min: 0, max: 3 }),
      ...overrides
    }
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, () => this.create(overrides))
  }

  static createSold(overrides: Partial<any> = {}) {
    const prix = parseFloat(faker.number.float({ min: 1, max: 200, fractionDigits: 2 }).toFixed(2))
    const prixVente = parseFloat(faker.number.float({ min: prix, max: prix * 2, fractionDigits: 2 }).toFixed(2))
    const fraisVente = parseFloat((prixVente * 0.1).toFixed(2))
    const benefice = parseFloat((prixVente - prix - fraisVente).toFixed(2))

    return this.create({
      status: 'sold',
      dateVente: faker.date.recent().toISOString(),
      prixVente,
      plateforme: faker.helpers.arrayElement(['Vinted', 'eBay', 'LeBonCoin', 'Facebook']),
      fraisVente,
      benefice,
      ...overrides
    })
  }

  static createAvailable(overrides: Partial<any> = {}) {
    return this.create({ status: 'available', ...overrides })
  }
}

// Market analysis test data factory
export class MarketAnalysisFactory {
  static createSearchQuery(overrides: Partial<any> = {}) {
    return {
      id: faker.string.uuid(),
      query: faker.commerce.productName(),
      brand: faker.company.name(),
      category: faker.helpers.arrayElement(['Vêtements', 'Chaussures', 'Accessoires', 'Maison']),
      minPrice: faker.number.int({ min: 1, max: 50 }),
      maxPrice: faker.number.int({ min: 51, max: 200 }),
      condition: faker.helpers.arrayElement(['Neuf', 'Très bon état', 'Bon état', 'État satisfaisant']),
      size: faker.helpers.arrayElement(['XS', 'S', 'M', 'L', 'XL']),
      createdAt: faker.date.recent().toISOString(),
      ...overrides
    }
  }

  static createSearchResult(overrides: Partial<any> = {}) {
    return {
      id: faker.string.uuid(),
      title: faker.commerce.productName(),
      price: parseFloat(faker.number.float({ min: 1, max: 200, fractionDigits: 2 }).toFixed(2)),
      brand: faker.company.name(),
      size: faker.helpers.arrayElement(['XS', 'S', 'M', 'L', 'XL']),
      condition: faker.helpers.arrayElement(['Neuf', 'Très bon état', 'Bon état', 'État satisfaisant']),
      url: faker.internet.url(),
      imageUrl: faker.image.url(),
      seller: faker.internet.userName(),
      location: faker.location.city(),
      views: faker.number.int({ min: 0, max: 1000 }),
      likes: faker.number.int({ min: 0, max: 100 }),
      datePosted: faker.date.recent().toISOString(),
      ...overrides
    }
  }

  static createAnalysisReport(overrides: Partial<any> = {}) {
    return {
      id: faker.string.uuid(),
      queryId: faker.string.uuid(),
      totalResults: faker.number.int({ min: 10, max: 500 }),
      averagePrice: parseFloat(faker.number.float({ min: 10, max: 100, fractionDigits: 2 }).toFixed(2)),
      medianPrice: parseFloat(faker.number.float({ min: 10, max: 100, fractionDigits: 2 }).toFixed(2)),
      minPrice: parseFloat(faker.number.float({ min: 1, max: 20, fractionDigits: 2 }).toFixed(2)),
      maxPrice: parseFloat(faker.number.float({ min: 100, max: 300, fractionDigits: 2 }).toFixed(2)),
      priceDistribution: {
        '0-20': faker.number.int({ min: 0, max: 50 }),
        '20-50': faker.number.int({ min: 0, max: 100 }),
        '50-100': faker.number.int({ min: 0, max: 80 }),
        '100+': faker.number.int({ min: 0, max: 30 })
      },
      brandDistribution: Object.fromEntries(
        Array.from({ length: 5 }, () => [
          faker.company.name(),
          faker.number.int({ min: 1, max: 50 })
        ])
      ),
      conditionDistribution: {
        'Neuf': faker.number.int({ min: 0, max: 30 }),
        'Très bon état': faker.number.int({ min: 0, max: 50 }),
        'Bon état': faker.number.int({ min: 0, max: 40 }),
        'État satisfaisant': faker.number.int({ min: 0, max: 20 })
      },
      createdAt: faker.date.recent().toISOString(),
      ...overrides
    }
  }
}

// Statistics test data factory
export class StatisticsFactory {
  static createROIData(overrides: Partial<any> = {}) {
    return {
      totalInvestment: parseFloat(faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }).toFixed(2)),
      totalRevenue: parseFloat(faker.number.float({ min: 150, max: 7500, fractionDigits: 2 }).toFixed(2)),
      totalProfit: parseFloat(faker.number.float({ min: 50, max: 2500, fractionDigits: 2 }).toFixed(2)),
      roi: parseFloat(faker.number.float({ min: 10, max: 200, fractionDigits: 2 }).toFixed(2)),
      period: faker.helpers.arrayElement(['week', 'month', 'quarter', 'year']),
      startDate: faker.date.past().toISOString(),
      endDate: faker.date.recent().toISOString(),
      ...overrides
    }
  }

  static createSalesData(overrides: Partial<any> = {}) {
    return {
      totalSales: faker.number.int({ min: 10, max: 500 }),
      totalRevenue: parseFloat(faker.number.float({ min: 500, max: 10000, fractionDigits: 2 }).toFixed(2)),
      averageSalePrice: parseFloat(faker.number.float({ min: 10, max: 200, fractionDigits: 2 }).toFixed(2)),
      topSellingProducts: Array.from({ length: 5 }, () => ({
        productId: faker.string.uuid(),
        name: faker.commerce.productName(),
        salesCount: faker.number.int({ min: 1, max: 20 }),
        revenue: parseFloat(faker.number.float({ min: 50, max: 1000, fractionDigits: 2 }).toFixed(2))
      })),
      salesByPlatform: {
        'Vinted': faker.number.int({ min: 0, max: 100 }),
        'eBay': faker.number.int({ min: 0, max: 50 }),
        'LeBonCoin': faker.number.int({ min: 0, max: 30 }),
        'Facebook': faker.number.int({ min: 0, max: 20 })
      },
      period: faker.helpers.arrayElement(['week', 'month', 'quarter', 'year']),
      ...overrides
    }
  }
}

// API test data factory
export class ApiTestDataFactory {
  static createAuthRequest(overrides: Partial<any> = {}) {
    return {
      email: faker.internet.email(),
      password: faker.internet.password(),
      ...overrides
    }
  }

  static createParcelleRequest(overrides: Partial<any> = {}) {
    return {
      numero: `P${faker.string.numeric(3)}`,
      transporteur: faker.helpers.arrayElement(['DHL', 'UPS', 'FedEx']),
      poids: parseFloat(faker.number.float({ min: 0.1, max: 10, fractionDigits: 2 }).toFixed(2)),
      prixAchat: parseFloat(faker.number.float({ min: 5, max: 500, fractionDigits: 2 }).toFixed(2)),
      notes: faker.lorem.sentence(),
      ...overrides
    }
  }

  static createProductRequest(overrides: Partial<any> = {}) {
    return {
      nom: faker.commerce.productName(),
      prix: parseFloat(faker.number.float({ min: 1, max: 200, fractionDigits: 2 }).toFixed(2)),
      quantite: faker.number.int({ min: 1, max: 10 }),
      parcelleId: faker.string.uuid(),
      description: faker.commerce.productDescription(),
      ...overrides
    }
  }

  static createMarketAnalysisRequest(overrides: Partial<any> = {}) {
    return {
      query: faker.commerce.productName(),
      brand: faker.company.name(),
      category: faker.helpers.arrayElement(['Vêtements', 'Chaussures', 'Accessoires']),
      minPrice: faker.number.int({ min: 1, max: 50 }),
      maxPrice: faker.number.int({ min: 51, max: 200 }),
      condition: faker.helpers.arrayElement(['Neuf', 'Très bon état', 'Bon état']),
      ...overrides
    }
  }
}

// Test database seeder
export class TestDataSeeder {
  static async seedUsers(count: number = 10) {
    return UserFactory.createMany(count)
  }

  static async seedParcelles(count: number = 20, userId?: string) {
    return ParcelleFactory.createMany(count, userId ? { userId } : {})
  }

  static async seedProducts(count: number = 50, parcelleId?: string) {
    return ProductFactory.createMany(count, parcelleId ? { parcelleId } : {})
  }

  static async seedCompleteDataset() {
    const users = await this.seedUsers(5)
    const parcelles = await this.seedParcelles(15, users[0].id)
    const products = await this.seedProducts(40, parcelles[0].id)

    return {
      users,
      parcelles,
      products
    }
  }
}

// Export all factories
export const TestData = {
  User: UserFactory,
  Parcelle: ParcelleFactory,
  Product: ProductFactory,
  MarketAnalysis: MarketAnalysisFactory,
  Statistics: StatisticsFactory,
  ApiTestData: ApiTestDataFactory,
  Seeder: TestDataSeeder
}