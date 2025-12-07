import { SearchQuery, SearchResult, ItemDetails } from "../types";

export interface MarketplaceProvider {
    name: 'vinted' | 'leboncoin' | 'ebay';

    /**
     * Authenticates with the marketplace to obtain necessary tokens/cookies.
     */
    authenticate(): Promise<void>;

    /**
     * Searches for items matching the query.
     */
    search(query: SearchQuery): Promise<SearchResult[]>;

    /**
     * Retrieves detailed information about a specific item.
     */
    getItem(id: string): Promise<ItemDetails>;

    /**
     * Checks if the provider is currently available and healthy.
     */
    isAvailable(): Promise<boolean>;
}
