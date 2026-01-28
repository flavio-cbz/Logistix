import { vintedClient } from './vinted-client-wrapper';
import { getLogger } from '@/lib/utils/logging/logger';
import { eq, isNull, and, inArray } from 'drizzle-orm';
import { VintedItem } from './types';
import { Product } from '@/lib/database/schema';
import { serviceContainer } from '../container';

const logger = getLogger('VintedMappingService');

const MATCH_THRESHOLD = 0.6;
const VINTED_STATUS_SOLD = 3;

interface MatchResult {
  vintedItem: string;
  localProduct: string;
  score: number;
  vintedId: number;
  localId: string;
}

export class VintedMappingService {
  /**
   * Maps Vinted items to local products based on title similarity.
   * Updates local products with Vinted ID, price, and status if matched.
   */
  async mapVintedItems(userId: string, dryRun: boolean = false) {
    logger.info('Starting Vinted item mapping', { userId, dryRun });

    const vintedItems = await this.fetchVintedItems(userId);
    if (!vintedItems || vintedItems.length === 0) {
      return { success: true, count: 0, matches: [] };
    }

    const localProducts = await this.fetchUnmappedProducts(userId);
    logger.info(`Found ${localProducts.length} unmapped local products and ${vintedItems.length} Vinted items`);

    const { matches, updateCount } = await this.findAndApplyMatches(vintedItems, localProducts, dryRun);

    logger.info('Mapping completed', {
      matchesFound: matches.length,
      updated: updateCount,
      matches: matches.map(m => `${m.vintedItem} -> ${m.localProduct} (${m.score.toFixed(2)})`)
    });

    return { success: true, matches, updateCount };
  }

  /**
   * Retrieves Vinted items and checks if they are already mapped to local products.
   * Useful for UI to show which items are pending mapping.
   */
  async getMappingStatus(userId: string) {
    try {
      // 1. Get Vinted items
      const vintedItems = await this.fetchVintedItems(userId);
      if (!vintedItems || vintedItems.length === 0) {
        return [];
      }

      // 2. Get IDs of Vinted items
      const vintedIds = vintedItems.map((i) => i.id.toString());

      // 3. Find which ones are already in DB
      const productRepo = serviceContainer.getProductRepository();

      const mappedProducts = await productRepo.executeCustomQuery(async (db) => {
        return db.select({
          id: productRepo.getTable().id,
          externalId: productRepo.getTable().externalId
        })
        .from(productRepo.getTable())
        .where(inArray(productRepo.getTable().externalId, vintedIds));
      });

      const mappedSet = new Set(mappedProducts.map(p => p.externalId));

      // 4. Enhance response
      return vintedItems.map((item) => ({
        ...item,
        mapped: mappedSet.has(item.id.toString())
      }));

    } catch (error) {
      logger.error('Failed to get mapping status', { error });
      throw error;
    }
  }

  private async fetchVintedItems(userId: string): Promise<VintedItem[] | null> {
    try {
      return await vintedClient.getSoldItems(userId);
    } catch (error) {
      logger.error('Failed to fetch Vinted items', { error });
      return null;
    }
  }

  private async fetchUnmappedProducts(userId: string): Promise<Product[]> {
    const productRepo = serviceContainer.getProductRepository();
    return productRepo.executeCustomQuery(async (db) => {
      return db.select()
        .from(productRepo.getTable())
        .where(
          and(
            eq(productRepo.getTable().userId, userId),
            isNull(productRepo.getTable().externalId)
          )
        );
    });
  }

  private async findAndApplyMatches(vintedItems: VintedItem[], localProducts: Product[], dryRun: boolean) {
    const matches: MatchResult[] = [];
    let updateCount = 0;

    for (const vItem of vintedItems) {
      const bestMatch = this.findBestMatch(vItem, localProducts);

      if (bestMatch) {
        matches.push({
          vintedItem: vItem.title,
          localProduct: bestMatch.product.name,
          score: bestMatch.score,
          vintedId: vItem.id,
          localId: bestMatch.product.id
        });

        if (!dryRun) {
          await this.updateProduct(bestMatch.product.id, vItem);
          updateCount++;
        }
      }
    }

    return { matches, updateCount };
  }

  private findBestMatch(vItem: VintedItem, localProducts: Product[]) {
    let bestMatch: Product | null = null;
    let bestScore = 0;

    for (const lProd of localProducts) {
      const score = this.calculateSimilarity(vItem.title, lProd.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = lProd;
      }
    }

    if (bestScore >= MATCH_THRESHOLD && bestMatch) {
      return { product: bestMatch, score: bestScore };
    }

    return null;
  }

  private async updateProduct(productId: string, vItem: VintedItem) {
    const productRepo = serviceContainer.getProductRepository();
    const isSold = vItem.status_id === VINTED_STATUS_SOLD;

    await productRepo.update(productId, {
      externalId: vItem.id.toString(),
      sellingPrice: vItem.price?.amount ? parseFloat(vItem.price.amount) : undefined,
      status: isSold ? 'sold' : undefined,
    });
  }

  /**
   * Simple Jaccard similarity on tokens
   */
  private calculateSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;

    const normalize = (s: string) => s.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const tokens1 = normalize(s1);
    const tokens2 = normalize(s2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const intersection = tokens1.filter(t => tokens2.includes(t));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.length / union.size;
  }
}

export const vintedMappingService = new VintedMappingService();
