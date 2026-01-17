import { BaseService } from "./base-service";
import { ProductRepository } from "@/lib/repositories/product-repository";
import { VintedAPI, VintedSearchParams } from "./market/vinted-api";
import { Product } from "@/lib/database/schema";
import { getLogger } from "@/lib/utils/logging/logger";

const logger = getLogger("MarketAnalysisService");

export interface MarketStats {
    minPrice: number;
    maxPrice: number;
    averagePrice: number;
    medianPrice: number;
    itemCount: number;
    currency: string;
    lastUpdated: string;
}

export class MarketAnalysisService extends BaseService {
    private vintedApi: VintedAPI;

    constructor(
        private productRepository: ProductRepository,
        // In a real generic app, we might inject an interface IMarketSource
    ) {
        super("MarketAnalysisService");
        this.vintedApi = new VintedAPI();
    }

    async analyzeProduct(productId: string): Promise<Product | null> {
        return this.executeOperation("analyzeProduct", async () => {
            const product = await this.productRepository.findById(productId);
            if (!product) {
                throw new Error("Product not found");
            }

            // strategies for search:
            // 1. Precise: Brand + Name
            // 2. Broad: Brand + Category

            // Let's try to construct a search query
            const searchText = `${product.brand || ""} ${product.name}`.trim();

            if (searchText.length < 3) {
                logger.warn("Search text too short for analysis", { productId, searchText });
                return product;
            }

            const searchParams: VintedSearchParams = {
                searchText: searchText,
                limit: 20 // Analyze top 20 results
            };

            // If we had mapped IDs (brandId, catalogId) we would pass them here
            // e.g. if (product.enrichmentData?.vintedBrandId) params.brandId = ...

            logger.info(`Analyzing market for product ${productId} ("${searchText}")`);

            try {
                const items = await this.vintedApi.searchItems(searchParams);

                if (items.length === 0) {
                    logger.info("No market items found", { productId });
                    return product;
                }

                const prices = items
                    .map(item => parseFloat(item.price.amount))
                    .filter(p => !isNaN(p))
                    .sort((a, b) => a - b);

                if (prices.length === 0) return product;

                const stats: MarketStats = {
                    minPrice: prices[0],
                    maxPrice: prices[prices.length - 1],
                    averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
                    medianPrice: prices[Math.floor(prices.length / 2)],
                    itemCount: prices.length,
                    currency: items[0].price.currency_code,
                    lastUpdated: new Date().toISOString()
                };

                // Initial MVP storage: we can store this in enrichmentData or a new field
                // Since schema has enrichmentData as JSON, let's use it for now 
                // to avoid schema migration in this step if possible.
                // Ideally detailed stats go to a dedicated table, but MVP = simple.

                const currentEnrichment = product.enrichmentData || {};

                const updatedProduct = await this.productRepository.update(productId, {
                    enrichmentData: {
                        ...currentEnrichment,
                        marketStats: stats
                    }
                });

                return updatedProduct;

            } catch (error) {
                logger.error("Market analysis failed", { productId, error });
                // We don't block the flow, just return product as is (or with error status)
                return product;
            }
        });
    }
}
