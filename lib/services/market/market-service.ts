import { MarketProduct, SearchFilters } from "@/lib/types/market";
import { databaseService } from "@/lib/database/database-service";
import { products } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { vintedClient } from "./vinted-client-wrapper";
import { EnrichmentData, MarketStats, Product } from "@/lib/shared/types/entities";
import { VintedItem } from "./types";

const VINTED_STATUS_SOLD = 3;
const DEFAULT_CURRENCY = "EUR";
const ANALYSIS_SAMPLE_SIZE = 40;

export class MarketService {
  async searchProducts(_filters: SearchFilters): Promise<MarketProduct[]> {
    // Keep mock for generic search if not used, or implement later.
    return [];
  }

  async analyzeProduct(productId: string, userId: string): Promise<Product> {
    const product = await this.getProduct(productId);
    if (!product) throw new Error("Produit non trouvé");

    const items = await this.searchSoldItems(userId, product.name);
    if (items.length === 0) {
      throw new Error("Aucun article similaire vendu trouvé sur Vinted");
    }

    const marketStats = this.calculateMarketStats(items);
    const updatedProduct = await this.updateProductEnrichment(productId, product, marketStats);

    return updatedProduct;
  }

  private async getProduct(productId: string): Promise<Product | undefined> {
    return databaseService.executeQuery(async (db) => {
      const [p] = await db.select().from(products).where(eq(products.id, productId));
      return p as Product | undefined;
    }, "analyzeProduct_get");
  }

  private async searchSoldItems(userId: string, query: string): Promise<VintedItem[]> {
    const searchResults = await vintedClient.searchItems(userId, {
      searchText: query,
      statusIds: [VINTED_STATUS_SOLD],
      order: 'relevance',
      perPage: ANALYSIS_SAMPLE_SIZE
    });
    return searchResults.items || [];
  }

  private calculateMarketStats(items: VintedItem[]): MarketStats {
    const prices = this.extractPrices(items);

    if (prices.length === 0) {
      throw new Error("Impossible d'extraire les prix");
    }

    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = sum / prices.length;
    const median = prices[Math.floor(prices.length / 2)];

    return {
      minPrice: prices[0] ?? 0,
      maxPrice: prices[prices.length - 1] ?? 0,
      avgPrice: Math.round(avg * 100) / 100,
      medianPrice: median ?? 0,
      currency: DEFAULT_CURRENCY,
      source: "vinted_sold",
      sampleSize: prices.length
    };
  }

  private extractPrices(items: VintedItem[]): number[] {
    return items
      .map((item) => {
        if (!item.price?.amount) return 0;
        return parseFloat(item.price.amount);
      })
      .filter((p) => !isNaN(p) && p > 0)
      .sort((a, b) => a - b);
  }

  private async updateProductEnrichment(productId: string, product: Product, marketStats: MarketStats): Promise<Product> {
    const currentEnrichment = (product.enrichmentData as EnrichmentData) || {
      enrichmentStatus: 'pending',
      confidence: 0
    };

    const newEnrichment: EnrichmentData = {
      ...currentEnrichment,
      marketStats: marketStats,
      enrichmentStatus: 'done'
    };

    await databaseService.executeQuery(async (db) => {
      await db.update(products)
        .set({
          enrichmentData: newEnrichment,
          updatedAt: new Date().toISOString()
        })
        .where(eq(products.id, productId));
    }, "analyzeProduct_update");

    return {
      ...product,
      enrichmentData: newEnrichment
    };
  }
}

export const marketService = new MarketService();
