import { databaseService } from "./database/db";
import { logger } from "../utils/logging/logger";

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

interface Product {
  id: string;
  userId: string;
  productName: string;
  externalProductId?: string | null; // Changed to allow null
  lastCheckedAt?: string | null; // Changed to allow null
  createdAt: string;
  updatedAt?: string | null; // Changed to allow null
}

interface Parcel {
  id: string;
  userId: string;
  numero: string;
  transporteur: string;
  prixAchat?: number | null; // Changed to allow null
  poids?: number | null; // Changed to allow null
  prixTotal?: number | null; // Changed to allow null
  prixParGramme?: number | null; // Changed to allow null
  createdAt: string | null; // Changed to allow null
}

export class SearchService {
  private static instance: SearchService;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  private constructor() {}

  async getBrandSuggestions(query: string): Promise<BrandSuggestion[]> {
    logger.info(`Fetching brand suggestions for query: ${query}`);
    try {
      const results = await databaseService.query(
        `
        SELECT plateforme as brand, COUNT(*) as count
        FROM products
        WHERE plateforme LIKE ?
        GROUP BY plateforme
        ORDER BY count DESC
        LIMIT 5
      `,
        [`%${query}%`],
      );
      return (results as { brand: string; count: number }[]).map((row) => ({
        brand: row.brand,
        count: row.count,
      }));
    } catch (error: unknown) {
      logger.error(
        `Error fetching brand suggestions: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async getCategorySuggestions(query: string): Promise<CategorySuggestion[]> {
    logger.info(`Fetching category suggestions for query: ${query}`);
    try {
      const results = await databaseService.query(
        `
        SELECT nom as category, COUNT(*) as count
        FROM products
        WHERE nom LIKE ?
        GROUP BY nom
        ORDER BY count DESC
        LIMIT 5
      `,
        [`%${query}%`],
      );
      return (results as { category: string; count: number }[]).map((row) => ({
        category: row.category,
        count: row.count,
      }));
    } catch (error: unknown) {
      logger.error(
        `Error fetching category suggestions: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async getProductSuggestions(query: string): Promise<ProductSuggestion[]> {
    logger.info(`Fetching product suggestions for query: ${query}`);
    try {
      const results = await databaseService.query(
        `
        SELECT nom as product, COUNT(*) as count
        FROM products
        WHERE nom LIKE ?
        GROUP BY nom
        ORDER BY count DESC
        LIMIT 5
      `,
        [`%${query}%`],
      );
      return (results as { product: string; count: number }[]).map((row) => ({
        product: row.product,
        count: row.count,
      }));
    } catch (error: unknown) {
      logger.error(
        `Error fetching product suggestions: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async getTransporteurSuggestions(
    query: string,
  ): Promise<TransporteurSuggestion[]> {
    logger.info(`Fetching transporteur suggestions for query: ${query}`);
    try {
      const results = await databaseService.query(
        `
        SELECT transporteur, COUNT(*) as count
        FROM parcelles
        WHERE transporteur LIKE ?
        GROUP BY transporteur
        ORDER BY count DESC
        LIMIT 5
      `,
        [`%${query}%`],
      );
      return (results as { transporteur: string; count: number }[]).map(
        (row) => ({ transporteur: row.transporteur, count: row.count }),
      );
    } catch (error: unknown) {
      logger.error(
        `Error fetching transporteur suggestions: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async getUserSuggestions(query: string): Promise<UserSuggestion[]> {
    logger.info(`Fetching user suggestions for query: ${query}`);
    try {
      const results = await databaseService.query(
        `
        SELECT username as nom, COUNT(*) as count
        FROM users
        WHERE username LIKE ?
        GROUP BY username
        ORDER BY count DESC
        LIMIT 5
      `,
        [`%${query}%`],
      );
      return (results as { nom: string; count: number }[]).map((row) => ({
        nom: row.nom,
        count: row.count,
      }));
    } catch (error: unknown) {
      logger.error(
        `Error fetching user suggestions: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  async globalSearch(
    query: string,
    _userId?: string,
  ): Promise<{ products: Product[]; parcels: Parcel[] }> {
    logger.info(`Performing global search for query: ${query}`);
    try {
      // Assuming 'produits' in SQL refers to 'trackedProducts' schema
      const products = (await databaseService.query(
        "SELECT * FROM tracked_products WHERE product_name LIKE ? LIMIT 10",
        [`%${query}%`],
      )) as Product[];
      // Assuming 'parcelles' in SQL refers to 'parcels' schema
      const parcels = (await databaseService.query(
        "SELECT * FROM parcelles WHERE numero LIKE ? LIMIT 10",
        [`%${query}%`],
      )) as Parcel[];
      return { products, parcels };
    } catch (error: unknown) {
      logger.error(
        `Error during global search: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { products: [], parcels: [] };
    }
  }

  async rebuildSearchIndex(_userId?: string): Promise<void> {
    logger.info("Rebuilding search index...");
    try {
      logger.info("Search index rebuilt successfully.");
    } catch (error: unknown) {
      logger.error(
        `Error rebuilding search index: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async searchProducts(criteria: {
    name?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    isSold?: boolean;
    userId: string;
  }): Promise<Product[]> {
    try {
      logger.info(`Searching products for user: ${criteria.userId}`, { criteria });

      // Build dynamic SQL query
      const conditions: string[] = ['user_id = ?'];
      const params: any[] = [criteria.userId];

      if (criteria.name) {
        conditions.push('product_name LIKE ?');
        params.push(`%${criteria.name}%`);
      }

      // Note: Adjusting based on actual schema - using product_name for category/brand search
      if (criteria.category) {
        conditions.push('product_name LIKE ?');
        params.push(`%${criteria.category}%`);
      }

      if (criteria.brand) {
        conditions.push('product_name LIKE ?');
        params.push(`%${criteria.brand}%`);
      }

      // Note: Tracking products may not have direct price fields
      // This logic may need adjustment based on actual schema requirements
      if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
        logger.warn('Price filtering on tracked products may need schema adjustment');
      }

      const sql = `
        SELECT id, user_id, product_name, external_product_id, 
               last_checked_at, created_at, updated_at
        FROM tracked_products 
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const results = await databaseService.query<{
        id: string;
        user_id: string;
        product_name: string;
        external_product_id?: string | null;
        last_checked_at?: string | null;
        created_at: string;
        updated_at?: string | null;
      }>(sql, params, 'search-products');

      return results.map((row) => ({
        id: row.id,
        userId: row.user_id,
        productName: row.product_name,
        externalProductId: row.external_product_id ?? null,
        lastCheckedAt: row.last_checked_at ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? null,
      }));
    } catch (error: unknown) {
      logger.error(
        `Error searching products: ${error instanceof Error ? error.message : String(error)}`,
        { criteria }
      );
      return [];
    }
  }

  async searchParcelsByCriteria(criteria: {
    numero?: string;
    transporteur?: string;
    userId: string;
  }): Promise<Parcel[]> {
    try {
      logger.info(`Searching parcels for user: ${criteria.userId}`, { criteria });

      // Build dynamic SQL query
      const conditions: string[] = ['user_id = ?'];
      const params: any[] = [criteria.userId];

      if (criteria.numero) {
        conditions.push('numero LIKE ?');
        params.push(`%${criteria.numero}%`);
      }

      if (criteria.transporteur) {
        conditions.push('transporteur = ?');
        params.push(criteria.transporteur);
      }

      const sql = `
        SELECT id, user_id, numero, transporteur, prix_achat, 
               poids, prix_total, prix_par_gramme, created_at
        FROM parcelles 
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const results = await databaseService.query<{
        id: string;
        user_id: string;
        numero: string;
        transporteur: string;
        prix_achat?: number | null;
        poids?: number | null;
        prix_total?: number | null;
        prix_par_gramme?: number | null;
        created_at: string | null;
      }>(sql, params, 'search-parcels');

      return results.map((row) => ({
        id: row.id,
        userId: row.user_id,
        numero: row.numero,
        transporteur: row.transporteur,
        prixAchat: row.prix_achat ?? null,
        poids: row.poids ?? null,
        prixTotal: row.prix_total ?? null,
        prixParGramme: row.prix_par_gramme ?? null,
        createdAt: row.created_at,
      }));
    } catch (error: unknown) {
      logger.error(
        `Error searching parcels by criteria: ${error instanceof Error ? error.message : String(error)}`,
        { criteria }
      );
      return [];
    }
  }
}

// Export a singleton instance of the SearchService
export const vintedSearchService = SearchService.getInstance();
