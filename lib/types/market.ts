export type MarketPlatform = 'Vinted' | 'eBay' | 'Leboncoin' | 'Rakuten' | 'Vestiaire Collective';

export interface MarketProduct {
    id: string;
    title: string;
    price: number;
    currency: string;
    platform: MarketPlatform;
    url: string;
    imageUrl?: string;
    condition?: string;
    sellerRating?: number;
    postedAt?: Date;
}

export interface PriceDistribution {
    range: string;
    min: number;
    max: number;
    count: number;
}

export interface MarketAnalysis {
    productId: string;
    timestamp: Date;
    totalListings: number;
    averagePrice: number;
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
    priceDistribution: PriceDistribution[];
    bestPlatform: MarketPlatform;
    demandLevel: 'Low' | 'Medium' | 'High';
    recommendation: {
        suggestedPrice: number;
        confidenceScore: number; // 0-100
        reasoning: string;
    };
}

export interface SearchFilters {
    query: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string[];
    platforms?: MarketPlatform[];
}
