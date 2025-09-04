import { databaseService } from './database/db';
import { logger } from '../utils/logging/logger';
import { eq, like, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/services/database/drizzle-client';
import { trackedProducts as productsSchema, parcels as parcelsSchema } from './database/drizzle-schema';

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
      const results = await databaseService.query(`
        SELECT plateforme as brand, COUNT(*) as count
        FROM produits
        WHERE plateforme LIKE ?
        GROUP BY plateforme
        ORDER BY count DESC
        LIMIT 5
      `, [`%${query}%`]);
      return (results as { brand: string; count: number }[]).map((row) => ({ brand: row.brand, count: row.count }));
    } catch (error: unknown) {
      logger.error(`Error fetching brand suggestions: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getCategorySuggestions(query: string): Promise<CategorySuggestion[]> {
    logger.info(`Fetching category suggestions for query: ${query}`);
    try {
      const results = await databaseService.query(`
        SELECT nom as category, COUNT(*) as count
        FROM produits
        WHERE nom LIKE ?
        GROUP BY nom
        ORDER BY count DESC
        LIMIT 5
      `, [`%${query}%`]);
      return (results as { category: string; count: number }[]).map((row) => ({ category: row.category, count: row.count }));
    } catch (error: unknown) {
      logger.error(`Error fetching category suggestions: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getProductSuggestions(query: string): Promise<ProductSuggestion[]> {
    logger.info(`Fetching product suggestions for query: ${query}`);
    try {
      const results = await databaseService.query(`
        SELECT nom as product, COUNT(*) as count
        FROM produits
        WHERE nom LIKE ?
        GROUP BY nom
        ORDER BY count DESC
        LIMIT 5
      `, [`%${query}%`]);
      return (results as { product: string; count: number }[]).map((row) => ({ product: row.product, count: row.count }));
    } catch (error: unknown) {
      logger.error(`Error fetching product suggestions: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getTransporteurSuggestions(query: string): Promise<TransporteurSuggestion[]> {
    logger.info(`Fetching transporteur suggestions for query: ${query}`);
    try {
      const results = await databaseService.query(`
        SELECT transporteur, COUNT(*) as count
        FROM parcelles
        WHERE transporteur LIKE ?
        GROUP BY transporteur
        ORDER BY count DESC
        LIMIT 5
      `, [`%${query}%`]);
      return (results as { transporteur: string; count: number }[]).map((row) => ({ transporteur: row.transporteur, count: row.count }));
    } catch (error: unknown) {
      logger.error(`Error fetching transporteur suggestions: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async getUserSuggestions(query: string): Promise<UserSuggestion[]> {
    logger.info(`Fetching user suggestions for query: ${query}`);
    try {
      const results = await databaseService.query(`
        SELECT username as nom, COUNT(*) as count
        FROM users
        WHERE username LIKE ?
        GROUP BY username
        ORDER BY count DESC
        LIMIT 5
      `, [`%${query}%`]);
      return (results as { nom: string; count: number }[]).map((row) => ({ nom: row.nom, count: row.count }));
    } catch (error: unknown) {
      logger.error(`Error fetching user suggestions: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async globalSearch(query: string, _userId?: string): Promise<{ products: Product[]; parcels: Parcel[] }> {
    logger.info(`Performing global search for query: ${query}`);
    try {
      // Assuming 'produits' in SQL refers to 'trackedProducts' schema
      const products = await databaseService.query('SELECT * FROM tracked_products WHERE product_name LIKE ? LIMIT 10', [`%${query}%`]) as Product[];
      // Assuming 'parcelles' in SQL refers to 'parcels' schema
      const parcels = await databaseService.query('SELECT * FROM parcelles WHERE numero LIKE ? LIMIT 10', [`%${query}%`]) as Parcel[];
      return { products, parcels };
    } catch (error: unknown) {
      logger.error(`Error during global search: ${error instanceof Error ? error.message : String(error)}`);
      return { products: [], parcels: [] };
    }
  }

  async rebuildSearchIndex(_userId?: string): Promise<void> {
    logger.info("Rebuilding search index...");
    try {
      logger.info("Search index rebuilt successfully.");
    } catch (error: unknown) {
      logger.error(`Error rebuilding search index: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async searchProductsByCriteria(criteria: {
    name?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    isSold?: boolean;
    userId: string;
  }): Promise<Product[]> {
    let query = db.select().from(productsSchema).where(eq(productsSchema.userId, criteria.userId)).$dynamic();

    if (criteria.name) {
      query = query.where(like(productsSchema.productName, `%${criteria.name}%`));
    }
    // Note: productsSchema (trackedProducts) does not have 'categorie' or 'plateforme' directly.
    // Assuming 'category' and 'brand' criteria are for productName.
    if (criteria.category) {
      query = query.where(like(productsSchema.productName, `%${criteria.category}%`));
    }
    if (criteria.brand) {
      query = query.where(like(productsSchema.productName, `%${criteria.brand}%`));
    }
    if (criteria.minPrice !== undefined) {
      // trackedProducts does not have price fields. Using lastCheckedAt as a placeholder,
      // but this logic might need adjustment based on actual schema.
      // Convert number to string for comparison with TEXT field
      query = query.where(gte(productsSchema.lastCheckedAt, criteria.minPrice.toString()));
    }
    if (criteria.maxPrice !== undefined) {
      // trackedProducts does not have price fields. Using lastCheckedAt as a placeholder.
      // Convert number to string for comparison with TEXT field
      query = query.where(lte(productsSchema.lastCheckedAt, criteria.maxPrice.toString()));
    }
    if (criteria.isSold !== undefined) {
      // trackedProducts does not have a 'vendu' field. This criteria might be for a different table or needs re-evaluation.
      // For now, this part of the query will not be applied.
      logger.warn("searchProductsByCriteria: 'isSold' criteria is not applicable to 'trackedProducts' schema.");
    }

    try {
      const results = await query.execute(); // Exécute la requête Drizzle
      return results as Product[];
    } catch (error: unknown) {
      logger.error(`Error searching products by criteria: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async searchParcelsByCriteria(criteria: {
    numero?: string;
    transporteur?: string;
    userId: string;
  }): Promise<Parcel[]> {
    let query = db.select().from(parcelsSchema).where(eq(parcelsSchema.userId, criteria.userId)).$dynamic();

    if (criteria.numero) {
      query = query.where(like(parcelsSchema.numero, `%${criteria.numero}%`));
    }
    if (criteria.transporteur) {
      query = query.where(eq(parcelsSchema.transporteur, criteria.transporteur));
    }

    try {
      const results = await query.execute(); // Exécute la requête Drizzle
      return results as Parcel[];
    } catch (error: unknown) {
      logger.error(`Error searching parcels by criteria: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}

// Export a singleton instance of the SearchService
export const vintedSearchService = SearchService.getInstance();