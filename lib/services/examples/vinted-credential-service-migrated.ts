/**
 * @fileoverview Migrated VintedCredentialService demonstrating new error handling
 * @description Example of how to migrate a service to use the centralized error handling system
 * @version 1.0.0
 * @since 2025-01-10
 */

import { logger } from "@/lib/utils/logging/logger";
import { migrationService } from "@/lib/shared/services/error-migration";
import {
  ValidationError,
  NotFoundError,
  AuthError,
  InfrastructureError,
  ErrorContext,
} from "@/lib/shared/errors";

export interface VintedCredentials {
  email: string;
  password: string;
  sessionToken?: string;
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VintedSearchParams {
  query?: string;
  brand?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  size?: string;
  color?: string;
  material?: string;
  location?: string;
  sortBy?: "newest" | "price_asc" | "price_desc" | "relevance";
  limit?: number;
}

export interface VintedProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  brand?: string;
  category: string;
  condition: string;
  size?: string;
  color?: string;
  material?: string;
  description: string;
  imageUrls: string[];
  url: string;
  seller: {
    id: string;
    username: string;
    rating?: number;
    reviewCount?: number;
  };
  location?: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Migrated VintedCredentialService using the new centralized error handling system
 */
export class VintedCredentialServiceMigrated extends migrationService.createBaseService() {
  private credentials: VintedCredentials | null = null;

  constructor(requestId?: string, userId?: string) {
    super(requestId, userId);
    this.loadCredentials();
  }

  /**
   * Charge les identifiants depuis le stockage local ou les variables d'environnement
   */
  private loadCredentials(): void {
    this.executeOperation(async () => {
      // En développement, utiliser les variables d'environnement
      if (process.env.NODE_ENV === "development") {
        const email = process.env.VINTED_EMAIL;
        const password = process.env.VINTED_PASSWORD;

        if (email && password) {
          this.credentials = {
            email,
            password,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
      }

      // En production, charger depuis la base de données ou le stockage sécurisé
      // TODO: Implémenter le chargement depuis la base de données
    }, 'loadCredentials').catch(error => {
      // Error is already logged by executeOperation
      logger.warn('Failed to load Vinted credentials, continuing without them', {
        requestId: this.requestId,
        userId: this.userId,
      });
    });
  }

  /**
   * Configure les identifiants Vinted
   */
  async setCredentials(email: string, password: string): Promise<boolean> {
    return this.executeOperation(async () => {
      // Validate input parameters
      if (!email || !email.trim()) {
        throw this.createValidationError(
          'Email is required',
          'email',
          { operation: 'setCredentials' }
        );
      }

      if (!password || password.length < 6) {
        throw this.createValidationError(
          'Password must be at least 6 characters long',
          'password',
          { operation: 'setCredentials' }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw this.createValidationError(
          'Invalid email format',
          'email',
          { operation: 'setCredentials', providedEmail: email }
        );
      }

      // Valider les identifiants en tentant une connexion
      const isValid = await this.validateCredentials(email, password);

      if (isValid) {
        this.credentials = {
          email,
          password,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // TODO: Sauvegarder en base de données de manière sécurisée
        return true;
      }

      throw new AuthError(
        'Invalid Vinted credentials provided',
        {
          operation: 'setCredentials',
          email: email, // Don't log password for security
        }
      );
    }, 'setCredentials');
  }

  /**
   * Valide les identifiants en tentant une connexion
   */
  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<boolean> {
    return this.executeOperation(async () => {
      if (!email || !password) {
        throw this.createValidationError(
          'Email and password are required for validation',
          undefined,
          { operation: 'validateCredentials' }
        );
      }

      try {
        // TODO: Implémenter la validation réelle avec l'API Vinted
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // For now, return true if credentials are provided
        return email.length > 0 && password.length > 0;
      } catch (error) {
        // Convert any network or API errors to InfrastructureError
        throw new InfrastructureError(
          'Failed to validate credentials with Vinted API',
          {
            operation: 'validateCredentials',
            email: email,
            originalError: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }, 'validateCredentials');
  }

  /**
   * Vérifie si des identifiants valides sont configurés
   */
  hasValidCredentials(): boolean {
    return this.credentials !== null && this.credentials.isActive;
  }

  /**
   * Récupère les identifiants actuels (sans le mot de passe)
   */
  getCredentialsInfo(): Omit<VintedCredentials, "password"> | null {
    if (!this.credentials) return null;

    const { password, ...info } = this.credentials;
    return info;
  }

  /**
   * Recherche des produits sur Vinted
   */
  async searchProducts(params: VintedSearchParams): Promise<VintedProduct[]> {
    return this.executeOperation(async () => {
      if (!this.hasValidCredentials()) {
        throw new AuthError(
          'Vinted credentials not configured or invalid',
          {
            operation: 'searchProducts',
            hasCredentials: this.credentials !== null,
            isActive: this.credentials?.isActive || false,
          }
        );
      }

      // Validate search parameters
      if (params.minPrice !== undefined && params.minPrice < 0) {
        throw this.createValidationError(
          'Minimum price cannot be negative',
          'minPrice',
          { operation: 'searchProducts', minPrice: params.minPrice }
        );
      }

      if (params.maxPrice !== undefined && params.maxPrice < 0) {
        throw this.createValidationError(
          'Maximum price cannot be negative',
          'maxPrice',
          { operation: 'searchProducts', maxPrice: params.maxPrice }
        );
      }

      if (
        params.minPrice !== undefined &&
        params.maxPrice !== undefined &&
        params.minPrice > params.maxPrice
      ) {
        throw this.createValidationError(
          'Minimum price cannot be greater than maximum price',
          'minPrice',
          {
            operation: 'searchProducts',
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
          }
        );
      }

      if (params.limit !== undefined && (params.limit < 1 || params.limit > 100)) {
        throw this.createValidationError(
          'Limit must be between 1 and 100',
          'limit',
          { operation: 'searchProducts', limit: params.limit }
        );
      }

      try {
        // TODO: Implémenter la recherche réelle avec l'API Vinted
        // Pour l'instant, retourner des données de test
        return this.getMockProducts(params);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error; // Re-throw validation errors as-is
        }

        throw new InfrastructureError(
          'Failed to search products on Vinted',
          {
            operation: 'searchProducts',
            searchParams: params,
            originalError: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }, 'searchProducts');
  }

  /**
   * Récupère les détails d'un produit spécifique
   */
  async getProductDetails(productId: string): Promise<VintedProduct | null> {
    return this.executeOperation(async () => {
      if (!productId || !productId.trim()) {
        throw this.createValidationError(
          'Product ID is required',
          'productId',
          { operation: 'getProductDetails' }
        );
      }

      if (!this.hasValidCredentials()) {
        throw new AuthError(
          'Vinted credentials not configured or invalid',
          {
            operation: 'getProductDetails',
            productId: productId,
          }
        );
      }

      try {
        // TODO: Implémenter la récupération réelle avec l'API Vinted
        // For now, return null (not found)
        return null;
      } catch (error) {
        throw new InfrastructureError(
          'Failed to retrieve product details from Vinted',
          {
            operation: 'getProductDetails',
            productId: productId,
            originalError: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }, 'getProductDetails');
  }

  /**
   * Désactive les identifiants
   */
  async deactivateCredentials(): Promise<void> {
    return this.executeOperation(async () => {
      if (!this.credentials) {
        throw this.createNotFoundError(
          'Credentials',
          undefined,
          { operation: 'deactivateCredentials' }
        );
      }

      this.credentials.isActive = false;
      this.credentials.updatedAt = new Date();
      
      // TODO: Mettre à jour en base de données
      logger.info('Vinted credentials deactivated', {
        requestId: this.requestId,
        userId: this.userId,
        email: this.credentials.email,
      });
    }, 'deactivateCredentials');
  }

  /**
   * Données de test pour le développement
   */
  private getMockProducts(params: VintedSearchParams): VintedProduct[] {
    const mockProducts: VintedProduct[] = [
      {
        id: "1",
        title: "T-shirt Nike vintage",
        price: 15.0,
        currency: "EUR",
        brand: "Nike",
        category: "T-shirts",
        condition: "Bon état",
        size: "M",
        color: "Noir",
        description:
          "T-shirt Nike vintage en excellent état, porté quelques fois seulement.",
        imageUrls: ["https://example.com/image1.jpg"],
        url: "https://vinted.fr/items/1",
        seller: {
          id: "seller1",
          username: "fashionista",
          rating: 4.8,
          reviewCount: 156,
        },
        location: "Paris",
        createdAt: new Date("2024-01-15"),
      },
      {
        id: "2",
        title: "Jeans Levi's 501",
        price: 35.0,
        currency: "EUR",
        brand: "Levi's",
        category: "Jeans",
        condition: "Très bon état",
        size: "32/34",
        color: "Bleu",
        description:
          "Jeans Levi's 501 classique, taille parfaite, très peu porté.",
        imageUrls: ["https://example.com/image2.jpg"],
        url: "https://vinted.fr/items/2",
        seller: {
          id: "seller2",
          username: "denimcollector",
          rating: 4.9,
          reviewCount: 89,
        },
        location: "Lyon",
        createdAt: new Date("2024-01-10"),
      },
    ];

    // Filtrer les résultats selon les paramètres de recherche
    let filtered = mockProducts;

    if (params.query) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(params.query!.toLowerCase()) ||
          p.description.toLowerCase().includes(params.query!.toLowerCase()),
      );
    }

    if (params.brand) {
      filtered = filtered.filter((p) =>
        p.brand?.toLowerCase().includes(params.brand!.toLowerCase()),
      );
    }

    if (params.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= params.minPrice!);
    }

    if (params.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= params.maxPrice!);
    }

    if (params.category) {
      filtered = filtered.filter((p) =>
        p.category.toLowerCase().includes(params.category!.toLowerCase()),
      );
    }

    // Appliquer la limite
    if (params.limit) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  }
}

// Example usage and migration demonstration
export async function demonstrateMigration() {
  console.log('🔄 Demonstrating VintedCredentialService Migration\n');

  // Create migrated service instance
  const migratedService = new VintedCredentialServiceMigrated('req_demo_123', 'user_demo_456');

  try {
    // Test validation errors
    console.log('Testing validation errors...');
    await migratedService.setCredentials('', 'short');
  } catch (error) {
    console.log('✅ Validation error caught:', error instanceof Error ? error.message : String(error));
  }

  try {
    // Test successful operation
    console.log('Testing successful credential setting...');
    const success = await migratedService.setCredentials('test@example.com', 'password123');
    console.log('✅ Credentials set successfully:', success);

    // Test search with validation
    console.log('Testing product search...');
    const products = await migratedService.searchProducts({
      query: 'Nike',
      minPrice: 10,
      maxPrice: 50,
      limit: 5,
    });
    console.log('✅ Products found:', products.length);

  } catch (error) {
    console.log('❌ Operation failed:', error instanceof Error ? error.message : String(error));
  }

  // Analyze migration status
  const migrationStatus = migrationService.analyzeService(migratedService, 'VintedCredentialServiceMigrated');
  console.log('\n📊 Migration Analysis:');
  console.log(`  Migration Score: ${migrationStatus.migrationScore}/100`);
  console.log(`  Is Migrated: ${migrationStatus.isMigrated ? '✅' : '❌'}`);
  console.log(`  Has New Error Methods: ${migrationStatus.hasNewErrorMethods ? '✅' : '❌'}`);
  console.log(`  Has Legacy Patterns: ${migrationStatus.hasLegacyErrorPatterns ? '⚠️' : '✅'}`);
}

export default VintedCredentialServiceMigrated;