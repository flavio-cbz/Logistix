export interface VintedSearchParams {
  searchText?: string;
  brandId?: number;
  catalogId?: number;
  colorId?: number;
  statusIds?: number[];
  priceFrom?: number;
  priceTo?: number;
  limit?: number;
  perPage?: number;
  order?: 'relevance' | 'price_low_to_high' | 'price_high_to_low' | 'newest_first';
}

export interface VintedItem {
  id: number;
  title: string;
  price: {
    amount: string;
    currency_code: string;
  };
  brand_title: string;
  size_title: string;
  status: string; // e.g. "Très bon état"
  url: string;
  photo: {
    url: string;
  };
  favourite_count: number;
  view_count: number;
  created_at_ts?: number;
  updated_at_ts?: number;
  // Specific fields sometimes present
  is_reserved?: boolean;
  is_closed?: boolean;
  service_fee?: { amount?: string };
  status_id?: number;
}
