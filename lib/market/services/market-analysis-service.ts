import { ProviderFactory } from "./provider-factory";
import { SearchQuery, SearchResult } from "../types";
import { getLogger } from "@/lib/utils/logging/logger";

export class MarketAnalysisService {
    private logger = getLogger("MarketAnalysisService");

    constructor(private providerFactory: ProviderFactory) { }

    /**
     * Searches across specified marketplaces or all available ones.
     */
    async analyzeMarket(query: SearchQuery, platforms: string[] = ['vinted']): Promise<SearchResult[]> {
        this.logger.info(`Starting market analysis for: ${query.query} on [${platforms.join(', ')}]`);

        const results: SearchResult[] = [];
        const errors: any[] = [];

        await Promise.all(platforms.map(async (platform) => {
            try {
                const provider = this.providerFactory.getProvider(platform);
                const providerResults = await provider.search(query);
                results.push(...providerResults);
            } catch (error) {
                this.logger.error(`Analysis failed for platform ${platform}`, { error });
                errors.push({ platform, error });
            }
        }));

        if (results.length === 0 && errors.length > 0) {
            throw new Error(`Market analysis failed on all requested platforms. Errors: ${JSON.stringify(errors)}`);
        }

        return this.sortResults(results, query.sortBy);
    }

    private sortResults(results: SearchResult[], sortBy?: string): SearchResult[] {
        if (!sortBy) return results;

        return results.sort((a, b) => {
            switch (sortBy) {
                case 'price_asc':
                    return a.price - b.price;
                case 'price_desc':
                    return b.price - a.price;
                case 'newest':
                    // Handle potential undefined dates
                    if (!a.postedAt) return 1;
                    if (!b.postedAt) return -1;
                    return b.postedAt.getTime() - a.postedAt.getTime();
                default:
                    return 0;
            }
        });
    }
}
