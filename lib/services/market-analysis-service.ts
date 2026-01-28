import { BaseService } from "./base-service";
import { ProductRepository } from "@/lib/repositories/product-repository";
import { Product } from "@/lib/database/schema";
import { getLogger } from "@/lib/utils/logging/logger";
import { marketService } from "./market/market-service";

const logger = getLogger("MarketAnalysisService");

export class MarketAnalysisService extends BaseService {
    constructor(
        private productRepository: ProductRepository,
    ) {
        super("MarketAnalysisService");
    }

    async analyzeProduct(productId: string): Promise<Product | null> {
        return this.executeOperation("analyzeProduct", async () => {
            // 1. Fetch product to get userId
            const product = await this.productRepository.findById(productId);
            if (!product) {
                throw new Error("Product not found");
            }

            if (!product.userId) {
                logger.warn("Product has no userId, cannot perform authenticated market analysis", { productId });
                return product;
            }

            logger.info(`Analyzing market for product ${productId} (User: ${product.userId})`);

            try {
                // 2. Delegate to MarketService which handles Vinted API (via Cookie) + Stats + Enrichment Update
                const updatedProduct = await marketService.analyzeProduct(productId, product.userId);
                return updatedProduct;

            } catch (error) {
                logger.error("Market analysis failed", { productId, error });
                // Return original product if analysis fails, or re-throw?
                // The original code caught errors and returned the product.
                return product;
            }
        });
    }
}
