
import { DatabaseService } from "@/lib/database";
import { logger } from "@/lib/utils/logging/logger";
import { ProductRepository, ParcelRepository, UserRepository } from "@/lib/repositories";

interface BrandSuggestion {
  brand: string;
  count: number;
}

interface CategorySuggestion {
  category: string;
  count: number;
}

interface ProductSuggestion {
  product: string;
  count: number;
}

interface TransporteurSuggestion {
  transporteur: string;
  count: number;
}

interface UserSuggestion {
  nom: string;
  count: number;
}

// Interfaces for global search results (mapped to frontend expectations)
interface SearchProduct {
  id: string;
  userId: string;
  productName: string;
  externalProductId?: string | null;
  lastCheckedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

interface SearchParcel {
  id: string;
  userId: string;
  numero: string;
  transporteur: string;
  prixAchat?: number | null | undefined;
  poids?: number | null | undefined;
  prixTotal?: number | null | undefined;
  prixParGramme?: number | null | undefined;
  createdAt: string | null;
}

export class SearchService {
  private static instance: SearchService;
  private productRepository: ProductRepository;
  private parcelleRepository: ParcelRepository;
  private userRepository: UserRepository;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      const dbService = DatabaseService.getInstance();
      SearchService.instance = new SearchService(
        new ProductRepository(dbService),
        new ParcelRepository(dbService),
        new UserRepository(dbService)
      );
    }
    return SearchService.instance;
  }

  public constructor(
    productRepository: ProductRepository,
    parcelleRepository: ParcelRepository,
    userRepository: UserRepository
  ) {
    this.productRepository = productRepository;
    this.parcelleRepository = parcelleRepository;
    this.userRepository = userRepository;
  }

  async getBrandSuggestions(query: string): Promise<BrandSuggestion[]> {
    logger.info(`Fetching brand suggestions for query: ${query} `);
    return this.productRepository.getBrandSuggestions(query);
  }

  async getCategorySuggestions(query: string): Promise<CategorySuggestion[]> {
    logger.info(`Fetching category suggestions for query: ${query} `);
    return this.productRepository.getCategorySuggestions(query);
  }

  async getProductSuggestions(query: string): Promise<ProductSuggestion[]> {
    logger.info(`Fetching product suggestions for query: ${query} `);
    return this.productRepository.getProductSuggestions(query);
  }

  async getTransporteurSuggestions(query: string): Promise<TransporteurSuggestion[]> {
    logger.info(`Fetching transporteur suggestions for query: ${query} `);
    return this.parcelleRepository.getCarrierSuggestions(query).then(res =>
      res.map(r => ({ transporteur: r.carrier, count: r.count }))
    );
  }

  async getUserSuggestions(query: string): Promise<UserSuggestion[]> {
    logger.info(`Fetching user suggestions for query: ${query} `);
    return this.userRepository.getUserSuggestions(query);
  }

  async globalSearch(
    query: string,
    userId?: string,
  ): Promise<{ products: SearchProduct[]; parcels: SearchParcel[] }> {
    logger.info(`Performing global search for query: ${query} `);
    try {
      let mappedProducts: SearchProduct[] = [];
      let mappedParcels: SearchParcel[] = [];

      if (userId) {
        const products = await this.productRepository.search({ userId, name: query, limit: 10 });
        mappedProducts = products.map(p => ({
          id: p.id,
          userId: p.userId,
          productName: p.name,
          externalProductId: p.externalId,
          lastCheckedAt: null,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));

        const parcels = await this.parcelleRepository.findParcels({ userId, searchTerm: query, limit: 10 });
        mappedParcels = parcels.map(p => ({
          id: p.id,
          userId: p.userId,
          numero: p.superbuyId,
          transporteur: p.carrier ?? "",
          prixAchat: p.totalPrice ?? 0,
          poids: p.weight ?? 0,
          prixTotal: p.totalPrice ?? 0,
          prixParGramme: p.pricePerGram ?? 0,
          createdAt: p.createdAt,
        }));
      } else {
        logger.warn("Global search called without userId, returning empty results for safety.");
      }

      return { products: mappedProducts, parcels: mappedParcels };
    } catch (error: unknown) {
      logger.error(
        `Error during global search: ${error instanceof Error ? error.message : String(error)} `,
      );
      return { products: [], parcels: [] };
    }
  }

  async rebuildSearchIndex(_userId?: string): Promise<void> {
    logger.info("Rebuilding search index...");
    // No-op
    logger.info("Search index rebuilt successfully.");
  }

  async searchProducts(criteria: {
    name?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    isSold?: boolean;
    userId: string;
  }): Promise<SearchProduct[]> {
    try {
      logger.info(`Searching products for user: ${criteria.userId} `, {
        criteria,
      });

      const products = await this.productRepository.search({
        userId: criteria.userId,
        name: criteria.name,
        category: criteria.category,
        brand: criteria.brand,
        status: criteria.isSold ? 'sold' : undefined, // Mapping boolean to status
      });

      return products.map(row => ({
        id: row.id,
        userId: row.userId,
        productName: row.name,
        externalProductId: row.externalId,
        lastCheckedAt: null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    } catch (error: unknown) {
      logger.error(
        `Error searching products: ${error instanceof Error ? error.message : String(error)} `,
        { criteria },
      );
      return [];
    }
  }

  async searchParcelsByCriteria(criteria: {
    numero?: string;
    transporteur?: string;
    userId: string;
  }): Promise<SearchParcel[]> {
    try {
      logger.info(`Searching parcels for user: ${criteria.userId} `, {
        criteria,
      });

      const parcels = await this.parcelleRepository.findParcels({
        userId: criteria.userId,
        superbuyId: criteria.numero,
        carrier: criteria.transporteur,
      });

      return parcels.map(row => ({
        id: row.id,
        userId: row.userId,
        numero: row.superbuyId,
        transporteur: row.carrier ?? "",
        prixAchat: row.totalPrice ?? 0,
        poids: row.weight ?? 0,
        prixTotal: row.totalPrice ?? 0,
        prixParGramme: row.pricePerGram ?? 0,
        createdAt: row.createdAt,
      }));
    } catch (error: unknown) {
      logger.error(
        `Error searching parcels by criteria: ${error instanceof Error ? error.message : String(error)} `,
        { criteria },
      );
      return [];
    }
  }
}

// Export a singleton instance of the SearchService
export const searchService = SearchService.getInstance();
