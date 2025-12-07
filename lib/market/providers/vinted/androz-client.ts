import { SearchQuery, SearchResult } from "../../types";
import { getLogger } from "@/lib/utils/logging/logger";
const Vinted = require('vinted-api');

export class AndrozClient {
    private client: any;
    private logger = getLogger("AndrozClient");

    constructor() {
        this.client = new Vinted();
    }

    async search(query: SearchQuery): Promise<SearchResult[]> {
        try {
            this.logger.debug(`Searching Vinted (Androz) for: ${query.query}`);

            // Androz API often uses direct URL or specific params
            const results = await this.client.search(query.query, {
                price_from: query.priceMin,
                price_to: query.priceMax,
                order: query.sortBy === 'price_asc' ? 'price_low_to_high' : 'newest_first'
            });

            return results.items.map((item: any) => ({
                id: item.id.toString(),
                title: item.title,
                price: parseFloat(item.price),
                currency: item.currency,
                brand: item.brand_title,
                size: item.size_title,
                url: item.url,
                imageUrl: item.photo?.url,
                provider: 'vinted',
                platformId: item.id.toString(),
                postedAt: new Date() // Often not available in simple search
            }));
        } catch (error) {
            this.logger.error("Vinted search failed (Androz)", { error });
            throw error;
        }
    }
}
