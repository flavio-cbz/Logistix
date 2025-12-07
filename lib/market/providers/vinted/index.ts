import { MarketplaceProvider } from "../interfaces";
import { SearchQuery, SearchResult, ItemDetails } from "../../types";
import { EliottClient } from "./eliott-client";
import { AndrozClient } from "./androz-client";
import { getLogger } from "@/lib/utils/logging/logger";

export class VintedProvider implements MarketplaceProvider {
    name: 'vinted' = 'vinted';
    private primaryClient: EliottClient;
    private fallbackClient: AndrozClient;
    private logger = getLogger("VintedProvider");

    constructor() {
        this.primaryClient = new EliottClient();
        this.fallbackClient = new AndrozClient();
    }

    async authenticate(): Promise<void> {
        // Authentication might be handled implicitly by the clients or require explicit steps
        // For now, we assume clients handle their own session init
        return Promise.resolve();
    }

    async search(query: SearchQuery): Promise<SearchResult[]> {
        try {
            return await this.primaryClient.search(query);
        } catch (error) {
            this.logger.warn("Primary Vinted provider failed, attempting fallback", { error });
            try {
                return await this.fallbackClient.search(query);
            } catch (fallbackError) {
                this.logger.error("All Vinted providers failed", { fallbackError });
                throw new Error("Vinted search failed on all providers");
            }
        }
    }

    async getItem(_id: string): Promise<ItemDetails> {
        // Currently only implementing search as per immediate requirements
        // Fallback logic would be similar
        throw new Error("Method not implemented.");
    }

    async isAvailable(): Promise<boolean> {
        // Simple health check
        try {
            // Could perform a lightweight search or ping
            return true;
        } catch {
            return false;
        }
    }
}
