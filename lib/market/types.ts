export interface SearchQuery {
    query: string;
    priceMin?: number;
    priceMax?: number;
    brands?: string[];
    size?: string[];
    condition?: string[];
    limit?: number;
    page?: number;
    sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'relevance';
}

export interface SearchResult {
    id: string;
    title: string;
    price: number;
    currency: string;
    brand?: string;
    size?: string;
    condition?: string;
    url: string;
    imageUrl?: string;
    provider: 'vinted' | 'leboncoin' | 'ebay';
    platformId: string;
    postedAt?: Date;
}

export interface ItemDetails extends SearchResult {
    description: string;
    seller: {
        id: string;
        username: string;
        rating?: number;
        feedbackCount?: number;
    };
    images: string[];
    attributes: Record<string, string>;
}

export interface AuthTokens {
    cookie?: string;
    accessToken?: string;
    csrfToken?: string;
    expiresAt?: Date;
}
