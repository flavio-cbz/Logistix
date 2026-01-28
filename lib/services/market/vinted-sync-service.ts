import { vintedClient } from './vinted-client-wrapper';
import { getLogger } from '@/lib/utils/logging/logger';
import { Product } from '@/lib/database/schema';
import { VintedItem } from './types';
import { serviceContainer } from '../container';
import { isNotNull } from 'drizzle-orm';

const logger = getLogger('VintedSyncService');

export interface SyncResult {
  productId: string;
  productName: string;
  success: boolean;
  action?: 'synced' | 'sold' | 'reserved' | 'unreserved';
  error?: string;
  soldPrice?: number;
}

export interface SyncSummary {
  success: boolean;
  message: string;
  synced: number;
  sold: number;
  reserved: number;
  failed: number;
  total: number;
  results: SyncResult[];
  error?: string;
}

interface VintedStats {
  viewCount: number;
  favouriteCount: number;
  isReserved: boolean;
  isClosed: boolean;
  interestRate: number;
  serviceFee?: number;
  soldPrice?: number;
  lastSyncAt: string;
}

export class VintedSyncService {
  /**
   * Syncs all linked products with Vinted status
   */
  async syncAllProducts(userId: string): Promise<SyncSummary> {
    try {
      const productRepo = serviceContainer.getProductRepository();

      // 1. Get all products with externalId (linked to Vinted)
      const linkedProducts = await productRepo.executeCustomQuery(async (db) => {
        return db.select()
          .from(productRepo.getTable())
          .where(isNotNull(productRepo.getTable().externalId));
      });

      if (linkedProducts.length === 0) {
        return {
          success: true,
          message: 'Aucun produit lié à Vinted',
          synced: 0,
          sold: 0,
          reserved: 0,
          failed: 0,
          total: 0,
          results: []
        };
      }

      logger.info(`[SYNC-ALL] Syncing ${linkedProducts.length} products for user ${userId}...`);

      // 2. Fetch all Vinted items
      let vintedItems: VintedItem[];
      try {
        vintedItems = await vintedClient.getSoldItems(userId);
      } catch (error) {
        logger.error('Failed to fetch Vinted wardrobe', { error });
        throw new Error(`Failed to fetch Vinted wardrobe: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Create a map for quick lookup
      const vintedMap = new Map(vintedItems.map(item => [String(item.id), item]));

      let synced = 0;
      let sold = 0;
      let reserved = 0;
      let failed = 0;
      const results: SyncResult[] = [];

      // 3. Update each linked product
      for (const product of linkedProducts) {
        try {
          const result = await this.syncSingleProduct(product, vintedMap);
          results.push(result);

          if (result.success) {
            synced++;
            if (result.action === 'sold') sold++;
            if (result.action === 'reserved') reserved++;
          } else {
            failed++;
          }
        } catch (error) {
          results.push({
            productId: product.id,
            productName: product.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          failed++;
        }
      }

      logger.info(`[SYNC-ALL] Completed: ${synced} synced, ${sold} sold, ${reserved} reserved, ${failed} failed`);

      let message = `${synced} produits synchronisés`;
      if (sold > 0) message += `, ${sold} vente(s) détectée(s) 🎉`;
      if (reserved > 0) message += `, ${reserved} réservation(s)`;

      return {
        success: true,
        message,
        synced,
        sold,
        reserved,
        failed,
        total: linkedProducts.length,
        results
      };

    } catch (error) {
      logger.error('[SYNC-ALL] Fatal Error:', { error });
      return {
        success: false,
        message: 'Sync failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        synced: 0,
        sold: 0,
        reserved: 0,
        failed: 0,
        total: 0,
        results: []
      };
    }
  }

  /**
   * Syncs a single product with Vinted status
   */
  async syncProduct(productId: string, userId: string): Promise<SyncResult> {
    try {
      const productRepo = serviceContainer.getProductRepository();

      // 1. Get product
      const product = await productRepo.findById(productId);

      if (!product) {
        return {
          productId,
          productName: 'Unknown',
          success: false,
          error: 'Product not found'
        };
      }

      if (!product.externalId) {
        return {
          productId: product.id,
          productName: product.name,
          success: false,
          error: 'Product not linked to Vinted'
        };
      }

      logger.info(`[SYNC-SINGLE] Syncing product ${productId} (ext: ${product.externalId})...`);

      // 2. Fetch Vinted items
      let vintedItems: VintedItem[];
      try {
        vintedItems = await vintedClient.getSoldItems(userId);
      } catch (error) {
        throw new Error(`Failed to fetch Vinted data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 3. Find the specific item
      const vintedItem = vintedItems.find(i => String(i.id) === String(product.externalId));

      if (!vintedItem) {
        return {
          productId: product.id,
          productName: product.name,
          success: false,
          error: 'Linked item not found in Vinted wardrobe (might be deleted)'
        };
      }

      // 4. Create a map just for this one item
      const vintedMap = new Map([[String(vintedItem.id), vintedItem]]);

      return await this.syncSingleProduct(product, vintedMap);

    } catch (error) {
      logger.error(`[SYNC-SINGLE] Error syncing product ${productId}`, { error });
      return {
        productId,
        productName: 'Unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async syncSingleProduct(product: Product, vintedMap: Map<string, VintedItem>): Promise<SyncResult> {
    const vintedItem = vintedMap.get(product.externalId!);
    const productRepo = serviceContainer.getProductRepository();

    if (!vintedItem) {
      return {
        productId: product.id,
        productName: product.name,
        success: false,
        error: 'Item not found on Vinted'
      };
    }

    // Extract Data
    const viewCount = vintedItem.view_count || 0;
    const favouriteCount = vintedItem.favourite_count || 0;
    const interestRate = viewCount > 0
      ? Math.round((favouriteCount / viewCount) * 1000) / 10
      : 0;

    const serviceFee = vintedItem.service_fee?.amount
      ? parseFloat(vintedItem.service_fee.amount)
      : undefined;

    const soldPrice = vintedItem.price?.amount
      ? parseFloat(vintedItem.price.amount)
      : undefined;

    const vintedStats: VintedStats = {
      viewCount,
      favouriteCount,
      isReserved: vintedItem.is_reserved || false,
      isClosed: vintedItem.is_closed || false,
      interestRate,
      serviceFee,
      soldPrice,
      lastSyncAt: new Date().toISOString()
    };

    // Determine Status Changes
    const previousStats = product.vintedStats;
    let action: SyncResult['action'] = 'synced';
    const updateFields: Partial<Product> = {
      vintedStats,
    };

    // 1. SALE DETECTION
    if (vintedItem.is_closed && !previousStats?.isClosed && product.status !== 'sold') {
      action = 'sold';
      updateFields.status = 'sold';
      updateFields.vendu = '1';
      updateFields.soldAt = new Date().toISOString();
      updateFields.sellingPrice = soldPrice;
      logger.info(`[SYNC-ALL] 🎉 SALE DETECTED: ${product.name} for ${soldPrice}€`);
    }
    // 2. RESERVATION DETECTION
    else if (vintedItem.is_reserved && !previousStats?.isReserved && product.status !== 'reserved') {
      action = 'reserved';
      updateFields.status = 'reserved';
      logger.info(`[SYNC-ALL] 🔒 RESERVATION: ${product.name}`);
    }
    // 3. UNRESERVATION
    else if (!vintedItem.is_reserved && previousStats?.isReserved && product.status === 'reserved') {
      action = 'unreserved';
      updateFields.status = 'online';
      logger.info(`[SYNC-ALL] 🔓 UNRESERVED: ${product.name}`);
    }

    // Update DB via Repository
    await productRepo.update(product.id, updateFields);

    return {
      productId: product.id,
      productName: product.name,
      success: true,
      action,
      soldPrice: action === 'sold' ? soldPrice : undefined
    };
  }
}

export const vintedSyncService = new VintedSyncService();
