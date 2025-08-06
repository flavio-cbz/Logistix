// Types générés à partir de docs/market-analysis.openapi.yaml

export interface SimilarSale {
  id: string
  price: {
    amount: number
    currency: string
  }
  size_title: string
  status: string
  user: {
    login: string
    feedback_reputation: number
  }
  photos: { url: string }[]
  created_at: string
  sold_at: string
}

export interface MarketMetrics {
  productName: string
  priceMetrics: {
    minPrice: number
    maxPrice: number
    avgPrice: number
    medianPrice: number
  }
  volumeMetrics: {
    salesVolume: number
    competitorCount: number
  }
  distributions: {
    sizeDistribution: Record<string, number>
    statusDistribution: Record<string, number>
  }
  sampleItems: SimilarSale[]
}